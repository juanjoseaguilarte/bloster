-- CreateTable
CREATE TABLE "LimpiezaTask" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" "UserGroup" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LimpiezaTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LimpiezaCompletion" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LimpiezaCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "LimpiezaCompletion_taskId_weekStart_dayOfWeek_key"
    ON "LimpiezaCompletion"("taskId", "weekStart", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "LimpiezaCompletion"
    ADD CONSTRAINT "LimpiezaCompletion_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "LimpiezaTask"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LimpiezaCompletion"
    ADD CONSTRAINT "LimpiezaCompletion_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
