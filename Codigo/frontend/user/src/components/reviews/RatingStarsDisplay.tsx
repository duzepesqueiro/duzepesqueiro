import { useId, useMemo } from 'react';

type Props = {
  value: number;
  max?: number;
  size?: number;
  className?: string;
};

const Star = ({ fill, size = 18 }: { fill: number; size?: number }) => {
  const clamped = Math.max(0, Math.min(1, fill));
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="inline-block">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${clamped * 100}%`} stopColor="currentColor" />
          <stop offset={`${clamped * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.787 1.402 8.172L12 18.896l-7.336 4.274 1.402-8.172L.132 9.211l8.2-1.193L12 .587z"
        fill={clamped === 0 ? 'transparent' : `url(#${id})`}
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
};

export const RatingStarsDisplay = ({ value, max = 5, size = 18, className }: Props) => {
  const stars = useMemo(() => Array.from({ length: max }, (_, i) => i + 1), [max]);
  const clampedValue = Math.max(0, Math.min(max, value));

  return (
    <div className={className} aria-label={`Avaliação ${clampedValue.toFixed(1)} de ${max}`}>
      {stars.map((i) => {
        const fill = clampedValue >= i ? 1 : clampedValue > i - 1 ? clampedValue - (i - 1) : 0;
        return (
          <span key={i} className="text-yellow-500">
            <Star fill={fill} size={size} />
          </span>
        );
      })}
    </div>
  );
};

export default RatingStarsDisplay;

