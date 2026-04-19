import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Icon from '../../../components/AppIcon';
import HostingReservationModal from './HostingReservationModal';
import CreateManualReservationModal from './CreateManualReservationModal';
import BlockDatesModal from './BlockDatesModal';
import FreeDateActionModal from './FreeDateActionModal';
import {
  createBlock,
  createManualReservation,
  getHostingOccupancyMap,
  listBlocks,
  listChalets,
} from '../../../utils/hostingService';

const weekDays = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

const statusConfig = {
  occupied: {
    color: 'bg-yellow-400',
    label: 'Ocupado (check-in feito)',
  },
  reserved: {
    color: 'bg-sky-500',
    label: 'Reservado (check-in pendente)',
  },
  free: {
    color: 'bg-emerald-500',
    label: 'Livre',
  },
  maintenance: {
    color: 'bg-gray-300',
    label: 'Indisponível/Manutenção',
  },
};

const statusByApiValue = {
  AVAILABLE: 'free',
  RESERVED: 'reserved',
  OCCUPIED: 'occupied',
  BLOCKED: 'maintenance',
};

const detailsByStatus = {
  free: 'Disponível para reserva',
  reserved: 'Reservado (check-in pendente)',
  occupied: 'Ocupado (hóspede em estadia)',
  maintenance: 'Indisponível por bloqueio operacional/manutenção',
};

const compareDay = (a, b) => format(a, 'yyyy-MM-dd') === format(b, 'yyyy-MM-dd');

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

const normalizeStatusMap = (mapResponse) => {
  const days = Array.isArray(mapResponse?.dias) ? mapResponse.dias : [];
  return days.reduce((acc, item) => {
    const dateKey = item?.data ? String(item.data).slice(0, 10) : null;
    if (!dateKey) {
      return acc;
    }
    acc[dateKey] = item?.status || 'AVAILABLE';
    return acc;
  }, {});
};

