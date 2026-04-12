import React, { useCallback, useEffect, useMemo, useState } from 'react';
import HostingLayout from './components/HostingLayout';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import ChaletsTable from './components/ChaletsTable';
import ChaletFormModal from './components/ChaletFormModal';
import BlockDatesModal from './components/BlockDatesModal';
import {
  createBlock,
  createChalet,
  deleteChalet,
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
  ...chalet,
  basePrice: Number(chalet?.basePrice || 0),
  maxGuests: Number(chalet?.maxGuests || 0),
  amenities: Array.isArray(chalet?.amenities) ? chalet.amenities : [],
  rooms: Array.isArray(chalet?.rooms) ? chalet.rooms : [],
  notes: chalet?.notes || '',
  images: Array.isArray(chalet?.images) ? chalet.images.map((image) => image?.imageUrl).filter(Boolean) : [],
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
    try {
      const imageFiles = Array.from(payload?.imageFiles || []);
      const payloadWithoutImages = { ...payload };
      delete payloadWithoutImages.imageFiles;
      delete payloadWithoutImages.images;
      delete payloadWithoutImages.image;

      const saved = payload.id
        ? await updateChalet(payload.id, payloadWithoutImages)
        : await createChalet(payloadWithoutImages);

      if (imageFiles.length && saved?.id) {
        await uploadChaletImages(saved.id, imageFiles);
      }

      await loadData();
      setIsChaletModalOpen(false);
      setEditingChalet(null);
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível salvar o chalé.'));
    }
  };

  const handleEditChalet = (chalet) => {
    setEditingChalet(chalet);
    setIsChaletModalOpen(true);
  };

  const handleDeleteChalet = async (chalet) => {
    const shouldDelete = window.confirm(`Deseja realmente excluir o chalé ${chalet.name}?`);
    if (!shouldDelete) {
      return;
    }
    try {
      await deleteChalet(chalet.id);
      await loadData();
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível excluir o chalé.'));
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
      />

      <ChaletFormModal
        isOpen={isChaletModalOpen}
        chalet={editingChalet}
        onClose={() => {
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
    </HostingLayout>
  );
};

export default ChaletsManagementPage;
