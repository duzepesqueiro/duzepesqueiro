import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const chaletTypes = ['STANDARD', 'DELUXE', 'SUITE'];
const chaletTypeLabel = {
  STANDARD: 'Standard',
  DELUXE: 'Deluxe',
  SUITE: 'Suite',
};

const initialValues = {
  name: '',
  unitType: '',
  maxGuests: '',
  description: '',
  basePrice: '',
  amenities: '',
  rooms: '',
  notes: '',
  status: 'AVAILABLE',
};

const ChaletFormModal = ({ isOpen, onClose, onSave, chalet, isSaving = false }) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [imageItems, setImageItems] = useState([]);
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const imageInputRef = useRef(null);

  const portalElement = useMemo(() => {
    if (typeof document === 'undefined') {
      return null;
    }
    const existingPortal = document.getElementById('hosting-modal-portal');
    if (existingPortal) {
      return existingPortal;
    }
    const newPortal = document.createElement('div');
    newPortal.setAttribute('id', 'hosting-modal-portal');
    document.body.appendChild(newPortal);
    return newPortal;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (!chalet) {
      setValues(initialValues);
      setErrors({});
      setImageItems([]);
      return;
    }
    setValues({
      name: chalet.name || '',
      unitType: chalet.unitType || '',
      maxGuests: String(chalet.maxGuests || ''),
      description: chalet.description || '',
      basePrice: String(chalet.basePrice || ''),
      amenities: (chalet.amenities || []).join(', '),
      rooms: (chalet.rooms || []).join(', '),
      notes: chalet.notes || '',
      status: chalet.status || 'AVAILABLE',
    });
    const existingImageEntries = Array.isArray(chalet.imageEntries)
      ? chalet.imageEntries
      : (Array.isArray(chalet.images) ? chalet.images.map((url) => ({ id: null, url })) : []);
    setImageItems(
      existingImageEntries
        .filter((entry) => Boolean(entry?.url))
        .map((entry, index) => ({
          key: `existing-${entry.id || index}`,
          source: 'existing',
          id: entry.id || null,
          url: entry.url,
        }))
    );
    setErrors({});
  }, [isOpen, chalet]);

  useEffect(() => {
    return () => {
      imageItems.forEach((item) => {
        if (item?.source === 'new' && item?.url?.startsWith('blob:')) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, [imageItems]);

  if (!isOpen || !portalElement) {
    return null;
  }

  const setField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.name || values.name.trim().length < 3) {
      nextErrors.name = 'Nome obrigatório com no mínimo 3 caracteres.';
    }
    if (!values.unitType) {
      nextErrors.unitType = 'Selecione um tipo.';
    }
    const maxGuests = Number(values.maxGuests);
    if (!values.maxGuests || Number.isNaN(maxGuests) || maxGuests < 1 || maxGuests > 20) {
      nextErrors.maxGuests = 'Capacidade deve estar entre 1 e 20.';
    }
    const basePrice = Number(values.basePrice);
    if (!values.basePrice || Number.isNaN(basePrice) || basePrice <= 0) {
      nextErrors.basePrice = 'Preço por diária deve ser maior que 0.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const applySelectedImages = (incomingFiles) => {
    const files = Array.from(incomingFiles || []);
    if (!files.length || isSaving) {
      return;
    }
    if (imageItems.length + files.length > 10) {
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
    const newItems = files.map((file, index) => ({
      key: `new-${Date.now()}-${index}`,
      source: 'new',
      id: null,
      url: URL.createObjectURL(file),
      file,
    }));
    setImageItems((prev) => [...prev, ...newItems]);
  };

  const handleChaletImageSelect = (event) => {
    applySelectedImages(event?.target?.files);
  };

  const handleDropImages = (event) => {
    event.preventDefault();
    setIsImageDragOver(false);
    applySelectedImages(event?.dataTransfer?.files);
  };

  const openImagePicker = () => {
    if (isSaving) return;
    imageInputRef.current?.click();
  };

  const removeSelectedImage = (indexToRemove) => {
    if (isSaving) return;
    setImageItems((prev) => {
      const target = prev[indexToRemove];
      if (target?.source === 'new' && target?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((_, index) => index !== indexToRemove);
    });
  };

  const renderImageUploader = () => (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
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
          setIsImageDragOver(true);
        }}
        onDragLeave={() => setIsImageDragOver(false)}
        onDrop={handleDropImages}
        className={`rounded-lg border-2 border-dashed p-6 transition-all ${
          isImageDragOver ? 'border-primary bg-primary/5' : 'border-border bg-background'
        } cursor-pointer`}
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleChaletImageSelect}
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
          <Button type="button" variant="outline" size="sm" iconName="Upload" className="mt-2">
            Selecionar Imagens
          </Button>
        </div>
      </div>
      {imageItems?.length ? (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {imageItems.map((item, index) => (
            <div key={item.key} className="relative rounded-md overflow-hidden border border-border bg-background">
              <img
                src={item.url}
                alt={`Pré-visualização ${index + 1}`}
                className="h-20 w-full object-cover"
              />
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeSelectedImage(index);
                }}
                disabled={isSaving}
                className="absolute right-1 top-1 h-5 w-5 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-black"
              >
                <Icon name="X" size={12} />
              </button>
              <span className="absolute left-1 top-1 text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white">
                {index + 1}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  const handleSubmit = () => {
    if (isSaving) return;
    if (!validate()) {
      return;
    }
    const newImageFiles = imageItems
      .filter((item) => item.source === 'new' && item.file)
      .map((item) => item.file);
    const keptImageIds = imageItems
      .filter((item) => item.source === 'existing' && item.id)
      .map((item) => item.id);
    const originalImageIds = Array.isArray(chalet?.imageEntries)
      ? chalet.imageEntries.map((item) => item?.id).filter(Boolean)
      : [];
    onSave({
      ...chalet,
      name: values.name.trim(),
      unitType: values.unitType,
      maxGuests: Number(values.maxGuests),
      description: values.description.trim(),
      basePrice: Number(values.basePrice),
      amenities: values.amenities.split(',').map((item) => item.trim()).filter(Boolean),
      rooms: values.rooms.split(',').map((item) => item.trim()).filter(Boolean),
      notes: values.notes.trim(),
      status: values.status || 'AVAILABLE',
      imageFiles: newImageFiles,
      keptImageIds,
      originalImageIds,
      images: imageItems.map((item) => item.url),
      image: imageItems[0]?.url || '',
    });
  };

  const handleFormSubmit = (event) => {
    // Bloqueia submit implícito (ex.: Enter em campos)
    event.preventDefault();
  };

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={() => { if (!isSaving) onClose(); }} aria-label="Fechar modal" />
      <form onSubmit={handleFormSubmit} className="relative w-full max-w-3xl bg-card border border-border rounded-lg shadow-soft-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h3 className="text-xl font-heading font-semibold text-foreground">
            {chalet ? `Editar Chalé: ${chalet.name}` : 'Novo Chalé'}
          </h3>
        </div>
        <div className="p-6 space-y-5">
          <Input
            label="Nome do Chalé"
            value={values.name}
            onChange={(event) => setField('name', event.target.value)}
            error={errors.name}
            required
          />

          <div className="space-y-2">
            <p className={`text-sm font-medium ${errors.unitType ? 'text-destructive' : 'text-foreground'}`}>
              Tipo
            </p>
            <div className="flex items-center gap-6">
              {chaletTypes.map((unitType) => (
                <label key={unitType} className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="unitType"
                    checked={values.unitType === unitType}
                    onChange={() => setField('unitType', unitType)}
                    className={`h-4 w-4 ${errors.unitType ? 'accent-red-600' : 'accent-primary'}`}
                  />
                  <span>{chaletTypeLabel[unitType]}</span>
                </label>
              ))}
            </div>
            {errors.unitType ? <p className="text-sm text-destructive">{errors.unitType}</p> : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Capacidade (pessoas)"
              min="1"
              max="20"
              value={values.maxGuests}
              onChange={(event) => setField('maxGuests', event.target.value)}
              error={errors.maxGuests}
              required
            />
            <Input
              type="number"
              step="0.01"
              label="Preço por Diária"
              min="0.01"
              value={values.basePrice}
              onChange={(event) => setField('basePrice', event.target.value)}
              error={errors.basePrice}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Descrição</label>
            <textarea
              rows={3}
              value={values.description}
              onChange={(event) => setField('description', event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {renderImageUploader()}

          <Input
            label="Comodidades (separadas por vírgula)"
            placeholder="WiFi, Ar condicionado, TV, Chuveiro"
            value={values.amenities}
            onChange={(event) => setField('amenities', event.target.value)}
          />

          <Input
            label="Cômodos (separados por vírgula)"
            placeholder="Quarto, Banheiro, Cozinha, Varanda"
            value={values.rooms}
            onChange={(event) => setField('rooms', event.target.value)}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Observações</label>
            <textarea
              rows={2}
              value={values.notes}
              onChange={(event) => setField('notes', event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Chalé'}
          </Button>
        </div>
      </form>
    </div>,
    portalElement
  );
};

export default ChaletFormModal;
