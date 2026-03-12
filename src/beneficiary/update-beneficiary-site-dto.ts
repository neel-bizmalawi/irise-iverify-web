/* eslint-disable prettier/prettier */
import { PartialType } from '@nestjs/mapped-types';
import { CreateBeneficiarydto } from './create-benificiary.dto';

export class UpdateBeneficiaryDto extends PartialType(
  CreateBeneficiarydto,
) {}