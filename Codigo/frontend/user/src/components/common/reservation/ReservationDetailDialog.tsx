import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard, QrCode, User, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import RoomInfoGrid from './RoomInfoGrid';
import type { Reservation } from '@/types/booking';
import type { Room } from '@/types/booking';
import { formatBRL } from '@/lib/currency';

const statusColors: Record<string, string> = {
  confirmed: 'bg-primary text-primary-foreground',
  pending: 'bg-accent text-accent-foreground',
  cancelled: 'bg-destructive text-destructive-foreground',
};

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendente',
  cancelled: 'Cancelada',
};

interface ReservationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation;
  room: Room | undefined;
}

const ReservationDetailDialog = ({ open, onOpenChange, reservation, room }: ReservationDetailDialogProps) => {
  const { bookingData, paymentData, totalPrice, createdAt, status } = reservation;
  const responsibleGuest =
    bookingData.responsibleGuestIndex !== null
      ? bookingData.guestDetails[bookingData.responsibleGuestIndex] ?? bookingData.guestDetails[0]
      : bookingData.guestDetails[0];
  const nights = bookingData.checkIn && bookingData.checkOut
    ? Math.max(1, Math.round((new Date(bookingData.checkOut).getTime() - new Date(bookingData.checkIn).getTime()) / 86400000))
    : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <DialogTitle className="font-display text-xl">Detalhes da Reserva</DialogTitle>
            <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{reservation.id}</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Dates & general info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoCard label="Check-in" value={bookingData.checkIn ? format(new Date(bookingData.checkIn), 'dd/MM/yyyy', { locale: ptBR }) : '—'} />
            <InfoCard label="Check-out" value={bookingData.checkOut ? format(new Date(bookingData.checkOut), 'dd/MM/yyyy', { locale: ptBR }) : '—'} />
            <InfoCard label="Noites" value={`${nights}`} />
            <InfoCard label="Hóspedes" value={`${bookingData.guests}`} />
          </div>

          {bookingData.pets && (
            <p className="text-sm text-accent font-medium">🐾 Reserva com pet</p>
          )}

          {bookingData.observations && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Observações</p>
              <p className="text-sm text-foreground">{bookingData.observations}</p>
            </div>
          )}

          <Separator />

          {/* Responsible */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="h-4 w-4" /> Responsável
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="Nome" value={responsibleGuest?.name || '—'} />
              <InfoCard label="CPF" value={responsibleGuest?.document || '—'} />
              <InfoCard label="Idade" value={responsibleGuest ? `${responsibleGuest.age} anos` : '—'} />
              <InfoCard label="Placa do veículo" value={bookingData.vehiclePlate || '—'} />
            </div>
          </div>

          <Separator />

          {/* Guests */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Hóspedes ({bookingData.guestDetails.length})
            </h4>
            <div className="space-y-2">
              {bookingData.guestDetails.map((g, i) => (
                <div key={i} className="bg-muted rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground">{g.name || `Hóspede ${i + 1}`} — {g.age} anos</p>
                  <p className="text-xs text-muted-foreground">CPF: {g.document}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.address.street}, {g.address.number} — {g.address.city}/{g.address.state} · CEP {g.address.zip}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Payment */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              {paymentData.method === 'pix' ? <QrCode className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              Pagamento
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="Método" value={paymentData.method === 'pix' ? 'PIX' : 'Cartão de Crédito'} />
              <InfoCard label="Status" value={paymentData.status === 'success' ? 'Aprovado' : paymentData.status === 'error' ? 'Erro' : 'Processando'} />
            </div>
          </div>

          <Separator />

          {/* Price */}
          <div className="rounded-xl p-4" style={{ background: 'var(--gradient-gold)' }}>
            <div className="flex justify-between items-center">
              <span className="text-primary-foreground font-semibold">Total pago</span>
              <span className="text-primary-foreground font-bold text-2xl">{formatBRL(totalPrice)}</span>
            </div>
            {room && (
              <p className="text-primary-foreground/80 text-sm mt-1">{nights} noite(s) × {formatBRL(room.pricePerNight)}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">Reserva criada em {format(new Date(createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>

          <Separator />

          {/* Room Info */}
          {room && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Informações do Quarto</h4>
              <RoomInfoGrid room={room} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-muted rounded-lg p-2.5">
    <p className="text-xs text-muted-foreground font-medium">{label}</p>
    <p className="text-sm text-foreground font-medium break-all">{value || '—'}</p>
  </div>
);

export default ReservationDetailDialog;
