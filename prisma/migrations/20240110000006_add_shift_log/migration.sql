CREATE TABLE "ShiftLog" (
    "id" TEXT NOT NULL,
    "weekScheduleId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT,
    "day" "DayOfWeek",
    "period" "Period",
    "oldType" "ShiftType",
    "newType" "ShiftType",
    "oldStartTime" TEXT,
    "newStartTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShiftLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ShiftLog"
    ADD CONSTRAINT "ShiftLog_weekScheduleId_fkey"
    FOREIGN KEY ("weekScheduleId") REFERENCES "WeekSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftLog"
    ADD CONSTRAINT "ShiftLog_changedById_fkey"
    FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShiftLog"
    ADD CONSTRAINT "ShiftLog_targetUserId_fkey"
    FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
