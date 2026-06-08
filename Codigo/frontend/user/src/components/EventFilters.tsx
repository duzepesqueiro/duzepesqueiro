import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export interface EventFiltersState {
  name: string;
  date: Date | undefined;
  time: string;
  status: string;
}

interface EventFiltersProps {
  filters: EventFiltersState;
  onFiltersChange: (filters: EventFiltersState) => void;
}

export const EventFilters = ({ filters, onFiltersChange }: EventFiltersProps) => {
  const updateFilter = (key: keyof EventFiltersState, value: string | Date | undefined) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      name: "",
      date: undefined,
      time: "",
      status: "all",
    });
  };

  const hasActiveFilters =
    filters.name || filters.date || (filters.time && filters.time !== "all") || filters.status !== "all";

  // Filtros são aplicados automaticamente via updateFilter

  return (
    <Card className="w-full border border-border/50 bg-card/90 backdrop-blur-sm shadow-sm">
      <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold leading-tight">Filtrar eventos</h3>
            <p className="text-sm text-muted-foreground">
              Use os filtros para encontrar o melhor evento para você.
            </p>
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name-filter">Nome do evento</Label>
            <Input
              id="name-filter"
              placeholder="Ex.: Festival de pesca"
              value={filters.name}
              onChange={(e) => updateFilter("name", e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label>Data do evento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-11 w-full justify-start text-left font-normal",
                    !filters.date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.date ? format(filters.date, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={filters.date} onSelect={(date) => updateFilter("date", date)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-filter">Horário</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="time-filter"
                placeholder="00:00"
                inputMode="numeric"
                maxLength={5}
                className="h-11 pl-9"
                value={filters.time}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                  let masked = digits;
                  if (digits.length >= 3) {
                    masked = digits.slice(0, 2) + ":" + digits.slice(2);
                  }
                  updateFilter("time", masked);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
              <SelectTrigger id="status-filter" className="h-11">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="scheduled">Em breve</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {filters.name && (
              <Badge variant="outline" className="gap-1 bg-background/70">
                Nome: {filters.name}
                <button
                  type="button"
                  className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => updateFilter("name", "")}
                  aria-label="Remover filtro de nome"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.date && (
              <Badge variant="outline" className="gap-1 bg-background/70">
                Data: {format(filters.date, "dd/MM/yyyy")}
                <button
                  type="button"
                  className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => updateFilter("date", undefined)}
                  aria-label="Remover filtro de data"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.time && filters.time !== "all" && (
              <Badge variant="outline" className="gap-1 bg-background/70">
                Horário: {filters.time}
                <button
                  type="button"
                  className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => updateFilter("time", "")}
                  aria-label="Remover filtro de horário"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.status !== "all" && (
              <Badge variant="outline" className="gap-1 bg-background/70">
                Status: {filters.status === "scheduled" ? "Em breve" : "Cancelado"}
                <button
                  type="button"
                  className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => updateFilter("status", "all")}
                  aria-label="Remover filtro de status"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
