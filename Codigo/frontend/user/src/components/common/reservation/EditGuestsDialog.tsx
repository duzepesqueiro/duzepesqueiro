import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import type { Guest } from '@/types/booking';

interface EditGuestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: Guest[];
  maxCapacity: number;
  onSave: (guests: Guest[]) => void;
}

const EditGuestsDialog = ({ open, onOpenChange, guests, maxCapacity, onSave }: EditGuestsDialogProps) => {
  const [editGuests, setEditGuests] = useState<Guest[]>(guests.map(g => ({ ...g, address: { ...g.address } })));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateGuest = (index: number, field: string, value: string | number) => {
    setEditGuests(prev => {
      const g = [...prev];
      if (field.startsWith('address.')) {
        const addrField = field.split('.')[1];
        g[index] = { ...g[index], address: { ...g[index].address, [addrField]: value } };
      } else {
        g[index] = { ...g[index], [field]: value };
      }
      return g;
    });
    setErrors(prev => {
      const copy = { ...prev };
      delete copy[`${index}-${field}`];
      return copy;
    });
  };

  const addGuest = () => {
    if (editGuests.length >= maxCapacity) {
      toast({ title: 'Limite atingido', description: `Capacidade máxima: ${maxCapacity} hóspede(s).`, variant: 'destructive' });
      return;
    }
    setEditGuests(prev => [...prev, { name: '', age: 0, document: '', address: { street: '', number: '', city: '', state: '', zip: '' } }]);
  };

  const removeGuest = (index: number) => {
    if (editGuests.length <= 1) return;
    setEditGuests(prev => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    editGuests.forEach((g, i) => {
      if (!g.name.trim()) newErrors[`${i}-name`] = 'Nome obrigatório';
      if (!g.age || g.age <= 0) newErrors[`${i}-age`] = 'Idade inválida';
      if (!g.address.street.trim()) newErrors[`${i}-address.street`] = 'Rua obrigatória';
      if (!g.address.number.trim()) newErrors[`${i}-address.number`] = 'Número obrigatório';
      if (!g.address.city.trim()) newErrors[`${i}-address.city`] = 'Cidade obrigatória';
      if (!g.address.state.trim()) newErrors[`${i}-address.state`] = 'Estado obrigatório';
      if (!g.address.zip.trim()) newErrors[`${i}-address.zip`] = 'CEP obrigatório';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      toast({ title: 'Dados incompletos', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    onSave(editGuests);
    onOpenChange(false);
    toast({ title: 'Hóspedes atualizados', description: 'Os dados dos hóspedes foram salvos com sucesso.' });
  };

  const fieldError = (key: string) => errors[key] ? <p className="text-xs text-destructive mt-0.5">{errors[key]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Editar Hóspedes</DialogTitle>
          <p className="text-sm text-muted-foreground">Você pode alterar os dados dos hóspedes. O responsável pela reserva não pode ser editado.</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {editGuests.map((guest, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border border-border rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground text-sm">Hóspede {i + 1}</h4>
                {editGuests.length > 1 && (
                  <button onClick={() => removeGuest(i)} className="text-xs text-destructive hover:underline">Remover</button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground text-xs">Nome completo *</Label>
                  <Input value={guest.name} onChange={e => updateGuest(i, 'name', e.target.value)} className={errors[`${i}-name`] ? 'border-destructive' : ''} />
                  {fieldError(`${i}-name`)}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Idade *</Label>
                  <Input type="number" min={0} value={guest.age || ''} onChange={e => updateGuest(i, 'age', Number(e.target.value))} className={errors[`${i}-age`] ? 'border-destructive' : ''} />
                  {fieldError(`${i}-age`)}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Documento (opcional)</Label>
                  <Input value={guest.document || ''} onChange={e => updateGuest(i, 'document', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground text-xs">Rua *</Label>
                  <Input value={guest.address.street} onChange={e => updateGuest(i, 'address.street', e.target.value)} className={errors[`${i}-address.street`] ? 'border-destructive' : ''} />
                  {fieldError(`${i}-address.street`)}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Número *</Label>
                  <Input value={guest.address.number} onChange={e => updateGuest(i, 'address.number', e.target.value)} className={errors[`${i}-address.number`] ? 'border-destructive' : ''} />
                  {fieldError(`${i}-address.number`)}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Cidade *</Label>
                  <Input value={guest.address.city} onChange={e => updateGuest(i, 'address.city', e.target.value)} className={errors[`${i}-address.city`] ? 'border-destructive' : ''} />
                  {fieldError(`${i}-address.city`)}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Estado *</Label>
                  <Input value={guest.address.state} onChange={e => updateGuest(i, 'address.state', e.target.value)} className={errors[`${i}-address.state`] ? 'border-destructive' : ''} />
                  {fieldError(`${i}-address.state`)}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">CEP *</Label>
                  <Input value={guest.address.zip} onChange={e => updateGuest(i, 'address.zip', e.target.value.replace(/\D/g, '').slice(0, 8))} className={errors[`${i}-address.zip`] ? 'border-destructive' : ''} placeholder="00000000" />
                  {fieldError(`${i}-address.zip`)}
                </div>
              </div>
            </motion.div>
          ))}
          <button onClick={addGuest} className="text-sm text-primary font-medium hover:underline">+ Adicionar hóspede</button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditGuestsDialog;
