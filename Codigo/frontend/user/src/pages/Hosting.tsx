import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookingProvider } from "@/contexts/BookingContext";
import { lazy, Suspense } from "react";
import Header from "@/components/Header";

const Index = lazy(() => import("../components/common/Index"));
const RoomsPage = lazy(() => import("../components/common/RoomsPage"));
const RoomDetailPage = lazy(() => import("../components/common/RoomDetailPage"));
const BookingPage = lazy(() => import("../components/common/BookingPage"));
const ConfirmationPage = lazy(() => import("../components/common/ConfirmationPage"));
const PaymentSuccessPage = lazy(() => import("../components/common/PaymentSuccessPage"));
const PaymentPendingPage = lazy(() => import("../components/common/PaymentPendingPage"));
const PaymentFailurePage = lazy(() => import("../components/common/PaymentFailurePage"));
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
            <Header searchScope="hosting" />
            <Toaster />
            <SonnerToaster position="top-right" richColors />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route index element={<Index />} />
                <Route path="home" element={<Index />} />
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="rooms/:id" element={<RoomDetailPage />} />
                <Route path="booking" element={<BookingPage />} />
                <Route path="pagamento/sucesso" element={<PaymentSuccessPage />} />
                <Route path="pagamento/pendente" element={<PaymentPendingPage />} />
                <Route path="pagamento/falha" element={<PaymentFailurePage />} />
                <Route path="confirmation" element={<ConfirmationPage />} />
                <Route path="my-reservations" element={<MyReservationsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
        </BookingProvider>
      </TooltipProvider>
    </div>
  </QueryClientProvider>
);

export default Hosting;
