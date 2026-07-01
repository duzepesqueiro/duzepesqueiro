import React, { useState, useMemo, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { createSaleItem, updateSaleItem, deleteSaleItem, listSuppliers, createSupplier, uploadProductImages } from '../../../utils/inventoryService';
import { createRentalItem } from '../../../utils/rentalService';

const InventoryDataTable = ({ items, loading, error, searchTerm, onSearchChange, onRefresh }) => {
  const [sortField, setSortField] = useState('recent');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const productsData = Array.isArray(items) ? items : [];
  const [modalProduct, setModalProduct] = useState(null);
  const [modalType, setModalType] = useState(null); // 'create' | 'edit' | 'view'
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    cnpj: '',
    rating: 4,
  });
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);
  const [productImageFiles, setProductImageFiles] = useState([]);
  const [productImagePreviews, setProductImagePreviews] = useState([]);
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const imageInputRef = useRef(null);

  const categoryOptions = [
    { value: 'all', label: 'Todas as Categorias' },
    { value: 'Equipamentos de Pesca', label: 'Equipamentos de Pesca' },
    { value: 'Alimentos', label: 'Alimentos' },
    { value: 'Bebidas', label: 'Bebidas' },
    { value: 'Acessórios', label: 'Acessórios' },
    { value: 'Equipamentos para Aluguel', label: 'Equipamentos para Aluguel' },
    { value: 'Itens para Eventos', label: 'Itens para Eventos' },
    { value: 'Itens para Hospedagem', label: 'Itens para Hospedagem' },
    { value: 'Material de Limpeza', label: 'Material de Limpeza' },
    { value: 'Outros', label: 'Outros' }
  ];

  const tableColumns = [
    { key: 'sku', label: 'SKU' },
    { key: 'product', label: 'Produto' },
    { key: 'category', label: 'Categoria' },
    { key: 'currentStock', label: 'Estoque Atual' },
    { key: 'status', label: 'Status' },
  ];

  const CATEGORY_MAP = {
    enumToPt: {
      FISHING_EQUIPMENT: 'Equipamentos de Pesca',
      FOOD: 'Alimentos',
      RENTAL_EQUIPMENT: 'Equipamentos para Aluguel',
      EVENT_ITEM: 'Itens para Eventos',
      HOSTING_ITEM: 'Itens para Hospedagem',
      DRINK: 'Bebidas',
      ACCESSORY: 'Acessórios',
      CLEANING_MATERIAL: 'Material de Limpeza',
      OTHER: 'Outros',
    },
    ptToEnum: {
      'Equipamentos de Pesca': 'FISHING_EQUIPMENT',
      'Alimentos': 'FOOD',
      'Equipamentos para Aluguel': 'RENTAL_EQUIPMENT',
      'Itens para Eventos': 'EVENT_ITEM',
      'Itens para Hospedagem': 'HOSTING_ITEM',
      'Bebidas': 'DRINK',
      'Acessórios': 'ACCESSORY',
      'Material de Limpeza': 'CLEANING_MATERIAL',
      'Outros': 'OTHER',
    },
  };

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
    [suppliers],
  );

  const fetchSuppliers = async () => {
    setSuppliersLoading(true);
    try {
      const response = await listSuppliers();
      const rows = Array.isArray(response?.items) ? response.items : [];
      setSuppliers(rows);
    } catch {
      setSuppliers([]);
    } finally {
      setSuppliersLoading(false);
    }
  };

  const openSupplierModal = () => {
    setSupplierForm({
      name: '',
      cnpj: '',
      rating: 4,
    });
    setSupplierModalOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name?.trim() || !supplierForm.cnpj?.trim()) {
      alert('Nome e CNPJ são obrigatórios para cadastrar fornecedor.');
      return;
    }
    setSupplierSubmitting(true);
    try {
      const created = await createSupplier({
        name: supplierForm.name.trim(),
        cnpj: supplierForm.cnpj.replace(/\D/g, ''),
        rating: Number(supplierForm.rating) || 4,
      });
      await fetchSuppliers();
      setSupplierModalOpen(false);
      if (created?.id && modalProduct && modalType !== 'view') {
        setModalProduct((prev) => ({
          ...prev,
          supplierId: created.id,
          supplier: created.name || prev.supplier,
        }));
      }
    } catch (err) {
      const message = err?.response?.data?.message;
      alert(Array.isArray(message) ? message.join(', ') : message || 'Não foi possível cadastrar fornecedor.');
    } finally {
      setSupplierSubmitting(false);
    }
  };

  const applySelectedImages = (incomingFiles) => {
    const files = Array.from(incomingFiles || []);
    if (!files.length) {
      setProductImageFiles([]);
      setProductImagePreviews(Array.isArray(modalProduct?.images) ? modalProduct.images : (modalProduct?.image ? [modalProduct.image] : []));
      return;
    }
    if (files.length > 10) {
      alert('Selecione no máximo 10 imagens.');
      return;
    }
    for (const file of files) {
      if (!file.type?.startsWith('image/')) {
        alert('Selecione apenas arquivos de imagem válidos.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('Cada imagem deve ter no máximo 2MB.');
        return;
      }
    }
    setProductImageFiles(files);
    setProductImagePreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleProductImageSelect = (event) => {
    applySelectedImages(event?.target?.files);
  };

  const handleDropImages = (event) => {
    event.preventDefault();
    if (modalType === 'view' || productSubmitting) {
      return;
    }
    setIsImageDragOver(false);
    applySelectedImages(event?.dataTransfer?.files);
  };

  const openImagePicker = () => {
    if (modalType === 'view' || productSubmitting) {
      return;
    }
    imageInputRef.current?.click();
  };

  const removeSelectedImage = (indexToRemove) => {
    setProductImagePreviews((prev) => prev.filter((_, index) => index !== indexToRemove));
    setProductImageFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const renderImageUploader = () => (
    <div className="md:col-span-2 rounded-xl border border-dashed border-border bg-muted/20 p-4">
      <div
        role="button"
        tabIndex={0}
        onClick={openImagePicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openImagePicker();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!productSubmitting && modalType !== 'view') {
            setIsImageDragOver(true);
          }
        }}
        onDragLeave={() => setIsImageDragOver(false)}
        onDrop={handleDropImages}
        className={`rounded-lg border-2 border-dashed p-6 transition-all ${
          isImageDragOver ? 'border-primary bg-primary/5' : 'border-border bg-background'
        } ${modalType === 'view' ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={modalType === 'view' || productSubmitting}
          onChange={handleProductImageSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Icon name="ImagePlus" size={22} />
          </div>
          <p className="text-sm font-medium text-foreground">
            Arraste imagens aqui ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WEBP ou GIF • até 2MB por imagem • máximo 10 imagens
          </p>
          {modalType !== 'view' ? (
            <Button variant="outline" size="sm" iconName="Upload" className="mt-2">
              Selecionar Imagens
            </Button>
          ) : null}
        </div>
      </div>
      {productImagePreviews?.length ? (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {productImagePreviews.map((preview, index) => (
            <div key={`${preview}-${index}`} className="relative rounded-md overflow-hidden border border-border bg-background">
              <img
                src={preview}
                alt={`Pré-visualização ${index + 1}`}
                className="h-20 w-full object-cover"
              />
              {modalType !== 'view' ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeSelectedImage(index);
                  }}
                  className="absolute right-1 top-1 h-5 w-5 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-black"
                >
                  <Icon name="X" size={12} />
                </button>
              ) : null}
              <span className="absolute left-1 top-1 text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white">
                {index + 1}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    return () => {
      productImagePreviews.forEach((preview) => {
        if (preview?.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [productImagePreviews]);

  // Filtragem e ordenação
  const filteredAndSortedData = useMemo(() => {
    const safeLower = (val) => (typeof val === 'string' ? val.toLowerCase() : '');
    const getCategoryPt = (item) => {
      const raw = item?.category;
      if (raw) return CATEGORY_MAP.enumToPt[raw] || raw;
      // Fallbacks for unified inventory items
      if (item?.source === 'RENTAL') return 'Equipamentos para Aluguel';
      return 'Equipamentos de Pesca';
    };
    const getTypePt = (item) => (item?.source === 'RENTAL' ? 'Aluguel' : 'Venda');

    let filtered = (Array.isArray(productsData) ? productsData : []).filter((item) => {
      const name = item?.product ?? item?.name ?? '';
      const sku = item?.sku ?? '';
      const supplier = item?.supplier ?? '';
      const typeLabel = getTypePt(item);
      const matchesSearch =
        safeLower(name).includes(safeLower(searchTerm)) ||
        safeLower(sku).includes(safeLower(searchTerm)) ||
        safeLower(supplier).includes(safeLower(searchTerm)) ||
        safeLower(typeLabel).includes(safeLower(searchTerm));
      const itemCategoryPt = getCategoryPt(item);
      const matchesCategory =
        selectedCategory === 'all' ||
        itemCategoryPt === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
      let aValue;
      let bValue;
      if (sortField === 'recent') {
        const aTime = new Date(a?.updatedAt ?? a?.createdAt ?? 0).getTime();
        const bTime = new Date(b?.updatedAt ?? b?.createdAt ?? 0).getTime();
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
      } else if (sortField === 'product') {
        aValue = a?.product ?? a?.name ?? '';
        bValue = b?.product ?? b?.name ?? '';
      } else if (sortField === 'category') {
        aValue = getCategoryPt(a);
        bValue = getCategoryPt(b);
      } else {
        aValue = a?.[sortField] ?? '';
        bValue = b?.[sortField] ?? '';
      }
      aValue = typeof aValue === 'string' ? aValue.toLowerCase() : aValue;
      bValue = typeof bValue === 'string' ? bValue.toLowerCase() : bValue;
      return sortDirection === 'asc'
        ? aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        : aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    });

    return filtered;
  }, [productsData, searchTerm, selectedCategory, sortField, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [productsData, searchTerm, selectedCategory]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  const openModal = (type, product = null) => {
    setModalType(type);
    setProductImageFiles([]);
    if (product) {
      const categoryPt = (() => {
        if (product?.category) return CATEGORY_MAP.enumToPt[product.category] || product.category;
        return product?.source === 'RENTAL' ? 'Equipamentos para Aluguel' : 'Equipamentos de Pesca';
      })();
      const matchedSupplier = suppliers.find(
        (item) =>
          item.id === product?.supplierId ||
          String(item.name || '').trim().toLowerCase() === String(product?.supplier || '').trim().toLowerCase(),
      );
      setModalProduct({
        ...product,
        product: product?.product ?? product?.name ?? '',
        category: categoryPt,
        registrationType: product?.source === 'RENTAL' ? 'Aluguel' : 'Venda',
        currentStock: product?.stock ?? product?.currentStock ?? 0,
        minThreshold: Number(product?.minThreshold ?? 0),
        suggestedQuantity: Number(product?.suggestedQuantity ?? product?.minThreshold ?? 0),
        supplierId: matchedSupplier?.id ?? product?.supplierId ?? '',
        supplier: matchedSupplier?.name ?? product?.supplier ?? '',
        description: product?.description || '',
        hourlyPrice: '',
        available: '',
        image: product.image || '',
        fullDescription: product?.description || ''
      });
      const existingImages = Array.isArray(product?.images) && product.images.length
        ? product.images
        : (product?.image ? [product.image] : []);
      setProductImagePreviews(existingImages);
    } else {
      setModalProduct({
        product: '',
        category: '',
        location: '',
        description: '',
        currentStock: 0,
        minThreshold: 0,
        suggestedQuantity: 0,
        unitCost: 0,
        sellingPrice: 0,
        supplier: '',
        supplierId: '',
        lastRestocked: '',
        status: 'good',
        registrationType: 'Venda',
        hourlyPrice: '',
        available: '',
        image: '',
        fullDescription: ''
      });
      setProductImagePreviews([]);
    }
  };

  const closeModal = () => {
    if (productSubmitting) {
      return;
    }
    setModalType(null);
    setModalProduct(null);
    setProductImageFiles([]);
    setProductImagePreviews([]);
  };

  const handleSaveProduct = async () => {
    if (productSubmitting) {
      return;
    }
    setProductSubmitting(true);
    try {
      console.group('[InventoryDataTable] handleSaveProduct');
      console.debug('modalType', modalType);
      let savedProductId = null;
      if (modalType === 'create') {
        if (modalProduct.registrationType === 'Aluguel') {
          if (!modalProduct.product?.trim()) {
            throw new Error('Nome do item de aluguel é obrigatório.');
          }
          const rentalPayload = {
            name: modalProduct.product,
            hourlyPrice: Number(modalProduct.hourlyPrice) || 0,
            available: Number(modalProduct.available) || 0,
            image: null,
            fullDescription: modalProduct.description || modalProduct.fullDescription || null,
          };
          console.debug('create rental payload', rentalPayload);
          const created = await createRentalItem(rentalPayload);
          console.debug('create rental response', created);
          savedProductId = created?.id || null;
          await onRefresh();
        } else {
          if (!modalProduct.product?.trim()) {
            throw new Error('Nome do produto é obrigatório.');
          }
          if (!modalProduct.category) {
            throw new Error('Categoria é obrigatória.');
          }
          if (!modalProduct.supplierId) {
            throw new Error('Fornecedor é obrigatório.');
          }
          const selectedSupplier = suppliers.find((item) => item.id === modalProduct.supplierId);
          const payload = {
            product: modalProduct.product,
            category: CATEGORY_MAP.ptToEnum[modalProduct.category] || modalProduct.category,
            location: modalProduct.location,
            description: modalProduct.description || undefined,
            currentStock: Number(modalProduct.currentStock) || 0,
            minThreshold: Number(modalProduct.minThreshold) || 0,
            suggestedQuantity: Number(modalProduct.suggestedQuantity) || 0,
            unitCost: Number(modalProduct.unitCost) || 0,
            sellingPrice: Number(modalProduct.sellingPrice) || 0,
            supplierId: modalProduct.supplierId || undefined,
            supplier: selectedSupplier?.name || modalProduct.supplier || undefined,
            lastRestocked: modalProduct.lastRestocked || null,
          };
          console.debug('create sale payload', payload);
          const created = await createSaleItem(payload);
          console.debug('create sale response', created);
          savedProductId = created?.id || null;
          await onRefresh();
        }
      } else if (modalType === 'edit') {
        if (!modalProduct.supplierId) {
          throw new Error('Fornecedor é obrigatório.');
        }
        const selectedSupplier = suppliers.find((item) => item.id === modalProduct.supplierId);
        const payload = {
          product: modalProduct.product,
          category: CATEGORY_MAP.ptToEnum[modalProduct.category] || modalProduct.category,
          location: modalProduct.location,
          description: modalProduct.description || undefined,
          currentStock: Number(modalProduct.currentStock) || 0,
          minThreshold: Number(modalProduct.minThreshold) || 0,
          suggestedQuantity: Number(modalProduct.suggestedQuantity) || 0,
          unitCost: Number(modalProduct.unitCost) || 0,
          sellingPrice: Number(modalProduct.sellingPrice) || 0,
          supplierId: modalProduct.supplierId || undefined,
          supplier: selectedSupplier?.name || modalProduct.supplier || undefined,
          lastRestocked: modalProduct.lastRestocked || null,
        };
        console.debug('update payload', payload);
        await updateSaleItem(modalProduct.id, payload);
        savedProductId = modalProduct.id;
        await onRefresh();
      }
      if (productImageFiles.length && savedProductId) {
        await uploadProductImages(savedProductId, productImageFiles);
        await onRefresh();
      }
      console.groupEnd();
      closeModal();
    } catch (err) {
      console.group('[InventoryDataTable] handleSaveProduct ERROR');
      console.error('Erro ao salvar produto:', err);
      console.error('status', err?.response?.status);
      console.error('data', err?.response?.data);
      console.error('message', err?.message);
      console.groupEnd();
      alert('Não foi possível salvar o produto.');
    } finally {
      setProductSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Deseja realmente deletar o produto "${product.product}"?`)) {
      return;
    }
    try {
      await deleteSaleItem(product.id);
      await onRefresh();
    } catch (err) {
      alert('Não foi possível deletar o produto.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'bg-green-500/10 text-green-600';
      case 'low': return 'bg-amber-500/10 text-amber-600';
      case 'critical': return 'bg-red-500/10 text-red-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good': return 'CheckCircle';
      case 'low': return 'AlertTriangle';
      case 'critical': return 'XCircle';
      default: return 'Circle';
    }
  };

  const getTypeStatusColor = (status, source) => {
    if (status === 'good') return 'bg-green-500/10 text-green-600';
    if (status === 'low') return 'bg-amber-500/10 text-amber-600';
    if (status === 'critical') return 'bg-red-500/10 text-red-600';
    // Sem status: colorir por tipo
    return source === 'RENTAL'
      ? 'bg-indigo-500/10 text-indigo-600'
      : 'bg-emerald-500/10 text-emerald-600';
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-error">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h2 className="text-xl font-heading font-semibold text-foreground">
          Gestão de Estoque
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="default" iconName="PackagePlus" onClick={() => openModal('create')}>
            Novo Produto
          </Button>
          <Button variant="outline" iconName="Truck" onClick={openSupplierModal}>
            Novo Fornecedor
          </Button>
          <Input
            type="search"
            placeholder="Buscar por nome, SKU ou fornecedor..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select
            options={categoryOptions}
            value={selectedCategory}
            onChange={setSelectedCategory}
            className="w-full sm:w-48"
          />
        </div>
      </div>

      {/* Tabela com rolagem responsiva */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted/50 scrollbar-track-transparent">
        <table className="w-full min-w-[800px]">
          <thead className="bg-muted/50">
            <tr>
              {tableColumns.map(col => (
                <th
                  key={col.key}
                  className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap"
                  onClick={() => {
                    if (sortField === col.key) {
                      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      return;
                    }
                    setSortField(col.key);
                    setSortDirection('asc');
                  }}
                >
                  {col.label}
                </th>
              ))}
              <th className="p-4 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.map(product => {
              const name = product?.product ?? product?.name ?? '';
              const categoryPt = (() => {
                if (product?.category) return CATEGORY_MAP.enumToPt[product.category] || product.category;
                return product?.source === 'RENTAL' ? 'Equipamentos para Aluguel' : 'Equipamentos de Pesca';
              })();
              const stock = product?.stock ?? product?.currentStock ?? product?.available ?? '';
              const supplier = product?.supplier ?? '';
              const location = product?.location ?? '';
              const statusVal = product?.status ?? null;
              const badgeText = statusVal ? String(statusVal).toUpperCase() : (product?.source === 'RENTAL' ? 'ALUGUEL' : 'VENDA');
              const typeLabel = product?.source === 'RENTAL' ? 'Aluguel' : 'Venda';
              return (
                <tr key={product.id} className="hover:bg-muted/50 transition-smooth">
                  <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">{product?.sku ?? ''}</td>
                  <td className="p-4 font-medium text-foreground whitespace-nowrap">{name}</td>
                  <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">{categoryPt}</td>
                  <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">{stock}</td>
                  <td className="p-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeStatusColor(statusVal, product?.source)}`}>
                      <Icon name={getStatusIcon(statusVal)} size={12} className="mr-1" />
                      {badgeText}
                    </span>
                  </td>
                  <td className="p-4 flex space-x-2">
                    <Button variant="ghost" size="sm" iconName="Edit" onClick={() => openModal('edit', product)} />
                    <Button variant="ghost" size="sm" iconName="Eye" onClick={() => openModal('view', product)} />
                    {product?.source !== 'RENTAL' ? (
                      <Button variant="ghost" size="sm" iconName="Trash2" onClick={() => handleDelete(product)} />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginação */}
      <div className="px-6 pb-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Página {currentPage} de {Math.max(1, totalPages)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            iconName="ChevronLeft"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconName="ChevronRight"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
          >
            Próximo
          </Button>
        </div>
      </div>

      {/* Modal Responsivo */}
      {modalProduct && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />

          <div
            className="
              relative bg-card border border-border rounded-lg p-6
              w-full max-w-md sm:max-w-lg lg:max-w-3xl
              max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-muted/40
              mx-4 transition-all
            "
          >
            <h3 className="text-lg font-heading font-semibold text-foreground mb-4">
              {modalType === 'create'
                ? 'Novo Produto'
                : modalType === 'edit'
                ? 'Editar Produto'
                : 'Visualizar Produto'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Tipo de cadastro: Venda ou Aluguel */}
              <Select
                label="Tipo de cadastro"
                options={[
                  { value: 'Venda', label: 'Venda' },
                  { value: 'Aluguel', label: 'Aluguel' },
                ]}
                value={modalProduct.registrationType}
                onChange={(val) => modalType !== 'view' && setModalProduct(prev => ({ ...prev, registrationType: val }))}
                className="w-full"
              />

              {/* Campos traduzidos */}
              <Input
                label="Produto"
                value={modalProduct.product}
                onChange={(e) => modalType !== 'view' && setModalProduct(prev => ({ ...prev, product: e.target.value }))}
                readOnly={modalType === 'view'}
              />
              {/* Campos de VENDA */}
              {modalProduct.registrationType === 'Venda' && (
                <>
                  {/* Categoria como Select com valores fixos */}
                  <Select
                    label="Categoria"
                    options={categoryOptions.filter(opt => opt.value !== 'all')}
                    value={modalProduct.category}
                    onChange={(val) => modalType !== 'view' && setModalProduct(prev => ({ ...prev, category: val }))}
                    className="w-full"
                  />
                  <Input
                    label="Local"
                    value={modalProduct.location}
                    onChange={(e) => modalType !== 'view' && setModalProduct(prev => ({ ...prev, location: e.target.value }))}
                    readOnly={modalType === 'view'}
                  />
                  <Input
                    label="Descrição"
                    value={modalProduct.description || ''}
                    onChange={(e) => modalType !== 'view' && setModalProduct(prev => ({ ...prev, description: e.target.value }))}
                    readOnly={modalType === 'view'}
                  />
                  <Select
                    label="Fornecedor"
                    options={supplierOptions}
                    value={modalProduct.supplierId || ''}
                    onChange={(val) => {
                      if (modalType === 'view') return;
                      const supplier = suppliers.find((item) => item.id === val);
                      setModalProduct((prev) => ({
                        ...prev,
                        supplierId: val,
                        supplier: supplier?.name || prev.supplier,
                      }));
                    }}
                    disabled={modalType === 'view' || suppliersLoading}
                    placeholder={suppliersLoading ? 'Carregando fornecedores...' : 'Selecione'}
                    className="w-full"
                  />
                  <Input
                    label="Último Reabastecimento"
                    type="date"
                    value={modalProduct.lastRestocked || ''}
                    onChange={(e) => modalType !== 'view' && setModalProduct(prev => ({ ...prev, lastRestocked: e.target.value }))}
                    readOnly={modalType === 'view'}
                  />
                  <Input
                    label="Estoque Atual"
                    type="number"
                    value={Number.isNaN(modalProduct.currentStock) ? '' : (modalProduct.currentStock ?? '')}
                    onChange={(e) => {
                      if (modalType === 'view') return;
                      const v = e.target.value;
                      const n = v === '' ? '' : parseInt(v, 10);
                      setModalProduct(prev => ({ ...prev, currentStock: Number.isNaN(n) ? '' : n }));
                    }}
                    readOnly={modalType === 'view'}
                  />
                  <Input
                    label="Limite Mínimo"
                    type="number"
                    value={Number.isNaN(modalProduct.minThreshold) ? '' : (modalProduct.minThreshold ?? '')}
                    onChange={(e) => {
                      if (modalType === 'view') return;
                      const v = e.target.value;
                      const n = v === '' ? '' : parseInt(v, 10);
                      setModalProduct(prev => ({ ...prev, minThreshold: Number.isNaN(n) ? '' : n }));
                    }}
                    readOnly={modalType === 'view'}
                  />
                  <Input
                    label="Quantidade Sugerida"
                    type="number"
                    value={Number.isNaN(modalProduct.suggestedQuantity) ? '' : (modalProduct.suggestedQuantity ?? '')}
                    onChange={(e) => {
                      if (modalType === 'view') return;
                      const v = e.target.value;
                      const n = v === '' ? '' : parseInt(v, 10);
                      setModalProduct(prev => ({ ...prev, suggestedQuantity: Number.isNaN(n) ? '' : n }));
                    }}
                    readOnly={modalType === 'view'}
                  />
                  <Input
                    label="Custo Unitário"
                    type="number"
                    value={Number.isNaN(modalProduct.unitCost) ? '' : (modalProduct.unitCost ?? '')}
                    onChange={(e) => {
                      if (modalType === 'view') return;
                      const v = e.target.value;
                      const n = v === '' ? '' : parseFloat(v);
                      setModalProduct(prev => ({ ...prev, unitCost: Number.isNaN(n) ? '' : n }));
                    }}
                    readOnly={modalType === 'view'}
                  />
                  <Input
                    label="Preço de Venda"
                    type="number"
                    value={Number.isNaN(modalProduct.sellingPrice) ? '' : (modalProduct.sellingPrice ?? '')}
                    onChange={(e) => {
                      if (modalType === 'view') return;
                      const v = e.target.value;
                      const n = v === '' ? '' : parseFloat(v);
                      setModalProduct(prev => ({ ...prev, sellingPrice: Number.isNaN(n) ? '' : n }));
                    }}
                    readOnly={modalType === 'view'}
                  />
                  {renderImageUploader()}
                </>
              )}

              {/* Campos de ALUGUEL */}
              {modalProduct.registrationType === 'Aluguel' && (
                <>
                  <Input
                    label="Preço por Hora (Aluguel)"
                    type="number"
                    value={Number.isNaN(modalProduct.hourlyPrice) ? '' : (modalProduct.hourlyPrice ?? '')}
                    onChange={(e) => {
                      if (modalType === 'view') return;
                      const v = e.target.value;
                      const n = v === '' ? '' : parseFloat(v);
                      setModalProduct(prev => ({ ...prev, hourlyPrice: Number.isNaN(n) ? '' : n }));
                    }}
                    readOnly={modalType === 'view'}
                  />
                  <Input
                    label="Disponíveis para Aluguel"
                    type="number"
                    value={Number.isNaN(modalProduct.available) ? '' : (modalProduct.available ?? '')}
                    onChange={(e) => {
                      if (modalType === 'view') return;
                      const v = e.target.value;
                      const n = v === '' ? '' : parseInt(v, 10);
                      setModalProduct(prev => ({ ...prev, available: Number.isNaN(n) ? '' : n }));
                    }}
                    readOnly={modalType === 'view'}
                  />
                  {renderImageUploader()}
                  <Input
                    label="Descrição Completa"
                    value={modalProduct.description || ''}
                    onChange={(e) => modalType !== 'view' && setModalProduct(prev => ({ ...prev, description: e.target.value }))}
                    readOnly={modalType === 'view'}
                  />
                </>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 mt-6">
              {modalType !== 'view' && (
                <Button variant="default" onClick={handleSaveProduct} disabled={productSubmitting}>
                  {productSubmitting ? 'Salvando...' : 'Salvar'}
                </Button>
              )}
              <Button variant="outline" onClick={closeModal} disabled={productSubmitting}>Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {supplierModalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSupplierModalOpen(false)} />
          <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-heading font-semibold text-foreground mb-4">Novo Fornecedor</h3>
            <div className="grid grid-cols-1 gap-3">
              <Input
                label="Nome"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label="CNPJ"
                value={supplierForm.cnpj}
                onChange={(e) => setSupplierForm((prev) => ({ ...prev, cnpj: e.target.value }))}
              />
              <Input
                label="Classificação (1 a 5)"
                type="number"
                min={1}
                max={5}
                value={supplierForm.rating}
                onChange={(e) => setSupplierForm((prev) => ({ ...prev, rating: Number(e.target.value) || 1 }))}
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setSupplierModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="default" onClick={handleSaveSupplier} disabled={supplierSubmitting}>
                {supplierSubmitting ? 'Salvando...' : 'Salvar Fornecedor'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryDataTable;
