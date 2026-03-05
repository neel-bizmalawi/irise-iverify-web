import { Module } from '@nestjs/common';
import { TrainingSiteController } from './training_site.controller';
import { TrainingSiteService } from './training_site.service';
import { TrainingSiteRepositoryService } from './training_site.repository/training_site.repository.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TrainingSiteController],
  providers: [TrainingSiteService, TrainingSiteRepositoryService],
  exports: [TrainingSiteRepositoryService],
})
export class TrainingSiteModule {}
