/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/require-await */

import { Body, Controller, Post, Res } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';


@Controller('auth')
export class AuthController {

    constructor(private authService: AuthService, private jwtService: JwtService, // ✅ ADD THIS
    ) {
        console.log("AuthController loaded");

    }


    @Post('verifyUser')
    async LoginByEmail(
        @Body() body,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.loginWithEmail(
            body.validemail,
            body.validPass,
        );

        // ✅ Access Token (short lived)
        // res.cookie('access_token', result.accessToken, {
        //     httpOnly: true,
        //     secure: false,
        //     sameSite: 'lax',
        //     maxAge: 1 * 60 * 1000,
        // });

        // ✅ Refresh Token (long lived)
        res.cookie('refresh_token', result.refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        const AccessTokenss = result.accessToken;

        return {
            message: result.message,
            user: result.user,
            AccessTokenss,
            RefreshToken:result.refreshToken,
        };
    }



}
