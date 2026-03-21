/* eslint-disable prettier/prettier */
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';

export class SyncTrainingSiteDto {

  @IsOptional()
  @IsNumber()
  offline_id?: number;

    @IsOptional()
  @IsNumber()
  m_training_point_id?: number;

  @IsOptional()
  @IsString()
  training_site?: string;

  @IsOptional()
  @IsNumber()
  s_is_sync?: number;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  gvh_name?: string;

  @IsOptional()
  @IsString()
  village_head_name?: string;

  @IsOptional()
  @IsString()
  traditional_authority?: string;

  @IsOptional()
  @IsNumber()
  cookstoves_count?: number;

  @IsOptional()
  @IsNumber()
  house_holds_count?: number;

  @IsOptional()
  @IsNumber()
  house_hold_radius?: number;

  @IsOptional()
  @IsEnum(['Yes', 'No'])
  road_access?: 'Yes' | 'No';

  @IsOptional()
  @IsNumber()
  total_people?: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Type(() => Date)
  created_date?: Date;

  @IsOptional()
  @Type(() => Date)
  server_time?: Date;
}