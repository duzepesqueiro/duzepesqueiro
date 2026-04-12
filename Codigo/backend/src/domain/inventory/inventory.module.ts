import { Module } from '@nestjs/common';
import { AuthModule } from '../../application/auth/auth.module';
import { MailModule } from '../../application/mail/mail.module';
import { NotificationsModule } from '../../application/notifications/notifications.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import {
  InventoryAdminFacadeController,
  KpiController,
  ProductController,
  ProductUserController,
  PurchaseOrderController,
  RentalInventoryController,
  SupplierController,
} from './controllers';
import {
  InventoryEventListener,
  RentalEventListener,
  SalesEventListener,
} from './events';
import {
  ConcurrencyControlRepository,
  InventoryMovementRepository,
  KpiRepository,
  ProductRepository,
  PurchaseOrderRepository,
  RentalInventoryRepository,
  SupplierRepository,
} from './repositories';
import {
  InventoryAdminFacadeService,
  InventoryMovementService,
  KpiService,
  ProductImageStorageService,
  ProductService,
  ProductUserService,
  PurchaseOrderService,
  RentalInventoryService,
  SupplierService,
} from './services';

@Module({
  imports: [PrismaModule, AuthModule, MailModule, NotificationsModule],
  controllers: [
    ProductController,
    InventoryAdminFacadeController,
    SupplierController,
    PurchaseOrderController,
    RentalInventoryController,
    KpiController,
    ProductUserController,
  ],
  providers: [
    ProductRepository,
    SupplierRepository,
    InventoryMovementRepository,
    RentalInventoryRepository,
    PurchaseOrderRepository,
    KpiRepository,
    ConcurrencyControlRepository,
    ProductService,
    ProductImageStorageService,
    InventoryAdminFacadeService,
    ProductUserService,
    SupplierService,
    InventoryMovementService,
    RentalInventoryService,
    PurchaseOrderService,
    KpiService,
    InventoryEventListener,
    SalesEventListener,
    RentalEventListener,
  ],
  exports: [
    ProductRepository,
    SupplierRepository,
    InventoryMovementRepository,
    RentalInventoryRepository,
    PurchaseOrderRepository,
    KpiRepository,
    ConcurrencyControlRepository,
    ProductService,
    InventoryAdminFacadeService,
    ProductUserService,
    SupplierService,
    InventoryMovementService,
    RentalInventoryService,
    PurchaseOrderService,
    KpiService,
  ],
})
export class InventoryModule {}
