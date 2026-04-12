import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const mapped = this.mapException(exception);

    response.status(mapped.statusCode).json({
      success: false,
      error: {
        code: mapped.code,
        message: mapped.message,
        details: {
          path: request.url,
          prismaCode: exception.code,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }

  private mapException(
    exception: Prisma.PrismaClientKnownRequestError,
  ): { statusCode: number; code: string; message: string } {
    if (exception.code === 'P2002') {
      const conflict = new ConflictException('Registro duplicado');
      return {
        statusCode: conflict.getStatus(),
        code: 'PRISMA_UNIQUE_CONSTRAINT',
        message: 'Conflito de unicidade nos dados informados.',
      };
    }

    if (exception.code === 'P2025') {
      const notFound = new NotFoundException('Registro não encontrado');
      return {
        statusCode: notFound.getStatus(),
        code: 'PRISMA_RECORD_NOT_FOUND',
        message: 'Registro não encontrado para a operação solicitada.',
      };
    }

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'PRISMA_KNOWN_ERROR',
      message: 'Erro conhecido de banco de dados.',
    };
  }
}
