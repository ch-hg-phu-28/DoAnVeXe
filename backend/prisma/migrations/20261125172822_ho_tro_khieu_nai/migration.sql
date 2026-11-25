-- CreateEnum
CREATE TYPE "SupportType" AS ENUM ('QUESTION', 'COMPLAINT', 'HANDOFF');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');

-- CreateTable
CREATE TABLE "support_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "type" "SupportType" NOT NULL DEFAULT 'QUESTION',
    "booking_code" TEXT,
    "contact_phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
    "reply" TEXT,
    "replied_at" TIMESTAMP(3),
    "replied_by_id" INTEGER,
    "chat_session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_requests_status_idx" ON "support_requests"("status");

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_replied_by_id_fkey" FOREIGN KEY ("replied_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
