import { Users, Star, BedDouble } from "lucide-react";
import { Chale } from "@/types/hospedagem";

interface ChaleCardProps {
  chale: Chale;
  onReserve: (id: string) => void;
}

export const ChaleCard = ({ chale, onReserve }: ChaleCardProps) => {
  return (
    <div className="card-room flex flex-col h-full">
      <div className="relative aspect-video overflow-hidden">
        <img
          src={chale.imagem}
          alt={chale.nome}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm flex items-center gap-1">
          <Star className="w-3 h-3 fill-[#F2C14E] text-[#F2C14E]" />
          {chale.estrelas}
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-bold mb-2 line-clamp-1 text-foreground">{chale.nome}</h3>
        
        <div className="space-y-2 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary shrink-0" />
            <span>Adultos: {chale.capacidadeAdultos} | Crianças: {chale.capacidadeCriancas}</span>
          </div>
          <div className="flex items-center gap-2">
             <BedDouble className="w-4 h-4 text-primary shrink-0" />
             <span>Acomodação completa</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">
          {chale.descricao}
        </p>

        <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-muted-foreground block">Diária a partir de</span>
            <span className="text-lg font-bold text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(chale.precoDiaria)}
            </span>
          </div>
          <button 
            className="btn-gold whitespace-nowrap"
            onClick={() => onReserve(chale.id)}
          >
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
};