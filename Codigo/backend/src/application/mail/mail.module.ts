import { Logger, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { join } from 'path';
import { MailService } from './services/mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('MailModule');
        const mailHost = config.get<string>('MAIL_HOST');
        const mailPort = Number.parseInt(config.get<string>('MAIL_PORT') ?? '587', 10);
        const mailUser = config.get<string>('MAIL_USER') || config.get<string>('MAIL_USERNAME');
        const mailPassword = config.get<string>('MAIL_PASSWORD');
        const mailFrom = config.get<string>('MAIL_FROM');
        const srcTemplatesDir = join(process.cwd(), 'src', 'application', 'mail', 'templates');
        const distTemplatesDir = join(
          process.cwd(),
          'dist',
          'application',
          'mail',
          'templates',
        );
        const templateDir = existsSync(distTemplatesDir)
          ? distTemplatesDir
          : srcTemplatesDir;

        const missingConfig: string[] = [];
        if (!mailHost) missingConfig.push('MAIL_HOST');
        if (!Number.isFinite(mailPort) || mailPort <= 0) missingConfig.push('MAIL_PORT');
        if (!mailUser) missingConfig.push('MAIL_USER/MAIL_USERNAME');
        if (!mailPassword) missingConfig.push('MAIL_PASSWORD');
        if (!mailFrom) missingConfig.push('MAIL_FROM');

        if (missingConfig.length > 0) {
          const message = `Configuração SMTP inválida. Variáveis ausentes/inválidas: ${missingConfig.join(', ')}`;
          logger.error(message);
          throw new Error(message);
        }

        return {
          transport: {
            host: mailHost,
            port: mailPort,
            secure: false,
            auth: {
              user: mailUser,
              pass: mailPassword,
            },
          },
          defaults: {
            from: mailFrom,
          },
          template: {
            dir: templateDir,
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
