import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial migration — captures the existing schema as-is.
 * This is a no-op if the database already has these tables (from synchronize: true era).
 * New deployments will create all tables from scratch.
 */
export class InitialSchema1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tables already exist (existing deployment)
    const hasUsers = await queryRunner.hasTable('users');
    if (hasUsers) {
      return; // Schema already exists, skip
    }

    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "subscriptions_status_enum" AS ENUM ('active', 'expired', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "payments_method_enum" AS ENUM ('stars', 'yokassa')
    `);
    await queryRunner.query(`
      CREATE TYPE "payments_status_enum" AS ENUM ('pending', 'paid', 'failed', 'refunded')
    `);

    // users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "telegramId" bigint NOT NULL UNIQUE,
        "username" varchar,
        "firstName" varchar,
        "languageCode" varchar,
        "referrerId" int,
        "referralCode" varchar(8) UNIQUE,
        "referralBonusDays" int NOT NULL DEFAULT 0,
        "notifyBeforeExpiry" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // plans
    await queryRunner.query(`
      CREATE TABLE "plans" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar NOT NULL,
        "slug" varchar NOT NULL UNIQUE,
        "price" int NOT NULL,
        "priceStars" int NOT NULL,
        "trafficLimitGB" int NOT NULL,
        "durationDays" int NOT NULL,
        "maxDevices" int NOT NULL DEFAULT 1,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" int NOT NULL DEFAULT 0
      )
    `);

    // servers
    await queryRunner.query(`
      CREATE TABLE "servers" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar NOT NULL,
        "host" varchar NOT NULL,
        "port" int NOT NULL DEFAULT 443,
        "apiPort" int NOT NULL DEFAULT 2096,
        "username" varchar NOT NULL,
        "password" varchar NOT NULL,
        "inboundId" int NOT NULL DEFAULT 1,
        "location" varchar NOT NULL DEFAULT 'Нидерланды',
        "maxClients" int NOT NULL DEFAULT 100,
        "currentClients" int NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true
      )
    `);

    // subscriptions
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" SERIAL PRIMARY KEY,
        "userId" int NOT NULL REFERENCES "users"("id"),
        "planId" int NOT NULL REFERENCES "plans"("id"),
        "serverId" int NOT NULL REFERENCES "servers"("id"),
        "vpnClientId" varchar NOT NULL,
        "vpnClientEmail" varchar,
        "status" "subscriptions_status_enum" NOT NULL DEFAULT 'active',
        "expiresAt" TIMESTAMP NOT NULL,
        "trafficUsedGB" decimal(10,2) NOT NULL DEFAULT 0,
        "connectionLink" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // payments
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" SERIAL PRIMARY KEY,
        "userId" int NOT NULL REFERENCES "users"("id"),
        "subscriptionId" int REFERENCES "subscriptions"("id"),
        "amount" int NOT NULL,
        "method" "payments_method_enum" NOT NULL,
        "status" "payments_status_enum" NOT NULL DEFAULT 'pending',
        "externalId" varchar,
        "planId" int,
        "discountPercent" int NOT NULL DEFAULT 0,
        "promoCodeId" int,
        "personalDiscountId" int,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // promo_codes
    await queryRunner.query(`
      CREATE TABLE "promo_codes" (
        "id" SERIAL PRIMARY KEY,
        "code" varchar(32) NOT NULL UNIQUE,
        "discountPercent" int NOT NULL DEFAULT 0,
        "bonusDays" int NOT NULL DEFAULT 0,
        "maxUses" int NOT NULL DEFAULT 0,
        "currentUses" int NOT NULL DEFAULT 0,
        "expiresAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // promo_usages
    await queryRunner.query(`
      CREATE TABLE "promo_usages" (
        "id" SERIAL PRIMARY KEY,
        "userId" int NOT NULL REFERENCES "users"("id"),
        "promoCodeId" int NOT NULL REFERENCES "promo_codes"("id"),
        "usedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // personal_discounts
    await queryRunner.query(`
      CREATE TABLE "personal_discounts" (
        "id" SERIAL PRIMARY KEY,
        "userId" int NOT NULL REFERENCES "users"("id"),
        "discountPercent" int NOT NULL DEFAULT 0,
        "bonusDays" int NOT NULL DEFAULT 0,
        "reason" varchar(255),
        "expiresAt" TIMESTAMP,
        "isUsed" boolean NOT NULL DEFAULT false,
        "usedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "personal_discounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_usages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_codes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "servers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payments_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payments_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscriptions_status_enum"`);
  }
}
