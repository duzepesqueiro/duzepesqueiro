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
        const useJsonTransport = !mailHost || !mailUser || !mailPassword;
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

        if (useJsonTransport) {
          logger.warn(
            'SMTP incompleto. E-mails serão simulados com jsonTransport e não serão entregues.',
          );
        }

        return {
          transport: useJsonTransport
            ? { jsonTransport: true }
            : {
                host: mailHost,
                port: mailPort,
                secure: false,
                auth: {
                  user: mailUser,
                  pass: mailPassword,
                },
              },
          defaults: {
            from: config.get('MAIL_FROM') || '"DuZePesqueiro" <no-reply@duzepesqueiro.local>',
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
