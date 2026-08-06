-- CreateEnum
CREATE TYPE "TaskRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "riskLevel" "TaskRiskLevel" NOT NULL DEFAULT 'LOW';
