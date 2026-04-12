import { useState } from "react";
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
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export interface EventFiltersState {
  name: string;
  date: Date | undefined;
  capacity: string;
  time: string;
  status: string
}

interface EventFiltersProps {
  filters: EventFiltersState;
  onFiltersChange: (filters: EventFiltersState) => void;
}

export const EventFilters = ({ filters, onFiltersChange }: EventFiltersProps) => {
  const [loading, setLoading] = useState(false);

  const updateFilter = (key: keyof EventFiltersState, value: string | Date | undefined) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      name: "",
      date: undefined,
      capacity: "all",
      time: "",
      status: "all",
    });
  };

  const hasActiveFilters =
    filters.name || filters.date || filters.capacity !== "all" || (filters.time && filters.time !== "all") || filters.status !== "all";

  // Filtros são aplicados automaticamente via updateFilter

  return (
    <div
      className="
    w-full 
    bg-[hsl(210_25%_97%)] 
    dark:bg-[hsl(210_30%_10%)] 
    border border-border/50 
    rounded-lg p-6 space-y-6 
    shadow-[0_2px_8px_rgba(0,0,0,0.05)] 
    transition-colors duration-300
  "
    >

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filtrar Eventos</h3>

        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* --- Filtros --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="name-filter">Nome do Evento</Label>
          <Input
            id="name-filter"
            placeholder="Buscar por nome..."
            value={filters.name}
            onChange={(e) => updateFilter("name", e.target.value)}
          />
        </div>

        {/* Data */}
        <div className="space-y-2">
          <Label>Data do Evento</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.date
                  ? format(filters.date, "dd/MM/yyyy")
                  : "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.date}
                onSelect={(date) => updateFilter("date", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Capacidade */}
        <div className="space-y-2">
          <Label htmlFor="capacity-filter">Capacidade</Label>
          <Select
            value={filters.capacity}
            onValueChange={(value) => updateFilter("capacity", value)}
          >
            <SelectTrigger id="capacity-filter">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="small">Pequena (&lt; 150)</SelectItem>
              <SelectItem value="medium">Média (150-500)</SelectItem>
              <SelectItem value="large">Grande (&gt; 500)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Horário */}
        <div className="space-y-2">
          <Label htmlFor="time-filter">Horário</Label>
          <Select
            value={filters.time || ""}
            onValueChange={(value) => {
              // Radix SelectItem não permite valor vazio; usamos "all" para limpar
              if (value === "all") {
                updateFilter("time", "");
              } else {
                updateFilter("time", value);
              }
            }}
          >
            <SelectTrigger id="time-filter" className="justify-start">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Todos os horários" />
              </div>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">Todos os horários</SelectItem>
              <SelectItem value="08:00">08:00</SelectItem>
              <SelectItem value="09:00">09:00</SelectItem>
              <SelectItem value="10:00">10:00</SelectItem>
              <SelectItem value="11:00">11:00</SelectItem>
              <SelectItem value="13:00">13:00</SelectItem>
              <SelectItem value="14:00">14:00</SelectItem>
              <SelectItem value="15:00">15:00</SelectItem>
              <SelectItem value="16:00">16:00</SelectItem>
              <SelectItem value="18:00">18:00</SelectItem>
              <SelectItem value="19:00">19:00</SelectItem>
              <SelectItem value="20:00">20:00</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status-filter">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => updateFilter("status", value)}
          >
            <SelectTrigger id="status-filter">
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

      {/* Resumo dos filtros ativos (estilo e-commerce) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {filters.name && (
            <Badge variant="outline" className="gap-1">
              Nome: {filters.name}
              <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("name", "")} />
            </Badge>
          )}
          {filters.date && (
            <Badge variant="outline" className="gap-1">
              Data: {format(filters.date, "dd/MM/yyyy")}
              <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("date", undefined)} />
            </Badge>
          )}
          {filters.capacity !== "all" && (
            <Badge variant="outline" className="gap-1">
              Capacidade: {filters.capacity === "small" ? "Pequena" : filters.capacity === "medium" ? "Média" : "Grande"}
              <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("capacity", "all")} />
            </Badge>
          )}
          {filters.time && filters.time !== "all" && (
            <Badge variant="outline" className="gap-1">
              Horário: {filters.time}
              <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("time", "")} />
            </Badge>
          )}
          {filters.status !== "all" && (
            <Badge variant="outline" className="gap-1">
              Status: {filters.status === "scheduled" ? "Em breve" : "Cancelado"}
              <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("status", "all")} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};