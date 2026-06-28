"use client";
import { PropsWithChildren, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

interface ContainerScrollAnimationProps {
  className?: string;
}

/**
 * Container Scroll Animation — componente oficial (Aceternity UI style)
 * Revela conteúdo com rotação/escala/translate conforme o scroll do container.
 */
export function ContainerScrollAnimation({ children, className }: PropsWithChildren<ContainerScrollAnimationProps>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });

  // Transforms baseados no progresso do scroll
  const rotateX = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1]);
  const translateY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <section className={cn("relative w-full", className)}>
      <div ref={containerRef} className="relative py-40" style={{ perspective: 1000 }}>
        <motion.div style={{ rotateX, scale, translateY }} className="sticky top-0">
          <div className="duze-container max-w-5xl">
            {children}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
