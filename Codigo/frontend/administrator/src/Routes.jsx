import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import RequireAdmin from "./components/RequireAdmin";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import InventoryManagementDashboard from './pages/inventory-management-dashboard';
import RentalOperationsDashboard from './pages/rental-operations-dashboard';
import ExecutiveOverviewDashboard from './pages/executive-overview-dashboard';
import SalesAnalyticsDashboard from './pages/sales-analytics-dashboard';
import EventsManagementDashboard from "./pages/events-management-dashboard";
import UsersManagementDashboard from "./pages/users-management-dashboard";
import MarketingDashboard from "./pages/marketing-dashboard";
import HostingDashboard from "./pages/hosting-dashboard";
import ChaletsManagementPage from "./pages/hosting-dashboard/ChaletsManagementPage";
import ReservationsManagementPage from "./pages/hosting-dashboard/ReservationsManagementPage";
import PricingManagementPage from "./pages/hosting-dashboard/PricingManagementPage";
import DataManagementDashboard from "./pages/data-management-dashboard";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const Routes = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("token") || params.has("refreshToken") || params.has("role") || params.has("email")) {
        const { protocol, host, pathname, hash } = window.location;
        const cleanUrl = `${protocol}//${host}${pathname}${hash || ""}`;
        window.history.replaceState({}, "", cleanUrl);
      }
    } catch {}
    finally {
      // Garante que as rotas renderizem após processar o query string/localStorage
      setReady(true);
    }
  }, []);

  return (
    <BrowserRouter basename={basePath || undefined}>
      <ErrorBoundary>
      <ScrollToTop />
      {ready && (
      <RouterRoutes>
        {/* Define your route here */}
        <Route path="/" element={<RequireAdmin><ExecutiveOverviewDashboard /></RequireAdmin>} />
        <Route path="/inventory-management-dashboard" element={<RequireAdmin><InventoryManagementDashboard /></RequireAdmin>} />
        <Route path="/rental-operations-dashboard" element={<RequireAdmin><RentalOperationsDashboard /></RequireAdmin>} />
        <Route path="/executive-overview-dashboard" element={<RequireAdmin><ExecutiveOverviewDashboard /></RequireAdmin>} />
        <Route path="/sales-analytics-dashboard" element={<RequireAdmin><SalesAnalyticsDashboard /></RequireAdmin>} />
        <Route path="/events-management-dashboard" element={<RequireAdmin><EventsManagementDashboard /></RequireAdmin>} />
        <Route path="/users-management-dashboard" element={<RequireAdmin><UsersManagementDashboard /></RequireAdmin>} />
        <Route path="/data-management-dashboard" element={<RequireAdmin><DataManagementDashboard /></RequireAdmin>} />
        <Route path="/marketing-dashboard" element={<RequireAdmin><MarketingDashboard /></RequireAdmin>} />
        <Route path="/hospedagem" element={<RequireAdmin><HostingDashboard /></RequireAdmin>} />
        <Route path="/hospedagem/chales" element={<RequireAdmin><ChaletsManagementPage /></RequireAdmin>} />
        <Route path="/hospedagem/reservas" element={<RequireAdmin><ReservationsManagementPage /></RequireAdmin>} />
        <Route path="/hospedagem/precos" element={<RequireAdmin><PricingManagementPage /></RequireAdmin>} />
        <Route path="/admin/hospedagem" element={<RequireAdmin><HostingDashboard /></RequireAdmin>} />
        <Route path="/admin/hospedagem/chales" element={<RequireAdmin><ChaletsManagementPage /></RequireAdmin>} />
        <Route path="/admin/hospedagem/reservas" element={<RequireAdmin><ReservationsManagementPage /></RequireAdmin>} />
        <Route path="/admin/hospedagem/precos" element={<RequireAdmin><PricingManagementPage /></RequireAdmin>} />
        <Route path="/admin/marketing-dashboard" element={<RequireAdmin><MarketingDashboard /></RequireAdmin>} />
        <Route path="/admin/data-management-dashboard" element={<RequireAdmin><DataManagementDashboard /></RequireAdmin>} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      )}
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
