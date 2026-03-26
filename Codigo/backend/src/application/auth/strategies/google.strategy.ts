import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    const clientID =
      configService.get<string>('GOOGLE_CLIENT_ID') || 'google-client-id';
    const clientSecret =
      configService.get<string>('GOOGLE_CLIENT_SECRET') || 'google-client-secret';
    const callbackURL =
      configService.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:3000/auth/google/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['profile', 'email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: unknown, user?: any) => void,
  ) {
    const { id, emails, displayName } = profile;
    done(null, {
      googleId: id,
      email: emails?.[0]?.value,
      name: displayName,
    });
  }
}
