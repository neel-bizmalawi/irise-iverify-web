import { Module } from '@nestjs/common';
import { BeneficiaryRepositoryService } from './beneficiary.repository/beneficiary.repository.service';
import { DatabaseModule } from 'src/database/database.module';
import { BeneficiaryService } from './beneficiary.service';
import { TrainingSiteModule } from 'src/training_site/training_site.module';
import { BeneficiaryController } from './beneficiary.controller';

@Module({
  imports: [DatabaseModule, TrainingSiteModule],
  controllers: [BeneficiaryController],
  providers: [BeneficiaryRepositoryService, BeneficiaryService],
})
export class BeneficiaryModule {}
