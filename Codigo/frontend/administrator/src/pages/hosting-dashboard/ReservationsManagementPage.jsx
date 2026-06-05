import React, { useCallback, useEffect, useMemo, useState } from 'react';
import HostingLayout from './components/HostingLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';
import ReservationsTable from './components/ReservationsTable';
import ReservationDetailsModal from './components/ReservationDetailsModal';
import CancelReservationModal from './components/CancelReservationModal';
import NoShowModal from './components/NoShowModal';
import CreateManualReservationModal from './components/CreateManualReservationModal';
import {
  cancelReservation,
  createManualReservation,
  getReservationById,
  listChalets,
  listReservations,
  processReservationCheckIn,
  processReservationCheckOut,
  registerReservationNoShow,
} from '../../utils/hostingService';

const tabs = ['Todas', 'Ativas', 'Check-in Feito', 'Finalizadas', 'Canceladas'];

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

const toDateOnly = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const canStartCheckIn = (reservation) => {
  const checkInDate = toDateOnly(reservation?.checkInDate || reservation?.checkInAt);
  if (!checkInDate) {
    return true;
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today.getTime() >= checkInDate.getTime();
};

const statusToLabel = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  OCCUPIED: 'Ocupado',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No-show',
};

const normalizeChalet = (chalet) => ({
  id: chalet?.id,
  name: chalet?.name || 'Chalé',
  dailyRate: Number(chalet?.basePrice || 0),
});

const normalizeReservation = (reservation, chaletsById = {}) => {
  const uiStatus = statusToLabel[reservation?.status] || 'Pendente';
  const guestName = reservation?.guestName || 'Hóspede';
  const mappedGuests = Array.isArray(reservation?.guests)
    ? reservation.guests.map((guest) => ({
        id: guest?.id,
        name: guest?.fullName || guestName,
        email: guest?.email || '-',
        phone: guest?.phone || '-',
        cpf: guest?.cpf || '-',
        rg: guest?.rg || '-',
        birthDate: guest?.birthDate || null,
        isPrimary: Boolean(guest?.isPrimary),
        checkInAt: reservation?.checkedInAt || null,
      }))
    : [];

  const guests = mappedGuests.length
    ? mappedGuests
    : [
        {
          name: guestName,
          checkInAt: reservation?.checkedInAt || null,
        },
      ];

  return {
    id: reservation?.id,
    code: reservation?.code,
    chaletId: reservation?.chaletId,
    chaletName: chaletsById[reservation?.chaletId] || 'Chalé',
    userId: reservation?.userId || null,
    origin: reservation?.origin || 'ONLINE',
    guest: {
      name: guestName,
      email: reservation?.guestEmail || '-',
      phone: reservation?.guestPhone || '-',
      cpf: guests?.[0]?.cpf || '-',
    },
    guests,
    checkInAt: reservation?.checkInDate,
    checkOutAt: reservation?.checkOutDate,
    checkInDate: reservation?.checkInDate,
    checkOutDate: reservation?.checkOutDate,
    checkInDone:
      Boolean(reservation?.checkedInAt) ||
      reservation?.status === 'OCCUPIED' ||
      reservation?.status === 'COMPLETED',
    checkOutDone: Boolean(reservation?.checkedOutAt) || reservation?.status === 'COMPLETED',
    checkedInAt: reservation?.checkedInAt || null,
    checkedOutAt: reservation?.checkedOutAt || null,
    cancelledAt: reservation?.cancelledAt || null,
    noShowAt: reservation?.noShowAt || null,
    noShowReason: reservation?.noShowReason || null,
    cancellationReason: reservation?.cancellationReason || null,
    noShowFeeAmount: reservation?.noShowFeeAmount != null ? Number(reservation.noShowFeeAmount) : null,
    status: uiStatus,
    paymentStatus: reservation?.paymentStatus || null,
    paymentMethod: reservation?.paymentMethod || null,
    paymentId: reservation?.paymentId || null,
    paidAt: reservation?.paidAt || null,
    baseAmount: Number(reservation?.baseAmount || 0),
    discountAmount: Number(reservation?.discountAmount || 0),
    surchargeAmount: Number(reservation?.surchargeAmount || 0),
    notes: reservation?.notes || '',
    contactChannel: reservation?.contactChannel || null,
    contactNotes: reservation?.contactNotes || null,
    adults: Number(reservation?.adults || guests.length || 0),
    children: Number(reservation?.children || 0),
    vehiclePlate: reservation?.vehiclePlate || null,
    vehicleModel: reservation?.vehicleModel || null,
    vehicleColor: reservation?.vehicleColor || null,
    vehicleType: reservation?.vehicleType || null,
    extraBedRequested: Boolean(reservation?.extraBedRequested),
    extraBedFee: Number(reservation?.extraBedFee || 0),
    negotiationNotes: reservation?.negotiationNotes || null,
    policiesAccepted: Boolean(reservation?.policiesAccepted),
    policiesAcceptedAt: reservation?.policiesAcceptedAt || null,
    policyVersion: reservation?.policyVersion || null,
    policyTerm: reservation?.policyTerm || null,
    cancellationPolicyId: reservation?.cancellationPolicyId || null,
    pricingRuleId: reservation?.pricingRuleId || null,
    createdById: reservation?.createdById || null,
    updatedById: reservation?.updatedById || null,
    createdAt: reservation?.createdAt || null,
    updatedAt: reservation?.updatedAt || null,
    vouchers: Array.isArray(reservation?.vouchers)
      ? reservation.vouchers.map((voucher) => ({
          id: voucher?.id,
          qrCode: voucher?.qrCode || '-',
          generatedAt: voucher?.generatedAt || null,
          sentByEmail: Boolean(voucher?.sentByEmail),
          arrivalInstructions: voucher?.arrivalInstructions || null,
          complexContacts: voucher?.complexContacts || null,
        }))
      : [],
    total: Number(reservation?.totalAmount || 0),
  };
};

