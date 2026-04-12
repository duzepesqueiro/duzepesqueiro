import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { LogsService } from '../../../application/logs/services';
import { MailService } from '../../../application/mail/services/mail.service';
import { NotificationsService } from '../../../application/notifications/services/notifications.service';
import { EventTypes } from '../../../shared/events';
import {
  CreateAdminUserDto,
  CreateUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from '../dto';
import { UsersRepository } from '../repositories';

type AuthIdentity = {
  id: string;
  email?: string;
  role: UserRole;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly logsService: LogsService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listUsers(query: ListUsersQueryDto) {
    const where = this.buildWhere(query);
    const users = await this.usersRepository.findMany(where);
    const mapped = users.map((user) => this.toAdminUser(user));

    if (query.page && query.pageSize) {
      const start = (query.page - 1) * query.pageSize;
      return mapped.slice(start, start + query.pageSize);
    }

    return mapped;
  }

  async getUserProfileByEmailOrIdentity(identity: AuthIdentity, email?: string) {
    const normalized = email?.trim().toLowerCase();
    const sameIdentityEmail =
      !normalized ||
      normalized === identity.email?.trim().toLowerCase() ||
      identity.role === UserRole.ADMIN ||
      identity.role === UserRole.MANAGER ||
      identity.role === UserRole.EMPLOYEE;

    if (!sameIdentityEmail) {
      throw new ForbiddenException('Acesso negado para consultar este usuário');
    }

    if (normalized) {
      const userEmail = await this.usersRepository.findByEmail(normalized);
      if (!userEmail?.user) {
        throw new NotFoundException('Usuário não encontrado');
      }
      return this.toAdminUser(userEmail.user);
    }

    const user = await this.usersRepository.findById(identity.id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.toAdminUser(user);
  }

  async createRegularUser(payload: CreateUserDto, createdBy: AuthIdentity) {
    const prepared = this.normalizeCreatePayload(payload, false);
    const user = await this.createUser(prepared, createdBy);
    return this.toAdminUser(user);
  }

  async createAdminUser(payload: CreateAdminUserDto, createdBy: AuthIdentity) {
    if (createdBy.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Somente administrador pode cadastrar outro admin');
    }
    const prepared = this.normalizeCreatePayload(payload, true);
    const user = await this.createUser(prepared, createdBy);
    return this.toAdminUser(user);
  }

  async updateUser(id: string, payload: UpdateUserDto, updatedBy: AuthIdentity) {
    const current = await this.usersRepository.findById(id);
    if (!current) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const shouldBeAdmin = Boolean(payload.isAdmin ?? payload.admin ?? current.role === UserRole.ADMIN);
    if (shouldBeAdmin && updatedBy.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Somente administrador pode atribuir papel de admin');
    }

    if (current.role === UserRole.ADMIN && updatedBy.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Somente administrador pode editar outro admin');
    }

    const wasActive = current.isActive && current.status === UserStatus.ACTIVE;
    const nextActive =
      payload.ativo !== undefined ? Boolean(payload.ativo) : current.isActive;
    const nextStatus = nextActive ? UserStatus.ACTIVE : UserStatus.BLOCKED;

    const updated = await this.usersRepository.updateUser(id, {
      role: shouldBeAdmin ? UserRole.ADMIN : current.role === UserRole.ADMIN ? UserRole.CUSTOMER : current.role,
      isActive: nextActive,
      status: nextStatus,
      lastLoginAt:
        payload.ultimoLogin !== undefined
          ? this.parseDate(payload.ultimoLogin)
          : undefined,
    });

    if (!updated) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const isActiveNow = updated.isActive && updated.status === UserStatus.ACTIVE;
    const primaryEmail = updated.emails[0]?.email ?? '';
    const name = updated.profile?.fullName ?? updated.username;

    if (wasActive && !isActiveNow) {
      this.eventEmitter.emit(EventTypes.USER_DEACTIVATED, {
        userId: updated.id,
        email: primaryEmail,
        name,
        timestamp: new Date(),
        triggeredBy: updatedBy.id,
      });
    }

    if (!wasActive && isActiveNow) {
      this.eventEmitter.emit(EventTypes.USER_ACTIVATED, {
        userId: updated.id,
        email: primaryEmail,
        name,
        timestamp: new Date(),
        triggeredBy: updatedBy.id,
      });
    }

    await this.logsService.info(
      'auth',
      'UserUpdatedByAdmin',
      {
        userId: id,
        email: primaryEmail,
        role: updated.role,
        isActive: updated.isActive,
      },
      id,
    );

    this.notificationsService.sendToAdmins('users:updated', {
      userId: updated.id,
      name,
      email: primaryEmail,
      updatedBy: updatedBy.id,
      role: updated.role,
      active: isActiveNow,
    });

    return this.toAdminUser(updated);
  }

  async deleteUser(id: string, deletedBy: AuthIdentity) {
    if (deletedBy.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Somente administrador pode excluir usuário');
    }
    if (deletedBy.id === id) {
      throw new ForbiddenException('Não é permitido excluir o próprio usuário');
    }

    const existing = await this.usersRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.usersRepository.deleteById(id);

    await this.logsService.warn(
      'auth',
      'UserDeletedByAdmin',
      {
        userId: id,
        email: existing.emails[0]?.email ?? null,
      },
      id,
    );

    this.notificationsService.sendToAdmins('users:deleted', {
      userId: id,
      deletedBy: deletedBy.id,
      email: existing.emails[0]?.email ?? null,
    });

    return { success: true };
  }

  async getKpis(periodoDias = 30) {
    const now = new Date();
    const periodDays = Number.isFinite(periodoDias) ? Math.max(1, periodoDias) : 30;

    const startCurrentPeriod = this.addDays(now, -periodDays);
    const startPreviousPeriod = this.addDays(startCurrentPeriod, -periodDays);

    const startCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalUsuarios,
      usuariosAtivosPeriodo,
      usuariosAtivosPeriodoAnterior,
      novosUsuariosMesAtual,
      novosUsuariosMesAnterior,
    ] = await Promise.all([
      this.usersRepository.countUsers(),
      this.usersRepository.countUsers({
        isActive: true,
        status: UserStatus.ACTIVE,
        lastLoginAt: {
          gte: startCurrentPeriod,
          lt: now,
        },
      }),
      this.usersRepository.countUsers({
        isActive: true,
        status: UserStatus.ACTIVE,
        lastLoginAt: {
          gte: startPreviousPeriod,
          lt: startCurrentPeriod,
        },
      }),
      this.usersRepository.countUsers({
        createdAt: {
          gte: startCurrentMonth,
          lt: startNextMonth,
        },
      }),
      this.usersRepository.countUsers({
        createdAt: {
          gte: startPreviousMonth,
          lt: startCurrentMonth,
        },
      }),
    ]);

    const crescimentoPercentualMes = this.calculatePercentageVariation(
      novosUsuariosMesAtual,
      novosUsuariosMesAnterior,
    );
    const variacaoAtivosPercentual = this.calculatePercentageVariation(
      usuariosAtivosPeriodo,
      usuariosAtivosPeriodoAnterior,
    );

    return {
      totalUsuarios,
      usuariosAtivosPeriodo,
      novosUsuariosMesAtual,
      novosUsuariosMesAnterior,
      crescimentoPercentualMes,
      variacaoAtivosPercentual,
    };
  }

  async getNewUsersChart(period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    if (period === 'week') {
      const start = this.startOfWeek(now);
      const end = this.addDays(start, 7);
      const users = await this.usersRepository.findCreatedBetween(start, end);
      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const buckets = Array.from({ length: 7 }, (_, index) => {
        const date = this.addDays(start, index);
        return {
          date,
          period: weekdays[date.getDay()],
          newUsers: 0,
        };
      });

      users.forEach((item) => {
        buckets.forEach((bucket) => {
          if (
            item.createdAt.getFullYear() === bucket.date.getFullYear() &&
            item.createdAt.getMonth() === bucket.date.getMonth() &&
            item.createdAt.getDate() === bucket.date.getDate()
          ) {
            bucket.newUsers += 1;
          }
        });
      });

      const avg = buckets.length
        ? Math.round(buckets.reduce((sum, bucket) => sum + bucket.newUsers, 0) / buckets.length)
        : 0;
      return buckets.map((bucket) => ({ period: bucket.period, newUsers: bucket.newUsers, avg }));
    }

    if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const users = await this.usersRepository.findCreatedBetween(start, end);
      const daysInMonth = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const weeksCount = Math.ceil(daysInMonth / 7);
      const buckets = Array.from({ length: weeksCount }, (_, index) => ({
        period: `Sem ${index + 1}`,
        newUsers: 0,
      }));

      users.forEach((item) => {
        const weekIndex = Math.min(
          buckets.length - 1,
          Math.floor((item.createdAt.getDate() - 1) / 7),
        );
        buckets[weekIndex].newUsers += 1;
      });

      const avg = buckets.length
        ? Math.round(buckets.reduce((sum, bucket) => sum + bucket.newUsers, 0) / buckets.length)
        : 0;
      return buckets.map((bucket) => ({ ...bucket, avg }));
    }

    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    const users = await this.usersRepository.findCreatedBetween(start, end);
    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const buckets = Array.from({ length: 12 }, (_, index) => ({
      period: labels[index],
      month: index,
      newUsers: 0,
    }));

    users.forEach((item) => {
      buckets[item.createdAt.getMonth()].newUsers += 1;
    });

    const avg = buckets.length
      ? Math.round(buckets.reduce((sum, bucket) => sum + bucket.newUsers, 0) / buckets.length)
      : 0;
    return buckets.map((bucket) => ({ period: bucket.period, newUsers: bucket.newUsers, avg }));
  }

  async getSummary() {
    const users = await this.usersRepository.findMany({});
    const total = users.length;
    const ativos = users.filter(
      (user) => user.isActive && user.status === UserStatus.ACTIVE,
    ).length;
    const inativos = total - ativos;
    const admins = users.filter((user) => user.role === UserRole.ADMIN).length;
    const pctAtivo = total > 0 ? Math.round((ativos / total) * 100) : 0;
    const pctInativo = total > 0 ? Math.round((inativos / total) * 100) : 0;
    const pctAdmin = total > 0 ? Math.round((admins / total) * 100) : 0;

    return { total, ativos, inativos, admins, pctAtivo, pctInativo, pctAdmin };
  }

  private async createUser(
    payload: {
      email: string;
      nome: string;
      telefone?: string;
      dataNascimento?: Date | null;
      createdAt?: Date;
      ultimoLogin?: Date | null;
      ativo: boolean;
      emailConfirmado: boolean;
      isAdmin: boolean;
      senha?: string;
    },
    actor: AuthIdentity,
  ) {
    const existing = await this.usersRepository.findByEmail(payload.email);
    if (existing?.user) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const username = await this.generateUsername(payload.email);
    const passwordValue = payload.senha && payload.senha.trim() ? payload.senha.trim() : randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(passwordValue, 10);
    const confirmationCode = randomBytes(3).toString('hex');

    const user = await this.usersRepository.createUser({
      username,
      passwordHash,
      role: payload.isAdmin ? UserRole.ADMIN : UserRole.CUSTOMER,
      isActive: payload.ativo,
      status: payload.ativo ? UserStatus.ACTIVE : UserStatus.BLOCKED,
      fullName: payload.nome,
      birthDate: payload.dataNascimento ?? null,
      email: payload.email,
      emailVerified: payload.emailConfirmado,
      emailToken: payload.emailConfirmado ? null : confirmationCode,
      phone: payload.telefone ?? null,
      createdAt: payload.createdAt,
      lastLoginAt: payload.ultimoLogin ?? null,
    });

    const primaryEmail = user.emails[0]?.email ?? payload.email;
    const name = user.profile?.fullName ?? payload.nome;

    this.eventEmitter.emit(EventTypes.USER_REGISTERED, {
      userId: user.id,
      email: primaryEmail,
      name,
      requiresEmailConfirmation: !payload.emailConfirmado,
      confirmationCode,
      timestamp: new Date(),
      triggeredBy: actor.id,
    });

    if (payload.emailConfirmado || payload.ativo) {
      this.eventEmitter.emit(EventTypes.USER_ACTIVATED, {
        userId: user.id,
        email: primaryEmail,
        name,
        timestamp: new Date(),
        triggeredBy: actor.id,
      });
    }

    if (!payload.emailConfirmado) {
      await this.mailService.sendWelcomeEmail(primaryEmail, name, confirmationCode);
    } else {
      await this.mailService.sendAccountVerifiedEmail(primaryEmail, name);
    }

    await this.logsService.info(
      'auth',
      'UserCreatedByManagement',
      {
        userId: user.id,
        role: user.role,
        isActive: user.isActive,
      },
      user.id,
    );

    this.notificationsService.sendToAdmins('users:created', {
      userId: user.id,
      email: primaryEmail,
      name,
      role: user.role,
      createdBy: actor.id,
    });

    return user;
  }

  private normalizeCreatePayload(payload: CreateAdminUserDto | CreateUserDto, asAdmin: boolean) {
    const email = payload.email?.trim().toLowerCase();
    const nome = payload.nome?.trim();
    if (!email || !nome) {
      throw new ConflictException('Nome e e-mail são obrigatórios');
    }

    return {
      email,
      nome,
      telefone: this.nullableString(payload.telefone) ?? undefined,
      dataNascimento: this.parseDate(payload.dataNascimento),
      createdAt: this.parseDate(payload.createdAt) ?? undefined,
      ultimoLogin: this.parseDate(payload.ultimoLogin),
      ativo: payload.ativo !== undefined ? Boolean(payload.ativo) : true,
      emailConfirmado: payload.emailConfirmado !== undefined ? Boolean(payload.emailConfirmado) : false,
      isAdmin: asAdmin,
      senha: payload.senha,
    };
  }

  private toAdminUser(user: {
    id: string;
    username: string;
    role: UserRole;
    isActive: boolean;
    status: UserStatus;
    createdAt: Date;
    lastLoginAt: Date | null;
    profile: { fullName: string; birthDate: Date | null } | null;
    emails: Array<{ email: string; isVerified: boolean }>;
    phones: Array<{ phoneNumber: string }>;
  }) {
    const primaryEmail = user.emails[0];
    const primaryPhone = user.phones[0];
    const isAdmin = user.role === UserRole.ADMIN;
    const ativo = user.isActive && user.status === UserStatus.ACTIVE;

    return {
      id: user.id,
      email: primaryEmail?.email ?? '',
      nome: user.profile?.fullName ?? user.username,
      telefone: primaryPhone?.phoneNumber ?? '',
      dataNascimento: user.profile?.birthDate
        ? user.profile.birthDate.toISOString().slice(0, 10)
        : null,
      createdAt: user.createdAt.toISOString(),
      isAdmin,
      admin: isAdmin,
      ativo,
      emailConfirmado: primaryEmail?.isVerified ?? false,
      ultimoLogin: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    };
  }

  private buildWhere(query: ListUsersQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.status === 'ativo') {
      where.isActive = true;
      where.status = UserStatus.ACTIVE;
    } else if (query.status === 'inativo') {
      where.OR = [
        { isActive: false },
        { status: UserStatus.BLOCKED },
      ];
    }

    if (query.papel === 'admin') {
      where.role = UserRole.ADMIN;
    } else if (query.papel === 'usuario') {
      where.role = { not: UserRole.ADMIN };
    }

    const terms = [query.search, query.nome, query.email]
      .map((item) => item?.trim())
      .filter(Boolean) as string[];

    if (terms.length) {
      where.AND = terms.map((term) => ({
        OR: [
          {
            profile: {
              fullName: {
                contains: term,
                mode: 'insensitive',
              },
            },
          },
          {
            emails: {
              some: {
                email: {
                  contains: term,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      }));
    }

    return where;
  }

  private calculatePercentageVariation(current: number, previous: number) {
    if (previous <= 0) {
      return current > 0 ? 100 : 0;
    }
    const value = ((current - previous) / previous) * 100;
    return Number(value.toFixed(1));
  }

  private async generateUsername(email: string) {
    const base = email
      .split('@')[0]
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .toLowerCase()
      .slice(0, 24);
    let username = base || `user${randomBytes(3).toString('hex')}`;
    let sequence = 0;
    while (await this.usersRepository.existsUsername(username)) {
      sequence += 1;
      username = `${base || 'user'}${sequence}`;
    }
    return username;
  }

  private addDays(date: Date, days: number) {
    const clone = new Date(date);
    clone.setDate(clone.getDate() + days);
    return clone;
  }

  private startOfWeek(date: Date) {
    const start = new Date(date);
    const day = start.getDay();
    const diffToMonday = (day + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private parseDate(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || value === '') {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private nullableString(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
