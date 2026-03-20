import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),
  PORT: Joi.number().default(3100),

  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().default('vpn_bot'),

  // Telegram
  BOT_TOKEN: Joi.string().required(),
  MINI_APP_URL: Joi.string().required(),
  WEBHOOK_DOMAIN: Joi.string().optional().allow(''),

  // 3X-UI
  XUI_HOST: Joi.string().required(),
  XUI_PORT: Joi.number().default(2096),
  XUI_USERNAME: Joi.string().required(),
  XUI_PASSWORD: Joi.string().required(),
  XUI_INBOUND_ID: Joi.number().default(1),

  // YooKassa
  YOKASSA_SHOP_ID: Joi.string().optional().allow(''),
  YOKASSA_SECRET_KEY: Joi.string().optional().allow(''),
  YOKASSA_RETURN_URL: Joi.string().optional().allow(''),

  // Admin
  ADMIN_PASSWORD: Joi.string().required().min(8),
  JWT_SECRET: Joi.string().required().min(16),
  ADMIN_APP_URL: Joi.string().optional().allow(''),

  // Admin Telegram notifications
  ADMIN_TELEGRAM_ID: Joi.number().optional(),

  // Channel for auto-posts
  CHANNEL_USERNAME: Joi.string().optional().default(''),

  // Webhook
  WEBHOOK_SECRET: Joi.string().optional().default(''),

  // Referral
  REFERRAL_BONUS_DAYS: Joi.number().optional().default(3),
});
