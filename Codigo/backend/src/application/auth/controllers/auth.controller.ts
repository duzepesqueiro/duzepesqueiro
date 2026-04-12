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
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
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

@ApiTags('Auth')
@Controller(['auth', 'api/auth'])
export class AuthController {
  constructor(private authService: AuthService) {}

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
  async login(@Body() _dto: LoginDto, @CurrentUser() user: any) {
    return this.authService.login(user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Public()
  @Post('confirm-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm email account' })
  async confirmEmail(@Body() dto: ConfirmEmailDto) {
    return this.authService.confirmEmail(dto.token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create password reset token' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Query('email') emailQuery?: string,
  ) {
    const email = (dto.email || emailQuery || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('E-mail inválido');
    }
    return this.authService.forgotPassword(email);
  }

  @Public()
  @Post('resend-confirmation')
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
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
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
  async googleAuthCallback(@Req() req: Request & { user: any }, @Res() res: any) {
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
      return res
        .status(HttpStatus.OK)
        .type('html')
        .send(this.renderGoogleCallbackHtml({
          accessToken: authData.accessToken,
          refreshToken: authData.refreshToken,
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
  async logout() {
    return { message: 'Logged out successfully' };
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
