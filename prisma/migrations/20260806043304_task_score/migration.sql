-- AlterTable
ALTER TABLE "TaskReview" ADD COLUMN     "qualityScore" INTEGER;

-- CreateTable
CREATE TABLE "TaskScore" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "basePoint" DECIMAL(65,30) NOT NULL,
    "deadlineCoefficient" DECIMAL(65,30) NOT NULL,
    "qualityCoefficient" DECIMAL(65,30) NOT NULL,
    "evidenceCoefficient" DECIMAL(65,30) NOT NULL,
    "finalScore" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskScore_taskId_key" ON "TaskScore"("taskId");

-- AddForeignKey
ALTER TABLE "TaskScore" ADD CONSTRAINT "TaskScore_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
