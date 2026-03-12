/* eslint-disable prettier/prettier */
import {
    ExecutionContext,
    Injectable,
    UnauthorizedException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(
        @InjectRedis() private readonly redis: Redis
    ) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {

        const request = context.switchToHttp().getRequest();
        const token = request.headers.authorization?.split(" ")[1];

        if (!token) {
            throw new UnauthorizedException("Token missing");
        }

        const isBlacklisted = await this.redis.get(`blacklist:${token}`);

        if (isBlacklisted) {
            throw new UnauthorizedException("Token expired");
        }

        return super.canActivate(context) as Promise<boolean>;
    }
}