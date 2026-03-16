-- Migration: Add hasUsedTrial to users and renewalDiscountPercent to plans
-- Run this in production where synchronize: false

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "hasUsedTrial" BOOLEAN DEFAULT FALSE;

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS "renewalDiscountPercent" INTEGER DEFAULT 0;
