import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus, PaymentDomain, PaymentStatus, Prisma, ReservationStatus, ReviewDomain, RentalStatus } from '@prisma/client';
import { MailService } from '../../mail/services/mail.service';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CreateReviewRequestDTO, ListReviewsQueryDTO, ReviewDTO, ReviewSummaryDTO } from '../dto';
import { ReviewsRepository } from '../repositories';

type ReviewContext = { targetId: string; targetName: string | null };

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsRepository: ReviewsRepository,
    private readonly mailService: MailService,
  ) {}

  async createReview(input: CreateReviewRequestDTO, userId: string): Promise<ReviewDTO> {
    const sanitizedComment = this.sanitizeComment(input.comment);

    if (sanitizedComment.length < 10) {
      throw new BadRequestException('comment deve ter no mínimo 10 caracteres.');
    }
    if (sanitizedComment.length > 1000) {
      throw new BadRequestException('comment deve ter no máximo 1000 caracteres.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await this.reviewsRepository.findByDomainAndSubject(
        { domain: input.domain, subjectId: input.subjectId },
        tx,
      );
      if (existing) {
        throw new BadRequestException('Já existe uma avaliação para este registro.');
      }

      const context = await this.resolveContext(tx, input.domain, input.subjectId, userId);

      const review = await this.reviewsRepository.createReview(
        {
          domain: input.domain,
          subjectId: input.subjectId,
          targetId: context.targetId,
          targetName: context.targetName,
          userId,
          rating: input.rating,
          comment: sanitizedComment,
        },
        tx,
      );

      const updatedAggregate = await this.incrementAggregate(
        tx,
        input.domain,
        context.targetId,
        input.rating,
      );

      if (input.domain === ReviewDomain.HOSTING) {
        await tx.hostingChalet.update({
          where: { id: context.targetId },
          data: {
            averageRating: updatedAggregate.averageRating,
            reviewsCount: updatedAggregate.reviewsCount,
          },
        });
      }

      const primaryEmail = await tx.userEmail.findFirst({
        where: { userId, isPrimary: true },
        select: { email: true },
      });

      const authorName = review.user.profile?.fullName ?? review.user.username;
      const mailPayload = primaryEmail?.email
        ? {
            email: primaryEmail.email,
            name: authorName,
            domain: input.domain,
            targetName: context.targetName,
            rating: input.rating,
          }
        : null;

      return { review: this.toReviewDTO(review), mailPayload };
    });

    if (result.mailPayload) {
      await this.mailService.sendReviewPublishedEmail(result.mailPayload);
    }

    return result.review;
  }

  async listReviews(query: ListReviewsQueryDTO): Promise<ReviewDTO[]> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(50, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const items = await this.reviewsRepository.listByTarget({
      domain: query.domain,
      targetId: query.targetId,
      skip,
      take: limit,
    });

    return items.map((item) => this.toReviewDTO(item));
  }

  async getSummary(input: { domain: ReviewDomain; targetId: string }): Promise<ReviewSummaryDTO> {
    const aggregate = await this.reviewsRepository.getAggregate(input);
    if (!aggregate) {
      return { averageRating: 0, reviewsCount: 0 };
    }
    return {
      averageRating: Number(aggregate.averageRating),
      reviewsCount: aggregate.reviewsCount,
    };
  }

  async getBySubject(input: { domain: ReviewDomain; subjectId: string }, userId: string) {
    await this.resolveContext(this.prisma, input.domain, input.subjectId, userId);
    const existing = await this.reviewsRepository.findByDomainAndSubject(input);
    if (!existing) {
      throw new NotFoundException('Avaliação não encontrada para o registro informado.');
    }
    return this.toReviewDTO(existing);
  }

  async deleteReview(id: string): Promise<void> {
    const deleted = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.findUnique({ where: { id } });
      if (!review) {
        throw new NotFoundException('Avaliação não encontrada.');
      }

      await this.reviewsRepository.deleteById(id, tx);

      const stats = await tx.review.aggregate({
        where: { domain: review.domain, targetId: review.targetId },
        _avg: { rating: true },
        _count: { _all: true },
      });

      const avg = stats._avg.rating ? new Prisma.Decimal(stats._avg.rating).toDecimalPlaces(2) : new Prisma.Decimal(0);
      const count = stats._count._all;

      await this.reviewsRepository.upsertAggregate(
        {
          domain: review.domain,
          targetId: review.targetId,
          averageRating: avg,
          reviewsCount: count,
        },
        tx,
      );

      if (review.domain === ReviewDomain.HOSTING) {
        await tx.hostingChalet.update({
          where: { id: review.targetId },
          data: {
            averageRating: avg,
            reviewsCount: count,
          },
        });
      }

      return review;
    });

    void deleted;
  }

  private async incrementAggregate(
    tx: Prisma.TransactionClient,
    domain: ReviewDomain,
    targetId: string,
    rating: number,
  ) {
    const current = await this.reviewsRepository.getAggregate({ domain, targetId }, tx);
    const currentCount = current?.reviewsCount ?? 0;
    const currentAvg = current?.averageRating ?? new Prisma.Decimal(0);
    const nextCount = currentCount + 1;
    const nextAvg = currentAvg.mul(currentCount).plus(rating).div(nextCount).toDecimalPlaces(2);

    return this.reviewsRepository.upsertAggregate(
      {
        domain,
        targetId,
        averageRating: nextAvg,
        reviewsCount: nextCount,
      },
      tx,
    );
  }

  private async resolveContext(
    tx: Prisma.TransactionClient | PrismaService,
    domain: ReviewDomain,
    subjectId: string,
    userId: string,
  ): Promise<ReviewContext> {
    const now = new Date();

    if (domain === ReviewDomain.HOSTING) {
      const reservation = await tx.hostingReservation.findFirst({
        where: { id: subjectId, deletedAt: null },
        select: { id: true, userId: true, chaletId: true, status: true, checkedOutAt: true, checkOutDate: true },
      });
      if (!reservation) {
        throw new NotFoundException('Reserva não encontrada.');
      }
      if (reservation.userId !== userId) {
        throw new BadRequestException('Usuário não pode avaliar uma reserva que não é sua.');
      }
      const checkoutFinished = Boolean(reservation.checkedOutAt) || reservation.checkOutDate < now;
      if (reservation.status !== ReservationStatus.COMPLETED || !checkoutFinished) {
        throw new BadRequestException('Avaliação só é permitida após checkout concluído.');
      }

      const chalet = await tx.hostingChalet.findUnique({
        where: { id: reservation.chaletId },
        select: { id: true, name: true },
      });
      return { targetId: reservation.chaletId, targetName: chalet?.name ?? null };
    }

    if (domain === ReviewDomain.EVENT) {
      const registration = await tx.eventRegistration.findUnique({
        where: { id: subjectId },
        select: {
          id: true,
          userId: true,
          event: { select: { id: true, title: true, status: true } },
        },
      });
      if (!registration) {
        throw new NotFoundException('Inscrição não encontrada.');
      }
      if (registration.userId !== userId) {
        throw new BadRequestException('Usuário não pode avaliar uma inscrição que não é sua.');
      }
      if (registration.event.status !== EventStatus.COMPLETED) {
        throw new BadRequestException('Avaliação só é permitida após o evento ser concluído.');
      }

      return { targetId: registration.event.id, targetName: registration.event.title };
    }

    if (domain === ReviewDomain.RENTAL) {
      const rental = await tx.rental.findUnique({
        where: { id: subjectId },
        select: {
          id: true,
          userId: true,
          paymentStatus: true,
          items: { where: { deletedAt: null }, select: { status: true } },
        },
      });
      if (!rental) {
        throw new NotFoundException('Aluguel não encontrado.');
      }
      if (rental.userId !== userId) {
        throw new BadRequestException('Usuário não pode avaliar um aluguel que não é seu.');
      }
      const allowedPaymentStatuses: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.APPROVED];
      if (!allowedPaymentStatuses.includes(rental.paymentStatus)) {
        throw new BadRequestException('Avaliação só é permitida após pagamento confirmado.');
      }
      const items = rental.items ?? [];
      if (items.length === 0) {
        throw new BadRequestException('Aluguel inválido para avaliação.');
      }
      const hasOpenItems = items.some((i) => i.status !== RentalStatus.RETURNED && i.status !== RentalStatus.CANCELLED);
      if (hasOpenItems) {
        throw new BadRequestException('Avaliação só é permitida após devolução concluída.');
      }

      return { targetId: rental.id, targetName: null };
    }

    if (domain === ReviewDomain.SALES) {
      const payment = await tx.payment.findUnique({
        where: { id: subjectId },
        select: { id: true, userId: true, domain: true, status: true, entityId: true },
      });
      if (!payment || payment.domain !== PaymentDomain.SALES) {
        throw new NotFoundException('Pagamento de vendas não encontrado.');
      }
      if (payment.userId !== userId) {
        throw new BadRequestException('Usuário não pode avaliar um pagamento que não é seu.');
      }
      const allowedPaymentStatuses: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.APPROVED];
      if (!allowedPaymentStatuses.includes(payment.status)) {
        throw new BadRequestException('Avaliação só é permitida após pagamento confirmado.');
      }
      return { targetId: payment.entityId, targetName: null };
    }

    throw new BadRequestException('domain inválido.');
  }

  private sanitizeComment(value: string): string {
    return value
      .replace(/\0/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private toReviewDTO(data: {
    id: string;
    domain: ReviewDomain;
    subjectId: string;
    targetId: string;
    targetName: string | null;
    rating: number;
    comment: string | null;
    createdAt: Date;
    user: { username: string; profile: { fullName: string } | null };
  }): ReviewDTO {
    return {
      id: data.id,
      domain: data.domain,
      subjectId: data.subjectId,
      targetId: data.targetId,
      targetName: data.targetName ?? null,
      rating: data.rating,
      comment: data.comment ?? null,
      authorName: data.user.profile?.fullName ?? data.user.username,
      createdAt: data.createdAt,
    };
  }
}
