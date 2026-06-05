import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RatingStars } from '@/components/RatingStars';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel?: string;
  onSubmit: (input: { rating: number; comment: string }) => Promise<void> | void;
};

export const ReviewModal = ({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = 'Enviar avaliação',
  onSubmit,
}: Props) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRating(5);
    setComment('');
  }, [open]);

  const trimmed = useMemo(() => comment.trim(), [comment]);
  const minLen = 10;
  const maxLen = 1000;
  const remaining = Math.max(0, maxLen - trimmed.length);
  const canSubmit = rating >= 1 && rating <= 5 && trimmed.length >= minLen && trimmed.length <= maxLen && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(next) => (!isSubmitting ? onOpenChange(next) : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <RatingStars value={rating} onChange={setRating} min={1} className="flex gap-1" />
          </div>

          <div className="space-y-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte como foi sua experiência"
              maxLength={maxLen + 50}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Mínimo {minLen} / máximo {maxLen} caracteres
              </span>
              <span>{remaining} restantes</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!canSubmit}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  await onSubmit({ rating, comment: trimmed });
                  onOpenChange(false);
                } catch {
                  return;
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? 'Enviando...' : submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
