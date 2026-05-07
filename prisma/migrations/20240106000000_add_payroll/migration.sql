CREATE TYPE "SalaryType" AS ENUM ('FIXED', 'PER_SHIFT', 'MIXED');
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PAID');

CREATE TABLE "SalaryConfig" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "SalaryType" NOT NULL DEFAULT 'FIXED',
  "fixedAmount" DOUBLE PRECISION,
  "morningRate" DOUBLE PRECISION,
  "afternoonRate" DOUBLE PRECISION,
  "imaginaryRate" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalaryConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalaryConfig_userId_key" ON "SalaryConfig"("userId");

ALTER TABLE "SalaryConfig" ADD CONSTRAINT "SalaryConfig_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MonthlyPayroll" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "baseAmount" DOUBLE PRECISION NOT NULL,
  "advances" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "garnishments" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "netAmount" DOUBLE PRECISION NOT NULL,
  "transferAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cashAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
  "paidAt" TIMESTAMP(3),
  "paidById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MonthlyPayroll_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonthlyPayroll_userId_year_month_key" ON "MonthlyPayroll"("userId", "year", "month");

ALTER TABLE "MonthlyPayroll" ADD CONSTRAINT "MonthlyPayroll_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MonthlyPayroll" ADD CONSTRAINT "MonthlyPayroll_paidById_fkey"
  FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
