import { motion } from 'framer-motion';
import { useAdmin } from '@/contexts/AdminContext';
import { useState } from 'react';
import { Plus, LogIn, LogOut, Eye, Ban, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { AdminReservation } from '@/types/admin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminReservations = () => {
  const { rooms, reservations, addReservation, processCheckIn, processCheckOut, cancelReservation, markNoShow } = useAdmin();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [showNoShowAlert, setShowNoShowAlert] = useState(false);
  const [selectedRes, setSelectedRes] = useState<AdminReservation | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const [form, setForm] = useState({
    roomId: '', checkIn: '', checkOut: '', guestName: '', guestEmail: '',
    guestPhone: '', guestCpf: '', guests: 1, observations: '',
  });

  const handleCreate = () => {
    const room = rooms.find(r => r.id === form.roomId);
    if (!room) return;
    const ci = new Date(form.checkIn);
    const co = new Date(form.checkOut);
    const nights = Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)));
    const id = `RES-${String(Date.now()).slice(-6)}`;
    const reservation: AdminReservation = {
      id,
      bookingData: {
        roomId: form.roomId,
        checkIn: ci,
        checkOut: co,
        guests: form.guests,
        pets: false,
        guestDetails: [{ name: form.guestName, age: 0, address: { street: '', number: '', city: '', state: '', zip: '' } }],
        responsible: { name: form.guestName, email: form.guestEmail, phone: form.guestPhone, cpf: form.guestCpf },
        observations: form.observations,
      },
      paymentData: { method: null, status: 'idle' },
      status: 'confirmed',
      createdAt: new Date(),
      totalPrice: nights * room.pricePerNight,
    };
    addReservation(reservation);
    setShowCreateDialog(false);
    setForm({ roomId: '', checkIn: '', checkOut: '', guestName: '', guestEmail: '', guestPhone: '', guestCpf: '', guests: 1, observations: '' });
  };

  const getCancellationInfo = (res: AdminReservation) => {
    if (!res.bookingData.checkIn) return '';
    const daysUntil = Math.ceil((res.bookingData.checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 7) return `⚠️ Multa de 50% (R$ ${Math.round(res.totalPrice * 0.5)}) — menos de 7 dias`;
    if (daysUntil < 14) return `⚠️ Multa de 20% (R$ ${Math.round(res.totalPrice * 0.2)}) — menos de 14 dias`;
    return '✅ Sem multa — mais de 14 dias de antecedência';
  };

  const filtered = filter === 'all' ? reservations : reservations.filter(r => {
    if (filter === 'active') return r.status !== 'cancelled' && !r.checkOutAt;
    if (filter === 'checkedin') return !!r.checkInAt && !r.checkOutAt;
    if (filter === 'completed') return !!r.checkOutAt;
    if (filter === 'cancelled') return r.status === 'cancelled';
    return true;
  });

  const statusBadge = (res: AdminReservation) => {
    if (res.noShow) return <Badge variant="destructive">No-Show</Badge>;
    if (res.status === 'cancelled') return <Badge variant="destructive">Cancelada</Badge>;
    if (res.checkOutAt) return <Badge variant="secondary">Finalizada</Badge>;
    if (res.checkInAt) return <Badge className="bg-accent text-accent-foreground">Ocupado</Badge>;
    if (res.status === 'confirmed') return <Badge variant="default">Confirmada</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };

  const fmt = (d: Date | null) => d ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Gestão de Reservas</h1>
          <p className="text-muted-foreground text-sm mt-1">Check-in, check-out, reservas manuais e cancelamentos</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Reserva Manual
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all', l: 'Todas' }, { v: 'active', l: 'Ativas' },
          { v: 'checkedin', l: 'Check-in feito' }, { v: 'completed', l: 'Finalizadas' },
          { v: 'cancelled', l: 'Canceladas' },
        ].map(f => (
          <Button key={f.v} variant={filter === f.v ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f.v)}>
            {f.l}
          </Button>
        ))}
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Chalé</TableHead>
              <TableHead>Hóspede</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(res => {
              const room = rooms.find(r => r.id === res.bookingData.roomId);
              const canCheckIn = res.status !== 'cancelled' && !res.checkInAt && !res.noShow;
              const canCheckOut = !!res.checkInAt && !res.checkOutAt;
              const canCancel = res.status !== 'cancelled' && !res.checkOutAt;
              const canNoShow = res.status !== 'cancelled' && !res.checkInAt && !res.noShow;
              return (
                <TableRow key={res.id}>
                  <TableCell className="font-mono text-xs">{res.id}</TableCell>
                  <TableCell>{room?.name ?? '—'}</TableCell>
                  <TableCell>{res.bookingData.responsible.name}</TableCell>
                  <TableCell>{fmt(res.bookingData.checkIn)}</TableCell>
                  <TableCell>{fmt(res.bookingData.checkOut)}</TableCell>
                  <TableCell>{statusBadge(res)}</TableCell>
                  <TableCell>R$ {res.totalPrice.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" title="Detalhes" onClick={() => { setSelectedRes(res); setShowDetailDialog(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canCheckIn && (
                      <Button variant="ghost" size="icon" title="Check-in" onClick={() => processCheckIn(res.id)}>
                        <LogIn className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    {canCheckOut && (
                      <Button variant="ghost" size="icon" title="Check-out" onClick={() => processCheckOut(res.id)}>
                        <LogOut className="h-4 w-4 text-accent" />
                      </Button>
                    )}
                    {canCancel && (
                      <Button variant="ghost" size="icon" title="Cancelar" onClick={() => { setSelectedRes(res); setShowCancelAlert(true); }}>
                        <Ban className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    {canNoShow && (
                      <Button variant="ghost" size="icon" title="No-Show" onClick={() => { setSelectedRes(res); setShowNoShowAlert(true); }}>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes da Reserva</DialogTitle></DialogHeader>
          {selectedRes && (
            <div className="space-y-4 mt-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Código:</span><p className="font-mono font-medium">{selectedRes.id}</p></div>
                <div><span className="text-muted-foreground">Status:</span><div className="mt-1">{statusBadge(selectedRes)}</div></div>
                <div><span className="text-muted-foreground">Check-in:</span><p>{fmt(selectedRes.bookingData.checkIn)}</p></div>
                <div><span className="text-muted-foreground">Check-out:</span><p>{fmt(selectedRes.bookingData.checkOut)}</p></div>
                <div><span className="text-muted-foreground">Chalé:</span><p>{rooms.find(r => r.id === selectedRes.bookingData.roomId)?.name}</p></div>
                <div><span className="text-muted-foreground">Total:</span><p className="font-bold text-accent">R$ {selectedRes.totalPrice.toLocaleString('pt-BR')}</p></div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="font-medium text-foreground mb-2">Responsável</p>
                <p>{selectedRes.bookingData.responsible.name}</p>
                <p className="text-muted-foreground">{selectedRes.bookingData.responsible.email} · {selectedRes.bookingData.responsible.phone}</p>
                <p className="text-muted-foreground">CPF: {selectedRes.bookingData.responsible.cpf}</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="font-medium text-foreground mb-2">Hóspedes ({selectedRes.bookingData.guestDetails.length})</p>
                {selectedRes.bookingData.guestDetails.map((g, i) => (
                  <p key={i} className="text-muted-foreground">{g.name}{g.age ? `, ${g.age} anos` : ''}</p>
                ))}
              </div>
              {selectedRes.bookingData.observations && (
                <div className="border-t border-border pt-3">
                  <p className="font-medium text-foreground mb-1">Observações</p>
                  <p className="text-muted-foreground">{selectedRes.bookingData.observations}</p>
                </div>
              )}
              {selectedRes.cancellationPenalty && (
                <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">{selectedRes.cancellationPenalty}</p>
                </div>
              )}
              {selectedRes.checkInAt && (
                <p className="text-xs text-muted-foreground">Check-in realizado: {format(selectedRes.checkInAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
              )}
              {selectedRes.checkOutAt && (
                <p className="text-xs text-muted-foreground">Check-out realizado: {format(selectedRes.checkOutAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Alert */}
      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Reserva {selectedRes?.id}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta ação aplica as regras de cancelamento da Lei do Turismo.</p>
              {selectedRes && <p className="font-medium">{getCancellationInfo(selectedRes)}</p>}
              <p className="text-xs text-muted-foreground mt-2">
                Política: Cancelamento gratuito com +14 dias de antecedência. Multa de 20% entre 7-14 dias. Multa de 50% com menos de 7 dias.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (selectedRes) cancelReservation(selectedRes.id); setShowCancelAlert(false); }} className="bg-destructive text-destructive-foreground">
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* No-Show Alert */}
      <AlertDialog open={showNoShowAlert} onOpenChange={setShowNoShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar No-Show para {selectedRes?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              <p>O hóspede não compareceu na data de check-in.</p>
              <p className="font-medium mt-2">Consequência: Cobrança integral do valor da reserva (R$ {selectedRes?.totalPrice.toLocaleString('pt-BR')}) conforme política de não comparecimento.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (selectedRes) markNoShow(selectedRes.id); setShowNoShowAlert(false); }} className="bg-destructive text-destructive-foreground">
              Registrar No-Show
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Manual Reservation */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Reserva Manual</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Chalé</Label>
              <Select value={form.roomId} onValueChange={v => setForm(f => ({ ...f, roomId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Check-in</Label><Input type="date" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} /></div>
              <div><Label>Check-out</Label><Input type="date" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} /></div>
            </div>
            <div><Label>Nº de Hóspedes</Label><Input type="number" min={1} value={form.guests} onChange={e => setForm(f => ({ ...f, guests: +e.target.value }))} /></div>
            <div><Label>Nome do Hóspede</Label><Input value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input value={form.guestEmail} onChange={e => setForm(f => ({ ...f, guestEmail: e.target.value }))} /></div>
              <div><Label>Telefone</Label><Input value={form.guestPhone} onChange={e => setForm(f => ({ ...f, guestPhone: e.target.value }))} /></div>
            </div>
            <div><Label>CPF</Label><Input value={form.guestCpf} onChange={e => setForm(f => ({ ...f, guestCpf: e.target.value }))} /></div>
            <div><Label>Observações</Label><Textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} /></div>
            <Button onClick={handleCreate} className="w-full" disabled={!form.roomId || !form.checkIn || !form.checkOut || !form.guestName}>
              Criar Reserva
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReservations;
