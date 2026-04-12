import { useEffect, useMemo, useRef } from "react";

interface RatingStarsProps {
  value: number;
  onChange: (rating: number) => void;
  max?: number;
  className?: string;
  size?: number; // pixel size for star icons
}

// Simple star icon using SVG, filled based on fraction
const Star = ({ fill, size = 24 }: { fill: number; size?: number }) => {
  const clamped = Math.max(0, Math.min(1, fill));
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="inline-block"
    >
      <defs>
        <linearGradient id="grad">
          <stop offset={`${clamped * 100}%`} stopColor="currentColor" />
          <stop offset={`${clamped * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.787 1.402 8.172L12 18.896l-7.336 4.274 1.402-8.172L.132 9.211l8.2-1.193L12 .587z"
        fill={clamped === 0 ? "transparent" : "url(#grad)"}
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
};

export const RatingStars = ({ value, onChange, max = 5, className, size = 24 }: RatingStarsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stars = useMemo(() => Array.from({ length: max }, (_, i) => i + 1), [max]);

  useEffect(() => {
    // Ensure integer steps and start empty
    const integer = Math.round(value);
    if (integer !== value) onChange(integer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(max, Math.round(value + 1)));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(0, Math.round(value - 1)));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(max);
    }
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="Avaliação de estrelas"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={className}
    >
      {stars.map((i) => {
        const fill = value >= i ? 1 : 0;
        return (
          <button
            key={i}
            type="button"
            aria-label={`${i} estrela${i > 1 ? "s" : ""}`}
            className="text-yellow-500 hover:text-yellow-400 focus:outline-none rounded-sm"
            onClick={(e) => {
              onChange(i);
            }}
          >
            <Star fill={fill} size={size} />
          </button>
        );
      })}
    </div>
  );
};

export default RatingStars;