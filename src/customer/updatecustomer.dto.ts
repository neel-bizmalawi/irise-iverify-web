/* eslint-disable prettier/prettier */
import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDto } from './customer.dto';

export class UpdateCustomerDto extends PartialType(
  CreateCustomerDto,
) {}
