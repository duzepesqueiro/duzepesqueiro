import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewDomain } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ReviewsRepository } from '../../repositories';
import { ReviewsService } from '../reviews.service';
import { ListAdminRatingsQueryDTO, UpdateAdminRatingRequestDTO } from '../../dto';

type TargetType = 'PRODUCT' | 'RENTAL' | 'EVENT' | 'HOSTING';

@Injectable()
export class RatingsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsRepository: ReviewsRepository,
    private readonly reviewsService: ReviewsService,
  ) {}

  async list(query: ListAdminRatingsQueryDTO) {
    const page = Math.max(0, query.page ?? 0);
    const size = Math.max(1, Math.min(50, query.size ?? 10));
    const skip = page * size;

    const domain = query.targetType ? this.mapTargetTypeToDomain(query.targetType) : undefined;

    const where: Prisma.ReviewWhereInput = {
      ...(domain ? { domain } : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
      ...(query.userEmail
        ? {
            user: {
              emails: {
                some: { email: { contains: query.userEmail, mode: 'insensitive' } },
              },
            },
          }
        : {}),
    };

    const [totalElements, items] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
        include: {
          user: {
            include: {
              profile: true,
              emails: { select: { email: true, isPrimary: true } },
            },
          },
        },
      }),
    ]);

    const content = items.map((r) => {
      const primaryEmail =
        r.user.emails.find((e) => e.isPrimary)?.email ?? r.user.emails[0]?.email ?? null;
      return {
        id: r.id,
        userName: r.user.profile?.fullName ?? r.user.username,
        userEmail: primaryEmail,
        targetType: this.mapDomainToTargetType(r.domain),
        targetId: r.targetId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      };
    });

    return {
      content,
      totalElements,
      totalPages: Math.max(1, Math.ceil(totalElements / size)),
    };
  }

  async update(id: string, input: UpdateAdminRatingRequestDTO) {
    const existing = await this.prisma.review.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Avaliação não encontrada.');
    }

    if (typeof input.rating !== 'number' && typeof input.comment !== 'string') {
      throw new BadRequestException('Nenhum campo para atualizar.');
    }

    await this.prisma.$transaction(async (tx) => {
      const nextComment = typeof input.comment === 'string' ? this.sanitizeComment(input.comment) : undefined;

      await tx.review.update({
        where: { id },
        data: {
          ...(typeof input.rating === 'number' ? { rating: input.rating } : {}),
          ...(typeof nextComment === 'string' ? { comment: nextComment } : {}),
        },
      });

      const stats = await tx.review.aggregate({
        where: { domain: existing.domain, targetId: existing.targetId },
        _avg: { rating: true },
        _count: { _all: true },
      });

      const avg = stats._avg.rating ? new Prisma.Decimal(stats._avg.rating).toDecimalPlaces(2) : new Prisma.Decimal(0);
      const count = stats._count._all;

      await this.reviewsRepository.upsertAggregate(
        {
          domain: existing.domain,
          targetId: existing.targetId,
          averageRating: avg,
          reviewsCount: count,
        },
        tx,
      );

      if (existing.domain === ReviewDomain.HOSTING) {
        await tx.hostingChalet.update({
          where: { id: existing.targetId },
          data: {
            averageRating: avg,
            reviewsCount: count,
          },
        });
      }
    });

    return { message: 'Avaliação atualizada com sucesso.' };
  }

  async remove(id: string): Promise<void> {
    await this.reviewsService.deleteReview(id);
  }

  private mapTargetTypeToDomain(type: TargetType): ReviewDomain {
    switch (type) {
      case 'PRODUCT':
        return ReviewDomain.SALES;
      case 'RENTAL':
        return ReviewDomain.RENTAL;
      case 'EVENT':
        return ReviewDomain.EVENT;
      case 'HOSTING':
        return ReviewDomain.HOSTING;
      default:
        return ReviewDomain.SALES;
    }
  }

  private mapDomainToTargetType(domain: ReviewDomain): TargetType {
    switch (domain) {
      case ReviewDomain.SALES:
        return 'PRODUCT';
      case ReviewDomain.RENTAL:
        return 'RENTAL';
      case ReviewDomain.EVENT:
        return 'EVENT';
      case ReviewDomain.HOSTING:
        return 'HOSTING';
      default:
        return 'PRODUCT';
    }
  }

  private sanitizeComment(comment: string): string {
    const normalized = String(comment ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
    return normalized.replace(/\s+/g, ' ');
  }
}
