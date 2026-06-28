import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Instagram, Send } from "lucide-react";

const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
  </svg>
);

const WppChatBubble = () => {
  const textLine1 = "Precisa de mais espaço?";
  const textLine2 = "Podemos combinar o número de hospedes!";
  
  return (
    <div className="relative rounded-2xl border border-border/50 bg-background px-4 py-3 text-sm shadow-xl max-w-[90vw] sm:max-w-[280px]">
      <div className="text-foreground">{textLine1}</div>
      <div className="text-muted-foreground">{textLine2}</div>
      
      {/* Triângulo do balão apontando para a direita */}
      <div className="absolute right-[-6px] top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-t border-r border-border/50 bg-background" />
    </div>
  );
};

const SocialActions = () => {
  const [message, setMessage] = useState("");
  const [showBubble, setShowBubble] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false); // Evita incomodar o usuário que já clicou
  
  const instagramUrl = String(import.meta.env.VITE_STORE_INSTAGRAM_URL ?? "https://instagram.com");
  const storeWhatsappPhone = String(import.meta.env.VITE_STORE_WHATSAPP_PHONE ?? ""); 

  useEffect(() => {
    // Se o usuário já interagiu com o botão, paramos o cronômetro para não incomodar mais.
    if (hasInteracted) {
      setShowBubble(false);
      return;
    }

    const checkAndShowBubble = () => {
      // Verifica se a URL atual contém "/hospedagem"
      const isHostingPage = window.location.pathname.includes("/hospedagem");
      
      if (isHostingPage && !hasInteracted) {
        setShowBubble(true);
        // Oculta o balão após 8 segundos
        setTimeout(() => setShowBubble(false), 8000);
      } else {
        setShowBubble(false);
      }
    };

    // Primeira exibição após 3 segundos
    const initialTimeout = setTimeout(checkAndShowBubble, 3000);

    // Depois repete o ciclo a cada 45 segundos
    const interval = setInterval(checkAndShowBubble, 45000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [hasInteracted]);

  const openWhatsApp = () => {
    const text = message.trim();
    const base = storeWhatsappPhone ? `https://wa.me/${storeWhatsappPhone}?text=` : `https://wa.me/?text=`;
    const url = `${base}${encodeURIComponent(text)}`;
    if (typeof window !== "undefined") window.open(url, "_blank");
  };

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-3">
      {/* WhatsApp: envolve balão e botão em linha (flex-row) */}
      <Dialog onOpenChange={(open) => { if (open) setHasInteracted(true); }}>
        <DialogTrigger asChild>
          <div 
            className="flex flex-row items-center gap-4 cursor-pointer group"
            onClick={() => setHasInteracted(true)} // Registra interação ao clicar
          >
            {/* Renderização condicional do balão com animação suave de entrada */}
            {showBubble && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 ease-out">
                <WppChatBubble />
              </div>
            )}
            <Button
              aria-label="Contato via WhatsApp"
              className="h-14 w-14 rounded-full p-0 bg-[#25D366] text-white hover:brightness-110 shadow-xl group-hover:scale-105 transition-transform shrink-0"
            >
              <WhatsAppIcon className="w-7 h-7" />
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>WhatsApp</DialogTitle>
            <DialogDescription>Nós envie uma mensagem pelo WhatsApp</DialogDescription>
          </DialogHeader>

          {/* Área estilo chat/social */}
          <div className="rounded-xl border border-border/50 overflow-hidden">
            {/* Top bar estilo app */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#1fa855] text-white">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-semibold">DZ</div>
              <div className="flex-1">
                <div className="text-sm font-semibold leading-tight">Du Zé Pesqueiro</div>
                <div className="text-xs opacity-90">online agora</div>
              </div>
              <WhatsAppIcon className="w-5 h-5 opacity-90" />
            </div>

            {/* Chat preview */}
            <div className="px-4 py-3 bg-background">
              <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-muted text-foreground shadow-sm">
                Olá! Em que posso ajudar?
              </div>
              {message && (
                <div className="mt-3 flex justify-end">
                  <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-[#d7f8e5] text-[#093] shadow-sm">
                    {message}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Campo de texto menor com destaque e botão interno */}
          <div className="py-3">
            <label className="text-xs font-medium text-muted-foreground">Mensagem</label>
            <div className="relative mt-1 rounded-xl border-2 border-[#25D366] p-2 focus-within:ring-2 focus-within:ring-[#25D366]/40">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="resize-none pr-12 border-none focus-visible:ring-0"
                placeholder="Digite sua mensagem"
              />
              <Button
                size="icon"
                onClick={openWhatsApp}
                aria-label="Enviar"
                className="absolute right-2 bottom-2 bg-[#25D366] text-white hover:brightness-110"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instagram: mantido alinhado à direita debaixo do WPP */}
      <Button
        aria-label="Instagram da loja"
        onClick={() => {
          if (typeof window !== "undefined") window.open(instagramUrl, "_blank");
        }}
        className="h-14 w-14 rounded-full p-0 bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 text-white hover:brightness-110 shadow-xl shrink-0"
      >
        <Instagram className="w-7 h-7" />
      </Button>
    </div>
  );
};

export default SocialActions;
