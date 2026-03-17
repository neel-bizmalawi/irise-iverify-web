/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepositoryService } from './auth.repository.service';
import { TokenCleanupService } from './token-cleanup.service';

@Module({
  imports: [
    PassportModule,
      JwtModule.registerAsync({ //jwtModule provides jwtModule and jwtService i.e this.jwtService.sign(),jwt.jwtService.verify()
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
    ConfigModule,
  ],
  providers: [JwtStrategy, AuthService,AuthRepositoryService, TokenCleanupService,], 

  exports: [PassportModule], 
  controllers: [AuthController],
})
export class AuthModule {}