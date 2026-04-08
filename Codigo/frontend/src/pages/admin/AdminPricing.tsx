import { motion } from 'framer-motion';
import { useAdmin } from '@/contexts/AdminContext';
import { useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { PricingRule } from '@/types/admin';

const typeLabels: Record<string, string> = {
  season: 'Temporada', weekend: 'Final de Semana', holiday: 'Feriado', discount: 'Desconto',
};

const AdminPricing = () => {
  const { rooms, pricingRules, addPricingRule, updatePricingRule, deletePricingRule } = useAdmin();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [form, setForm] = useState({ name: '', type: 'season' as PricingRule['type'], startDate: '', endDate: '', modifier: 1.0, roomIds: [] as string[], active: true });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', type: 'season', startDate: '', endDate: '', modifier: 1.0, roomIds: [], active: true });
    setShowDialog(true);
  };

  const openEdit = (rule: PricingRule) => {
    setEditing(rule);
    setForm({ name: rule.name, type: rule.type, startDate: rule.startDate, endDate: rule.endDate, modifier: rule.modifier, roomIds: rule.roomIds, active: rule.active });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (editing) {
      updatePricingRule(editing.id, form);
    } else {
      addPricingRule({ ...form, id: `pr-${Date.now()}` });
    }
    setShowDialog(false);
  };

  const getModifierLabel = (m: number) => {
    if (m > 1) return `+${Math.round((m - 1) * 100)}%`;
    if (m < 1) return `-${Math.round((1 - m) * 100)}%`;
    return '0%';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Preços Dinâmicos</h1>
          <p className="text-muted-foreground text-sm mt-1">Alta/baixa temporada, finais de semana, feriados e descontos</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Regra</Button>
      </div>

      {/* Price Preview */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Simulação de Preços (hoje)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rooms.map(room => {
            const { getCalculatedPrice } = useAdmin();
            const today = new Date();
            const calculated = getCalculatedPrice(room.id, today);
            const diff = calculated - room.pricePerNight;
            return (
              <div key={room.id} className="p-4 bg-background rounded-lg border border-border">
                <p className="font-medium text-sm text-foreground">{room.name}</p>
                <p className="text-xs text-muted-foreground line-through">R$ {room.pricePerNight}</p>
                <p className="text-lg font-bold text-accent">R$ {calculated}</p>
                {diff !== 0 && (
                  <p className={`text-xs ${diff > 0 ? 'text-destructive' : 'text-primary'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Rules List */}
      <div className="space-y-3">
        {pricingRules.map((rule, i) => (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-5 flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <p className="font-medium text-foreground">{rule.name}</p>
                <Badge variant="outline">{typeLabels[rule.type]}</Badge>
                <Badge variant={rule.modifier > 1 ? 'destructive' : 'default'}>
                  {getModifierLabel(rule.modifier)}
                </Badge>
                {!rule.active && <Badge variant="secondary">Inativa</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {rule.type === 'weekend'
                  ? 'Aplicado automaticamente em sextas, sábados e domingos'
                  : `${rule.startDate} → ${rule.endDate}`}
                {rule.roomIds.length > 0
                  ? ` · ${rule.roomIds.length} chalé(s)`
                  : ' · Todos os chalés'}
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => updatePricingRule(rule.id, { active: !rule.active })}>
                {rule.active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => deletePricingRule(rule.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Regra' : 'Nova Regra de Preço'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as PricingRule['type'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="season">Temporada</SelectItem>
                  <SelectItem value="weekend">Final de Semana</SelectItem>
                  <SelectItem value="holiday">Feriado</SelectItem>
                  <SelectItem value="discount">Desconto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type !== 'weekend' && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Início</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div><Label>Fim</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
              </div>
            )}
            <div>
              <Label>Modificador de preço</Label>
              <div className="flex items-center gap-3">
                <Input type="number" step="0.05" min={0.1} max={3} value={form.modifier} onChange={e => setForm(f => ({ ...f, modifier: +e.target.value }))} />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {getModifierLabel(form.modifier)} (ex: 1.3 = +30%)
                </span>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={!form.name}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPricing;
