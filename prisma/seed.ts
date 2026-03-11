import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default plans
  const freePlan = await prisma.plan.upsert({
    where: { name: 'free' },
    update: {},
    create: {
      name: 'free',
      displayName: 'Free Plan',
      description: 'Perfect for trying out BloggerSEO',
      price: 0,
      yearlyPrice: 0,
      
      // Limits
      articlesPerMonth: 10,
      imagesPerMonth: 30,
      blogsLimit: 1,
      projectsLimit: 1,
      brandProfilesLimit: 1,
      campaignsLimit: 0,
      
      wordsPerArticle: 2000,
      
      // Features
      hasAutoPublish: false,
      hasScheduling: false,
      hasAnalytics: false,
      hasBulkGeneration: false,
      hasTrendIdeas: false,
      hasAutoClustering: false,
      hasContentRefresh: false,
      hasApiAccess: false,
      hasPrioritySupport: false,
      hasWhiteLabel: false,
      hasTeamAccess: false,
      teamMembersLimit: 1,
      hasAdvancedAI: false,
      hasCompetitorAnalysis: false,
      hasCustomPrompts: false,
      
      isActive: true,
      sortOrder: 1,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { name: 'pro' },
    update: {},
    create: {
      name: 'pro',
      displayName: 'Pro Plan',
      description: 'For serious content creators and bloggers',
      price: 29.99,
      yearlyPrice: 299.99,
      
      // Limits
      articlesPerMonth: 100,
      imagesPerMonth: 300,
      blogsLimit: 5,
      projectsLimit: 10,
      brandProfilesLimit: 5,
      campaignsLimit: 3,
      
      wordsPerArticle: 5000,
      
      // Features
      hasAutoPublish: true,
      hasScheduling: true,
      hasAnalytics: true,
      hasBulkGeneration: true,
      hasTrendIdeas: true,
      hasAutoClustering: true,
      hasContentRefresh: true,
      hasApiAccess: false,
      hasPrioritySupport: true,
      hasWhiteLabel: false,
      hasTeamAccess: false,
      teamMembersLimit: 1,
      hasAdvancedAI: true,
      hasCompetitorAnalysis: true,
      hasCustomPrompts: true,
      
      stripePriceId: 'price_pro_monthly',
      stripeYearlyPriceId: 'price_pro_yearly',
      
      isActive: true,
      sortOrder: 2,
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { name: 'enterprise' },
    update: {},
    create: {
      name: 'enterprise',
      displayName: 'Enterprise Plan',
      description: 'For agencies and large teams',
      price: 99.99,
      yearlyPrice: 999.99,
      
      // Limits (unlimited or very high)
      articlesPerMonth: 1000,
      imagesPerMonth: 3000,
      blogsLimit: 50,
      projectsLimit: 100,
      brandProfilesLimit: 50,
      campaignsLimit: 50,
      
      wordsPerArticle: 10000,
      
      // Features (all enabled)
      hasAutoPublish: true,
      hasScheduling: true,
      hasAnalytics: true,
      hasBulkGeneration: true,
      hasTrendIdeas: true,
      hasAutoClustering: true,
      hasContentRefresh: true,
      hasApiAccess: true,
      hasPrioritySupport: true,
      hasWhiteLabel: true,
      hasTeamAccess: true,
      teamMembersLimit: 10,
      hasAdvancedAI: true,
      hasCompetitorAnalysis: true,
      hasCustomPrompts: true,
      
      stripePriceId: 'price_enterprise_monthly',
      stripeYearlyPriceId: 'price_enterprise_yearly',
      
      isActive: true,
      sortOrder: 3,
    },
  });

  console.log('✅ Created plans:', {
    free: freePlan.id,
    pro: proPlan.id,
    enterprise: enterprisePlan.id,
  });

  // Create default templates
  const templates = [
    {
      name: 'How-To Guide',
      type: 'how-to',
      description: 'Step-by-step tutorial format',
      structure: JSON.stringify({
        sections: ['Introduction', 'What You\'ll Need', 'Step-by-Step Instructions', 'Tips & Tricks', 'Conclusion'],
      }),
      isSystem: true,
    },
    {
      name: 'Product Review',
      type: 'review',
      description: 'Comprehensive product review',
      structure: JSON.stringify({
        sections: ['Overview', 'Features', 'Pros & Cons', 'Performance', 'Pricing', 'Verdict'],
      }),
      isSystem: true,
    },
    {
      name: 'Comparison Article',
      type: 'comparison',
      description: 'Compare multiple options',
      structure: JSON.stringify({
        sections: ['Introduction', 'Comparison Table', 'Option 1 Deep Dive', 'Option 2 Deep Dive', 'Which One to Choose', 'Conclusion'],
      }),
      isSystem: true,
    },
    {
      name: 'Listicle',
      type: 'listicle',
      description: 'Top X list format',
      structure: JSON.stringify({
        sections: ['Introduction', 'Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Conclusion'],
      }),
      isSystem: true,
    },
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: { name: template.name },
      update: {},
      create: template,
    });
  }

  console.log(`✅ Created ${templates.length} default templates`);
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
