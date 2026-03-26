import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  async validate(_req: Request, payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        profile: true,
        emails: {
          select: { email: true, isPrimary: true, isVerified: true },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const primaryEmail = user.emails.find((email) => email.isPrimary) ?? user.emails[0];

    return {
      id: user.id,
      username: user.username,
      email: primaryEmail?.email,
      fullName: user.profile?.fullName ?? null,
      role: user.role,
      status: user.status,
    };
  }
}
