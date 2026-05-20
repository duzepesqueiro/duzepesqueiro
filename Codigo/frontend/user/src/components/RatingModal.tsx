import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/components/RatingStars";

interface RatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectType: "event" | "rental" | "product";
  subjectName: string;
  onSubmit?: (rating: number, comment?: string) => void;
}

export const RatingModal = ({ open, onOpenChange, subjectType, subjectName, onSubmit }: RatingModalProps) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");

  const titleMap = {
    event: "Avalie o evento",
    rental: "Avalie seu aluguel",
    product: "Avalie o produto",
  } as const;

  const handleSubmit = () => {
    try {
      onSubmit?.(rating, comment.trim() || undefined);
    } catch {}
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titleMap[subjectType]}</DialogTitle>
          <DialogDescription>
            Como você avalia "{subjectName}"? Sua opinião nos ajuda a melhorar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <RatingStars value={rating} onChange={setRating} className="flex gap-1" />
          </div>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Opcional: compartilhe sua experiência"
          />

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Agora não</Button>
            <Button onClick={handleSubmit}>
              Enviar avaliação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingModal;