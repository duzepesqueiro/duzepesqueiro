import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { cancelAdminSale, confirmAdminSale, getAdminSale, updateAdminSale } from '../../../utils/salesManagementService';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const SaleOrderDetailsModal = ({ isOpen, saleId, onClose, onChanged }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const portalElement = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const existingPortal = document.getElementById('sales-modal-portal');
    if (existingPortal) return existingPortal;
    const portal = document.createElement('div');
    portal.setAttribute('id', 'sales-modal-portal');
    document.body.appendChild(portal);
    return portal;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setNote('');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !saleId) return;
    let mounted = true;
    getAdminSale(saleId)
      .then((res) => {
        if (!mounted) return;
        const data = res?.data;
        setOrder(data);
        setNote(data?.note || '');
      })
      .catch((err) => {
        if (!mounted) return;
        const message = err?.response?.data?.message || err?.response?.data || err?.message || 'Falha ao carregar a venda.';
        setError(String(message));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen, saleId]);

  const buyerName = useMemo(() => {
    return (
      order?.user?.profile?.fullName ||
      order?.user?.username ||
      order?.user?.emails?.[0]?.email ||
      order?.userId ||
      '-'
    );
  }, [order]);

  const statusLabel = useMemo(() => {
    const raw = String(order?.status || '').toUpperCase();
    if (raw === 'CONFIRMED') return 'Efetivada';
    if (raw === 'CANCELLED') return 'Cancelada';
    return 'Pendente';
  }, [order]);

  const canConfirm = statusLabel === 'Pendente' && String(order?.status || '').toUpperCase() !== 'CANCELLED';
  const canCancel = statusLabel === 'Pendente' && String(order?.paymentStatus || '').toUpperCase() === 'PENDING';

  const saveNote = async () => {
    if (!saleId) return;
    setSaving(true);
    setError('');
    try {
      await updateAdminSale(saleId, { note });
      onChanged?.();
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data || err?.message || 'Falha ao salvar.';
      setError(String(message));
    } finally {
      setSaving(false);
    }
  };

  const confirm = async () => {
    if (!saleId) return;
    setSaving(true);
    setError('');
    try {
      await confirmAdminSale(saleId);
      onChanged?.();
      onClose?.();
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data || err?.message || 'Falha ao confirmar.';
      setError(String(message));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!saleId) return;
    setSaving(true);
    setError('');
    try {
      await cancelAdminSale(saleId);
      onChanged?.();
      onClose?.();
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data || err?.message || 'Falha ao cancelar.';
      setError(String(message));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !portalElement) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-3xl mx-4 bg-card border border-border rounded-xl shadow-soft-lg">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Detalhes da venda</h3>
            <p className="text-sm text-muted-foreground">{saleId}</p>
          </div>
          <Button variant="ghost" size="sm" iconName="X" onClick={onClose} />
        </div>

        <div className="p-6 space-y-5">
          {error ? <div className="text-sm text-error">{error}</div> : null}
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-sm text-muted-foreground">Cliente</div>
                  <div className="font-medium text-foreground truncate">{buyerName}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="font-medium text-foreground">{statusLabel}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="font-medium text-foreground">{formatCurrency(order?.totalAmount)}</div>
                </div>
              </div>

              <Input
                label="Observação"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Opcional"
              />

              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/40 px-4 py-3 text-sm font-medium text-foreground">Itens</div>
                <div className="divide-y divide-border">
                  {(order?.items || []).length ? (
                    (order.items || []).map((item) => (
                      <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{item?.nameSnapshot}</div>
                          <div className="text-xs text-muted-foreground truncate">{item?.product?.sku || ''}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.subtotal)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-muted-foreground">Nenhum item.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={saveNote} disabled={saving || loading}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="text-success border-success hover:bg-success/10"
              onClick={confirm}
              disabled={saving || loading || !canConfirm}
              iconName="CheckCircle"
            >
              Confirmar
            </Button>
            <Button
              variant="outline"
              className="text-error border-error hover:bg-error/10"
              onClick={cancel}
              disabled={saving || loading || !canCancel}
              iconName="XCircle"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default SaleOrderDetailsModal;

