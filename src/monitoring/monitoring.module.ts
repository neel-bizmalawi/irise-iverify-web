/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MonitoringRepositoryService } from './monitoring.repository/monitoring.repository/monitoring.repository.service';
import { TrainingSiteModule } from 'src/training_site/training_site.module';

@Module({
  imports: [TrainingSiteModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringRepositoryService]
})
export class MonitoringModule {}
