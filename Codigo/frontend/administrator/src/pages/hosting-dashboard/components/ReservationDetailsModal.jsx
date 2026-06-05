import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/ui/Button';

const statusStyles = {
  Confirmado: 'bg-blue-100 text-blue-700',
  Pendente: 'bg-yellow-100 text-yellow-700',
  Ocupado: 'bg-orange-100 text-orange-700',
  Finalizada: 'bg-green-100 text-green-700',
  Cancelada: 'bg-red-100 text-red-700',
  'No-show': 'bg-red-100 text-red-700',
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '-';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

const toDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const canStartCheckIn = (reservation) => {
  const checkInDate = toDateOnly(reservation?.checkInDate || reservation?.checkInAt);
  if (!checkInDate) {
    return true;
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today.getTime() >= checkInDate.getTime();
};

const ReservationDetailsModal = ({ isOpen, reservation, onClose, onCheckOut, onCheckIn, processingAction }) => {
  const portalElement = useMemo(() => {
    if (typeof document === 'undefined') {
      return null;
    }
    const existingPortal = document.getElementById('hosting-modal-portal');
    if (existingPortal) {
      return existingPortal;
    }
    const newPortal = document.createElement('div');
    newPortal.setAttribute('id', 'hosting-modal-portal');
    document.body.appendChild(newPortal);
    return newPortal;
  }, []);

  if (!isOpen || !portalElement || !reservation) {
    return null;
  }

  const showCheckOut =
    reservation.checkInDone &&
    !reservation.checkOutDone &&
    reservation.status !== 'Cancelada' &&
    reservation.status !== 'No-show';
  const showCheckIn =
    !reservation.checkInDone &&
    reservation.status !== 'Cancelada' &&
    reservation.status !== 'Finalizada' &&
    reservation.status !== 'No-show';
  const isCheckInAllowed = canStartCheckIn(reservation);
  const isProcessingCurrent = processingAction?.reservationId === reservation.id;
  const isProcessingCheckIn = isProcessingCurrent && processingAction?.type === 'checkin';
  const isProcessingCheckOut = isProcessingCurrent && processingAction?.type === 'checkout';

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={isProcessingCurrent ? undefined : onClose}
        aria-label="Fechar modal"
      />
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-lg shadow-soft-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-xl font-heading font-semibold text-foreground">Detalhes da Reserva {reservation.code}</h3>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar" disabled={isProcessingCurrent}>
            ✕
          </Button>
        </div>

        <div className="p-6 space-y-5">
          <div className="border border-border rounded-lg p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Código: <span className="font-semibold text-foreground">{reservation.code}</span>
            </div>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[reservation.status] || 'bg-muted text-foreground'}`}>
              {reservation.status}
            </span>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Dados da Reserva</h4>
            <p className="text-sm text-muted-foreground">Origem: <span className="text-foreground">{reservation.origin || '-'}</span></p>
            <p className="text-sm text-muted-foreground">Check-in (previsto): <span className="text-foreground">{formatDateTime(reservation.checkInDate || reservation.checkInAt)}</span></p>
            <p className="text-sm text-muted-foreground">Check-out (previsto): <span className="text-foreground">{formatDateTime(reservation.checkOutDate || reservation.checkOutAt)}</span></p>
            <p className="text-sm text-muted-foreground">Check-in realizado: <span className="text-foreground">{formatDateTime(reservation.checkedInAt)}</span></p>
            <p className="text-sm text-muted-foreground">Check-out realizado: <span className="text-foreground">{formatDateTime(reservation.checkedOutAt)}</span></p>
            <p className="text-sm text-muted-foreground">Chalé: <span className="text-foreground">{reservation.chaletName}</span></p>
            <p className="text-sm text-muted-foreground">Adultos/Crianças: <span className="text-foreground">{reservation.adults} / {reservation.children}</span></p>
            <p className="text-sm text-muted-foreground">Total: <span className="text-foreground font-semibold">{formatCurrency(reservation.total)}</span></p>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Responsável</h4>
            <p className="text-sm text-foreground">{reservation.guest.name}</p>
            <p className="text-sm text-muted-foreground">{reservation.guest.email} · {reservation.guest.phone}</p>
            <p className="text-sm text-muted-foreground">CPF: {reservation.guest.cpf}</p>
            <p className="text-sm text-muted-foreground">Canal de contato: {reservation.contactChannel || '-'}</p>
            <p className="text-sm text-muted-foreground">Observação de contato: {reservation.contactNotes || '-'}</p>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Hóspedes ({reservation.guests.length})</h4>
            {reservation.guests.map((guest, index) => (
              <div key={`${guest.id || guest.name}-${index}`} className="text-sm text-muted-foreground">
                <p>
                  • {guest.name}{guest.isPrimary ? ' (Responsável)' : ''}
                </p>
                <p className="ml-3">Email/Telefone: {guest.email || '-'} · {guest.phone || '-'}</p>
                <p className="ml-3">CPF/RG: {guest.cpf || '-'} · {guest.rg || '-'}</p>
                <p className="ml-3">Nascimento: {formatDate(guest.birthDate)}</p>
              </div>
            ))}
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Pagamento e Valores</h4>
            <p className="text-sm text-muted-foreground">Status pagamento: <span className="text-foreground">{reservation.paymentStatus || '-'}</span></p>
            <p className="text-sm text-muted-foreground">Método: <span className="text-foreground">{reservation.paymentMethod || '-'}</span></p>
            <p className="text-sm text-muted-foreground">ID pagamento: <span className="text-foreground">{reservation.paymentId || '-'}</span></p>
            <p className="text-sm text-muted-foreground">Pago em: <span className="text-foreground">{formatDateTime(reservation.paidAt)}</span></p>
            <p className="text-sm text-muted-foreground">Valor base: <span className="text-foreground">{formatCurrency(reservation.baseAmount)}</span></p>
            <p className="text-sm text-muted-foreground">Desconto: <span className="text-foreground">{formatCurrency(reservation.discountAmount)}</span></p>
            <p className="text-sm text-muted-foreground">Acréscimo: <span className="text-foreground">{formatCurrency(reservation.surchargeAmount)}</span></p>
            <p className="text-sm text-muted-foreground">Cama extra: <span className="text-foreground">{reservation.extraBedRequested ? `Sim (${formatCurrency(reservation.extraBedFee)})` : 'Não'}</span></p>
            <p className="text-sm text-muted-foreground">Total: <span className="text-foreground font-semibold">{formatCurrency(reservation.total)}</span></p>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Veículo</h4>
            <p className="text-sm text-muted-foreground">Placa: <span className="text-foreground">{reservation.vehiclePlate || '-'}</span></p>
            <p className="text-sm text-muted-foreground">Modelo/Cor/Tipo: <span className="text-foreground">{reservation.vehicleModel || '-'} · {reservation.vehicleColor || '-'} · {reservation.vehicleType || '-'}</span></p>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Termos e Política</h4>
            <p className="text-sm text-muted-foreground">Termos aceitos: <span className="text-foreground">{reservation.policiesAccepted ? 'Sim' : 'Não'}</span></p>
            <p className="text-sm text-muted-foreground">Aceite em: <span className="text-foreground">{formatDateTime(reservation.policiesAcceptedAt)}</span></p>
            <p className="text-sm text-muted-foreground">Versão da política: <span className="text-foreground">{reservation.policyVersion || '-'}</span></p>
            <p className="text-sm text-muted-foreground">ID política cancelamento: <span className="text-foreground">{reservation.cancellationPolicyId || '-'}</span></p>
            <p className="text-sm text-muted-foreground">ID regra de preço: <span className="text-foreground">{reservation.pricingRuleId || '-'}</span></p>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Operacional</h4>
            <p className="text-sm text-muted-foreground">Cancelada em: <span className="text-foreground">{formatDateTime(reservation.cancelledAt)}</span></p>
            <p className="text-sm text-muted-foreground">Motivo cancelamento: <span className="text-foreground">{reservation.cancellationReason || '-'}</span></p>
            <p className="text-sm text-muted-foreground">No-show em: <span className="text-foreground">{formatDateTime(reservation.noShowAt)}</span></p>
            <p className="text-sm text-muted-foreground">Taxa no-show: <span className="text-foreground">{reservation.noShowFeeAmount != null ? formatCurrency(reservation.noShowFeeAmount) : '-'}</span></p>
            <p className="text-sm text-muted-foreground">Motivo no-show: <span className="text-foreground">{reservation.noShowReason || '-'}</span></p>
            <p className="text-sm text-muted-foreground">Criado por / Atualizado por: <span className="text-foreground">{reservation.createdById || '-'} / {reservation.updatedById || '-'}</span></p>
            <p className="text-sm text-muted-foreground">Criada em / Atualizada em: <span className="text-foreground">{formatDateTime(reservation.createdAt)} / {formatDateTime(reservation.updatedAt)}</span></p>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Observações</h4>
            <p className="text-sm text-muted-foreground">Observação da reserva: {reservation.notes || '-'}</p>
            <p className="text-sm text-muted-foreground">Observação de negociação: {reservation.negotiationNotes || '-'}</p>
            <p className="text-sm text-muted-foreground">Termo completo: {reservation.policyTerm || '-'}</p>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Vouchers ({reservation.vouchers?.length || 0})</h4>
            {Array.isArray(reservation.vouchers) && reservation.vouchers.length ? (
              reservation.vouchers.map((voucher) => (
                <div key={voucher.id} className="text-sm text-muted-foreground">
                  <p>• QR Code: <span className="text-foreground">{voucher.qrCode}</span></p>
                  <p className="ml-3">Gerado em: {formatDateTime(voucher.generatedAt)}</p>
                  <p className="ml-3">Enviado por e-mail: {voucher.sentByEmail ? 'Sim' : 'Não'}</p>
                  <p className="ml-3">Instruções: {voucher.arrivalInstructions || '-'}</p>
                  <p className="ml-3">Contatos: {voucher.complexContacts || '-'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum voucher gerado.</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isProcessingCurrent}>
            Fechar
          </Button>
          {showCheckIn ? (
            <Button
              type="button"
              onClick={() => onCheckIn(reservation)}
              disabled={isProcessingCurrent || !isCheckInAllowed}
              loading={isProcessingCheckIn}
              title={isCheckInAllowed ? 'Fazer check-in' : 'Check-in disponível apenas na data da reserva'}
            >
              {isProcessingCheckIn ? 'Processando Check-in...' : 'Fazer Check-in'}
            </Button>
          ) : null}
          {showCheckOut ? (
            <Button type="button" onClick={() => onCheckOut(reservation)} disabled={isProcessingCurrent} loading={isProcessingCheckOut}>
              {isProcessingCheckOut ? 'Processando Check-out...' : 'Fazer Check-out'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default ReservationDetailsModal;
