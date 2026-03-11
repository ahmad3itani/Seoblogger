-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "yearlyPrice" REAL,
    "articlesPerMonth" INTEGER NOT NULL DEFAULT 10,
    "imagesPerMonth" INTEGER NOT NULL DEFAULT 30,
    "blogsLimit" INTEGER NOT NULL DEFAULT 1,
    "projectsLimit" INTEGER NOT NULL DEFAULT 1,
    "brandProfilesLimit" INTEGER NOT NULL DEFAULT 1,
    "campaignsLimit" INTEGER NOT NULL DEFAULT 0,
    "hasAutoPublish" BOOLEAN NOT NULL DEFAULT false,
    "hasScheduling" BOOLEAN NOT NULL DEFAULT false,
    "hasAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "hasApiAccess" BOOLEAN NOT NULL DEFAULT false,
    "hasPrioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "hasWhiteLabel" BOOLEAN NOT NULL DEFAULT false,
    "hasTeamAccess" BOOLEAN NOT NULL DEFAULT false,
    "teamMembersLimit" INTEGER NOT NULL DEFAULT 1,
    "hasAdvancedAI" BOOLEAN NOT NULL DEFAULT false,
    "hasCompetitorAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "hasCustomPrompts" BOOLEAN NOT NULL DEFAULT false,
    "stripePriceId" TEXT,
    "stripeYearlyPriceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" DATETIME NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePaymentMethodId" TEXT,
    "trialStart" DATETIME,
    "trialEnd" DATETIME,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "articlesGenerated" INTEGER NOT NULL DEFAULT 0,
    "imagesGenerated" INTEGER NOT NULL DEFAULT 0,
    "apiCallsCount" INTEGER NOT NULL DEFAULT 0,
    "totalArticles" INTEGER NOT NULL DEFAULT 0,
    "totalImages" INTEGER NOT NULL DEFAULT 0,
    "totalApiCalls" INTEGER NOT NULL DEFAULT 0,
    "lastResetAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "subscriptionId" TEXT,
    "planId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "image", "name", "updatedAt") SELECT "createdAt", "email", "emailVerified", "id", "image", "name", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_subscriptionId_key" ON "User"("subscriptionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Usage_userId_key" ON "Usage"("userId");