const ReservationsManagementPage = () => {
  const [reservations, setReservations] = useState([]);
  const [chalets, setChalets] = useState([]);
  const [activeTab, setActiveTab] = useState('Todas');
  const [search, setSearch] = useState('');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isNoShowOpen, setIsNoShowOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState({ reservationId: null, type: null });
  const [errorPopup, setErrorPopup] = useState({ open: false, title: '', message: '' });

  const chaletNameMap = useMemo(
    () =>
      chalets.reduce((acc, chalet) => {
        acc[chalet.id] = chalet.name;
        return acc;
      }, {}),
    [chalets]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [chaletsResponse, reservationsResponse] = await Promise.all([listChalets(), listReservations()]);
      const normalizedChalets = chaletsResponse.map(normalizeChalet);
      const normalizedMap = normalizedChalets.reduce((acc, chalet) => {
        acc[chalet.id] = chalet.name;
        return acc;
      }, {});
      setChalets(normalizedChalets);
      setReservations(reservationsResponse.map((reservation) => normalizeReservation(reservation, normalizedMap)));
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível carregar os dados de reservas.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredReservations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return reservations.filter((reservation) => {
      const matchesTab =
        activeTab === 'Todas' ||
        (activeTab === 'Ativas' && ['Confirmado', 'Pendente', 'Ocupado'].includes(reservation.status)) ||
        (activeTab === 'Check-in Feito' && reservation.checkInDone && reservation.status !== 'Finalizada' && reservation.status !== 'Cancelada') ||
        (activeTab === 'Finalizadas' && reservation.status === 'Finalizada') ||
        (activeTab === 'Canceladas' && ['Cancelada', 'No-show'].includes(reservation.status));

      if (!matchesTab) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const fields = [
        reservation.code,
        reservation.guest.name,
        reservation.guest.email,
        reservation.guest.phone,
      ]
        .join(' ')
        .toLowerCase();

      return fields.includes(normalizedSearch);
    });
  }, [reservations, activeTab, search]);

  const handleView = async (reservation) => {
    try {
      const detail = await getReservationById(reservation.id);
      setSelectedReservation(normalizeReservation(detail, chaletNameMap));
    } catch {
      setSelectedReservation(reservation);
    }
    setIsDetailsOpen(true);
  };

  const handleCheckIn = async (reservation) => {
    if (processingAction.reservationId) {
      return;
    }
    if (!canStartCheckIn(reservation)) {
      alert('Check-in só pode ser realizado a partir da data da reserva.');
      return;
    }
    setProcessingAction({ reservationId: reservation.id, type: 'checkin' });
    try {
      await processReservationCheckIn(reservation.id);
      await loadData();
      setIsDetailsOpen(false);
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível processar o check-in.'));
    } finally {
      setProcessingAction({ reservationId: null, type: null });
    }
  };

  const handleCheckOut = async (reservation) => {
    if (processingAction.reservationId) {
      return;
    }
    setProcessingAction({ reservationId: reservation.id, type: 'checkout' });
    try {
      await processReservationCheckOut(reservation.id);
      await loadData();
      setIsDetailsOpen(false);
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível processar o check-out.'));
    } finally {
      setProcessingAction({ reservationId: null, type: null });
    }
  };

  const handleOpenCancel = (reservation) => {
    setSelectedReservation(reservation);
    setIsCancelOpen(true);
  };

  const handleConfirmCancel = async (reservation) => {
    try {
      await cancelReservation(reservation.id, 'Cancelamento realizado pelo administrador.');
      await loadData();
      setIsCancelOpen(false);
      setIsDetailsOpen(false);
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível cancelar a reserva.'));
    }
  };

  const handleOpenNoShow = (reservation) => {
    setSelectedReservation(reservation);
    setIsNoShowOpen(true);
  };

  const handleConfirmNoShow = async (reservation) => {
    try {
      await registerReservationNoShow(reservation.id);
      await loadData();
      setIsNoShowOpen(false);
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível registrar no-show.'));
    }
  };

  const handleCreateManual = async (payload) => {
    try {
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

      await loadData();
      setIsCreateOpen(false);
      setActiveTab('Todas');
    } catch (error) {
      const message = toErrorMessage(error, 'Não foi possível criar a reserva manual.');
      setErrorPopup({
        open: true,
        title: 'Conflito de disponibilidade',
        message,
      });
      throw error;
    }
  };

  const headerActions = (
    <Button type="button" onClick={() => setIsCreateOpen(true)}>
      <Icon name="Plus" size={16} className="mr-2" />
      Criar Reserva Manualmente
    </Button>
  );

  return (
    <HostingLayout
      title="Gerenciamento de Reservas"
      subtitle="Fluxo operacional de reservas com check-in, check-out, cancelamento e no-show"
      actions={headerActions}
    >
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-smooth ${
                activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="max-w-lg">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código, hóspede, data..."
            className="pl-9"
          />
          <Icon name="Search" size={16} className="relative -top-8 left-3 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <ReservationsTable
        reservations={loading ? [] : filteredReservations}
        onView={handleView}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        onCancel={handleOpenCancel}
        onNoShow={handleOpenNoShow}
        processingAction={processingAction}
      />

      <ReservationDetailsModal
        isOpen={isDetailsOpen}
        reservation={selectedReservation}
        onClose={() => setIsDetailsOpen(false)}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        processingAction={processingAction}
      />

      <CancelReservationModal
        isOpen={isCancelOpen}
        reservation={selectedReservation}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleConfirmCancel}
      />

      <NoShowModal
        isOpen={isNoShowOpen}
        reservation={selectedReservation}
        onClose={() => setIsNoShowOpen(false)}
        onConfirm={handleConfirmNoShow}
      />

      <CreateManualReservationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        chalets={chalets}
        onCreate={handleCreateManual}
      />

      {processingAction.reservationId ? (
        <div className="fixed inset-0 z-[1400] bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg px-5 py-4 text-sm text-foreground shadow-soft-lg">
            {processingAction.type === 'checkout' ? 'Processando check-out...' : 'Processando check-in...'}
          </div>
        </div>
      ) : null}

      {errorPopup.open ? (
        <div className="fixed inset-0 z-[1450] bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-soft-lg">
            <div className="p-5 border-b border-border">
              <h4 className="text-base font-semibold text-foreground">{errorPopup.title}</h4>
            </div>
            <div className="p-5">
              <p className="text-sm text-muted-foreground">{errorPopup.message}</p>
            </div>
            <div className="p-5 border-t border-border flex justify-end">
              <Button
                type="button"
                onClick={() => setErrorPopup({ open: false, title: '', message: '' })}
              >
                Entendi
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </HostingLayout>
  );
};

export default ReservationsManagementPage;
