import React, { useMemo, useState } from 'react';
import HostingLayout from './components/HostingLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';
import ReservationsTable from './components/ReservationsTable';
import ReservationDetailsModal from './components/ReservationDetailsModal';
import CancelReservationModal from './components/CancelReservationModal';
import NoShowModal from './components/NoShowModal';
import CreateManualReservationModal from './components/CreateManualReservationModal';

const tabs = ['Todas', 'Ativas', 'Check-in Feito', 'Finalizadas', 'Canceladas'];

const chaletOptions = [
  { id: 'chalet-1', name: 'Quarto Jardim', dailyRate: 150 },
  { id: 'chalet-2', name: 'Quarto Serra', dailyRate: 220 },
  { id: 'chalet-3', name: 'Quarto Bosque', dailyRate: 280 },
];

const initialReservations = [
  {
    id: 'res-1',
    code: 'RES-001',
    chaletId: 'chalet-1',
    chaletName: 'Quarto Jardim',
    guest: {
      name: 'Maria Silva',
      email: 'maria@email.com',
      phone: '(11) 99999-0001',
      cpf: '123.456.789-00',
    },
    guests: [{ name: 'Maria Silva', age: 32, checkInAt: '2026-04-04T14:05:00.000Z' }],
    checkInAt: '2026-04-04T14:00:00.000Z',
    checkOutAt: '2026-04-07T12:00:00.000Z',
    checkInDone: true,
    checkOutDone: false,
    status: 'Ocupado',
    notes: 'Cliente prefere quarto silencioso.',
    total: 1260,
  },
  {
    id: 'res-2',
    code: 'RES-002',
    chaletId: 'chalet-2',
    chaletName: 'Quarto Serra',
    guest: {
      name: 'João Martins',
      email: 'joao@email.com',
      phone: '(11) 98888-2200',
      cpf: '456.111.777-09',
    },
    guests: [{ name: 'João Martins', age: 35, checkInAt: null }],
    checkInAt: '2026-04-05T14:00:00.000Z',
    checkOutAt: '2026-04-08T12:00:00.000Z',
    checkInDone: false,
    checkOutDone: false,
    status: 'Confirmado',
    notes: '',
    total: 930,
  },
  {
    id: 'res-3',
    code: 'RES-003',
    chaletId: 'chalet-3',
    chaletName: 'Quarto Bosque',
    guest: {
      name: 'Ana Oliveira',
      email: 'ana@email.com',
      phone: '(11) 97777-0088',
      cpf: '908.333.122-10',
    },
    guests: [{ name: 'Ana Oliveira', age: 29, checkInAt: '2026-03-10T14:01:00.000Z' }],
    checkInAt: '2026-03-10T14:00:00.000Z',
    checkOutAt: '2026-03-13T12:00:00.000Z',
    checkInDone: true,
    checkOutDone: true,
    status: 'Finalizada',
    notes: 'Estadia sem ocorrências.',
    total: 1350,
  },
  {
    id: 'res-4',
    code: 'RES-004',
    chaletId: 'chalet-1',
    chaletName: 'Quarto Jardim',
    guest: {
      name: 'Pedro Reis',
      email: 'pedro@email.com',
      phone: '(11) 96666-5511',
      cpf: '229.122.447-11',
    },
    guests: [{ name: 'Pedro Reis', age: 41, checkInAt: null }],
    checkInAt: '2026-04-12T14:00:00.000Z',
    checkOutAt: '2026-04-15T12:00:00.000Z',
    checkInDone: false,
    checkOutDone: false,
    status: 'Cancelada',
    notes: 'Cancelada pelo hóspede.',
    total: 450,
  },
];

const ReservationsManagementPage = () => {
  const [reservations, setReservations] = useState(initialReservations);
  const [activeTab, setActiveTab] = useState('Todas');
  const [search, setSearch] = useState('');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isNoShowOpen, setIsNoShowOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredReservations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return reservations.filter((reservation) => {
      const matchesTab =
        activeTab === 'Todas' ||
        (activeTab === 'Ativas' && ['Confirmado', 'Pendente', 'Ocupado'].includes(reservation.status)) ||
        (activeTab === 'Check-in Feito' && reservation.checkInDone && reservation.status !== 'Finalizada' && reservation.status !== 'Cancelada') ||
        (activeTab === 'Finalizadas' && reservation.status === 'Finalizada') ||
        (activeTab === 'Canceladas' && reservation.status === 'Cancelada');

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

  const setReservationStatus = (reservationId, changes) => {
    setReservations((prev) =>
      prev.map((item) => (item.id === reservationId ? { ...item, ...changes } : item))
    );
  };

  const handleView = (reservation) => {
    setSelectedReservation(reservation);
    setIsDetailsOpen(true);
  };

  const handleCheckIn = (reservation) => {
    setReservationStatus(reservation.id, {
      checkInDone: true,
      status: 'Ocupado',
      guests: reservation.guests.map((guest) => ({
        ...guest,
        checkInAt: guest.checkInAt || new Date().toISOString(),
      })),
    });
    setIsDetailsOpen(false);
  };

  const handleCheckOut = (reservation) => {
    setReservationStatus(reservation.id, {
      checkOutDone: true,
      status: 'Finalizada',
    });
    setIsDetailsOpen(false);
  };

  const handleOpenCancel = (reservation) => {
    setSelectedReservation(reservation);
    setIsCancelOpen(true);
  };

  const handleConfirmCancel = (reservation) => {
    setReservationStatus(reservation.id, {
      status: 'Cancelada',
    });
    setIsCancelOpen(false);
    setIsDetailsOpen(false);
  };

  const handleOpenNoShow = (reservation) => {
    setSelectedReservation(reservation);
    setIsNoShowOpen(true);
  };

  const handleConfirmNoShow = (reservation) => {
    setReservationStatus(reservation.id, {
      status: 'Cancelada',
      notes: 'No-show registrado. Cobrança integral aplicada.',
    });
    setIsNoShowOpen(false);
  };

  const handleCreateManual = (payload) => {
    const chalet = chaletOptions.find((item) => item.id === payload.chaletId);
    const codeNumber = reservations.length + 1;
    const code = `RES-${String(codeNumber).padStart(3, '0')}`;
    const mainGuest = payload.guests[0];
    const newReservation = {
      id: `res-${Date.now()}`,
      code,
      chaletId: payload.chaletId,
      chaletName: chalet?.name || 'Chalé',
      guest: {
        name: mainGuest.name,
        email: mainGuest.email,
        phone: mainGuest.phone,
        cpf: mainGuest.cpf,
      },
      guests: payload.guests.map((guest) => ({
        name: guest.name,
        age: 30,
        checkInAt: null,
      })),
      checkInAt: payload.checkInAt,
      checkOutAt: payload.checkOutAt,
      checkInDone: false,
      checkOutDone: false,
      status: 'Pendente',
      notes: payload.notes,
      total: payload.total,
    };
    setReservations((prev) => [newReservation, ...prev]);
    setIsCreateOpen(false);
    setActiveTab('Todas');
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
        reservations={filteredReservations}
        onView={handleView}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        onCancel={handleOpenCancel}
        onNoShow={handleOpenNoShow}
      />

      <ReservationDetailsModal
        isOpen={isDetailsOpen}
        reservation={selectedReservation}
        onClose={() => setIsDetailsOpen(false)}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
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
        chalets={chaletOptions}
        onCreate={handleCreateManual}
      />
    </HostingLayout>
  );
};

export default ReservationsManagementPage;
