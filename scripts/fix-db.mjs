import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. List all users
  const users = await prisma.user.findMany({ include: { plan: true } });
  console.log('=== USERS ===');
  for (const u of users) {
    console.log(`  ID: ${u.id}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Name: ${u.name}`);
    console.log(`  Role: ${u.role}`);
    console.log(`  PlanId: ${u.planId}`);
    console.log(`  Plan: ${u.plan?.name || 'NONE'}`);
    console.log(`  Google Token: ${u.googleAccessToken ? 'YES' : 'NO'}`);
    console.log('---');
  }

  // 2. List all plans
  const plans = await prisma.plan.findMany();
  console.log('\n=== PLANS ===');
  for (const p of plans) {
    console.log(`  ID: ${p.id} | Name: ${p.name} | Display: ${p.displayName}`);
  }

  // 3. List all blogs
  const blogs = await prisma.blog.findMany();
  console.log('\n=== BLOGS ===');
  console.log(`  Total: ${blogs.length}`);
  for (const b of blogs) {
    console.log(`  ID: ${b.id} | BlogId: ${b.blogId} | Name: ${b.name} | UserId: ${b.userId}`);
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('ERROR:', e);
  process.exit(1);
});
