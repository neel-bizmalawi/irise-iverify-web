import { Module } from '@nestjs/common';
import { BeneficiaryRepositoryService } from './beneficiary.repository/beneficiary.repository.service';
import { DatabaseModule } from 'src/database/database.module';
import { BeneficiaryService } from './beneficiary.service';

@Module({
  imports: [DatabaseModule],
  providers: [BeneficiaryRepositoryService, BeneficiaryService],
})
export class BeneficiaryModule {}
