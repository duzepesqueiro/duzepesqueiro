import React, { useCallback, useEffect, useMemo, useState } from 'react';
import HostingLayout from './components/HostingLayout';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import ChaletsTable from './components/ChaletsTable';
import ChaletFormModal from './components/ChaletFormModal';
import BlockDatesModal from './components/BlockDatesModal';
import ConfirmDeleteChaletModal from './components/ConfirmDeleteChaletModal';
import ChaletSuccessModal from './components/ChaletSuccessModal';
import {
  createBlock,
  createChalet,
  deleteChaletImage,
  deleteChalet,
  getChaletById,
  listBlocks,
  listChalets,
  updateChalet,
  uploadChaletImages,
} from '../../utils/hostingService';

const toErrorMessage = (error, fallback) => {
  const message = error?.response?.data?.message;
  if (Array.isArray(message) && message.length) {
    return message.join(', ');
  }
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  return fallback;
};

const normalizeChalet = (chalet) => ({
  imageEntries: Array.isArray(chalet?.images)
    ? chalet.images
        .map((image) => {
          if (typeof image === 'string') {
            return { id: null, url: image };
          }
          const url = image?.imageUrl || image?.url || '';
          if (!url) return null;
          return { id: image?.id || null, url };
        })
        .filter(Boolean)
    : (chalet?.image ? [{ id: null, url: chalet.image }] : []),
  ...chalet,
  basePrice: Number(chalet?.basePrice || 0),
  maxGuests: Number(chalet?.maxGuests || 0),
  amenities: Array.isArray(chalet?.amenities) ? chalet.amenities : [],
  rooms: Array.isArray(chalet?.rooms) ? chalet.rooms : [],
  notes: chalet?.notes || '',
  images: Array.isArray(chalet?.images)
    ? chalet.images.map((image) => (typeof image === 'string' ? image : image?.imageUrl)).filter(Boolean)
    : (chalet?.image ? [chalet.image] : []),
});

const normalizeBlock = (block) => ({
  ...block,
  dataInicio: block?.startDate || block?.dataInicio || '',
  dataFim: block?.endDate || block?.dataFim || '',
});

