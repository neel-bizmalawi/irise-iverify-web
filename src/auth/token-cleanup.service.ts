/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuthRepositoryService } from './auth.repository.service';

@Injectable()
export class TokenCleanupService {
    constructor(private readonly authRepo: AuthRepositoryService) { }

    @Cron('0 * * * *') // runs every hour
    async cleanupTokens() {
          console.log("Running token cleanup job...");

        await this.authRepo.deleteExpiredTokens();
    }
}