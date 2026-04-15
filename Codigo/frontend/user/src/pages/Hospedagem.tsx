import { useState, useMemo } from "react";
import Header from "@/components/Header"; // Ajuste o path conforme sua estrutura
import { HospedagemFilters, HospedagemFiltersState } from "@/components/ui/HospedagemFilters";
import { ChaleCard } from "@/components/ui/ChaleCard";
import { mockChales } from "@/data/mockChales";
import { Button } from "@/components/ui/button";
import { CalendarDays, Tent } from "lucide-react";
import { toast } from "sonner"; // Assumindo que você usa sonner, vi no seu Header

export default function Hospedagem() {
  const [filters, setFilters] = useState<HospedagemFiltersState>({
    adultos: "all",
    criancas: "all",
    checkIn: undefined,
    checkOut: undefined,
    estrelas: "all",
  });

  // Lógica de Filtragem Local (Substituirá pelo backend no futuro)
  const chalesFiltrados = useMemo(() => {
    return mockChales.filter((chale) => {
      // Filtro de Adultos
      if (filters.adultos !== "all") {
        const adultosReq = parseInt(filters.adultos);
        if (filters.adultos === "4" ? chale.capacidadeAdultos < 4 : chale.capacidadeAdultos !== adultosReq) {
          return false;
        }
      }

      // Filtro de Crianças
      if (filters.criancas !== "all") {
        const criancasReq = parseInt(filters.criancas);
        if (filters.criancas === "3" ? chale.capacidadeCriancas < 3 : chale.capacidadeCriancas !== criancasReq) {
          return false;
        }
      }

      // Filtro de Estrelas
      if (filters.estrelas !== "all") {
        if (chale.estrelas !== parseInt(filters.estrelas)) return false;
      }

      // Datas: Como estamos com hardcode, não vamos filtrar por data agora.
      // O backend cuidará do range de datas cruzando com as reservas existentes.

      return true;
    });
  }, [filters]);

  const handleReserve = (id: string) => {
    toast.success("Redirecionando para o fluxo de reserva...");
    console.log("Reservar chalé ID:", id);
  };

  const handleMinhasReservas = () => {
    toast.info("Em breve: Área de gestão das suas reservas.");
  };

  return (
    // Envelopando a página com a classe de tema do CSS global
    <div className="hosting-theme min-h-screen bg-background flex flex-col">
      <Header searchScope="home" />

      {/* Hero Section com Gradiente */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-4 overflow-hidden bg-muted">
        <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1542718610-a1d656d1884c?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center opacity-10 dark:opacity-20"></div>
        <div className="container relative z-10 mx-auto text-center space-y-6">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
             <Tent className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl mx-auto">
            Sua Conexão com a Natureza Começa Aqui
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Hospede-se em nossos chalés exclusivos e desfrute de momentos inesquecíveis.
          </p>
          
          {/* Botão Itinerário / Minhas Reservas */}
          <div className="pt-4 flex justify-center">
            <Button 
              variant="outline" 
              size="lg" 
              className="gap-2 bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300"
              onClick={handleMinhasReservas}
            >
              <CalendarDays className="w-5 h-5" />
              Minhas Reservas / Itinerário
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content (Filtros e Catálogo) */}
      <main className="container mx-auto px-4 py-12 flex-grow space-y-12">
        {/* Seção de Filtros */}
        <section className="relative -mt-24 z-20">
          <HospedagemFilters filters={filters} onFiltersChange={setFilters} />
        </section>

        {/* Catálogo de Chalés */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Chalés Disponíveis</h2>
            <span className="text-muted-foreground">{chalesFiltrados.length} opções encontradas</span>
          </div>

          {chalesFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {chalesFiltrados.map((chale) => (
                <ChaleCard 
                  key={chale.id} 
                  chale={chale} 
                  onReserve={handleReserve} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
              <Tent className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Nenhum chalé encontrado</h3>
              <p className="text-muted-foreground">Tente alterar os filtros de capacidade ou classificação.</p>
              <Button variant="outline" className="mt-4" onClick={() => setFilters({ adultos: "all", criancas: "all", checkIn: undefined, checkOut: undefined, estrelas: "all" })}>
                Limpar Filtros
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50 bg-background mt-auto z-10">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 Duzepesqueiro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}