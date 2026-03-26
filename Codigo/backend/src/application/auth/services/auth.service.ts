import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '@prisma/client';
import { randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RegisterDto } from '../dto/register.dto';
import { EventTypes } from '../../../shared/events/event-types';
import { TokenService } from './token.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { LogsService } from '../../logs/services';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private tokenService: TokenService,
    private logsService: LogsService,
  ) {}

  private buildIdentity(user: {
    id: string;
    username: string;
    role: UserRole;
    status: UserStatus;
    profile: { fullName: string } | null;
    emails: Array<{ email: string; isPrimary: boolean; isVerified: boolean }>;
  }) {
    const primaryEmail =
      user.emails.find((email) => email.isPrimary) ?? user.emails[0];

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

  async validateUser(email: string, password: string) {
    const userEmail = await this.prisma.userEmail.findUnique({
      where: { email },
      include: {
        user: {
          include: {
            profile: true,
            emails: {
              select: { email: true, isPrimary: true, isVerified: true },
            },
          },
        },
      },
    });

    if (!userEmail?.user) {
      void this.logsService.warn(
        'auth',
        'LoginFailedUserNotFound',
        { email },
      );
      return null;
    }

    const user = userEmail.user;
    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: { increment: 1 } },
      });
      void this.logsService.warn(
        'auth',
        'LoginFailedInvalidPassword',
        { email },
        user.id,
      );
      return null;
    }

    if (!user.isActive || user.status !== UserStatus.ACTIVE) {
      void this.logsService.warn(
        'auth',
        'LoginFailedInactiveUser',
        { email, status: user.status, isActive: user.isActive },
        user.id,
      );
      throw new UnauthorizedException('User not found or inactive');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    void this.logsService.info(
      'auth',
      'LoginSucceeded',
      { email },
      user.id,
    );
    return this.buildIdentity(user);
  }

  async register(dto: RegisterDto) {
    const [existingUsername, existingEmail] = await Promise.all([
      this.prisma.user.findUnique({
        where: { username: dto.username },
        select: { id: true },
      }),
      this.prisma.userEmail.findUnique({
        where: { email: dto.email },
        select: { id: true },
      }),
    ]);

    if (existingUsername) {
      throw new ConflictException('Username already registered');
    }

    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const emailToken = await this.generateConfirmationCode();

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash: hashedPassword,
        isActive: false,
        status: UserStatus.PENDING,
        profile: {
          create: {
            fullName: dto.fullName,
            document: dto.document,
          },
        },
        emails: {
          create: {
            email: dto.email,
            isPrimary: true,
            isVerified: false,
            token: emailToken,
          },
        },
        phones: dto.phone
          ? {
              create: {
                phoneNumber: dto.phone,
                isPrimary: true,
              },
            }
          : undefined,
      },
      include: {
        profile: true,
        emails: {
          select: { email: true, isPrimary: true, isVerified: true },
        },
      },
    });

    const primaryEmail = user.emails.find((email) => email.isPrimary) ?? user.emails[0];

    this.eventEmitter.emit(EventTypes.USER_REGISTERED, {
      userId: user.id,
      email: primaryEmail?.email,
      name: user.profile?.fullName,
      requiresEmailConfirmation: true,
      confirmationCode: emailToken,
      timestamp: new Date(),
      triggeredBy: 'system',
    });

    return {
      user: this.buildIdentity(user),
      requiresEmailConfirmation: true,
      confirmationToken: emailToken,
    };
  }

  async login(user: any) {
    return this.generateTokens(user);
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email ?? '', role: user.role };
    const { accessToken, refreshToken } =
      await this.tokenService.generateTokens(payload);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

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
        throw new UnauthorizedException();
      }

      return this.generateTokens(this.buildIdentity(user));
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateGoogleLogin(profile: {
    email?: string;
    name: string;
    googleId: string;
  }) {
    if (!profile.email) {
      throw new UnauthorizedException('Google account without email');
    }

    const existingEmail = await this.prisma.userEmail.findUnique({
      where: { email: profile.email },
      include: {
        user: {
          include: {
            profile: true,
            emails: {
              select: { email: true, isPrimary: true, isVerified: true },
            },
          },
        },
      },
    });

    if (existingEmail?.user) {
      return this.generateTokens(this.buildIdentity(existingEmail.user));
    }

    const username = profile.email.split('@')[0] + randomBytes(3).toString('hex');
    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
        isActive: true,
        status: UserStatus.ACTIVE,
        profile: {
          create: {
            fullName: profile.name,
          },
        },
        emails: {
          create: {
            email: profile.email,
            isPrimary: true,
            isVerified: true,
          },
        },
      },
      include: {
        profile: true,
        emails: {
          select: { email: true, isPrimary: true, isVerified: true },
        },
      },
    });

    return this.generateTokens(this.buildIdentity(user));
  }

  async confirmEmail(token: string) {
    const email = await this.prisma.userEmail.findFirst({
      where: { token },
      include: {
        user: {
          include: {
            profile: true,
            emails: {
              select: { email: true, isPrimary: true, isVerified: true },
            },
          },
        },
      },
    });

    if (!email?.user) {
      void this.logsService.warn(
        'auth',
        'EmailConfirmationFailedInvalidToken',
        { token },
      );
      throw new UnauthorizedException('Invalid confirmation token');
    }

    await this.prisma.$transaction([
      this.prisma.userEmail.update({
        where: { id: email.id },
        data: { isVerified: true, token: null },
      }),
      this.prisma.user.update({
        where: { id: email.userId },
        data: { isActive: true, status: UserStatus.ACTIVE },
      }),
    ]);

    const refreshedUser = await this.prisma.user.findUnique({
      where: { id: email.userId },
      include: {
        profile: true,
        emails: {
          select: { email: true, isPrimary: true, isVerified: true },
        },
      },
    });

    if (!refreshedUser) {
      throw new NotFoundException('User not found');
    }

    const primaryEmail =
      refreshedUser.emails.find((item) => item.isPrimary) ?? refreshedUser.emails[0];
    this.eventEmitter.emit(EventTypes.USER_ACTIVATED, {
      userId: refreshedUser.id,
      email: primaryEmail?.email ?? '',
      name: refreshedUser.profile?.fullName ?? refreshedUser.username,
      timestamp: new Date(),
      triggeredBy: 'system',
    });
    void this.logsService.info(
      'auth',
      'EmailConfirmed',
      { email: primaryEmail?.email },
      refreshedUser.id,
    );

    return this.generateTokens(this.buildIdentity(refreshedUser));
  }

  async forgotPassword(email: string) {
    const userEmail = await this.prisma.userEmail.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!userEmail) {
      return { success: true };
    }

    const token = randomBytes(32).toString('hex');
    await this.prisma.userEmail.update({
      where: { id: userEmail.id },
      data: { token },
    });

    return {
      success: true,
      resetToken: token,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const userEmail = await this.prisma.userEmail.findFirst({
      where: { token },
      select: { id: true, userId: true },
    });

    if (!userEmail) {
      throw new UnauthorizedException('Invalid recovery token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userEmail.userId },
        data: {
          passwordHash,
          failedAttempts: 0,
        },
      }),
      this.prisma.userEmail.update({
        where: { id: userEmail.id },
        data: { token: null },
      }),
    ]);

    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        emails: {
          orderBy: { isPrimary: 'desc' },
          select: {
            email: true,
            isPrimary: true,
            isVerified: true,
          },
        },
        phones: {
          orderBy: { isPrimary: 'desc' },
          select: {
            phoneNumber: true,
            isPrimary: true,
            isVerified: true,
            verifiedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      status: user.status,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
      profile: user.profile,
      emails: user.emails,
      phones: user.phones,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = user.profile
      ? await this.prisma.userProfile.update({
          where: { userId },
          data: {
            fullName: dto.fullName ?? user.profile.fullName,
            document: dto.document ?? user.profile.document,
            birthDate: dto.birthDate ? new Date(dto.birthDate) : user.profile.birthDate,
          },
        })
      : await this.prisma.userProfile.create({
          data: {
            userId,
            fullName: dto.fullName ?? user.username,
            document: dto.document,
            birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          },
        });

    return profile;
  }

  private async generateConfirmationCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
      const existing = await this.prisma.userEmail.findFirst({
        where: {
          token: code,
          isVerified: false,
        },
        select: { id: true },
      });
      if (!existing) {
        return code;
      }
    }
    throw new ConflictException('Unable to generate confirmation code');
  }
}
