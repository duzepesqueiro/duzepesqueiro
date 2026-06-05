import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/components/RatingStars";
import { X } from "lucide-react";

export interface RatingToastPrompt {
  id: string | number;
  type: "event" | "rental" | "product";
  name: string;
}

export function showRatingToast(
  prompt: RatingToastPrompt,
  opts?: {
    onSubmit?: (rating: number, comment?: string) => void;
    onClose?: () => void;
  }
) {
  let toastId: string | number;
  const ToastContent = () => {
    const [rating, setRating] = useState<number>(0);
    const [comment, setComment] = useState<string>("");
    const [charsLeft, setCharsLeft] = useState<number>(250);

    const titleMap = {
      event: "Avalie o evento",
      rental: "Avalie seu aluguel",
      product: "Avalie o produto",
    } as const;

    return (
      <div className="relative w-[360px] sm:w-[380px] p-3 rounded-lg border bg-background shadow-lg">
        <button
          aria-label="Fechar"
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {
            try { opts?.onClose?.(); } catch {}
            toast.dismiss(toastId);
          }}
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-2">
          <p className="text-sm font-semibold">{titleMap[prompt.type]}</p>
          <p className="text-xs text-muted-foreground">{prompt.name}</p>
        </div>
        <div className="flex items-center gap-1 mb-2">
          <RatingStars value={rating} onChange={setRating} className="flex gap-1" />
        </div>
        <Textarea
          value={comment}
          onChange={(e) => {
            const v = e.target.value.slice(0, 250);
            setComment(v);
            setCharsLeft(250 - v.length);
          }}
          placeholder="Opcional: escreva sua avaliação (até 250 caracteres)"
          maxLength={250}
          className="mb-1"
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
          <span>{charsLeft} caracteres restantes</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            onClick={() => {
              try { opts?.onSubmit?.(rating, comment.trim() || undefined); } catch {}
              toast.dismiss(toastId);
            }}
            disabled={rating <= 0}
          >
            Enviar avaliação
          </Button>
        </div>
      </div>
    );
  };

  toastId = toast.custom(() => <ToastContent />, {
    duration: 15000,
    position: "bottom-right",
  });
  return toastId;
}
