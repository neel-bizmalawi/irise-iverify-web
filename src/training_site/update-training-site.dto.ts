/* eslint-disable prettier/prettier */
import { PartialType } from '@nestjs/mapped-types';
import { CreateTrainingSiteDto } from './create-training-site.dto';

export class UpdateTrainingSiteDto extends PartialType(
  CreateTrainingSiteDto,
) {}