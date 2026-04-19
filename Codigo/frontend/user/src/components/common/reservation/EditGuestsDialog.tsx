import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import type { Guest } from '@/types/booking';

const FULL_NAME_REGEX = /^[A-Za-zÀ-ÿ]+(?:[ '\-][A-Za-zÀ-ÿ]+)+$/;
const STREET_REGEX = /^[A-Za-zÀ-ÿ0-9]+(?:[ '\-][A-Za-zÀ-ÿ0-9]+)+$/;
const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const CEP_REGEX = /^\d{5}-\d{3}$/;

const BRAZIL_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
] as const;

const normalizeDigits = (value: string) => value.replace(/\D/g, '');

const formatCpf = (value: string) => {
  const digits = normalizeDigits(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatCep = (value: string) => {
  const digits = normalizeDigits(value).slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

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
      else if (!FULL_NAME_REGEX.test(g.name.trim())) newErrors[`${i}-name`] = 'Informe nome e sobrenome';

      if (!g.age || g.age <= 0) newErrors[`${i}-age`] = 'Idade inválida';
      else if (i === 0 && g.age < 18) newErrors[`${i}-age`] = 'O hóspede principal precisa ter pelo menos 18 anos';

      if (!g.document.trim()) newErrors[`${i}-document`] = 'CPF obrigatório';
      else if (!CPF_REGEX.test(g.document.trim())) newErrors[`${i}-document`] = 'CPF inválido';

      if (!g.address.street.trim()) newErrors[`${i}-address.street`] = 'Rua obrigatória';
      else if (!STREET_REGEX.test(g.address.street.trim())) newErrors[`${i}-address.street`] = 'Informe rua e complemento com pelo menos duas palavras';

      if (!g.address.number.trim()) newErrors[`${i}-address.number`] = 'Número obrigatório';
      if (!g.address.city.trim()) newErrors[`${i}-address.city`] = 'Cidade obrigatória';
      if (!g.address.state.trim()) newErrors[`${i}-address.state`] = 'Estado obrigatório';
      else if (!BRAZIL_STATES.some((state) => state.value === g.address.state)) newErrors[`${i}-address.state`] = 'Selecione um estado válido';

      if (!g.address.zip.trim()) newErrors[`${i}-address.zip`] = 'CEP obrigatório';
      else if (!CEP_REGEX.test(g.address.zip.trim())) newErrors[`${i}-address.zip`] = 'CEP inválido. Use 00000-000';
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
                  <Input value={guest.name} onChange={e => updateGuest(i, 'name', e.target.value)} className={errors[`${i}-name`] ? 'border-destructive' : ''} placeholder="Nome e sobrenome" />
                  {fieldError(`${i}-name`)}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Idade *</Label>
                  <Input type="number" min={0} value={guest.age || ''} onChange={e => updateGuest(i, 'age', Number(e.target.value))} className={errors[`${i}-age`] ? 'border-destructive' : ''} />
                  {fieldError(`${i}-age`)}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">CPF *</Label>
                  <Input value={guest.document || ''} onChange={e => updateGuest(i, 'document', formatCpf(e.target.value))} className={errors[`${i}-document`] ? 'border-destructive' : ''} placeholder="000.000.000-00" inputMode="numeric" />
                  {fieldError(`${i}-document`)}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground text-xs">Rua *</Label>
                  <Input value={guest.address.street} onChange={e => updateGuest(i, 'address.street', e.target.value)} className={errors[`${i}-address.street`] ? 'border-destructive' : ''} placeholder="Rua e complemento" />
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
                  <Select value={guest.address.state} onValueChange={(value) => updateGuest(i, 'address.state', value)}>
                    <SelectTrigger className={errors[`${i}-address.state`] ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZIL_STATES.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldError(`${i}-address.state`)}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">CEP *</Label>
                  <Input value={guest.address.zip} onChange={e => updateGuest(i, 'address.zip', formatCep(e.target.value))} className={errors[`${i}-address.zip`] ? 'border-destructive' : ''} placeholder="00000-000" inputMode="numeric" />
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
