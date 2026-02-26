/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepositoryService } from './auth.repository.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [
    PassportModule,
      JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
    ConfigModule,
    DatabaseModule
  ],
  providers: [JwtStrategy, AuthService,AuthRepositoryService],

  exports: [PassportModule],
  controllers: [AuthController],
})
export class AuthModule {}