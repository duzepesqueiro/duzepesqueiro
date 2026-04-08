import { motion } from 'framer-motion';
import { useAdmin } from '@/contexts/AdminContext';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Room } from '@/types/booking';
import type { DateBlock } from '@/types/admin';

const emptyRoom: Omit<Room, 'id'> = {
  name: '', type: 'standard', description: '', capacity: 2,
  pricePerNight: 200, amenities: [], petFriendly: false, images: [],
  beds: '', bathroom: '', extras: [], rules: [], unavailableDates: [],
};

const AdminRooms = () => {
  const { rooms, addRoom, updateRoom, deleteRoom, dateBlocks, addDateBlock, removeDateBlock, getRoomStatus } = useAdmin();
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState<Omit<Room, 'id'>>(emptyRoom);
  const [amenitiesInput, setAmenitiesInput] = useState('');
  const [blockForm, setBlockForm] = useState({ roomId: '', startDate: '', endDate: '', reason: 'maintenance' as DateBlock['reason'], notes: '' });

  const openCreateRoom = () => {
    setEditingRoom(null);
    setRoomForm(emptyRoom);
    setAmenitiesInput('');
    setShowRoomDialog(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({ ...room });
    setAmenitiesInput(room.amenities.join(', '));
    setShowRoomDialog(true);
  };

  const handleSaveRoom = () => {
    const data = { ...roomForm, amenities: amenitiesInput.split(',').map(a => a.trim()).filter(Boolean) };
    if (editingRoom) {
      updateRoom(editingRoom.id, data);
    } else {
      addRoom({ ...data, id: `room-${Date.now()}` });
    }
    setShowRoomDialog(false);
  };

  const handleSaveBlock = () => {
    addDateBlock({ ...blockForm, id: `block-${Date.now()}` });
    setShowBlockDialog(false);
    setBlockForm({ roomId: '', startDate: '', endDate: '', reason: 'maintenance', notes: '' });
  };

  const statusLabels: Record<string, string> = { free: 'Livre', occupied: 'Ocupado', reserved: 'Reservado', blocked: 'Bloqueado' };
  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    free: 'default', occupied: 'secondary', reserved: 'outline', blocked: 'destructive',
  };
  const reasonLabels: Record<string, string> = {
    maintenance: 'Manutenção', cleaning: 'Limpeza', administrative: 'Administrativo', interdiction: 'Interdição',
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Gerenciamento de Chalés</h1>
          <p className="text-muted-foreground text-sm mt-1">CRUD completo e bloqueio de datas</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowBlockDialog(true)} variant="outline" size="sm">
            <Lock className="h-4 w-4 mr-1" /> Bloquear Datas
          </Button>
          <Button onClick={openCreateRoom} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Chalé
          </Button>
        </div>
      </div>

      {/* Rooms Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Capacidade</TableHead>
              <TableHead>Diária</TableHead>
              <TableHead>Pets</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map(room => {
              const status = getRoomStatus(room.id);
              return (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.name}</TableCell>
                  <TableCell className="capitalize">{room.type}</TableCell>
                  <TableCell>{room.capacity}</TableCell>
                  <TableCell>R$ {room.pricePerNight}</TableCell>
                  <TableCell>{room.petFriendly ? '✅' : '❌'}</TableCell>
                  <TableCell><Badge variant={statusVariant[status]}>{statusLabels[status]}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditRoom(room)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteRoom(room.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>

      {/* Date Blocks */}
      {dateBlocks.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Bloqueios Ativos</h3>
          <div className="space-y-3">
            {dateBlocks.map(block => {
              const room = rooms.find(r => r.id === block.roomId);
              return (
                <div key={block.id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                  <div>
                    <p className="text-sm font-medium text-foreground">{room?.name ?? block.roomId}</p>
                    <p className="text-xs text-muted-foreground">
                      {block.startDate} → {block.endDate} · {reasonLabels[block.reason]}
                    </p>
                    {block.notes && <p className="text-xs text-muted-foreground mt-1">{block.notes}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeDateBlock(block.id)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Room Dialog */}
      <Dialog open={showRoomDialog} onOpenChange={setShowRoomDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Editar Chalé' : 'Novo Chalé'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nome</Label>
              <Input value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={roomForm.type} onValueChange={v => setRoomForm(f => ({ ...f, type: v as Room['type'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="deluxe">Deluxe</SelectItem>
                    <SelectItem value="suite">Suíte</SelectItem>
                    <SelectItem value="cabin">Chalé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Capacidade</Label>
                <Input type="number" min={1} value={roomForm.capacity} onChange={e => setRoomForm(f => ({ ...f, capacity: +e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={roomForm.description} onChange={e => setRoomForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço/noite (R$)</Label>
                <Input type="number" min={0} value={roomForm.pricePerNight} onChange={e => setRoomForm(f => ({ ...f, pricePerNight: +e.target.value }))} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={roomForm.petFriendly} onCheckedChange={v => setRoomForm(f => ({ ...f, petFriendly: v }))} />
                <Label>Aceita pets</Label>
              </div>
            </div>
            <div>
              <Label>Camas</Label>
              <Input value={roomForm.beds} onChange={e => setRoomForm(f => ({ ...f, beds: e.target.value }))} />
            </div>
            <div>
              <Label>Banheiro</Label>
              <Input value={roomForm.bathroom} onChange={e => setRoomForm(f => ({ ...f, bathroom: e.target.value }))} />
            </div>
            <div>
              <Label>Comodidades (separadas por vírgula)</Label>
              <Input value={amenitiesInput} onChange={e => setAmenitiesInput(e.target.value)} placeholder="Wi-Fi, Ar condicionado, TV" />
            </div>
            <Button onClick={handleSaveRoom} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Datas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Chalé</Label>
              <Select value={blockForm.roomId} onValueChange={v => setBlockForm(f => ({ ...f, roomId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Início</Label>
                <Input type="date" value={blockForm.startDate} onChange={e => setBlockForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="date" value={blockForm.endDate} onChange={e => setBlockForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Motivo</Label>
              <Select value={blockForm.reason} onValueChange={v => setBlockForm(f => ({ ...f, reason: v as DateBlock['reason'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="cleaning">Limpeza</SelectItem>
                  <SelectItem value="administrative">Administrativo</SelectItem>
                  <SelectItem value="interdiction">Interdição</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={blockForm.notes} onChange={e => setBlockForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <Button onClick={handleSaveBlock} className="w-full" disabled={!blockForm.roomId || !blockForm.startDate || !blockForm.endDate}>
              Bloquear
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRooms;
