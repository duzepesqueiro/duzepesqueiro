import { useEffect, useState } from "react";

interface LoadingBarProps {
  duration: number;
  onComplete: () => void;
}

const LoadingBar = ({ duration, onComplete }: LoadingBarProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / (duration / 16)); // 60fps approximation
        if (newProgress >= 100) {
          clearInterval(interval);
          onComplete();
          return 0; // Reset for next cycle
        }
        return newProgress;
      });
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-white/20 z-60">
      <div 
        className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-75 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default LoadingBar;