/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(), // ✅ frontend
                (req) => req?.cookies?.access_token,
            ]),
            secretOrKey: config.getOrThrow<string>('JWT_SECRET'), //it checks the jwt_secret and is token modified , token expired ex. 
        });
    }

    async validate(payload: any) {
        // Minimal, clean, correct
        return {
            userId: payload.sub,
            email: payload.email, // optional
        };
    }
}