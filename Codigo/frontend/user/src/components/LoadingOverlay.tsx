import { Loader2 } from "lucide-react";
import React from "react";

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ show, message }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-3 rounded-md border bg-background shadow-md">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{message || "Carregando..."}</span>
      </div>
    </div>
  );
};

export default LoadingOverlay;