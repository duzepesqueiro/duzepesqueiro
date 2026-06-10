import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { listUsers } from '../../../services/usersService';
import { getInventoryItems } from '../../../utils/inventoryService';
import { createAdminSale } from '../../../utils/salesManagementService';

const CreateSaleOrderModal = ({ isOpen, onClose, onCreated }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [values, setValues] = useState({ userId: '', note: '' });
  const [currentItem, setCurrentItem] = useState({ productId: '', quantity: 1 });
  const [items, setItems] = useState([]);

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
    setIsSubmitting(false);
    setError('');
    setValues({ userId: '', note: '' });
    setCurrentItem({ productId: '', quantity: 1 });
    setItems([]);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    Promise.all([listUsers(), getInventoryItems()])
      .then(([usersRes, productsRes]) => {
        if (!mounted) return;
        setUsers(Array.isArray(usersRes) ? usersRes : []);
        const arr = Array.isArray(productsRes) ? productsRes : [];
        const saleProducts = arr.filter((p) => {
          const status = String(p?.status || p?.productStatus || p?.source || '').toUpperCase();
          return status ? status.includes('SALE') : true;
        });
        setProducts(saleProducts);
      })
      .catch(() => {
        if (!mounted) return;
        setUsers([]);
        setProducts([]);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const userOptions = useMemo(() => {
    return (users || []).map((u) => ({
      value: u?.id,
      label: u?.nome || u?.name || u?.username || u?.email || u?.id,
    }));
  }, [users]);

  const productOptions = useMemo(() => {
    return (products || []).map((p) => ({
      value: p?.id,
      label: `${p?.sku ? `${p.sku} - ` : ''}${p?.name || p?.product || 'Produto'}`,
    }));
  }, [products]);

  const selectedProducts = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return items.map((item) => ({
      ...item,
      product: map.get(item.productId),
    }));
  }, [items, products]);

  const addItem = () => {
    setError('');
    const productId = String(currentItem.productId || '');
    const quantity = Number(currentItem.quantity || 0);
    if (!productId) {
      setError('Selecione um produto.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Quantidade inválida.');
      return;
    }
    const exists = items.some((item) => item.productId === productId);
    if (exists) {
      setError('Este produto já foi adicionado.');
      return;
    }
    setItems((prev) => [...prev, { productId, quantity }]);
    setCurrentItem({ productId: '', quantity: 1 });
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const submit = async () => {
    setError('');
    if (!values.userId) {
      setError('Selecione um cliente.');
      return;
    }
    if (!items.length) {
      setError('Adicione ao menos 1 item.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await createAdminSale({
        userId: values.userId,
        items: items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
        note: values.note || undefined,
      });
      onCreated?.(res?.data);
      onClose?.();
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data || err?.message || 'Falha ao criar venda.';
      setError(String(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !portalElement) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-card border border-border rounded-xl shadow-soft-lg">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Nova venda</h3>
            <p className="text-sm text-muted-foreground">Criação manual de pedido</p>
          </div>
          <Button variant="ghost" size="sm" iconName="X" onClick={onClose} />
        </div>

        <div className="p-6 space-y-5">
          {error ? <div className="text-sm text-error">{error}</div> : null}

          <Select
            label="Cliente"
            options={userOptions}
            value={values.userId}
            onChange={(value) => setValues((prev) => ({ ...prev, userId: value }))}
            placeholder="Selecione um cliente"
          />

          <Input
            label="Observação"
            value={values.note}
            onChange={(e) => setValues((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="Opcional"
          />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-7">
              <Select
                label="Produto"
                options={productOptions}
                value={currentItem.productId}
                onChange={(value) => setCurrentItem((prev) => ({ ...prev, productId: value }))}
                placeholder="Selecione um produto"
              />
            </div>
            <div className="md:col-span-3">
              <Input
                label="Quantidade"
                type="number"
                min="1"
                value={currentItem.quantity}
                onChange={(e) => setCurrentItem((prev) => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Button variant="outline" onClick={addItem} className="w-full" iconName="Plus">
                Adicionar
              </Button>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/40 px-4 py-3 text-sm font-medium text-foreground">Itens</div>
            <div className="divide-y divide-border">
              {selectedProducts.length ? (
                selectedProducts.map((row) => (
                  <div key={row.productId} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {row?.product?.name || row?.product?.product || 'Produto'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{row?.product?.sku || ''}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground">Qtd: {row.quantity}</div>
                      <Button variant="ghost" size="sm" iconName="Trash2" onClick={() => removeItem(row.productId)} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-muted-foreground">Nenhum item adicionado.</div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="default" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Criar venda'}
          </Button>
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default CreateSaleOrderModal;

