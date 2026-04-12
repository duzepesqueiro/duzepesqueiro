import { BadRequestException, ConflictException } from '@nestjs/common';
import { RentalBookingService } from './rental-booking.service';

describe('RentalBookingService', () => {
  const createService = () => {
    const aluguelRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      softDelete: jest.fn(),
    };
    const aluguelRegistrationRepository = {
      findByUserId: jest.fn(),
      findByRentalId: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    const rentalInventoryRepository = {
      findByProductId: jest.fn(),
      performInspection: jest.fn(),
    };
    const inventoryMovementRepository = {
      create: jest.fn(),
    };
    const paymentFacadeService = {
      createRentalPayment: jest.fn(),
      checkPaymentStatus: jest.fn(),
    };
    const notificationsService = {
      sendToUser: jest.fn(),
    };
    const eventEmitter = {
      emit: jest.fn(),
    };
    const logsService = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const prisma = {
      rentalItem: { findFirst: jest.fn() },
      eventRegistration: { findFirst: jest.fn() },
      user: { findUnique: jest.fn() },
    };

    const service = new RentalBookingService(
      aluguelRepository as any,
      aluguelRegistrationRepository as any,
      rentalInventoryRepository as any,
      inventoryMovementRepository as any,
      paymentFacadeService as any,
      notificationsService as any,
      eventEmitter as any,
      logsService as any,
      prisma as any,
    );

    return {
      service,
      aluguelRepository,
      aluguelRegistrationRepository,
      rentalInventoryRepository,
      inventoryMovementRepository,
      paymentFacadeService,
      notificationsService,
      eventEmitter,
      logsService,
      prisma,
    };
  };

  const baseDto = () => ({
    productId: '11111111-1111-1111-1111-111111111111',
    rentalDate: '2026-01-10',
    returnDate: '2026-01-12',
    quantity: 1,
    unitPrice: 100,
    periodType: 'DAILY',
    periodValue: 2,
    notes: 'teste',
  });

  it('deve rejeitar período com devolução menor/igual ao início', async () => {
    const { service, aluguelRegistrationRepository } = createService();
    aluguelRegistrationRepository.findByUserId.mockResolvedValue([]);

    await expect(
      service.createBooking('user-1', {
        ...baseDto(),
        rentalDate: '2026-01-10',
        returnDate: '2026-01-10',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve rejeitar quando usuário atinge limite simultâneo', async () => {
    const { service, aluguelRegistrationRepository } = createService();
    aluguelRegistrationRepository.findByUserId.mockResolvedValue(
      Array.from({ length: 5 }).map((_, i) => ({
        id: `b-${i}`,
        status: 'PENDING',
      })),
    );

    await expect(service.createBooking('user-1', baseDto() as any)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('deve fazer rollback lógico quando falha no pagamento', async () => {
    const {
      service,
      aluguelRepository,
      aluguelRegistrationRepository,
      rentalInventoryRepository,
      inventoryMovementRepository,
      paymentFacadeService,
      prisma,
    } = createService();

    aluguelRegistrationRepository.findByUserId.mockResolvedValue([]);
    rentalInventoryRepository.findByProductId.mockResolvedValue({
      quality: 'GOOD',
      product: { stockQuantity: 10 },
    });
    prisma.rentalItem.findFirst.mockResolvedValue(null);
    prisma.eventRegistration.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      username: 'user',
      profile: { fullName: 'User Name', document: '00000000000' },
      emails: [{ email: 'user@example.com', isPrimary: true }],
    });
    aluguelRepository.create.mockResolvedValue({
      id: 'rental-1',
      userId: 'user-1',
    });
    inventoryMovementRepository.create.mockResolvedValue({});
    paymentFacadeService.createRentalPayment.mockRejectedValue(new Error('gateway down'));
    aluguelRepository.softDelete.mockResolvedValue(undefined);

    await expect(service.createBooking('user-1', baseDto() as any)).rejects.toThrow('gateway down');

    expect(aluguelRepository.softDelete).toHaveBeenCalledWith('rental-1');
    expect(inventoryMovementRepository.create).toHaveBeenCalledTimes(2);
  });
});
