-- CreateTable
CREATE TABLE "DayItem" (
    "id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "text" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DayItem_doneAt_idx" ON "DayItem"("doneAt");

