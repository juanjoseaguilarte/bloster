CREATE TABLE "MonthSocialSecurity" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "MonthSocialSecurity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonthSocialSecurity_year_month_key" ON "MonthSocialSecurity"("year", "month");
