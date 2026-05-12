/* eslint-disable prettier/prettier */
import {
    IsString,
    IsOptional,
    IsEmail,
    MinLength,
    IsEnum,
} from 'class-validator';

export class CreateCustomerDto {

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    user_name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;

    @IsOptional()
    @IsString()
    role?: string;

    @IsOptional()
    @IsString()
    mobile_number?: string;

    @IsOptional()
    @IsString()
    user_setting?: string;

    @IsOptional()
    @IsEnum(['active', 'inactive'])
    status?: 'active' | 'inactive';

    @IsOptional()
    @IsString()
    timezone?: string;
}
