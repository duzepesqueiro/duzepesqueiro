import { Injectable } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeProfile = {
    profile: true,
    emails: {
      orderBy: { isPrimary: 'desc' as const },
      select: {
        id: true,
        email: true,
        isPrimary: true,
        isVerified: true,
      },
    },
    phones: {
      orderBy: { isPrimary: 'desc' as const },
      select: {
        id: true,
        phoneNumber: true,
        isPrimary: true,
        isVerified: true,
      },
    },
  };

  async findMany(where: Prisma.UserWhereInput) {
    return this.prisma.user.findMany({
      where,
      include: this.includeProfile,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: this.includeProfile,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.userEmail.findUnique({
      where: { email },
      include: {
        user: {
          include: this.includeProfile,
        },
      },
    });
  }

  async existsUsername(username: string) {
    const exists = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return Boolean(exists);
  }

  async createUser(input: {
    username: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
    status: UserStatus;
    fullName: string;
    birthDate?: Date | null;
    email: string;
    emailVerified: boolean;
    emailToken?: string | null;
    phone?: string | null;
    createdAt?: Date;
    lastLoginAt?: Date | null;
  }) {
    return this.prisma.user.create({
      data: {
        username: input.username,
        passwordHash: input.passwordHash,
        role: input.role,
        isActive: input.isActive,
        status: input.status,
        createdAt: input.createdAt,
        lastLoginAt: input.lastLoginAt,
        profile: {
          create: {
            fullName: input.fullName,
            birthDate: input.birthDate ?? null,
          },
        },
        emails: {
          create: {
            email: input.email,
            isPrimary: true,
            isVerified: input.emailVerified,
            token: input.emailToken ?? null,
          },
        },
        phones: input.phone
          ? {
              create: {
                phoneNumber: input.phone,
                isPrimary: true,
              },
            }
          : undefined,
      },
      include: this.includeProfile,
    });
  }

  async updateUser(
    id: string,
    input: {
      role?: UserRole;
      isActive?: boolean;
      status?: UserStatus;
      lastLoginAt?: Date | null;
      fullName?: string;
      birthDate?: Date | null;
      email?: string;
      emailVerified?: boolean;
      phone?: string | null;
    },
  ) {
    const current = await this.findById(id);
    if (!current) {
      return null;
    }

    const primaryEmail = current.emails[0];
    const primaryPhone = current.phones[0];

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          role: input.role,
          isActive: input.isActive,
          status: input.status,
          lastLoginAt: input.lastLoginAt,
        },
      });

      if (input.fullName !== undefined || input.birthDate !== undefined) {
        if (current.profile) {
          await tx.userProfile.update({
            where: { userId: id },
            data: {
              fullName: input.fullName ?? current.profile.fullName,
              birthDate:
                input.birthDate !== undefined
                  ? input.birthDate
                  : current.profile.birthDate,
            },
          });
        } else if (input.fullName) {
          await tx.userProfile.create({
            data: {
              userId: id,
              fullName: input.fullName,
              birthDate: input.birthDate ?? null,
            },
          });
        }
      }

      if (input.email !== undefined || input.emailVerified !== undefined) {
        if (primaryEmail) {
          await tx.userEmail.update({
            where: { id: primaryEmail.id },
            data: {
              email: input.email ?? primaryEmail.email,
              isVerified:
                input.emailVerified !== undefined
                  ? input.emailVerified
                  : primaryEmail.isVerified,
            },
          });
        } else if (input.email) {
          await tx.userEmail.create({
            data: {
              userId: id,
              email: input.email,
              isPrimary: true,
              isVerified: Boolean(input.emailVerified),
            },
          });
        }
      }

      if (input.phone !== undefined) {
        if (primaryPhone && input.phone === null) {
          await tx.userPhone.delete({
            where: { id: primaryPhone.id },
          });
        } else if (primaryPhone && input.phone) {
          await tx.userPhone.update({
            where: { id: primaryPhone.id },
            data: {
              phoneNumber: input.phone,
            },
          });
        } else if (!primaryPhone && input.phone) {
          await tx.userPhone.create({
            data: {
              userId: id,
              phoneNumber: input.phone,
              isPrimary: true,
            },
          });
        }
      }
    });

    return this.findById(id);
  }

  async deleteById(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async countUsers(where?: Prisma.UserWhereInput) {
    return this.prisma.user.count({ where });
  }

  async findCreatedBetween(start: Date, end: Date) {
    return this.prisma.user.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      select: { createdAt: true },
    });
  }
}
