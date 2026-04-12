import { useEffect, useMemo, useState } from "react";
import { MapPin, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const DEST_LAT = -19.724839255162383;
const DEST_LNG = -43.873423088361804;

const buildEmbedUrl = (origin?: { lat: number; lng: number }) => {
  if (origin) {
    const saddr = `${origin.lat},${origin.lng}`;
    const daddr = `${DEST_LAT},${DEST_LNG}`;
    return `https://www.google.com/maps?output=embed&saddr=${encodeURIComponent(saddr)}&daddr=${encodeURIComponent(daddr)}`;
  }
  return `https://www.google.com/maps?q=${DEST_LAT},${DEST_LNG}&z=14&output=embed`;
};

const buildExternalUrl = (origin?: { lat: number; lng: number }) => {
  if (origin) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${DEST_LAT},${DEST_LNG}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${DEST_LAT},${DEST_LNG}`;
};

const GPSTrackingPanel = () => {
  const [showConsent, setShowConsent] = useState(true);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const mapUrl = useMemo(() => buildEmbedUrl(origin), [origin]);
  const externalUrl = useMemo(() => buildExternalUrl(origin), [origin]);

  const requestLocation = () => {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Seu navegador não suporta geolocalização.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setOrigin({ lat: latitude, lng: longitude });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError("Permissão de localização negada. Você pode permitir manualmente nas configurações do navegador.");
        } else {
          setError("Não foi possível obter sua localização. Tente novamente.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    setShowConsent(true);
  }, []);

  return (
    <section className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            Como chegar ao Pesque e Pague
          </CardTitle>
          <CardDescription>
            Traçamos a rota até o pesque e pague a partir da sua localização.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="relative h-72 rounded-lg overflow-hidden border">
            <iframe
              width="100%"
              height="100%"
              loading="lazy"
              title="Rota para o Pesque e Pague"
              referrerPolicy="no-referrer-when-downgrade"
              src={mapUrl}
              className="border-0"
            />
            {/* Botão de abrir no Google Maps no canto superior direito, apenas ícone */}
            <div className="absolute top-3 right-3">
              <Button asChild variant="secondary" size="icon" className="shadow-md">
                <a href={externalUrl} target="_blank" rel="noreferrer" aria-label="Abrir no Google Maps">
                  <MapPin className="w-4 h-4" />
                </a>
              </Button>
            </div>
            {!origin && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Permita o acesso à sua localização para traçar a rota.
                  </p>
                  <Button onClick={() => setShowConsent(true)} variant="default" className="inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Permitir localização
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConsent} onOpenChange={setShowConsent}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permitir uso da sua localização?</AlertDialogTitle>
            <AlertDialogDescription>
              Usaremos sua localização atual para traçar a rota até o pesque e pague. Isso é semelhante a aceitar cookies de localização. Você pode alterar essa permissão a qualquer momento nas configurações do navegador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Agora não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConsent(false);
                requestLocation();
              }}
            >
              Permitir localização
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default GPSTrackingPanel;