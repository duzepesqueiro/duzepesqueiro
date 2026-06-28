import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Copy } from 'lucide-react';
import Header from '@/components/common/layout/Header';
import { useBooking } from '@/contexts/BookingContext';
import { toast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/currency';

const ConfirmationPage = () => {
  const navigate = useNavigate();
  const { reservations, resetBooking } = useBooking();
  const latest = reservations[0];

  if (!latest) {
    return (
      <div className="min-h-screen bg-background pt-24 text-center">
        <Header />
        <div className="duze-container">
          <p className="text-muted-foreground mt-16">Nenhuma reserva encontrada.</p>
        </div>
      </div>
    );
  }

  const copyCode = () => {
    navigator.clipboard.writeText(latest.id);
    toast({ title: 'Código copiado!' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="duze-container max-w-lg text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mb-6"
          >
            <CheckCircle2 className="h-24 w-24 text-primary mx-auto" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              {latest.status === 'confirmed' ? 'Reserva Confirmada!' : 'Reserva Pendente'}
            </h1>
            <p className="text-muted-foreground mb-8">
              {latest.status === 'confirmed'
                ? 'Sua reserva foi confirmada com sucesso.'
                : 'Sua reserva foi registrada e está aguardando finalização.'}
            </p>

            <div className="bg-card rounded-2xl p-6 text-left space-y-4" style={{ boxShadow: 'var(--shadow-elevated)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Código da reserva</span>
                <button onClick={copyCode} className="flex items-center gap-1 text-sm font-mono text-foreground font-bold hover:text-primary">
                  {latest.id} <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`text-sm font-semibold ${latest.status === 'confirmed' ? 'text-primary' : 'text-accent'}`}>
                  {latest.status === 'confirmed' ? '✅ Confirmada' : '⏳ Pendente'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">{formatBRL(latest.totalPrice)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={() => navigate('/hospedagem/my-reservations')}
                className="btn-gold flex-1 text-sm"
              >
                Ver minhas reservas
              </button>
              <button
                onClick={() => { resetBooking(); navigate('/hospedagem'); }}
                className="flex-1 text-sm font-medium text-foreground border border-border rounded-lg px-4 py-3 hover:bg-muted transition-colors"
              >
                Voltar ao início
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default ConfirmationPage;
