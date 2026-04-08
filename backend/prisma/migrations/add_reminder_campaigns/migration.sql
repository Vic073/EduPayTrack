-- CreateEnum
CREATE TYPE "ReminderCampaignStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "ReminderScheduleType" AS ENUM ('DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "ReminderCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ReminderCampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "scheduleType" "ReminderScheduleType" NOT NULL,
    "dayOfWeek" INTEGER,
    "sendHour" INTEGER NOT NULL,
    "sendMinute" INTEGER NOT NULL DEFAULT 0,
    "minBalance" DECIMAL(12,2),
    "maxBalance" DECIMAL(12,2),
    "titleTemplate" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "targetStudentIds" JSONB,
    "createdBy" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderCampaign_status_nextRunAt_idx" ON "ReminderCampaign"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "ReminderCampaign_createdBy_createdAt_idx" ON "ReminderCampaign"("createdBy", "createdAt");

-- AddForeignKey
ALTER TABLE "ReminderCampaign" ADD CONSTRAINT "ReminderCampaign_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
