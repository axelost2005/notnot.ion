-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Task_archivedAt_completedAt_idx" ON "Task"("archivedAt", "completedAt");
