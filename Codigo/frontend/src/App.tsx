import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookingProvider } from "@/contexts/BookingContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { AnimatePresence } from "framer-motion";
import { lazy, Suspense } from "react";

const Index = lazy(() => import("./pages/Index"));
const RoomsPage = lazy(() => import("./pages/RoomsPage"));
const RoomDetailPage = lazy(() => import("./pages/RoomDetailPage"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const ConfirmationPage = lazy(() => import("./pages/ConfirmationPage"));
const MyReservationsPage = lazy(() => import("./pages/MyReservationsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminRooms = lazy(() => import("./pages/admin/AdminRooms"));
const AdminReservations = lazy(() => import("./pages/admin/AdminReservations"));
const AdminPricing = lazy(() => import("./pages/admin/AdminPricing"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BookingProvider>
        <AdminProvider>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/rooms" element={<RoomsPage />} />
                  <Route path="/rooms/:id" element={<RoomDetailPage />} />
                  <Route path="/booking" element={<BookingPage />} />
                  <Route path="/confirmation" element={<ConfirmationPage />} />
                  <Route path="/my-reservations" element={<MyReservationsPage />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="rooms" element={<AdminRooms />} />
                    <Route path="reservations" element={<AdminReservations />} />
                    <Route path="pricing" element={<AdminPricing />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </BrowserRouter>
        </AdminProvider>
      </BookingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
