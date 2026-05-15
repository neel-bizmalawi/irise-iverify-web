/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrainingSiteModule } from './training_site/training_site.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { BeneficiaryModule } from './beneficiary/beneficiary.module';
import { UserModule } from './user/user.module';
import { UserRepositoryService } from './user/user.repository/user.repository.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MonitoringModule } from './monitoring/monitoring.module';
import { AuditModule } from './audit/audit.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CustomerModule } from './customer/customer.module';


@Module({
  imports: [ TrainingSiteModule,
        ScheduleModule.forRoot(),

     ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ConfigModule.forRoot({
      isGlobal: true, // 👈 IMPORTANT
    }),
    DatabaseModule,
    AuthModule,
    BeneficiaryModule,
    UserModule,
    CustomerModule,
    MonitoringModule,
    AuditModule
  ],
  controllers: [AppController],
  providers: [AppService, UserRepositoryService],
})
export class AppModule { }
