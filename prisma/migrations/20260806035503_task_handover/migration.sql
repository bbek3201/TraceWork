-- CreateEnum
CREATE TYPE "HandoverTransferType" AS ENUM ('TEMPORARY', 'PERMANENT');

-- CreateTable
CREATE TABLE "TaskHandover" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "leaveRequestId" TEXT,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "transferType" "HandoverTransferType" NOT NULL DEFAULT 'TEMPORARY',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskHandover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskHandover_taskId_idx" ON "TaskHandover"("taskId");

-- CreateIndex
CREATE INDEX "TaskHandover_leaveRequestId_idx" ON "TaskHandover"("leaveRequestId");

-- AddForeignKey
ALTER TABLE "TaskHandover" ADD CONSTRAINT "TaskHandover_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskHandover" ADD CONSTRAINT "TaskHandover_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskHandover" ADD CONSTRAINT "TaskHandover_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "OrganizationMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskHandover" ADD CONSTRAINT "TaskHandover_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "OrganizationMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskHandover" ADD CONSTRAINT "TaskHandover_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
