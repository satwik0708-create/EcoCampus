-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "WasteCategory" AS ENUM ('PLASTIC', 'PAPER', 'GLASS', 'METAL', 'EWASTE', 'ORGANIC', 'GENERAL', 'OTHER');

-- CreateEnum
CREATE TYPE "FoodCategory" AS ENUM ('COOKED_FOOD', 'FRUITS', 'VEGETABLES', 'GRAINS', 'DAIRY', 'BEVERAGES', 'OTHER');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('GRAM', 'KILOGRAM', 'PIECE', 'LITRE', 'MILLILITRE', 'PLATE', 'SERVING');

-- CreateEnum
CREATE TYPE "DisposalAction" AS ENUM ('RECYCLE', 'COMPOST', 'REUSE', 'SPECIAL_DISPOSAL', 'GENERAL_WASTE');

-- CreateEnum
CREATE TYPE "ChallengeMetric" AS ENUM ('RECORD_COUNT', 'ACTIVE_DAYS', 'MASS_GRAMS');

-- CreateEnum
CREATE TYPE "ChallengeScope" AS ENUM ('WASTE', 'FOOD_WASTE', 'ANY');

-- CreateEnum
CREATE TYPE "PointReason" AS ENUM ('WASTE_RECORD', 'FOOD_WASTE_RECORD', 'DAILY_FIRST_ACTIVITY', 'SEGREGATION_BONUS', 'STREAK_MILESTONE', 'CHALLENGE_COMPLETION', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "RecommendationTrigger" AS ENUM ('LATEST_WASTE_CATEGORY', 'LATEST_FOOD_CATEGORY', 'FREQUENT_WASTE_CATEGORY', 'FREQUENT_FOOD_CATEGORY', 'HIGH_FOOD_WASTE', 'NO_RECENT_ACTIVITY', 'NO_ACTIVE_CHALLENGE', 'STREAK_AT_RISK', 'GENERAL');

-- CreateEnum
CREATE TYPE "ContentCategory" AS ENUM ('SEGREGATION', 'REDUCE', 'REUSE', 'RECYCLING', 'FOOD_WASTE', 'RESPONSIBLE_CONSUMPTION', 'CAMPUS_HABITS', 'SDG');

-- CreateEnum
CREATE TYPE "AdminAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "displayName" TEXT NOT NULL,
    "course" TEXT,
    "departmentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "WasteCategory" NOT NULL,
    "itemType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "Unit" NOT NULL,
    "massGrams" DOUBLE PRECISION,
    "disposal" "DisposalAction" NOT NULL,
    "recordedOn" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WasteRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodWasteRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "foodCategory" "FoodCategory" NOT NULL,
    "mealType" "MealType" NOT NULL,
    "itemType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "Unit" NOT NULL,
    "massGrams" DOUBLE PRECISION,
    "avoidable" BOOLEAN NOT NULL DEFAULT true,
    "recordedOn" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodWasteRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" "PointReason" NOT NULL,
    "detail" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" "ChallengeMetric" NOT NULL,
    "scope" "ChallengeScope" NOT NULL,
    "wasteCategory" "WasteCategory",
    "foodCategory" "FoodCategory",
    "disposal" "DisposalAction",
    "target" DOUBLE PRECISION NOT NULL,
    "targetUnit" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeParticipation" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisposalGuide" (
    "id" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "WasteCategory" NOT NULL,
    "summary" TEXT NOT NULL,
    "reduceGuidance" TEXT NOT NULL,
    "reuseGuidance" TEXT NOT NULL,
    "recycleGuidance" TEXT NOT NULL,
    "disposeGuidance" TEXT NOT NULL,
    "recommendedAction" "DisposalAction" NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisposalGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationalContent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ContentCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "readMinutes" INTEGER NOT NULL DEFAULT 3,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationalContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsRule" (
    "id" TEXT NOT NULL,
    "code" "PointReason" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointsRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "trigger" "RecommendationTrigger" NOT NULL,
    "priority" INTEGER NOT NULL,
    "matchWasteCategory" "WasteCategory",
    "matchFoodCategory" "FoodCategory",
    "threshold" INTEGER,
    "windowDays" INTEGER,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionLabel" TEXT,
    "actionHref" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AdminActivity" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" "AdminAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "WasteRecord_userId_recordedOn_idx" ON "WasteRecord"("userId", "recordedOn");

-- CreateIndex
CREATE INDEX "WasteRecord_category_recordedOn_idx" ON "WasteRecord"("category", "recordedOn");

-- CreateIndex
CREATE INDEX "WasteRecord_recordedOn_idx" ON "WasteRecord"("recordedOn");

-- CreateIndex
CREATE INDEX "WasteRecord_createdAt_idx" ON "WasteRecord"("createdAt");

-- CreateIndex
CREATE INDEX "FoodWasteRecord_userId_recordedOn_idx" ON "FoodWasteRecord"("userId", "recordedOn");

-- CreateIndex
CREATE INDEX "FoodWasteRecord_foodCategory_recordedOn_idx" ON "FoodWasteRecord"("foodCategory", "recordedOn");

-- CreateIndex
CREATE INDEX "FoodWasteRecord_recordedOn_idx" ON "FoodWasteRecord"("recordedOn");

-- CreateIndex
CREATE INDEX "FoodWasteRecord_createdAt_idx" ON "FoodWasteRecord"("createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_userId_createdAt_idx" ON "PointTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_createdAt_idx" ON "PointTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_userId_sourceType_sourceId_key" ON "PointTransaction"("userId", "sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Streak_userId_key" ON "Streak"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");

-- CreateIndex
CREATE INDEX "Challenge_active_startDate_endDate_idx" ON "Challenge"("active", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ChallengeParticipation_userId_idx" ON "ChallengeParticipation"("userId");

-- CreateIndex
CREATE INDEX "ChallengeParticipation_challengeId_completed_idx" ON "ChallengeParticipation"("challengeId", "completed");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeParticipation_challengeId_userId_key" ON "ChallengeParticipation"("challengeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DisposalGuide_slug_key" ON "DisposalGuide"("slug");

-- CreateIndex
CREATE INDEX "DisposalGuide_category_idx" ON "DisposalGuide"("category");

-- CreateIndex
CREATE INDEX "DisposalGuide_published_idx" ON "DisposalGuide"("published");

-- CreateIndex
CREATE UNIQUE INDEX "EducationalContent_slug_key" ON "EducationalContent"("slug");

-- CreateIndex
CREATE INDEX "EducationalContent_category_idx" ON "EducationalContent"("category");

-- CreateIndex
CREATE INDEX "EducationalContent_published_idx" ON "EducationalContent"("published");

-- CreateIndex
CREATE UNIQUE INDEX "PointsRule_code_key" ON "PointsRule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationRule_code_key" ON "RecommendationRule"("code");

-- CreateIndex
CREATE INDEX "RecommendationRule_active_priority_idx" ON "RecommendationRule"("active", "priority");

-- CreateIndex
CREATE INDEX "AdminActivity_adminId_createdAt_idx" ON "AdminActivity"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActivity_createdAt_idx" ON "AdminActivity"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodWasteRecord" ADD CONSTRAINT "FoodWasteRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipation" ADD CONSTRAINT "ChallengeParticipation_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipation" ADD CONSTRAINT "ChallengeParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActivity" ADD CONSTRAINT "AdminActivity_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
