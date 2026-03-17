import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditRepository } from './repository/audit.repository/audit.repository';
import { TrainingSiteModule } from 'src/training_site/training_site.module';

@Module({
  imports: [TrainingSiteModule],
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
})
export class AuditModule {}
