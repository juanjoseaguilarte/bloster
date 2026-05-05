CREATE TABLE "WeekClearLog" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "clearedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedById" TEXT,
    "shifts" JSONB NOT NULL,

    CONSTRAINT "WeekClearLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WeekClearLog" ADD CONSTRAINT "WeekClearLog_clearedById_fkey" FOREIGN KEY ("clearedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
