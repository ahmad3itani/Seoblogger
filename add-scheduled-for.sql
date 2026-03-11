-- Add scheduledFor column to Article table for scheduled publishing
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMP(3);

-- Create index for efficient querying of scheduled articles
CREATE INDEX IF NOT EXISTS "Article_scheduledFor_idx" ON "Article"("scheduledFor");
CREATE INDEX IF NOT EXISTS "Article_status_scheduledFor_idx" ON "Article"("status", "scheduledFor");
