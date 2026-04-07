/* eslint-disable prettier/prettier */
import { PartialType } from '@nestjs/mapped-types';
import { CreateAuditDto } from './createAudit.dto';


export class updateAuditDto extends PartialType(
  CreateAuditDto,
) {}