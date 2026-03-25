/* eslint-disable prettier/prettier */
import { PartialType } from '@nestjs/mapped-types';
import { CreateMonitoringDto } from './createmonitoring.dto';

export class UpdateMonitoringdto extends PartialType(
  CreateMonitoringDto,
) {}