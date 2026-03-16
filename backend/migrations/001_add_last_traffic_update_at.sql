-- Migration: Add lastTrafficUpdateAt column to subscriptions table
-- Required for inactive user notification feature (cron job that detects users
-- who have active subscriptions but haven't used VPN in 3+ days)
--
-- Run this in production where synchronize: false

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS "lastTrafficUpdateAt" TIMESTAMP DEFAULT NULL;

-- Initialize for existing active subscriptions: set to current timestamp
-- so they don't immediately trigger inactive notifications
UPDATE subscriptions
  SET "lastTrafficUpdateAt" = NOW()
  WHERE status = 'active' AND "lastTrafficUpdateAt" IS NULL;

-- Optional: create index for the daily cron query performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_last_traffic_update
  ON subscriptions ("lastTrafficUpdateAt")
  WHERE status = 'active';
