import {
  BadRequestException,
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Req,
  Patch,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ConfirmEmailDto } from '../dto/confirm-email.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { VerifyPasswordResetCodeDto } from '../dto/verify-password-reset-code.dto';

@ApiTags('Auth')
@Controller(['auth', 'api/auth'])
export class AuthController {
  constructor(private authService: AuthService) {}

  private getCookie(req: Request, name: string): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    const parts = header.split(';').map((item) => item.trim());
    const prefix = `${name}=`;
    const found = parts.find((item) => item.startsWith(prefix));
    if (!found) return undefined;
    return decodeURIComponent(found.slice(prefix.length));
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSite = (() => {
      const raw = (process.env.REFRESH_COOKIE_SAMESITE ?? '').trim().toLowerCase();
      if (raw === 'lax' || raw === 'strict' || raw === 'none') return raw;
      return 'lax';
    })();
    const secure = (() => {
      const raw = (process.env.REFRESH_COOKIE_SECURE ?? '').trim().toLowerCase();
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return isProduction;
    })();
    const domain = (process.env.REFRESH_COOKIE_DOMAIN ?? '').trim() || undefined;
    const path = (process.env.REFRESH_COOKIE_PATH ?? '').trim() || '/';

    const expires = (() => {
      try {
        const parts = refreshToken.split('.');
        if (parts.length < 2) return undefined;
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
        const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
        const exp = typeof decoded?.exp === 'number' ? decoded.exp : null;
        return exp ? new Date(exp * 1000) : undefined;
      } catch {
        return undefined;
      }
    })();
    res.cookie('duze_refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path,
      expires,
    });
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() dto: RegisterDto) {
    const normalized = {
      username:
        dto.username ||
        dto.email
          ?.split('@')[0]
          ?.toLowerCase()
          ?.replace(/[^a-z0-9._-]/g, ''),
      email: dto.email?.trim().toLowerCase(),
      password: dto.password || dto.senha,
      fullName: dto.fullName || dto.nome,
      phone: dto.phone || dto.telefone,
      document: dto.document,
    };
    if (!normalized.email || !normalized.password || !normalized.fullName) {
      throw new BadRequestException('Email, nome e senha são obrigatórios');
    }
    if (!normalized.username || normalized.username.length < 3) {
      normalized.username = `user${Date.now()}`;
    }
    const response = await this.authService.register(normalized as RegisterDto);
    return {
      ...response,
      id: response.user.id,
      nome: response.user.fullName,
      email: response.user.email,
      telefone: normalized.phone ?? '',
      dataNascimento: dto.dataNascimento ?? null,
      createdAt: new Date().toISOString(),
      ultimoLogin: null,
    };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  async login(
    @Body() _dto: LoginDto,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.login(user);
    if (session?.refreshToken) {
      this.setRefreshCookie(res, session.refreshToken);
    }
    return session;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = dto.refreshToken || this.getCookie(req, 'duze_refresh_token') || '';
    const session = await this.authService.refreshTokens(refreshToken);
    if (session?.refreshToken) {
      this.setRefreshCookie(res, session.refreshToken);
    }
    return session;
  }

  @Public()
  @Post('confirm-email')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm email account' })
  async confirmEmail(
    @Body() dto: ConfirmEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.confirmEmail(dto.token);
    if ((session as any)?.refreshToken) {
      this.setRefreshCookie(res, (session as any).refreshToken);
    }
    return session;
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset code by email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const email = (dto.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('E-mail inválido');
    }
    return this.authService.forgotPassword(email);
  }

  @Public()
  @Post('verify-password-reset-code')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate password reset code' })
  async verifyPasswordResetCode(@Body() dto: VerifyPasswordResetCodeDto) {
    const email = (dto.email || '').trim().toLowerCase();
    const code = (dto.code || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('E-mail inválido');
    }
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Código inválido');
    }
    return this.authService.verifyPasswordResetCode(email, code);
  }

  @Public()
  @Post('resend-confirmation')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email confirmation code' })
  async resendConfirmation(@Body() dto: ForgotPasswordDto) {
    const email = (dto.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('E-mail inválido');
    }
    return this.authService.resendConfirmation(email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with verified reset session token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.resetSessionToken,
      dto.newPassword,
      dto.confirmPassword,
    );
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  @ApiOperation({ summary: 'Google OAuth login' })
  async googleAuth() {
    return;
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req: Request & { user: any }, @Res() res: Response) {
    try {
      const authData = await this.authService.validateGoogleLogin(req.user);
      const role = authData?.user?.role;
      if (role !== 'CUSTOMER') {
        return res
          .status(HttpStatus.OK)
          .type('html')
          .send(this.renderGoogleCallbackHtml({
            error: 'Login com Google é permitido apenas para usuário comum.',
          }));
      }
      if (authData?.refreshToken) {
        this.setRefreshCookie(res, authData.refreshToken);
      }
      return res
        .status(HttpStatus.OK)
        .type('html')
        .send(this.renderGoogleCallbackHtml({
          accessToken: authData.accessToken,
          role,
          email: authData?.user?.email || '',
        }));
    } catch {
      return res
        .status(HttpStatus.OK)
        .type('html')
        .send(this.renderGoogleCallbackHtml({
          error: 'Falha na autenticação com Google.',
        }));
    }
  }

  private renderGoogleCallbackHtml(payload: {
    accessToken?: string;
    refreshToken?: string;
    role?: string;
    email?: string;
    error?: string;
  }): string {
    const serializedPayload = JSON.stringify(payload).replace(/</g, '\\u003c');
    return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Autenticação Google</title>
  </head>
  <body>
    <script>
      (function () {
        var payload = ${serializedPayload};
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              Object.assign({ type: 'DUZE_AUTH_GOOGLE' }, payload),
              window.location.origin
            );
          }
        } catch (e) {}
        window.close();
      })();
    </script>
  </body>
</html>`;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const domain = (process.env.REFRESH_COOKIE_DOMAIN ?? '').trim() || undefined;
    const path = (process.env.REFRESH_COOKIE_PATH ?? '').trim() || '/';
    res.clearCookie('duze_refresh_token', { path, domain });
    return this.authService.logout(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user' })
  async me(@CurrentUser() user: any) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  async profile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin-check')
  @ApiOperation({ summary: 'Role guard check' })
  async adminCheck() {
    return { ok: true };
  }
}
