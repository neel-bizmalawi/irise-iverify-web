/* eslint-disable prettier/prettier */
import {
    IsString,
    IsOptional,
    IsNumber,
    IsEnum,
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
    latitude?: number;

    @IsOptional()
    @IsNumber()
    longitude?: number;
}