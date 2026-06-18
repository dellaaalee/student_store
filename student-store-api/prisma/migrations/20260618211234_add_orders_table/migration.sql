-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "customer" INTEGER NOT NULL,
    "customer_email" TEXT,
    "total_price" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
