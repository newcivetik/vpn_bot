import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsDateString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LoginDto {
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  totpCode?: string;
}

export class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreatePlanDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  slug: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  priceStars: number;

  @IsInt()
  @Min(0)
  trafficLimitGB: number;

  @IsInt()
  @Min(1)
  durationDays: number;

  @IsInt()
  @Min(1)
  maxDevices: number = 1;

  @IsOptional()
  @IsInt()
  sortOrder?: number = 0;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceStars?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  trafficLimitGB?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxDevices?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateServerDto {
  @IsString()
  name: string;

  @IsString()
  host: string;

  @IsOptional()
  @IsInt()
  port?: number = 443;

  @IsOptional()
  @IsInt()
  apiPort?: number = 2096;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsInt()
  inboundId?: number = 1;

  @IsOptional()
  @IsString()
  location?: string = 'Нидерланды';

  @IsOptional()
  @IsInt()
  maxClients?: number = 100;
}

export class UpdateServerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsInt()
  port?: number;

  @IsOptional()
  @IsInt()
  apiPort?: number;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsInt()
  inboundId?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  maxClients?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePromoDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  bonusDays?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxUses?: number = 0;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdatePromoDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bonusDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxUses?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSubscriptionDto {
  @IsInt()
  userId: number;

  @IsInt()
  planId: number;
}

export class ExtendSubscriptionDto {
  @IsInt()
  @Min(1)
  days: number;
}

export class BroadcastDto {
  @IsString()
  @MinLength(1)
  text: string;

  @IsOptional()
  @IsBoolean()
  onlyActive?: boolean = false;

  @IsOptional()
  @IsBoolean()
  postToChannel?: boolean = false;
}

export class CreatePersonalDiscountDto {
  @IsInt()
  userId: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  bonusDays?: number = 0;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class PersonalDiscountFilterQuery extends PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

export class SubscriptionFilterQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

export class ReplyTicketDto {
  @IsString()
  @MinLength(1)
  text: string;
}

export class TicketFilterQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  status?: string;
}

export class PaymentFilterQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}
