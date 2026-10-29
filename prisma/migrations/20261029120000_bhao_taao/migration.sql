-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "bargainPct" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "productId" TEXT,
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "Haggle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ask" INTEGER NOT NULL,
    "rounds" INTEGER NOT NULL DEFAULT 0,
    "calledBack" BOOLEAN NOT NULL DEFAULT false,
    "dealPrice" INTEGER,
    "couponCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Haggle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Haggle_userId_productId_key" ON "Haggle"("userId", "productId");

-- AddForeignKey
ALTER TABLE "Haggle" ADD CONSTRAINT "Haggle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Haggle" ADD CONSTRAINT "Haggle_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
