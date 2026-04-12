import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MovementReason, MovementType } from '../../enums';
import { ProductService } from '../../services/product.service';
import { InventoryEventName } from '../constants';
import { SaleLifecycleEventPayload } from '../payloads';

@Injectable()
export class SalesEventListener {
  constructor(private readonly productService: ProductService) {}

  @OnEvent(InventoryEventName.SALE_ITEM_ADDED)
  async handleSaleItemAdded(_payload: SaleLifecycleEventPayload): Promise<void> {}

  @OnEvent(InventoryEventName.SALE_CONFIRMED)
  async handleSaleConfirmed(payload: SaleLifecycleEventPayload): Promise<void> {
    for (const item of payload.items) {
      if (item.productType === 'SALE') {
        await this.productService.adjustStock(
          item.productId,
          {
            movementType: MovementType.OUTBOUND,
            movementReason: MovementReason.SALE,
            quantity: item.quantity,
            referenceId: payload.saleId,
            referenceType: 'SALE',
          },
          payload.user,
        );
      }
    }
  }

  @OnEvent(InventoryEventName.SALE_CANCELLED)
  async handleSaleCancelled(payload: SaleLifecycleEventPayload): Promise<void> {
    for (const item of payload.items) {
      if (item.productType === 'SALE') {
        await this.productService.adjustStock(
          item.productId,
          {
            movementType: MovementType.INBOUND,
            movementReason: MovementReason.RETURN,
            quantity: item.quantity,
            referenceId: payload.saleId,
            referenceType: 'SALE_CANCELLED',
          },
          payload.user,
        );
      }
    }
  }
}
