import { useState, useMemo, useEffect } from "react";
import { format as formatDate } from "date-fns";
import { useLocation } from "react-router-dom";
import { EventCard } from "@/components/EventCard";
import { EventsCarousel } from "@/components/EventsCarousel";
import LoadingSpinner from "@/components/LoadingSpinner";
import { RegistrationFormModal } from "@/components/RegistrationFormModal";
import { enqueueRatingPrompt, dequeueRatingPrompt } from "@/lib/ratings";
import { showRatingToast } from "@/components/RatingToast";
import { EventFilters, EventFiltersState } from "@/components/EventFilters";
import { api, submitUserRating, getPendingRequests } from "@/lib/api";
import { toast } from "sonner";
import { isAuthenticated, redirectToLogin } from "@/lib/auth";
import Header from "@/components/Header";

const readEventItems = (data: any) => {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
};

const normalizeEvent = (event: any) => {
  const eventDate = event?.eventDate || event?.date || "";
  const eventTime = event?.eventTime || event?.time || "";
  const totalSlots = Number(event?.totalSlots ?? event?.totalCapacity ?? event?.capacity ?? 0);
  const availableSlots = Number(event?.availableSlots ?? Math.max(0, totalSlots - Number(event?.currentAttendees ?? 0)));
  const currentAttendees = Number(event?.currentAttendees ?? Math.max(0, totalSlots - availableSlots));
  const images = Array.isArray(event?.images) ? event.images.filter(Boolean) : [];
  const image = event?.image || event?.imageUrl || images[0] || "https://placehold.co/800x450?text=Evento";

  return {
    ...event,
    id: event?.id,
    title: event?.title || "Evento",
    description: event?.description || "",
    rules: event?.rules || "",
    location: event?.location || "",
    eventDate,
    date: eventDate ? new Date(eventDate).toLocaleDateString("pt-BR") : "",
    eventTime,
    time: eventTime,
    totalSlots,
    totalCapacity: totalSlots,
    availableSlots,
    currentAttendees,
    image,
    imageUrl: event?.imageUrl || image,
    images: images.length ? images : [image],
  };
};

