import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { BookingData, PaymentData, Reservation, Guest } from '@/types/booking';

interface BookingContextType {
  booking: BookingData;
  setBooking: React.Dispatch<React.SetStateAction<BookingData>>;
  payment: PaymentData;
  setPayment: React.Dispatch<React.SetStateAction<PaymentData>>;
  reservations: Reservation[];
  addReservation: (reservation: Reservation) => void;
  cancelReservation: (id: string) => void;
  updateReservationGuests: (id: string, guests: Guest[]) => void;
  resetBooking: () => void;
}

const defaultBooking: BookingData = {
  roomId: '',
  checkIn: null,
  checkOut: null,
  guests: 1,
  pets: false,
  guestDetails: [],
  responsibleGuestIndex: null,
  vehiclePlate: '',
  observations: '',
};

const defaultPayment: PaymentData = {
  method: null,
  status: 'idle',
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [booking, setBooking] = useState<BookingData>(defaultBooking);
  const [payment, setPayment] = useState<PaymentData>(defaultPayment);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const addReservation = (reservation: Reservation) => {
    setReservations(prev => [reservation, ...prev]);
  };

  const cancelReservation = (id: string) => {
    setReservations(prev =>
      prev.map(r => (r.id === id ? { ...r, status: 'cancelled' as const } : r))
    );
  };

  const updateReservationGuests = (id: string, guests: Guest[]) => {
    setReservations(prev =>
      prev.map(r => (r.id === id ? { ...r, bookingData: { ...r.bookingData, guestDetails: guests } } : r))
    );
  };

  const resetBooking = () => {
    setBooking(defaultBooking);
    setPayment(defaultPayment);
  };

  return (
    <BookingContext.Provider
      value={{ booking, setBooking, payment, setPayment, reservations, addReservation, cancelReservation, updateReservationGuests, resetBooking }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
};
