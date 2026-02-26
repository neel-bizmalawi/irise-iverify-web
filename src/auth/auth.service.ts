/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepositoryService } from './auth.repository.service';
import * as bcrypt from 'bcrypt';


@Injectable()
export class AuthService {

   constructor(
    private jwtService: JwtService,
    private readonly Authrepo: AuthRepositoryService,
  ) { }


   async generateTokens(user) {

    console.log("generatetoken called ")
  const accessToken = this.jwtService.sign(
  { sub: user.id, email: user.email },
  { expiresIn: '1m' },
);

const refreshToken = this.jwtService.sign(
  { sub: user.id, type: 'refresh' },
  { expiresIn: '7d' },
);

    // await this.saveRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }


  async loginWithEmail(email: string, password: string) {

    const rows = await this.Authrepo.loginemail(email);


    if (!rows || rows.length === 0) {
      throw new UnauthorizedException('No Email Found');
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // ✅ Use generateTokens
    const { accessToken, refreshToken } =
      await this.generateTokens({
        id: user.id,
        email: user.email,
      });

    return {
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
