-- Add payrollOnly field to User
ALTER TABLE "User" ADD COLUMN "payrollOnly" BOOLEAN NOT NULL DEFAULT false;

-- Create PayrollExclusion table
CREATE TABLE "PayrollExclusion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    CONSTRAINT "PayrollExclusion_pkey" PRIMARY KEY ("id")
);

-- Unique constraint
CREATE UNIQUE INDEX "PayrollExclusion_userId_year_month_key" ON "PayrollExclusion"("userId", "year", "month");

-- Foreign key
ALTER TABLE "PayrollExclusion" ADD CONSTRAINT "PayrollExclusion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
