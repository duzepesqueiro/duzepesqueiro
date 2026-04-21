import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookingProvider } from "@/contexts/BookingContext";
import { AnimatePresence } from "framer-motion";
import { lazy, Suspense } from "react";

const Index = lazy(() => import("../components/common/Index"));
const RoomsPage = lazy(() => import("../components/common/RoomsPage"));
const RoomDetailPage = lazy(() => import("../components/common/RoomDetailPage"));
const BookingPage = lazy(() => import("../components/common/BookingPage"));
const PaymentPage = lazy(() => import("../components/common/PaymentPage"));
const ConfirmationPage = lazy(() => import("../components/common/ConfirmationPage"));
const MyReservationsPage = lazy(() => import("../components/common/MyReservationsPage"));
const NotFound = lazy(() => import("../components/common/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const Hosting = () => (
  <QueryClientProvider client={queryClient}>
    <div className="hosting-theme">
      <TooltipProvider>
        <BookingProvider>
            <Toaster />
            <SonnerToaster position="top-right" richColors />
            <Suspense fallback={<PageLoader />}>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route index element={<Index />} />
                  <Route path="home" element={<Index />} />
                  <Route path="rooms" element={<RoomsPage />} />
                  <Route path="rooms/:id" element={<RoomDetailPage />} />
                  <Route path="booking" element={<BookingPage />} />
                  <Route path="payment" element={<PaymentPage />} />
                  <Route path="confirmation" element={<ConfirmationPage />} />
                  <Route path="my-reservations" element={<MyReservationsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
        </BookingProvider>
      </TooltipProvider>
    </div>
  </QueryClientProvider>
);

export default Hosting;
