import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, X, Star } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface HospedagemFiltersState {
  adultos: string;
  criancas: string;
  checkIn: Date | undefined;
  checkOut: Date | undefined;
  estrelas: string;
}

interface HospedagemFiltersProps {
  filters: HospedagemFiltersState;
  onFiltersChange: (filters: HospedagemFiltersState) => void;
}

export const HospedagemFilters = ({ filters, onFiltersChange }: HospedagemFiltersProps) => {

  const updateFilter = (key: keyof HospedagemFiltersState, value: string | Date | undefined) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({ adultos: "all", criancas: "all", checkIn: undefined, checkOut: undefined, estrelas: "all" });
  };

  const hasActiveFilters = filters.adultos !== "all" || filters.criancas !== "all" || filters.checkIn !== undefined || filters.checkOut !== undefined || filters.estrelas !== "all";

  return (
    <div className="glass rounded-xl p-6 space-y-6 shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Refinar Busca</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4 mr-2" /> Limpar 
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Check-in */}
        <div className="space-y-2">
          <Label>Check-in</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-background/50", !filters.checkIn && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.checkIn ? format(filters.checkIn, "dd/MM/yyyy") : "Data de entrada"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={filters.checkIn} onSelect={(date) => updateFilter("checkIn", date)} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        {/* Check-out */}
        <div className="space-y-2">
          <Label>Check-out</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-background/50", !filters.checkOut && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.checkOut ? format(filters.checkOut, "dd/MM/yyyy") : "Data de saída"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={filters.checkOut} onSelect={(date) => updateFilter("checkOut", date)} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        {/* Adultos */}
        <div className="space-y-2">
          <Label htmlFor="adultos-filter">Adultos</Label>
          <Select value={filters.adultos} onValueChange={(value) => updateFilter("adultos", value)}>
            <SelectTrigger id="adultos-filter" className="bg-background/50">
              <SelectValue placeholder="Qualquer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer</SelectItem>
              <SelectItem value="1">1 Adulto</SelectItem>
              <SelectItem value="2">2 Adultos</SelectItem>
              <SelectItem value="3">3 Adultos</SelectItem>
              <SelectItem value="4">4+ Adultos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Crianças */}
        <div className="space-y-2">
          <Label htmlFor="criancas-filter">Crianças</Label>
          <Select value={filters.criancas} onValueChange={(value) => updateFilter("criancas", value)}>
            <SelectTrigger id="criancas-filter" className="bg-background/50">
              <SelectValue placeholder="Nenhuma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer</SelectItem>
              <SelectItem value="0">Nenhuma</SelectItem>
              <SelectItem value="1">1 Criança</SelectItem>
              <SelectItem value="2">2 Crianças</SelectItem>
              <SelectItem value="3">3+ Crianças</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estrelas */}
        <div className="space-y-2">
          <Label htmlFor="estrelas-filter">Classificação</Label>
          <Select value={filters.estrelas} onValueChange={(value) => updateFilter("estrelas", value)}>
            <SelectTrigger id="estrelas-filter" className="bg-background/50">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="5">5 Estrelas</SelectItem>
              <SelectItem value="4">4 Estrelas</SelectItem>
              <SelectItem value="3">3 Estrelas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {filters.adultos !== "all" && <Badge variant="secondary" className="gap-1">Adultos: {filters.adultos} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("adultos", "all")} /></Badge>}
          {filters.criancas !== "all" && <Badge variant="secondary" className="gap-1">Crianças: {filters.criancas} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("criancas", "all")} /></Badge>}
          {filters.estrelas !== "all" && <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3 mr-1 fill-current" /> {filters.estrelas} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("estrelas", "all")} /></Badge>}
        </div>
      )}
    </div>
  );
};