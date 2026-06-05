import { Injectable } from '@nestjs/common';
import { Prisma, ReviewDomain } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async findByDomainAndSubject(
    input: { domain: ReviewDomain; subjectId: string },
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).review.findUnique({
      where: {
        domain_subjectId: {
          domain: input.domain,
          subjectId: input.subjectId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: { select: { fullName: true } },
          },
        },
      },
    });
  }

  async createReview(
    data: {
      domain: ReviewDomain;
      subjectId: string;
      targetId: string;
      targetName: string | null;
      userId: string;
      rating: number;
      comment: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).review.create({
      data: {
        domain: data.domain,
        subjectId: data.subjectId,
        targetId: data.targetId,
        targetName: data.targetName ?? null,
        userId: data.userId,
        rating: data.rating,
        comment: data.comment ?? null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: { select: { fullName: true } },
          },
        },
      },
    });
  }

  async listByTarget(
    input: { domain: ReviewDomain; targetId: string; skip: number; take: number },
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).review.findMany({
      where: {
        domain: input.domain,
        targetId: input.targetId,
      },
      orderBy: { createdAt: 'desc' },
      skip: input.skip,
      take: input.take,
      include: {
        user: {
          select: {
            username: true,
            profile: { select: { fullName: true } },
          },
        },
      },
    });
  }

  async deleteById(id: string, tx?: Prisma.TransactionClient) {
    return this.client(tx).review.delete({ where: { id } });
  }

  async getAggregate(
    input: { domain: ReviewDomain; targetId: string },
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).reviewAggregate.findUnique({
      where: {
        domain_targetId: {
          domain: input.domain,
          targetId: input.targetId,
        },
      },
    });
  }

  async upsertAggregate(
    input: { domain: ReviewDomain; targetId: string; averageRating: Prisma.Decimal; reviewsCount: number },
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).reviewAggregate.upsert({
      where: {
        domain_targetId: {
          domain: input.domain,
          targetId: input.targetId,
        },
      },
      create: {
        domain: input.domain,
        targetId: input.targetId,
        averageRating: input.averageRating,
        reviewsCount: input.reviewsCount,
      },
      update: {
        averageRating: input.averageRating,
        reviewsCount: input.reviewsCount,
      },
    });
  }
}

