CREATE TABLE "TipRecord" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "period" "Period" NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TipRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TipShare" (
    "id" TEXT NOT NULL,
    "tipRecordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "hadShift" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TipShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TipShare_tipRecordId_userId_key" ON "TipShare"("tipRecordId", "userId");

CREATE TABLE "TipDebt" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "remainingAmount" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TipDebt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TipDebtDeduction" (
    "id" TEXT NOT NULL,
    "tipDebtId" TEXT NOT NULL,
    "tipRecordId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TipDebtDeduction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TipRecord"
    ADD CONSTRAINT "TipRecord_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TipShare"
    ADD CONSTRAINT "TipShare_tipRecordId_fkey"
    FOREIGN KEY ("tipRecordId") REFERENCES "TipRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TipShare"
    ADD CONSTRAINT "TipShare_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TipDebt"
    ADD CONSTRAINT "TipDebt_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TipDebtDeduction"
    ADD CONSTRAINT "TipDebtDeduction_tipDebtId_fkey"
    FOREIGN KEY ("tipDebtId") REFERENCES "TipDebt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TipDebtDeduction"
    ADD CONSTRAINT "TipDebtDeduction_tipRecordId_fkey"
    FOREIGN KEY ("tipRecordId") REFERENCES "TipRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
