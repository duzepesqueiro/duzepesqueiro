import { Mail, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ADMIN_EMAIL = 'contato@villaserena.com';
const ADMIN_WHATSAPP = '5511999999999';

interface CancelReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
}

const CancelReservationDialog = ({ open, onOpenChange, reservationId }: CancelReservationDialogProps) => {
  const emailSubject = encodeURIComponent(`Cancelamento de reserva - ${reservationId}`);
  const emailBody = encodeURIComponent(`Olá, gostaria de solicitar o cancelamento da minha reserva ${reservationId}.\n\nAguardo retorno.`);
  const whatsappMessage = encodeURIComponent(`Olá! Gostaria de cancelar minha reserva ${reservationId}. Poderia me ajudar?`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Cancelar Reserva</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Para cancelar sua reserva, entre em contato com nossa equipe por e-mail ou WhatsApp. Responderemos o mais rápido possível.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            Código da reserva: <span className="font-mono font-semibold text-foreground">{reservationId}</span>
          </p>

          <a
            href={`mailto:${ADMIN_EMAIL}?subject=${emailSubject}&body=${emailBody}`}
            className="flex items-center gap-3 bg-muted rounded-xl p-4 hover:bg-secondary transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Enviar e-mail</p>
              <p className="text-xs text-muted-foreground">{ADMIN_EMAIL}</p>
            </div>
          </a>

          <a
            href={`https://wa.me/${ADMIN_WHATSAPP}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-muted rounded-xl p-4 hover:bg-secondary transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">WhatsApp</p>
              <p className="text-xs text-muted-foreground">+55 11 99999-9999</p>
            </div>
          </a>
        </div>

        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CancelReservationDialog;
