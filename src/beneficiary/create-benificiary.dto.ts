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

export class CreateBeneficiarydto {



  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  training_site?: number;


  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  beneficiary_id?: number;


  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  m_user_id?: number;

  @IsOptional()
    @Type(() => Number)

  @IsNumber()
  m_site_id?: number;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  mobile_no?: string;

  @IsOptional()
  @IsEnum(['yes', 'no'])
  other_cookstove?: 'yes' | 'no';

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
  @IsString()
  cooking_method?: string;

  @IsOptional()
  @IsString()
  district_name?: string;

  @IsOptional()
  @IsString()
  national_id?: string;

  @IsOptional()
  @IsString()
  national_id_attachment?: string;

  @IsOptional()
  @IsString()
  house_pic?: string;

  @IsOptional()
  @IsString()
  cookstove_pic?: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsNumber()
  emp_id?: number;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsEnum(['yes', 'no'])
  read_doc?: 'yes' | 'no';

  @IsOptional()
  @IsEnum(['yes', 'no'])
  understood_doc?: 'yes' | 'no';

  @IsOptional()
  @IsString()
  emp_sign?: string;

  @IsOptional()
  @IsEnum(['yes', 'no'])
  read_to_you?: 'yes' | 'no';

  @IsOptional()
  @IsEnum(['yes', 'no'])
  stove_status_delivery?: 'yes' | 'no';

  @IsOptional()
  @IsEnum(['yes', 'no'])
  no_other_cook_stove_present?: 'yes' | 'no';

  @IsOptional()
  @IsEnum(['yes', 'no'])
  primary_residence_confirmation?: 'yes' | 'no';

  @IsOptional()
  @Type(() => Date)

  cookstove_pic_timestamp?: Date;

  @IsOptional()
  @Type(() => Date)

  house_pic_timestamp?: Date;

  @IsOptional()
  @Type(() => Date)
  national_id_timestamp?: Date;

  @IsOptional()
  @Type(() => Date)

  signature_timestamp?: Date;

  @IsOptional()
  @IsString()
  device_serial_no?: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  @IsString()
  geo_address?: string;

  @IsOptional()
  @IsString()
  created_by?: string;

  @IsOptional()
  @IsString()
  modified_by?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @Type(() => Date)
  created_date?: Date;

  @IsOptional()
  @Type(() => Date)
  modified_date?: Date;

  @IsOptional()
  @Type(() => Date)
  distribution_date?: Date;

  @IsOptional()
  @IsString()
  s_is_sync?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  remove_national_id?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  remove_signature?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  remove_house_pic?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  remove_cookstove_pic?: boolean;


}