const Events = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [carouselEvents, setCarouselEvents] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allEvents, setAllEvents] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [globalLoading, setGlobalLoading] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  // Rating via lateral toast, not dialog
  const [filters, setFilters] = useState<EventFiltersState>({
    name: "",
    date: undefined,
    capacity: "all",
    time: "",
    status: "all",
  });

  // Busca vinda da barra de pesquisa (Header), via parâmetro ?q
  const [searchQuery, setSearchQuery] = useState<string>("");

  const hasActiveFilters = useMemo(() => {
    return !!(
      (searchQuery && searchQuery.trim()) ||
      (filters.name && filters.name.trim()) ||
      filters.date ||
      filters.capacity !== "all" ||
      (filters.time && filters.time !== "all") ||
      filters.status !== "all"
    );
  }, [searchQuery, filters]);

  // Carrega todos os eventos na montagem (para carrossel e base de busca)
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await api.get("/events", { params: { limit: 100 } });
        const data = readEventItems(response.data).map(normalizeEvent);
        setCarouselEvents(data);
        setAllEvents(data);
        // Inicialmente filteredEvents pode ser igual a allEvents, 
        // mas será atualizado pelo useEffect de filtro logo em seguida.
      } catch (error) {
        console.error("Erro ao buscar eventos", error);
        setCarouselEvents([]);
        setAllEvents([]);
        setFilteredEvents([]);
      }
    };
    loadEvents();
  }, []);

  // Lógica de filtragem CLIENT-SIDE (replicando padrão de Aluguel/Vendas)
  useEffect(() => {
    let result = [...allEvents];

    // 1. Filtro por Busca Global (Header) ou Nome (Filtro Local)
    // Se houver searchQuery (Header), ela tem prioridade ou soma-se? 
    // O padrão geralmente é: se o usuário digitou no header, filtra por isso.
    // Se digitou no filtro local, filtra por isso.
    // Vamos considerar ambos combinados (AND) ou priorizar um? 
    // O código anterior usava um "effectiveTitle". Vamos manter a lógica de que ambos filtram o título.
    
    const query = searchQuery.trim().toLowerCase();
    const filterName = filters.name?.trim().toLowerCase();

    if (query) {
      result = result.filter((e) => String(e.title || "").toLowerCase().includes(query));
    }
    if (filterName) {
      result = result.filter((e) => String(e.title || "").toLowerCase().includes(filterName));
    }

    // 2. Filtro por Data
    if (filters.date) {
      const filterDateStr = formatDate(filters.date, "yyyy-MM-dd");
      result = result.filter((e) => {
        if (!e.date) return false;
        // Assume e.date vindo do backend ou formato string comparável
        // Se e.date for ISO completo, extrair a parte da data
        return String(e.date).includes(filterDateStr);
      });
    }

    // 3. Filtro por Capacidade
    if (filters.capacity && filters.capacity !== "all") {
      result = result.filter((e) => {
        const cap = Number(e?.totalCapacity ?? e?.capacity ?? 0);
        if (filters.capacity === "small") return cap < 150;
        if (filters.capacity === "medium") return cap >= 150 && cap <= 500;
        if (filters.capacity === "large") return cap > 500;
        return true;
      });
    }

    // 4. Filtro por Horário
    if (filters.time && filters.time !== "all") {
      const t = String(filters.time).trim().toLowerCase();
      if (t) {
        result = result.filter((e) => String(e.time || "").toLowerCase().includes(t));
      }
    }

    // 5. Filtro por Status
    if (filters.status && filters.status !== "all") {
      const wantedStatus = String(filters.status).toUpperCase();
      result = result.filter((e) => String(e.status || "").toUpperCase() === wantedStatus);
    }

    setFilteredEvents(result);
  }, [allEvents, filters, searchQuery]);

  // Abre modal via parâmetro de query (eventId)
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eventIdParam = params.get("eventId");
    const id = eventIdParam || undefined;
    if (id) {
      // if (!isAuthenticated()) {
      //   redirectToLogin(`register_event:${id}`);
      //   return;
      // }
      setSelectedEventId(id);
      setIsModalOpen(true);
    }
  }, [location.search]);

  // Ouve o estado global de loading emitido pelo cliente de API
  useEffect(() => {
    const handler = (e: Event) => {
      const pending = (e as CustomEvent)?.detail?.pending ?? 0;
      setGlobalLoading(pending > 0);
    };
    setGlobalLoading(getPendingRequests() > 0);
    if (typeof window !== 'undefined') {
      window.addEventListener('global-loading', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('global-loading', handler);
      }
    };
  }, []);

  // Atualiza apenas a busca do carrossel pelo parâmetro (?q), sem mexer nos filtros
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    setSearchQuery(q);
  }, [location.search]);

  const handleRegister = (eventId: string | number) => {
    // If not authenticated, redirect to login and store pending action
    // if (!isAuthenticated()) {
    //   redirectToLogin(`register_event:${eventId}`);
    //   return;
    // }
    setSelectedEventId(String(eventId));
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header searchScope="events" />

      {/* Hero Section */}
      <section className="pt-24 pb-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-4 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-bold">
            Próximos eventos
          </h1>
          <p>
            Descubra eventos e experiências incríveis. Inscreva-se agora para
            garantir sua vaga!
          </p>
        </div>

        {/* Filters Section */}
        <section className="px-4 md:px-8 pb-2 pt-10">
          <div className="max-w-7xl mx-auto">
            <EventFilters 
              filters={filters} 
              onFiltersChange={setFilters} 
            />
          </div>
        </section>
      </section>

      {/* Events Carousel or Grid Section */}
      <section className="py-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {globalLoading ? (
            <div className="py-24">
              <LoadingSpinner />
            </div>
          ) : hasActiveFilters ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Resultados da busca</h2>
              {filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((event) => (
                    <EventCard 
                      key={event.id} 
                      {...event} 
                      onRegister={() => handleRegister(event.id)} 
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground bg-muted/30 rounded-lg">
                  Nenhum evento encontrado para os filtros selecionados.
                </div>
              )}
            </div>
          ) : (
            <EventsCarousel onRegister={handleRegister} events={carouselEvents} />
          )}
        </div>
      </section>

      {/* Registration Modal */}
      <RegistrationFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialEventId={selectedEventId}
        onRegistered={({ eventId, eventTitle }) => {
          const name = eventTitle || "Evento";
          const prompt = { type: "event" as const, id: eventId, name };
          enqueueRatingPrompt(prompt);
          // Exibe após a confirmação de inscrição (leve atraso)
          setTimeout(() => {
            showRatingToast(prompt, {
              onSubmit: async (rating, comment) => {
                try {
                  await submitUserRating({ targetType: 'EVENT', targetId: prompt.id, rating, comment });
                  toast.success('Obrigado pela sua avaliação!');
                } catch (e) {
                  toast.error('Não foi possível enviar sua avaliação.');
                } finally {
                  dequeueRatingPrompt(prompt.id);
                }
              },
              onClose: () => dequeueRatingPrompt(prompt.id),
            });
          }, 300);
        }}
      />

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p>
            &copy; 2025 Eventos Duzepesqueiro. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Events;
