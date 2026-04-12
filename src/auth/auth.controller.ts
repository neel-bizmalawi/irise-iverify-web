/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/require-await */

import { BadRequestException, Body, Controller, Post, Req, Res } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';


@Controller('auth')
@ApiTags('auth')
export class AuthController {

    constructor(private authService: AuthService, private jwtService: JwtService, // ✅ ADD THIS
    ) {
        console.log("AuthController loaded");

    }


    @Post('verifyUser')
    @ApiOperation({ summary: 'User login with email and password' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                validemail: { type: 'string', example: 'user@example.com' },
                validPass: { type: 'string', example: 'password123' }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
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


@Post('logout')
@ApiOperation({ summary: 'User logout' })
@ApiResponse({ status: 200, description: 'Logout successful' })
@ApiResponse({ status: 400, description: 'Token missing' })
logout(@Req() req) {

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    throw new BadRequestException("Token missing");
  }

  return this.authService.logout(token);
}

}
