import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Events from "./pages/Events";
import ChangePassword from "./pages/ChangePassword";
import FishingGear from "./pages/FishingGear";
import About from "./pages/About";
import Hospedagem from "./pages/Hospedagem";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Remove parâmetros sensíveis antigos da URL, sem consumi-los
if (typeof window !== "undefined") {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("token") || params.has("refreshToken") || params.has("role") || params.has("email")) {
      const { protocol, host, pathname, hash } = window.location;
      const cleanUrl = `${protocol}//${host}${pathname}${hash || ""}`;
      window.history.replaceState({}, "", cleanUrl);
    }
  } catch {}
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={basePath || undefined}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/events" element={<Events />} />
              <Route path="/store" element={<FishingGear />} />
              <Route path="/about" element={<About />} />
              <Route path="/account/change-password" element={<ChangePassword />} />
              <Route path="/hospedagem/*" element={<Hospedagem />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
