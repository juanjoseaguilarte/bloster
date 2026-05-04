-- CreateEnum
CREATE TYPE "UserGroup" AS ENUM ('BARRA', 'COCINA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "group" "UserGroup" NOT NULL DEFAULT 'BARRA';
