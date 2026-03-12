/* eslint-disable prettier/prettier */
import { Type } from 'class-transformer';
import {
    IsString,
    IsOptional,
    IsNumber,
    IsEnum,
    IsEmail,
    MinLength,
} from 'class-validator';

export class CreateUserDto {

    @IsOptional()
    @IsString()
    name?: string;


    @IsOptional()
    @IsString()
    user_name: string;

    @IsOptional()
    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    password: string;

    @IsOptional()
    @IsString()
    role: string;

    @IsOptional()
    @IsString()
    mobile_number?: number;

    @IsOptional()
    @IsString()
    user_setting?: string;

    @IsOptional()
    @IsEnum(['active', 'inactive'])
    status?: 'active' | 'inactive';

}