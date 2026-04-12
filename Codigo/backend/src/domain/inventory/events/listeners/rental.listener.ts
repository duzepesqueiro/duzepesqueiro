import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventTypes } from '../../../../shared/events';
import { EquipmentQuality, MovementReason, MovementType } from '../../enums';
import { ProductService } from '../../services/product.service';
import { RentalInventoryService } from '../../services/rental-inventory.service';
import { InventoryEventName } from '../constants';
import { RentalLifecycleEventPayload } from '../payloads';

type RentalFinishedPayload = RentalLifecycleEventPayload & {
  returnedQuality?: EquipmentQuality;
  inspectionNote?: string;
};

@Injectable()
export class RentalEventListener {
  constructor(
    private readonly productService: ProductService,
    private readonly rentalInventoryService: RentalInventoryService,
  ) {}

  @OnEvent(InventoryEventName.RENTAL_STARTED)
  @OnEvent(EventTypes.RENTAL_APPROVED)
  async handleRentalStarted(payload: RentalLifecycleEventPayload): Promise<void> {
    for (const item of payload.items) {
      await this.productService.adjustStock(
        item.productId,
        {
          movementType: MovementType.OUTBOUND,
          movementReason: MovementReason.RENTAL,
          quantity: item.quantity,
          referenceId: payload.rentalId,
          referenceType: 'RENTAL',
        },
        payload.user,
      );
    }
  }

  @OnEvent(InventoryEventName.RENTAL_FINISHED)
  @OnEvent(EventTypes.RENTAL_RETURNED)
  async handleRentalFinished(payload: RentalFinishedPayload): Promise<void> {
    for (const item of payload.items) {
      await this.productService.adjustStock(
        item.productId,
        {
          movementType: MovementType.INBOUND,
          movementReason: MovementReason.RENTAL_RETURN,
          quantity: item.quantity,
          referenceId: payload.rentalId,
          referenceType: 'RENTAL_RETURN',
        },
        payload.user,
      );

      await this.rentalInventoryService.performInspection(
        item.productId,
        {
          newQuality: payload.returnedQuality ?? EquipmentQuality.GOOD,
          note: payload.inspectionNote,
        },
        payload.user,
      );
    }
  }
}
