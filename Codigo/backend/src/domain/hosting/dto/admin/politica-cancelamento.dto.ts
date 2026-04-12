export class CancellationFeeDTO {
  reservaId?: string;
  valorTotal: number;
  diasAntecedencia: number;
  percentualMulta: number;
  valorMulta: number;
  valorReembolso: number;
  regraAplicada: string;
}

export class PoliticaCancelamentoDTO {
  id: string;
  name: string;
  freeCancellationDays: number;
  partialPenaltyFromDay: number;
  partialPenaltyToDay: number;
  partialPenaltyPercent: number;
  fullPenaltyPercent: number;
  termsVersion: string;
  termsContent: string;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CreatePoliticaDTO {
  name: string;
  termsVersion: string;
  termsContent: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive?: boolean;
  freeCancellationDays?: number;
  partialPenaltyFromDay?: number;
  partialPenaltyToDay?: number;
  partialPenaltyPercent?: number;
  fullPenaltyPercent?: number;
  createdById?: string;
}

export class UpdatePoliticaDTO {
  name?: string;
  termsVersion?: string;
  termsContent?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
  freeCancellationDays?: number;
  partialPenaltyFromDay?: number;
  partialPenaltyToDay?: number;
  partialPenaltyPercent?: number;
  fullPenaltyPercent?: number;
  createdById?: string | null;
}
