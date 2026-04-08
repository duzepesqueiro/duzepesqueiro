import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Room, Reservation, Guest, BookingData, PaymentData } from '@/types/booking';
import type { DateBlock, PricingRule, AdminReservation, RoomStatus } from '@/types/admin';
import { rooms as defaultRooms } from '@/data/rooms';
import { toast } from 'sonner';

interface AdminContextType {
  rooms: Room[];
  addRoom: (room: Room) => void;
  updateRoom: (id: string, room: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  reservations: AdminReservation[];
  addReservation: (reservation: AdminReservation) => void;
  processCheckIn: (id: string) => void;
  processCheckOut: (id: string) => void;
  cancelReservation: (id: string) => void;
  markNoShow: (id: string) => void;
  dateBlocks: DateBlock[];
  addDateBlock: (block: DateBlock) => void;
  removeDateBlock: (id: string) => void;
  pricingRules: PricingRule[];
  addPricingRule: (rule: PricingRule) => void;
  updatePricingRule: (id: string, rule: Partial<PricingRule>) => void;
  deletePricingRule: (id: string) => void;
  getRoomStatus: (roomId: string) => RoomStatus;
  getCalculatedPrice: (roomId: string, date: Date) => number;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const generateMockReservations = (): AdminReservation[] => {
  const today = new Date();
  return [
    {
      id: 'RES-001',
      bookingData: {
        roomId: 'deluxe-1',
        checkIn: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
        checkOut: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
        guests: 2,
        pets: false,
        guestDetails: [{ name: 'Maria Silva', age: 32, address: { street: 'Rua A', number: '100', city: 'São Paulo', state: 'SP', zip: '01000-000' } }],
        responsible: { name: 'Maria Silva', email: 'maria@email.com', phone: '(11) 99999-0001', cpf: '123.456.789-00' },
        observations: '',
      },
      paymentData: { method: 'card', status: 'success' },
      status: 'confirmed',
      createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
      totalPrice: 1260,
      checkInAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
    },
    {
      id: 'RES-002',
      bookingData: {
        roomId: 'suite-1',
        checkIn: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
        checkOut: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7),
        guests: 3,
        pets: true,
        guestDetails: [{ name: 'João Santos', age: 45, address: { street: 'Rua B', number: '200', city: 'Rio de Janeiro', state: 'RJ', zip: '20000-000' } }],
        responsible: { name: 'João Santos', email: 'joao@email.com', phone: '(21) 98888-0002', cpf: '987.654.321-00' },
        observations: 'Pet: cachorro pequeno',
      },
      paymentData: { method: 'pix', status: 'success' },
      status: 'confirmed',
      createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2),
      totalPrice: 3000,
    },
    {
      id: 'RES-003',
      bookingData: {
        roomId: 'standard-1',
        checkIn: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        checkOut: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        guests: 1,
        pets: false,
        guestDetails: [{ name: 'Ana Costa', age: 28, address: { street: 'Rua C', number: '300', city: 'Curitiba', state: 'PR', zip: '80000-000' } }],
        responsible: { name: 'Ana Costa', email: 'ana@email.com', phone: '(41) 97777-0003', cpf: '111.222.333-44' },
        observations: '',
      },
      paymentData: { method: 'card', status: 'success' },
      status: 'pending',
      createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
      totalPrice: 280,
    },
  ];
};

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [rooms, setRooms] = useState<Room[]>(defaultRooms);
  const [reservations, setReservations] = useState<AdminReservation[]>(generateMockReservations());
  const [dateBlocks, setDateBlocks] = useState<DateBlock[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([
    {
      id: 'pr-1',
      name: 'Alta Temporada - Verão',
      type: 'season',
      startDate: '2026-12-15',
      endDate: '2027-03-15',
      modifier: 1.4,
      roomIds: [],
      active: true,
    },
    {
      id: 'pr-2',
      name: 'Final de Semana',
      type: 'weekend',
      startDate: '',
      endDate: '',
      modifier: 1.2,
      roomIds: [],
      active: true,
    },
    {
      id: 'pr-3',
      name: 'Desconto Baixa Temporada',
      type: 'discount',
      startDate: '2026-05-01',
      endDate: '2026-06-30',
      modifier: 0.85,
      roomIds: [],
      active: true,
    },
  ]);

  const addRoom = useCallback((room: Room) => {
    setRooms(prev => [...prev, room]);
    toast.success('Chalé adicionado com sucesso!');
  }, []);

  const updateRoom = useCallback((id: string, data: Partial<Room>) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    toast.success('Chalé atualizado com sucesso!');
  }, []);

  const deleteRoom = useCallback((id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
    toast.success('Chalé removido com sucesso!');
  }, []);

  const addReservation = useCallback((reservation: AdminReservation) => {
    setReservations(prev => [reservation, ...prev]);
    toast.success(`Reserva ${reservation.id} criada!`);
  }, []);

  const processCheckIn = useCallback((id: string) => {
    setReservations(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, status: 'confirmed' as const, checkInAt: new Date() }
          : r
      )
    );
    toast.success('Check-in realizado com sucesso!');
  }, []);

  const processCheckOut = useCallback((id: string) => {
    setReservations(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, checkOutAt: new Date() }
          : r
      )
    );
    toast.success('Check-out realizado com sucesso!');
  }, []);

  const cancelReservation = useCallback((id: string) => {
    const reservation = reservations.find(r => r.id === id);
    let penalty = '';
    if (reservation?.bookingData.checkIn) {
      const daysUntil = Math.ceil(
        (reservation.bookingData.checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil < 7) {
        penalty = 'Multa de 50% do valor total (cancelamento com menos de 7 dias de antecedência)';
      } else if (daysUntil < 14) {
        penalty = 'Multa de 20% do valor total (cancelamento com menos de 14 dias de antecedência)';
      } else {
        penalty = 'Sem multa (cancelamento com mais de 14 dias de antecedência)';
      }
    }
    setReservations(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, status: 'cancelled' as const, cancellationPenalty: penalty }
          : r
      )
    );
    toast.success('Reserva cancelada.');
  }, [reservations]);

  const markNoShow = useCallback((id: string) => {
    setReservations(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              noShow: true,
              cancellationPenalty: 'Cobrança integral por não comparecimento (no-show) conforme política.',
            }
          : r
      )
    );
    toast.warning('No-show registrado. Cobrança integral aplicada.');
  }, []);

  const addDateBlock = useCallback((block: DateBlock) => {
    setDateBlocks(prev => [...prev, block]);
    toast.success('Bloqueio de datas criado!');
  }, []);

  const removeDateBlock = useCallback((id: string) => {
    setDateBlocks(prev => prev.filter(b => b.id !== id));
    toast.success('Bloqueio removido!');
  }, []);

  const addPricingRule = useCallback((rule: PricingRule) => {
    setPricingRules(prev => [...prev, rule]);
    toast.success('Regra de preço adicionada!');
  }, []);

  const updatePricingRule = useCallback((id: string, data: Partial<PricingRule>) => {
    setPricingRules(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    toast.success('Regra de preço atualizada!');
  }, []);

  const deletePricingRule = useCallback((id: string) => {
    setPricingRules(prev => prev.filter(r => r.id !== id));
    toast.success('Regra de preço removida!');
  }, []);

  const getRoomStatus = useCallback((roomId: string): RoomStatus => {
    const now = new Date();
    const isBlocked = dateBlocks.some(b => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      return b.roomId === roomId && now >= start && now <= end;
    });
    if (isBlocked) return 'blocked';

    const activeRes = reservations.find(r => {
      if (r.bookingData.roomId !== roomId || r.status === 'cancelled') return false;
      const ci = r.bookingData.checkIn;
      const co = r.bookingData.checkOut;
      return ci && co && now >= ci && now <= co;
    });

    if (activeRes) {
      return activeRes.checkInAt ? 'occupied' : 'reserved';
    }
    return 'free';
  }, [dateBlocks, reservations]);

  const getCalculatedPrice = useCallback((roomId: string, date: Date): number => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return 0;
    let price = room.pricePerNight;
    const day = date.getDay();
    const isWeekend = day === 0 || day === 5 || day === 6;

    for (const rule of pricingRules) {
      if (!rule.active) continue;
      if (rule.roomIds.length > 0 && !rule.roomIds.includes(roomId)) continue;
      if (rule.type === 'weekend' && isWeekend) {
        price *= rule.modifier;
      } else if (rule.type !== 'weekend' && rule.startDate && rule.endDate) {
        const start = new Date(rule.startDate);
        const end = new Date(rule.endDate);
        if (date >= start && date <= end) {
          price *= rule.modifier;
        }
      }
    }
    return Math.round(price);
  }, [rooms, pricingRules]);

  return (
    <AdminContext.Provider
      value={{
        rooms, addRoom, updateRoom, deleteRoom,
        reservations, addReservation, processCheckIn, processCheckOut, cancelReservation, markNoShow,
        dateBlocks, addDateBlock, removeDateBlock,
        pricingRules, addPricingRule, updatePricingRule, deletePricingRule,
        getRoomStatus, getCalculatedPrice,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
};
