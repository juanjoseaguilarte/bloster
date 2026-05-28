CREATE TABLE "LimpiezaUrgent" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LimpiezaUrgent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LimpiezaUrgent_taskId_weekStart_dayOfWeek_key"
    ON "LimpiezaUrgent"("taskId", "weekStart", "dayOfWeek");

ALTER TABLE "LimpiezaUrgent"
    ADD CONSTRAINT "LimpiezaUrgent_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "LimpiezaTask"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