const ChaletsManagementPage = () => {
  const [chalets, setChalets] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [isChaletModalOpen, setIsChaletModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingChalet, setEditingChalet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSavingChalet, setIsSavingChalet] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteChalet, setPendingDeleteChalet] = useState(null);
  const [deletingChaletId, setDeletingChaletId] = useState(null);
  const [successModal, setSuccessModal] = useState({ open: false, mode: 'create' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [chaletsResponse, blocksResponse] = await Promise.all([listChalets(), listBlocks()]);
      setChalets(chaletsResponse.map(normalizeChalet));
      setBlockedDates(blocksResponse.map(normalizeBlock));
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível carregar os dados de chalés.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const actionButtons = useMemo(
    () => (
      <>
        <Button type="button" onClick={() => { setEditingChalet(null); setIsChaletModalOpen(true); }}>
          <Icon name="Plus" size={16} className="mr-2" />
          Novo Chalé
        </Button>
        <Button type="button" variant="outline" onClick={() => setIsBlockModalOpen(true)}>
          <Icon name="Lock" size={16} className="mr-2" />
          Bloquear Datas
        </Button>
      </>
    ),
    []
  );

  const handleSaveChalet = async (payload) => {
    if (isSavingChalet) return;
    setIsSavingChalet(true);
    const isEditing = Boolean(payload?.id);
    let createdChaletId = null;
    try {
      const imageFiles = Array.from(payload?.imageFiles || []);
      const originalImageIds = Array.isArray(payload?.originalImageIds) ? payload.originalImageIds : [];
      const keptImageIds = Array.isArray(payload?.keptImageIds) ? payload.keptImageIds : [];
      const payloadWithoutImages = { ...payload };
      delete payloadWithoutImages.imageFiles;
      delete payloadWithoutImages.images;
      delete payloadWithoutImages.image;
      delete payloadWithoutImages.originalImageIds;
      delete payloadWithoutImages.keptImageIds;

      const saved = isEditing
        ? await updateChalet(payload.id, payloadWithoutImages)
        : await createChalet(payloadWithoutImages);
      if (!isEditing && saved?.id) {
        createdChaletId = saved.id;
      }

      if (saved?.id && isEditing && originalImageIds.length) {
        const removedImageIds = originalImageIds.filter((imageId) => !keptImageIds.includes(imageId));
        if (removedImageIds.length) {
          await Promise.all(removedImageIds.map((imageId) => deleteChaletImage(saved.id, imageId)));
        }
      }

      if (imageFiles.length && saved?.id) {
        await uploadChaletImages(saved.id, imageFiles);
      }

      await loadData();
      setIsChaletModalOpen(false);
      setEditingChalet(null);
      setSuccessModal({ open: true, mode: isEditing ? 'edit' : 'create' });
    } catch (error) {
      const isPayloadTooLarge = Number(error?.response?.status) === 413;
      if (!isEditing && createdChaletId) {
        try {
          await deleteChalet(createdChaletId);
          await loadData();
        } catch {}
      }

      if (isPayloadTooLarge && !isEditing && createdChaletId) {
        alert('As imagens ultrapassam o limite total de upload. O cadastro do chalé foi desfeito automaticamente. Reduza o tamanho total das imagens e tente novamente.');
      } else if (isPayloadTooLarge && isEditing) {
        alert('As imagens ultrapassam o limite total de upload. Reduza o tamanho total das imagens e tente novamente.');
      } else {
        alert(toErrorMessage(error, 'Não foi possível salvar o chalé.'));
      }
    } finally {
      setIsSavingChalet(false);
    }
  };

  const handleEditChalet = async (chalet) => {
    try {
      const detail = await getChaletById(chalet.id);
      setEditingChalet(normalizeChalet(detail || chalet));
      setIsChaletModalOpen(true);
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível carregar os detalhes do chalé.'));
    }
  };

  const handleDeleteChalet = (chalet) => {
    if (deletingChaletId) return;
    setPendingDeleteChalet(chalet);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteChalet = async () => {
    if (!pendingDeleteChalet || deletingChaletId) return;
    setDeletingChaletId(pendingDeleteChalet.id);
    try {
      await deleteChalet(pendingDeleteChalet.id);
      await loadData();
      setIsDeleteModalOpen(false);
      setPendingDeleteChalet(null);
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível excluir o chalé.'));
    } finally {
      setDeletingChaletId(null);
    }
  };

  const handleSaveBlockDates = async (payload) => {
    const reasonToStatus = {
      MAINTENANCE: 'MAINTENANCE',
      CLEANING: 'CLEANING',
      ADMIN: 'ADMIN',
      INTERDICTION: 'INTERDICTED',
    };
    try {
      const createdBlock = await createBlock(payload);
      const normalizedBlock = normalizeBlock(createdBlock);
      const nextStatus = reasonToStatus[normalizedBlock.reason] || 'MAINTENANCE';
      setBlockedDates((prev) => [...prev, normalizedBlock]);
      setChalets((prev) =>
        prev.map((chalet) =>
          chalet.id === normalizedBlock.chaletId
            ? {
                ...chalet,
                status: nextStatus,
                notes: normalizedBlock.notes || chalet.notes,
              }
            : chalet
        )
      );
      setIsBlockModalOpen(false);
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível criar o bloqueio.'));
    }
  };

  return (
    <HostingLayout
      title="Gerenciamento de Chalés"
      subtitle="Cadastro, atualização e controle operacional das unidades de hospedagem"
      actions={actionButtons}
    >
      <ChaletsTable
        chalets={loading ? [] : chalets}
        onEdit={handleEditChalet}
        onDelete={handleDeleteChalet}
        deletingChaletId={deletingChaletId}
      />

      <ChaletFormModal
        isOpen={isChaletModalOpen}
        chalet={editingChalet}
        isSaving={isSavingChalet}
        onClose={() => {
          if (isSavingChalet) return;
          setIsChaletModalOpen(false);
          setEditingChalet(null);
        }}
        onSave={handleSaveChalet}
      />

      <BlockDatesModal
        isOpen={isBlockModalOpen}
        chalets={chalets}
        blockedDates={blockedDates}
        onClose={() => setIsBlockModalOpen(false)}
        onSave={handleSaveBlockDates}
      />

      <ConfirmDeleteChaletModal
        isOpen={isDeleteModalOpen}
        chalet={pendingDeleteChalet}
        isDeleting={Boolean(deletingChaletId)}
        onClose={() => {
          if (deletingChaletId) return;
          setIsDeleteModalOpen(false);
          setPendingDeleteChalet(null);
        }}
        onConfirm={handleConfirmDeleteChalet}
      />

      <ChaletSuccessModal
        isOpen={successModal.open}
        mode={successModal.mode}
        onClose={() => setSuccessModal({ open: false, mode: 'create' })}
      />
    </HostingLayout>
  );
};

export default ChaletsManagementPage;
