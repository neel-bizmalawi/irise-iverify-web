/* eslint-disable prettier/prettier */
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateAuditDto {

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  audit_id?: number;

  @IsOptional()
  @IsString()
  household_name?: string;

  @IsOptional()
  @IsString()
  national_id?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @Type(() => Date)
  visit_date?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  females_below_18?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  females_above_18?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  males_below_18?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  males_above_18?: number;

  @IsOptional()
  @IsEnum(['yes', 'no'])
  has_cookstove_observe?: 'yes' | 'no';

  @IsOptional()
  @IsString()
  cooking_method_before?: string;

  @IsOptional()
  @IsString()
  fuel_used_before?: string;

  @IsOptional()
  @IsEnum(['yes', 'no'])
  other_cooking_device_before?: 'yes' | 'no';

  @IsOptional()
  @IsString()
  payment_requested?: string;

  @IsOptional()
  @IsString()
  payment_requested_by?: string;

  @IsOptional()
  @IsEnum(['yes', 'no'])
  training_before_receiving?: 'yes' | 'no';

  @IsOptional()
  @IsEnum(['yes', 'no'])
  read_conset?: 'yes' | 'no';

  @IsOptional()
  @IsEnum(['yes', 'no'])
  sign_consent?: 'yes' | 'no';

  @IsOptional()
  @IsEnum(['yes', 'no'])
  delivered_condition?: 'yes' | 'no';

  @IsOptional()
  @Type(() => Date)
  date_of_cookstove_recieved?: Date;

  @IsOptional()
  @IsString()
  where_received?: string;

  @IsOptional()
  @IsString()
  where_trained?: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  @IsString()
  photo_path_cook_stove?: string;

  @IsOptional()
  @IsString()
  photo_path_cook_stove_area?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  s_is_sync?: boolean;

  @IsOptional()
  @IsString()
  created_by?: string;

  @IsOptional()
  @IsString()
  modified_by?: string;


    @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  remove_cookstove_area?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  remove_cookstove?: boolean;


    @IsOptional()
  @Type(() => Date)
  created_date?: Date;

  @IsOptional()
  @Type(() => Date)
  modified_date?: string;

    @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';

}
