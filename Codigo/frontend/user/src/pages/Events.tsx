import { useState, useMemo, useEffect } from "react";
import { format as formatDate } from "date-fns";
import { useLocation } from "react-router-dom";
import { EventCard } from "@/components/EventCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { RegistrationFormModal } from "@/components/RegistrationFormModal";
import { MyEventsModal } from "@/components/MyEventsModal";
import { enqueueRatingPrompt, dequeueRatingPrompt } from "@/lib/ratings";
import { showRatingToast } from "@/components/RatingToast";
import { EventFilters, EventFiltersState } from "@/components/EventFilters";
import { api, submitUserRating } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Header from "@/components/Header";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 9;

interface PaginatedEventsResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  total: number;
  page: number;
  pageSize: number;
}

const mapStatusToApi = (value: string): "ALL" | "UPCOMING" | "CANCELLED" => {
  if (value === "cancelled") return "CANCELLED";
  if (value === "scheduled") return "UPCOMING";
  return "ALL";
};

const Events = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);

  const [refreshKey, setRefreshKey] = useState(0);

  const [isMyEventsOpen, setIsMyEventsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [selectedEventTitle, setSelectedEventTitle] = useState<string | undefined>();
  // Rating via lateral toast, not dialog
  const [filters, setFilters] = useState<EventFiltersState>({
    name: "",
    date: undefined,
    time: "",
    status: "all",
  });

  // Busca vinda da barra de pesquisa (Header), via parâmetro ?q
  const [searchQuery, setSearchQuery] = useState<string>("");

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const hasActiveFilters = useMemo(() => {
    return !!(
      (searchQuery && searchQuery.trim()) ||
      (filters.name && filters.name.trim()) ||
      filters.date ||
      (filters.time && filters.time !== "all") ||
      filters.status !== "all"
    );
  }, [searchQuery, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  useEffect(() => {
    let mounted = true;
    const loadEvents = async () => {
      try {
        setIsLoadingEvents(true);
        const nameFilter = filters.name.trim();
        const globalQuery = searchQuery.trim();
        const response = await api.get<PaginatedEventsResponse>("/events", {
          params: {
            name: nameFilter || globalQuery || undefined,
            date: filters.date ? formatDate(filters.date, "dd/MM/yyyy") : undefined,
            time: filters.time || undefined,
            status: mapStatusToApi(filters.status),
            page: currentPage,
            limit: PAGE_SIZE,
          },
        });

        if (!mounted) return;
        const raw = Array.isArray(response.data?.items) ? response.data.items : [];
        const data = raw.map((e: any) => ({
          ...e,
          image: e.imageUrl ?? "",
          date: e.eventDate ? (() => { const [y, m, d] = String(e.eventDate).split("T")[0].split("-"); return `${d}/${m}/${y}`; })() : "",
          time: e.eventTime ?? "",
          currentAttendees: (e.totalSlots ?? 0) - (e.availableSlots ?? 0),
          totalCapacity: e.totalSlots ?? 0,
          description: e.description ?? "",
          rules: e.rules ?? "",
        }));

        setEvents(data);
        setTotalItems(Number(response.data?.total ?? 0));
        setPageSize(Number(response.data?.pageSize ?? PAGE_SIZE));
      } catch (error) {
        console.error("Erro ao buscar eventos paginados", error);
        if (!mounted) return;
        setEvents([]);
        setTotalItems(0);
        setPageSize(PAGE_SIZE);
      } finally {
        if (mounted) setIsLoadingEvents(false);
      }
    };

    loadEvents();
    return () => {
      mounted = false;
    };
  }, [searchQuery, filters, currentPage, refreshKey]);

  // Abre modal via parâmetro de query (eventId)
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eventIdParam = params.get("eventId");
    if (eventIdParam) {
      const event = events.find((e) => String(e.id) === eventIdParam);
      setSelectedEventId(eventIdParam);
      setSelectedEventTitle(event?.title);
      setIsModalOpen(true);
    }
  }, [location.search, events]);

  // Atualiza apenas a busca do carrossel pelo parâmetro (?q), sem mexer nos filtros
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    setSearchQuery(q);
  }, [location.search]);

  const handleRegister = (eventId: string) => {
    const event = events.find((e) => String(e.id) === eventId);
    setSelectedEventId(eventId);
    setSelectedEventTitle(event?.title);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header searchScope="events" />

      {/* Hero Section */}
      <section className="pt-24 pb-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-4 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">
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
          {isLoadingEvents ? (
            <div className="py-24">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-bold">
                  {hasActiveFilters ? "Resultados da busca" : "Eventos disponíveis"}
                </h2>
                {isAuthenticated() && (
                  <Button
                    onClick={() => setIsMyEventsOpen(true)}
                    className="shrink-0 bg-[#f2c14e] hover:bg-[#d9ad46] text-[#1a2832] font-bold gap-2"
                  >
                    <Ticket className="w-4 h-4" />
                    Meus eventos
                  </Button>
                )}
              </div>
              {events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event) => (
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
              {events.length > 0 && totalPages > 1 && (
                <Pagination className="mt-2">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((page) => Math.max(1, page - 1));
                        }}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === currentPage}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((page) => Math.min(totalPages, page + 1));
                        }}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </div>
      </section>

      {/* My Events Modal */}
      <MyEventsModal
        open={isMyEventsOpen}
        onOpenChange={setIsMyEventsOpen}
        onRegistrationCancelled={() => setRefreshKey((k) => k + 1)}
      />

      {/* Registration Modal */}
      <RegistrationFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialEventId={selectedEventId}
        initialEventTitle={selectedEventTitle}
        onRegistered={({ eventId, eventTitle }) => {
          setRefreshKey((k) => k + 1);
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