const MonthCalendar = ({ chalet, monthDate, getStatusForDay, onOpenDate }) => {
  const days = useMemo(() => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [monthDate]);

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="text-sm font-medium text-foreground capitalize mb-3">
        {format(monthDate, 'MMMM yyyy', { locale: ptBR })}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((weekDay, index) => (
          <div key={`${weekDay}-${index}`} className="text-xs text-center text-muted-foreground font-medium">
            {weekDay}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, monthDate);
          const dateKey = format(day, 'yyyy-MM-dd');
          const apiStatus = getStatusForDay(day);
          const uiStatus = statusByApiValue[apiStatus] || 'free';
          const status = statusConfig[uiStatus] || statusConfig.free;
          const details = detailsByStatus[uiStatus] || detailsByStatus.free;

          return (
            <button
              key={`${chalet.id}-${format(monthDate, 'yyyy-MM')}-${format(day, 'yyyy-MM-dd')}`}
              type="button"
              onClick={() =>
                onOpenDate({
                  chaletId: chalet.id,
                  chaletName: chalet.name,
                  dateKey,
                  statusLabel: status.label,
                  statusKey: uiStatus,
                  dateLabel: format(day, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
                  guest: null,
                  details,
                })
              }
              title={`${format(day, 'dd/MM/yyyy')} - ${status.label}`}
              className={`h-8 rounded-md text-xs font-medium flex items-center justify-center transition-smooth border border-transparent hover:border-border ${status.color} ${
                isCurrentMonth ? 'text-gray-900' : 'text-gray-500 opacity-55'
              } ${compareDay(day, new Date()) ? 'ring-1 ring-primary ring-offset-1 ring-offset-card' : ''}`}
            >
              {dateKey.slice(-2)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ChaletCalendar = ({ chalet, onOpenDate, loadMonthMap, refreshToken }) => {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [monthStatusMaps, setMonthStatusMaps] = useState({});
  const [loadingMonths, setLoadingMonths] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const monthsToLoad = [
      addMonths(currentMonth, -1),
      currentMonth,
      addMonths(currentMonth, 1),
      addMonths(currentMonth, 2),
    ];

    const fetchMaps = async () => {
      setLoadingMonths(true);
      try {
        const loaded = await Promise.all(
          monthsToLoad.map(async (monthDate) => {
            const monthKey = format(monthDate, 'yyyy-MM');
            const statusMap = await loadMonthMap(chalet.id, monthDate);
            return [monthKey, statusMap];
          }),
        );
        if (!isMounted) {
          return;
        }
        setMonthStatusMaps((prev) => {
          const next = { ...prev };
          loaded.forEach(([monthKey, statusMap]) => {
            next[monthKey] = statusMap;
          });
          return next;
        });
      } finally {
        if (isMounted) {
          setLoadingMonths(false);
        }
      }
    };

    fetchMaps();
    return () => {
      isMounted = false;
    };
  }, [chalet.id, currentMonth, loadMonthMap, refreshToken]);

  const getStatusForDay = useCallback(
    (day) => {
      const monthKey = format(day, 'yyyy-MM');
      const dateKey = format(day, 'yyyy-MM-dd');
      return monthStatusMaps[monthKey]?.[dateKey] || 'AVAILABLE';
    },
    [monthStatusMaps],
  );

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h4 className="text-base font-heading font-semibold text-foreground mb-3">{chalet.name}</h4>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
          className="w-7 h-7 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth flex items-center justify-center"
          aria-label="Período anterior"
        >
          <Icon name="ChevronLeft" size={14} />
        </button>
        <span className="text-sm font-medium text-foreground">
          Janela de 60 dias
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
          className="w-7 h-7 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth flex items-center justify-center"
          aria-label="Próximo período"
        >
          <Icon name="ChevronRight" size={14} />
        </button>
      </div>
      {loadingMonths ? (
        <p className="text-xs text-muted-foreground mb-3">Atualizando disponibilidade...</p>
      ) : null}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[currentMonth, addMonths(currentMonth, 1)].map((month) => (
          <MonthCalendar
            key={`${chalet.id}-${format(month, 'yyyy-MM')}`}
            chalet={chalet}
            monthDate={month}
            getStatusForDay={getStatusForDay}
            onOpenDate={onOpenDate}
          />
        ))}
      </div>
    </div>
  );
};

const OccupationMap = () => {
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [freeDateSelection, setFreeDateSelection] = useState(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [chalets, setChalets] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [loadingChalets, setLoadingChalets] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mapRefreshToken, setMapRefreshToken] = useState(0);
  const monthMapCacheRef = useRef(new Map());

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoadingChalets(true);
      setLoadError('');
      try {
        const [chaletList, blocksList] = await Promise.all([listChalets(), listBlocks()]);
        if (!isMounted) {
          return;
        }
        setChalets(
          (Array.isArray(chaletList) ? chaletList : []).map((item) => ({
            id: item.id,
            name: item.name || 'Chalé',
            dailyRate: Number(item.currentPrice ?? item.basePrice ?? 0),
          })),
        );
        setBlockedDates(Array.isArray(blocksList) ? blocksList : []);
      } catch {
        if (isMounted) {
          setLoadError('Não foi possível carregar os chalés e o mapa de ocupação.');
        }
      } finally {
        if (isMounted) {
          setLoadingChalets(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const reloadMapData = useCallback(async () => {
    monthMapCacheRef.current.clear();
    setMapRefreshToken((prev) => prev + 1);
    try {
      const blocksList = await listBlocks();
      setBlockedDates(Array.isArray(blocksList) ? blocksList : []);
    } catch {
      setBlockedDates([]);
    }
  }, []);

  const loadMonthMap = useCallback(async (chaletId, monthDate) => {
    const monthKey = format(monthDate, 'yyyy-MM');
    const cacheKey = `${chaletId}:${monthKey}`;
    if (monthMapCacheRef.current.has(cacheKey)) {
      return monthMapCacheRef.current.get(cacheKey);
    }

    const response = await getHostingOccupancyMap({
      chaletId,
      referenceDate: monthDate,
    });
    const normalized = normalizeStatusMap(response);
    monthMapCacheRef.current.set(cacheKey, normalized);
    return normalized;
  }, []);

  const handleOpenDate = useCallback((payload) => {
    if (payload?.statusKey === 'free') {
      setFreeDateSelection(payload);
      setIsActionModalOpen(true);
      return;
    }
    setSelectedReservation(payload);
  }, []);

  const handleOpenCreateReservation = useCallback(() => {
    setIsActionModalOpen(false);
    setIsCreateOpen(true);
  }, []);

  const handleOpenBlockDate = useCallback(() => {
    setIsActionModalOpen(false);
    setIsBlockModalOpen(true);
  }, []);

  const handleCreateManual = useCallback(
    async (payload) => {
      await createManualReservation({
        chaletId: payload.chaletId,
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
        adults: payload.guests.length,
        children: 0,
        vehiclePlate: payload.vehiclePlate,
        notes: payload.notes,
        guests: payload.guests.map((guest, index) => ({
          fullName: guest.name,
          email: guest.email,
          phone: guest.phone,
          cpf: guest.cpf,
          isPrimary: index === 0,
        })),
      });
      setIsCreateOpen(false);
      setFreeDateSelection(null);
      await reloadMapData();
    },
    [reloadMapData]
  );

  const handleSaveBlockDates = useCallback(
    async (payload) => {
      await createBlock({
        chaletId: payload.chaletId,
        startDate: payload.dataInicio,
        endDate: payload.dataFim,
        reason: payload.reason,
        notes: payload.notes,
        isActive: payload.isActive,
      });
      setIsBlockModalOpen(false);
      setFreeDateSelection(null);
      await reloadMapData();
    },
    [reloadMapData]
  );

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-5">
      <div>
        <h3 className="text-lg font-heading font-semibold text-foreground">Mapa de Ocupação</h3>
        <p className="text-sm text-muted-foreground">Calendário individual por chalé</p>
      </div>

      <div className="flex flex-col gap-4">
        {loadingChalets ? <p className="text-sm text-muted-foreground">Carregando chalés...</p> : null}
        {!loadingChalets && loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
        {!loadingChalets && !loadError && chalets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum chalé cadastrado para exibir no mapa.</p>
        ) : null}
        {!loadingChalets && !loadError
          ? chalets.map((chalet) => (
              <ChaletCalendar
                key={`${chalet.id}-${mapRefreshToken}`}
                chalet={chalet}
                onOpenDate={handleOpenDate}
                loadMonthMap={loadMonthMap}
                refreshToken={mapRefreshToken}
              />
            ))
          : null}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        {Object.entries(statusConfig).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-sm ${value.color}`} />
            <span className="text-muted-foreground">{value.label}</span>
          </div>
        ))}
      </div>

      <HostingReservationModal
        isOpen={Boolean(selectedReservation)}
        reservation={selectedReservation}
        onClose={() => setSelectedReservation(null)}
      />

      <FreeDateActionModal
        isOpen={isActionModalOpen && Boolean(freeDateSelection)}
        selection={freeDateSelection}
        onClose={() => {
          setIsActionModalOpen(false);
          setFreeDateSelection(null);
        }}
        onCreateReservation={handleOpenCreateReservation}
        onBlockDate={handleOpenBlockDate}
      />

      <CreateManualReservationModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setFreeDateSelection(null);
        }}
        chalets={chalets}
        onCreate={async (payload) => {
          try {
            await handleCreateManual(payload);
          } catch (error) {
            alert(toErrorMessage(error, 'Não foi possível criar a reserva manual.'));
            throw error;
          }
        }}
        initialValues={
          freeDateSelection
            ? {
                chaletId: freeDateSelection.chaletId,
                checkInDate: freeDateSelection.dateKey,
                checkOutDate: format(addDays(new Date(`${freeDateSelection.dateKey}T00:00:00`), 1), 'yyyy-MM-dd'),
              }
            : undefined
        }
      />

      <BlockDatesModal
        isOpen={isBlockModalOpen}
        onClose={() => {
          setIsBlockModalOpen(false);
          setFreeDateSelection(null);
        }}
        chalets={chalets}
        blockedDates={blockedDates}
        onSave={async (payload) => {
          try {
            await handleSaveBlockDates(payload);
          } catch (error) {
            alert(toErrorMessage(error, 'Não foi possível bloquear a data.'));
          }
        }}
        initialValues={
          freeDateSelection
            ? {
                chaletId: freeDateSelection.chaletId,
                dataInicio: freeDateSelection.dateKey,
                dataFim: freeDateSelection.dateKey,
              }
            : undefined
        }
      />
    </div>
  );
};

export default OccupationMap;
