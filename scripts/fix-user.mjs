import { PrismaClient } from '@prisma/client';

// Use session pooler to avoid PgBouncer prepared statement issues
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL }
  }
});

async function main() {
  const outlookUserId = 'cfde8ae7-5123-4b6b-91f8-87c61914c742';
  
  // Get enterprise plan ID
  const enterprisePlan = await prisma.plan.findFirst({ where: { name: 'enterprise' } });
  if (!enterprisePlan) {
    console.error('Enterprise plan not found!');
    return;
  }
  console.log('Enterprise plan ID:', enterprisePlan.id);

  // 1. Upgrade outlook user to Enterprise + admin
  const updated = await prisma.user.update({
    where: { id: outlookUserId },
    data: { 
      planId: enterprisePlan.id,
      role: 'admin',
    },
    include: { plan: true },
  });
  console.log('✅ Updated user:', updated.email);
  console.log('   Plan:', updated.plan?.name);
  console.log('   Role:', updated.role);
  console.log('   Name:', updated.name);

  // 2. Verify usage record exists
  await prisma.usage.upsert({
    where: { userId: outlookUserId },
    update: {},
    create: { userId: outlookUserId },
  });
  console.log('✅ Usage record ensured');

  // 3. Check if outlook user has Google tokens
  const user = await prisma.user.findUnique({
    where: { id: outlookUserId },
    select: { googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true },
  });
  console.log('   Google Access Token:', user.googleAccessToken ? 'YES' : 'NO');
  console.log('   Google Refresh Token:', user.googleRefreshToken ? 'YES' : 'NO');
  console.log('   Token Expiry:', user.googleTokenExpiry);

  // 4. Check blogs for this user
  const blogs = await prisma.blog.findMany({ where: { userId: outlookUserId } });
  console.log('   Blogs for outlook user:', blogs.length);

  // 5. Final verification
  const finalUser = await prisma.user.findUnique({
    where: { id: outlookUserId },
    include: { plan: true, usage: true, blogs: true },
  });
  console.log('\n=== FINAL STATE ===');
  console.log('Email:', finalUser.email);
  console.log('Name:', finalUser.name);
  console.log('Role:', finalUser.role);
  console.log('Plan:', finalUser.plan?.name, '(' + finalUser.plan?.displayName + ')');
  console.log('Blogs:', finalUser.blogs.length);
  console.log('Usage record:', finalUser.usage ? 'YES' : 'NO');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('ERROR:', e);
  process.exit(1);
});
