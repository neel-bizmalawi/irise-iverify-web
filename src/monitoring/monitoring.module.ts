/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MonitoringRepositoryService } from './monitoring.repository/monitoring.repository/monitoring.repository.service';
import { DatabaseModule } from 'src/database/database.module';
import { TrainingSiteModule } from 'src/training_site/training_site.module';

@Module({
  imports: [DatabaseModule,TrainingSiteModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringRepositoryService, MonitoringRepositoryService]
})
export class MonitoringModule {}
