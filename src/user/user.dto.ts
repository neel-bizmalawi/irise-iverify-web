/* eslint-disable prettier/prettier */
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
    @IsEnum(['yes', 'no'])
    is_approver?: 'yes' | 'no';

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
    @IsNumber()
    roleID?: number;

    @IsOptional()
    @IsString()
    user_setting?: string;

    @IsOptional()
    @IsEnum(['active', 'inactive'])
    status?: 'active' | 'inactive';

}