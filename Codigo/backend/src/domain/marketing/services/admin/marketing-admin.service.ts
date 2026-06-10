import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { LogsService } from '../../../../application/logs/services';
import { MailService } from '../../../../application/mail/services/mail.service';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

type RecipientMode = 'all' | 'selected';

@Injectable()
export class MarketingAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly logsService: LogsService,
  ) {}

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private applyTemplate(template: string, vars: Record<string, string>) {
    let out = template;
    Object.entries(vars).forEach(([key, rawValue]) => {
      const value = this.escapeHtml(rawValue);
      const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      out = out.replace(re, value);
    });
    return out;
  }

  private buildUserSearchWhere(search?: string): Prisma.UserWhereInput {
    const term = search?.trim();
    if (!term) return {};
    return {
      OR: [
        { username: { contains: term, mode: 'insensitive' } },
        { profile: { fullName: { contains: term, mode: 'insensitive' } } },
        { emails: { some: { email: { contains: term, mode: 'insensitive' } } } },
      ],
    };
  }

  async listRecipients(params: { page?: number; pageSize?: number; search?: string }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    if (pageSize > 100) {
      throw new BadRequestException('pageSize máximo é 100');
    }

    const where: Prisma.UserWhereInput = {
      ...this.buildUserSearchWhere(params.search),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          profile: true,
          emails: {
            where: { isPrimary: true },
            take: 1,
            select: { email: true, isVerified: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((user) => ({
        id: user.id,
        username: user.username,
        nome: user.profile?.fullName ?? user.username,
        email: user.emails[0]?.email ?? '',
        emailConfirmado: user.emails[0]?.isVerified ?? false,
        ativo: user.isActive && user.status === UserStatus.ACTIVE,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async sendCampaign(payload: {
    subject: string;
    html: string;
    mode: RecipientMode;
    userIds?: string[];
    triggeredBy: { id: string; role: UserRole };
  }) {
    const subject = String(payload.subject || '').trim();
    const html = String(payload.html || '').trim();
    if (!subject) {
      throw new BadRequestException('Assunto é obrigatório');
    }
    if (!html) {
      throw new BadRequestException('Conteúdo do e-mail é obrigatório');
    }

    const where: Prisma.UserWhereInput =
      payload.mode === 'selected'
        ? {
            id: { in: Array.isArray(payload.userIds) ? payload.userIds : [] },
          }
        : {};

    if (payload.mode === 'selected' && !Array.isArray(payload.userIds)) {
      throw new BadRequestException('Lista de usuários é obrigatória');
    }

    const recipients = await this.prisma.user.findMany({
      where,
      include: {
        profile: true,
        emails: {
          where: { isPrimary: true },
          take: 1,
          select: { email: true, isVerified: true },
        },
      },
    });

    const toSend = recipients
      .map((user) => {
        const email = user.emails[0]?.email;
        if (!email) return null;
        const fullName = user.profile?.fullName ?? '';
        const firstName = fullName.trim().split(/\s+/)[0] || user.username;
        return {
          id: user.id,
          username: user.username,
          email,
          firstName,
        };
      })
      .filter(Boolean) as Array<{ id: string; username: string; email: string; firstName: string }>;

    let sent = 0;
    let failed = 0;

    for (const user of toSend) {
      const content = this.applyTemplate(html, {
        username: user.username,
        email: user.email,
        firstName: user.firstName,
      });

      const ok = await this.mailService.sendMarketingCampaignEmail({
        to: user.email,
        subject,
        content,
        metadata: {
          userId: user.id,
          triggeredBy: payload.triggeredBy.id,
        },
      });

      if (ok) {
        sent += 1;
      } else {
        failed += 1;
      }
    }

    await this.logsService.info('mail', 'MarketingCampaignDispatched', {
      subject,
      mode: payload.mode,
      requestedCount: toSend.length,
      sent,
      failed,
      triggeredBy: payload.triggeredBy.id,
    });

    return { sent, failed, requested: toSend.length };
  }
}

