import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const statusStyles = {
  Confirmado: 'bg-blue-100 text-blue-700',
  Pendente: 'bg-yellow-100 text-yellow-700',
  Ocupado: 'bg-orange-100 text-orange-700',
  Finalizada: 'bg-green-100 text-green-700',
  Cancelada: 'bg-red-100 text-red-700',
  'No-show': 'bg-red-100 text-red-700',
};

const codeStyles = {
  Confirmado: 'bg-blue-100 text-blue-700',
  Pendente: 'bg-yellow-100 text-yellow-700',
  Ocupado: 'bg-orange-100 text-orange-700',
  Finalizada: 'bg-green-100 text-green-700',
  Cancelada: 'bg-red-100 text-red-700',
  'No-show': 'bg-red-100 text-red-700',
};

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

const toDateOnly = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
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

const ReservationActions = ({ reservation, onView, onCheckIn, onCheckOut, onCancel, onNoShow, processingAction }) => {
  const isFinal = reservation.status === 'Finalizada' || reservation.status === 'Cancelada' || reservation.status === 'No-show';
  const isProcessingCurrent = processingAction?.reservationId === reservation.id;
  const isProcessingCheckIn = isProcessingCurrent && processingAction?.type === 'checkin';
  const isProcessingCheckOut = isProcessingCurrent && processingAction?.type === 'checkout';
  const isCheckInAllowed = canStartCheckIn(reservation);

  if (isFinal) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onView(reservation)}
        aria-label={`Ver ${reservation.code}`}
        title="Ver detalhes da reserva"
        disabled={isProcessingCurrent}
      >
        <Icon name="Eye" size={16} />
      </Button>
    );
  }

  if (!reservation.checkInDone) {
    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onView(reservation)}
          aria-label={`Ver ${reservation.code}`}
          title="Ver detalhes da reserva"
          disabled={isProcessingCurrent}
        >
          <Icon name="Eye" size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onCheckIn(reservation)}
          aria-label={`Check-in ${reservation.code}`}
          title={isCheckInAllowed ? 'Realizar check-in' : 'Check-in disponível apenas na data da reserva'}
          disabled={isProcessingCurrent || !isCheckInAllowed}
          loading={isProcessingCheckIn}
        >
          <Icon name="ClipboardCheck" size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onNoShow(reservation)}
          aria-label={`No-show ${reservation.code}`}
          title="Registrar no-show"
          disabled={isProcessingCurrent}
        >
          <Icon name="UserX" size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onCancel(reservation)}
          aria-label={`Cancelar ${reservation.code}`}
          title="Cancelar reserva"
          disabled={isProcessingCurrent}
        >
          <Icon name="XCircle" size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onView(reservation)}
        aria-label={`Ver ${reservation.code}`}
        title="Ver detalhes da reserva"
        disabled={isProcessingCurrent}
      >
        <Icon name="Eye" size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onCheckOut(reservation)}
        aria-label={`Check-out ${reservation.code}`}
        title="Realizar check-out"
        disabled={isProcessingCurrent}
        loading={isProcessingCheckOut}
      >
        <Icon name="LogOut" size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onCancel(reservation)}
        aria-label={`Cancelar ${reservation.code}`}
        title="Cancelar reserva"
        disabled={isProcessingCurrent}
      >
        <Icon name="XCircle" size={16} />
      </Button>
    </div>
  );
};

const ReservationsTable = ({
  reservations,
  onView,
  onCheckIn,
  onCheckOut,
  onCancel,
  onNoShow,
  processingAction,
}) => {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1160px]">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chalé</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hóspede</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check-in / Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check-out / Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation.id} className="border-b border-border last:border-b-0 hover:bg-muted/40 transition-smooth">
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${codeStyles[reservation.status] || 'bg-muted text-foreground'}`}>
                    {reservation.code}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{reservation.chaletName}</td>
                <td className="px-4 py-3 text-sm text-foreground">
                  <div className="font-medium">{reservation.guest.name}</div>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <span title={reservation.guest.email} className="inline-flex">
                      <Icon name="Mail" size={13} />
                    </span>
                    <span title={reservation.guest.phone} className="inline-flex">
                      <Icon name="Phone" size={13} />
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="text-foreground">{formatDateTime(reservation.checkInAt)}</div>
                  <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${reservation.checkInDone ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {reservation.checkInDone ? '✅ Check-in' : 'Pendente'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="text-foreground">{formatDateTime(reservation.checkOutAt)}</div>
                  <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${reservation.checkOutDone ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {reservation.checkOutDone ? '✅ Check-out' : 'Pendente'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusStyles[reservation.status] || 'bg-muted text-foreground'}`}>
                    {reservation.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-foreground">{formatCurrency(reservation.total)}</td>
                <td className="px-4 py-3 text-sm">
                  <ReservationActions
                    reservation={reservation}
                    onView={onView}
                    onCheckIn={onCheckIn}
                    onCheckOut={onCheckOut}
                    onCancel={onCancel}
                    onNoShow={onNoShow}
                    processingAction={processingAction}
                  />
                </td>
              </tr>
            ))}
            {!reservations.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma reserva encontrada para os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReservationsTable;
