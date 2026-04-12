/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "./EventCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EventsCarouselProps {
  onRegister: (eventId: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: any[];
}

interface EventsCarouselProps {
  onRegister: (eventId: number) => void;
  events: any[];
}

export const EventsCarousel = ({ onRegister, events }: EventsCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  if (!events?.length) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Nenhum evento disponível no momento.
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="overflow-hidden relative" ref={emblaRef}>
        <div className="flex">
          {events.map((event) => (
            <div key={event.id} className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] px-4">
              <EventCard {...event} onRegister={() => onRegister(event.id)} />
            </div>
          ))}
        </div>

        {/* Controles dentro do carrossel */}
        <div className="pointer-events-none">
          <Button
            variant="secondary"
            size="icon"
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 shadow-lg pointer-events-auto cursor-pointer opacity-80 hover:opacity-100"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 shadow-lg pointer-events-auto cursor-pointer opacity-80 hover:opacity-100"
            aria-label="Próximo"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-6">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300 cursor-pointer",
              index === selectedIndex ? "bg-primary w-8" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            onClick={() => scrollTo(index)}
          />
        ))}
      </div>
    </div>
  );
};