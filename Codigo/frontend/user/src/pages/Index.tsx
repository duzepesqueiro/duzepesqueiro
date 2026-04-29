import { useEffect } from "react";
import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import { isAuthenticated } from "@/lib/auth";
import { peekRatingPrompt, dequeueRatingPrompt } from "@/lib/ratings";
import { showRatingToast } from "@/components/RatingToast";

const Index = () => {
  useEffect(() => {
    // Ao carregar a homepage, se estiver autenticado e houver avaliações pendentes, mostrar modal
    if (isAuthenticated()) {
      const next = peekRatingPrompt();
      if (next) {
        showRatingToast(next, {
          onSubmit: () => {
            dequeueRatingPrompt(next.id);
            const n2 = peekRatingPrompt();
            if (n2) {
              showRatingToast(n2, {
                onSubmit: () => dequeueRatingPrompt(n2.id),
                onClose: () => dequeueRatingPrompt(n2.id),
              });
            }
          },
          onClose: () => {
            dequeueRatingPrompt(next.id);
            const n2 = peekRatingPrompt();
            if (n2) {
              showRatingToast(n2, {
                onSubmit: () => dequeueRatingPrompt(n2.id),
                onClose: () => dequeueRatingPrompt(n2.id),
              });
            }
          },
        });
      }
    }
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header transparente apenas nesta tela */}
      <Header transparent searchScope="home" />
      <main>
        <HeroCarousel />
      </main>

      {/* Rating via toast é gerenciado automaticamente via showRatingToast */}
    </div>
  );
};

export default Index;
