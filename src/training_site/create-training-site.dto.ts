/* eslint-disable prettier/prettier */
import { Type } from 'class-transformer';
import {
    IsString,
    IsOptional,
    IsNumber,
    IsEnum,
    IsDateString,
} from 'class-validator';

export class CreateTrainingSiteDto {

    @IsOptional()
    @IsString()
    training_site: string;

    @IsOptional()
    @IsString()
    district: string;

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
    number_of_people_present?: number;

    @IsOptional()
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @IsNumber()
    longitude?: number;

    @IsOptional()
    @Type(() => Date)
    conduct_training_date?: Date;

    @IsOptional()
    @Type(() => Date)
    server_time?: Date;

}