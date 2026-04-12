import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        profile: true,
        emails: {
          select: {
            email: true,
            isPrimary: true,
            isVerified: true,
          },
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
      emailVerified: primaryEmail?.isVerified ?? false,
      fullName: user.profile?.fullName ?? null,
      role: user.role,
      status: user.status,
    };
  }
}
