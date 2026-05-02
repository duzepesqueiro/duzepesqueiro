import {
  BadRequestException,
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
import { createHash, randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RegisterDto } from '../dto/register.dto';
import { EventTypes } from '../../../shared/events/event-types';
import { TokenService } from './token.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { LogsService } from '../../logs/services';
import { MailService } from '../../mail/services/mail.service';

@Injectable()
export class AuthService {
  private static readonly PASSWORD_RESET_CODE_PREFIX = 'PWDRESET';
  private static readonly PASSWORD_RESET_SESSION_PREFIX = 'PWDSESSION';
  private static readonly PASSWORD_RESET_CODE_EXPIRY_MINUTES = 10;
  private static readonly PASSWORD_RESET_SESSION_EXPIRY_MINUTES = 10;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private tokenService: TokenService,
    private logsService: LogsService,
    private mailService: MailService,
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
    const username = dto.username?.trim();
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;
    const fullName = dto.fullName?.trim();

    if (!username || !email || !password || !fullName) {
      throw new ConflictException('Missing required registration fields');
    }

    const [existingUsername, existingEmail] = await Promise.all([
      this.prisma.user.findUnique({
        where: { username },
        select: { id: true },
      }),
      this.prisma.userEmail.findUnique({
        where: { email },
        select: { id: true },
      }),
    ]);

    if (existingUsername) {
      throw new ConflictException('Username already registered');
    }

    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailToken = await this.generateConfirmationCode();

    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash: hashedPassword,
        isActive: false,
        status: UserStatus.PENDING,
        profile: {
          create: {
            fullName,
            document: dto.document,
          },
        },
        emails: {
          create: {
            email,
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

    const primaryEmail =
      user.emails.find((item: { isPrimary: boolean }) => item.isPrimary) ??
      user.emails[0];

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

  async validateToken(token: string): Promise<{
    id: string;
    email?: string;
    role: UserRole;
    roles: UserRole[];
  }> {
    const secret = this.configService.get<string>('jwt.secret');
    if (!secret) {
      throw new UnauthorizedException('JWT secret is not configured');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const userId = payload?.sub as string | undefined;
    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        emails: {
          select: { email: true, isPrimary: true },
        },
      },
    });

    if (!user || !user.isActive || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const email = user.emails.find((item) => item.isPrimary)?.email ?? user.emails[0]?.email;
    return {
      id: user.id,
      email,
      role: user.role,
      roles: [user.role],
    };
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
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (
      !userEmail?.user ||
      !userEmail.isVerified ||
      !userEmail.user.isActive ||
      userEmail.user.status !== UserStatus.ACTIVE
    ) {
      return { success: true };
    }

    const code = this.generatePasswordResetCode();
    const expiresAt = new Date(
      Date.now() +
        AuthService.PASSWORD_RESET_CODE_EXPIRY_MINUTES * 60 * 1000,
    );
    const token = this.buildPasswordResetCodeToken(code, expiresAt);
    await this.prisma.userEmail.update({
      where: { id: userEmail.id },
      data: { token },
    });

    await this.mailService.sendPasswordResetCodeEmail(
      userEmail.email,
      userEmail.user.profile?.fullName ?? userEmail.user.username,
      code,
      AuthService.PASSWORD_RESET_CODE_EXPIRY_MINUTES,
    );

    return { success: true };
  }

  async resendConfirmation(email: string) {
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
      return { success: true };
    }

    if (userEmail.isVerified) {
      return { success: true };
    }

    const confirmationCode = await this.generateConfirmationCode();
    await this.prisma.userEmail.update({
      where: { id: userEmail.id },
      data: { token: confirmationCode },
    });

    const primaryEmail =
      userEmail.user.emails.find((item) => item.isPrimary) ?? userEmail.user.emails[0];

    this.eventEmitter.emit(EventTypes.USER_REGISTERED, {
      userId: userEmail.user.id,
      email: primaryEmail?.email ?? email,
      name: userEmail.user.profile?.fullName ?? userEmail.user.username,
      requiresEmailConfirmation: true,
      confirmationCode,
      timestamp: new Date(),
      triggeredBy: 'system',
    });

    return { success: true };
  }

  async verifyPasswordResetCode(email: string, code: string) {
    const userEmail = await this.prisma.userEmail.findUnique({
      where: { email },
      select: {
        id: true,
        userId: true,
        token: true,
        isVerified: true,
        user: {
          select: {
            id: true,
            isActive: true,
            status: true,
          },
        },
      },
    });
    if (
      !userEmail?.user ||
      !userEmail.isVerified ||
      !userEmail.user.isActive ||
      userEmail.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Código de recuperação inválido');
    }

    const tokenData = this.parsePasswordResetCodeToken(userEmail.token);
    if (
      !tokenData ||
      tokenData.expiresAt.getTime() < Date.now() ||
      tokenData.codeHash !== this.hashPasswordResetValue(code)
    ) {
      throw new UnauthorizedException('Código de recuperação inválido');
    }

    const sessionId = randomBytes(24).toString('hex');
    const sessionExpiresAt = new Date(
      Date.now() +
        AuthService.PASSWORD_RESET_SESSION_EXPIRY_MINUTES * 60 * 1000,
    );
    await this.prisma.userEmail.update({
      where: { id: userEmail.id },
      data: {
        token: this.buildPasswordResetSessionToken(sessionId, sessionExpiresAt),
      },
    });

    const resetSessionToken = await this.jwtService.signAsync(
      {
        sub: userEmail.userId,
        emailId: userEmail.id,
        sid: sessionId,
        purpose: 'PASSWORD_RESET',
      },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: `${AuthService.PASSWORD_RESET_SESSION_EXPIRY_MINUTES}m`,
      },
    );

    return { success: true, resetSessionToken };
  }

  async resetPassword(
    resetSessionToken: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('As senhas informadas não coincidem');
    }

    const secret = this.configService.get<string>('jwt.secret');
    if (!secret) {
      throw new UnauthorizedException('JWT secret is not configured');
    }

    let payload: {
      sub: string;
      emailId: string;
      sid: string;
      purpose: string;
    };
    try {
      payload = await this.jwtService.verifyAsync(resetSessionToken, { secret });
    } catch {
      throw new UnauthorizedException('Sessão de recuperação inválida');
    }

    if (!payload?.sub || !payload?.emailId || !payload?.sid || payload.purpose !== 'PASSWORD_RESET') {
      throw new UnauthorizedException('Sessão de recuperação inválida');
    }

    const userEmail = await this.prisma.userEmail.findUnique({
      where: { id: payload.emailId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!userEmail?.user || userEmail.userId !== payload.sub) {
      throw new UnauthorizedException('Sessão de recuperação inválida');
    }

    const sessionData = this.parsePasswordResetSessionToken(userEmail.token);
    if (
      !sessionData ||
      sessionData.expiresAt.getTime() < Date.now() ||
      sessionData.sessionHash !== this.hashPasswordResetValue(payload.sid)
    ) {
      throw new UnauthorizedException('Sessão de recuperação inválida');
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

    this.eventEmitter.emit(EventTypes.USER_PASSWORD_RESET, {
      userId: userEmail.userId,
      email: userEmail.email,
      timestamp: new Date(),
      triggeredBy: 'system',
    });

    await this.mailService.sendPasswordUpdatedEmail(
      userEmail.email,
      userEmail.user.profile?.fullName ?? userEmail.user.username,
    );

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

  private generatePasswordResetCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private hashPasswordResetValue(value: string): string {
    const secret = this.configService.get<string>('jwt.secret') ?? 'duze-reset-fallback';
    return createHash('sha256').update(`${value}:${secret}`).digest('hex');
  }

  private buildPasswordResetCodeToken(code: string, expiresAt: Date): string {
    return [
      AuthService.PASSWORD_RESET_CODE_PREFIX,
      expiresAt.getTime().toString(),
      this.hashPasswordResetValue(code),
    ].join(':');
  }

  private parsePasswordResetCodeToken(token?: string | null): {
    expiresAt: Date;
    codeHash: string;
  } | null {
    if (!token) {
      return null;
    }
    const [prefix, expiresAtRaw, codeHash] = token.split(':');
    if (prefix !== AuthService.PASSWORD_RESET_CODE_PREFIX || !expiresAtRaw || !codeHash) {
      return null;
    }
    const expiresAtMs = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAtMs)) {
      return null;
    }
    return { expiresAt: new Date(expiresAtMs), codeHash };
  }

  private buildPasswordResetSessionToken(sessionId: string, expiresAt: Date): string {
    return [
      AuthService.PASSWORD_RESET_SESSION_PREFIX,
      expiresAt.getTime().toString(),
      this.hashPasswordResetValue(sessionId),
    ].join(':');
  }

  private parsePasswordResetSessionToken(token?: string | null): {
    expiresAt: Date;
    sessionHash: string;
  } | null {
    if (!token) {
      return null;
    }
    const [prefix, expiresAtRaw, sessionHash] = token.split(':');
    if (
      prefix !== AuthService.PASSWORD_RESET_SESSION_PREFIX ||
      !expiresAtRaw ||
      !sessionHash
    ) {
      return null;
    }
    const expiresAtMs = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAtMs)) {
      return null;
    }
    return { expiresAt: new Date(expiresAtMs), sessionHash };
  }
}
