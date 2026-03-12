/* eslint-disable prettier/prettier */
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
} from 'class-validator';

export class CreateMonitoringDto {

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  user_id?: number;

  @IsOptional()
  @IsString()
  national_id?: string;

  @IsOptional()
  @IsString()
  agent_name?: string;

  @IsOptional()
  @IsDateString()
  visit_at?: Date;

  @IsOptional()
  @Type(() => Number)
  old_gps_lat?: number;

  @IsOptional()
  @Type(() => Number)
  old_gps_lng?: number;

  @IsOptional()
  @Type(() => Number)
  new_gps_lat?: number;

  @IsOptional()
  @Type(() => Number)
  new_gps_lng?: number;

  @IsOptional()
  @IsString()
  device_serial_no?: string;

  @IsOptional()
  @IsString()
  new_device_serial_no?: string;

  @IsOptional()
  @IsString()
  hh_name_same?: string;

  @IsOptional()
  @IsString()
  stoves_present?: string;

  @IsOptional()
  @IsString()
  stove_being_used?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  times_used_today?: number;

  @IsOptional()
  @IsString()
  stove_condition?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;

  @IsOptional()
  @IsString()
  nfc_tag_status?: string;

  @IsOptional()
  @IsString()
  user_satisfaction?: string;

  @IsOptional()
  @IsString()
  fuel_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  daily_fuel_cost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  savings_3_months?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  est_fuel_last3meals_kg?: number;

  @IsOptional()
  @IsString()
  needs_training?: string;

  @IsOptional()
  @IsString()
  training_type?: string;

  @IsOptional()
  @IsString()
  training_performed?: string;

  @IsOptional()
  @IsString()
  training_not_done_reason?: string;

  @IsOptional()
  @IsString()
  needs_more_visits?: string;

  @IsOptional()
  @IsString()
  more_visits_reason?: string;

  @IsOptional()
  @IsString()
  health_hospital_less?: string;

  @IsOptional()
  @IsString()
  health_better_air?: string;

  @IsOptional()
  @IsString()
  photo_path?: string;

  @IsOptional()
  @IsDateString()
  created_date?: Date;

  @IsOptional()
  @IsString()
  created_by?: string;

  @IsOptional()
  @IsDateString()
  modified_at?: Date;

  @IsOptional()
  @IsString()
  modified_by?: string;
}