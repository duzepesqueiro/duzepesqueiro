import { ForbiddenException, Injectable } from '@nestjs/common';
import { InventoryConcurrencyControl } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class ConcurrencyControlRepository {
  constructor(private readonly prisma: PrismaService) {}

  async acquireLock(
    productId: string,
    userId: string,
    expirationMs: number,
  ): Promise<InventoryConcurrencyControl> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationMs);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryConcurrencyControl.findUnique({
        where: { productId },
      });

      if (
        existing &&
        existing.lockExpiration &&
        existing.lockExpiration > now &&
        existing.lockedById &&
        existing.lockedById !== userId
      ) {
        throw new ForbiddenException('Product is currently locked by another user');
      }

      return tx.inventoryConcurrencyControl.upsert({
        where: { productId },
        create: {
          productId,
          version: 0,
          lockExpiration: expiresAt,
          lockedById: userId,
        },
        update: {
          lockExpiration: expiresAt,
          lockedById: userId,
        },
      });
    });
  }

  async releaseLock(productId: string): Promise<void> {
    await this.prisma.inventoryConcurrencyControl.update({
      where: { productId },
      data: {
        lockExpiration: null,
        lockedById: null,
      },
    });
  }

  async isLocked(productId: string): Promise<boolean> {
    const lock = await this.prisma.inventoryConcurrencyControl.findUnique({
      where: { productId },
      select: { lockExpiration: true },
    });
    return Boolean(lock?.lockExpiration && lock.lockExpiration > new Date());
  }

  async isLockedByMe(productId: string, userId: string): Promise<boolean> {
    const lock = await this.prisma.inventoryConcurrencyControl.findUnique({
      where: { productId },
      select: { lockExpiration: true, lockedById: true },
    });
    return Boolean(
      lock?.lockExpiration &&
        lock.lockExpiration > new Date() &&
        lock.lockedById === userId,
    );
  }
}
