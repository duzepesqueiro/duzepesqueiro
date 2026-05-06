/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { api, getUserProfile } from "@/lib/api";
import { isAuthenticated, redirectToLogin } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatPhoneBR, unmaskPhone } from "@/lib/phone";


const formSchema = z.object({
  eventId: z.string().min(1, {
    message: "Selecione um evento.",
  }),
  fullName: z.string().min(2, {
    message: "Nome completo deve ter ao menos 2 caracteres.",
  }).max(100, {
    message: "Nome completo deve ter no máximo 100 caracteres.",
  }),
  phoneNumber: z.string().min(10, {
    message: "Informe um telefone válido.",
  }).max(15, {
    message: "Telefone deve ter no máximo 15 caracteres.",
  }),
  age: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 120;
  }, {
    message: "Informe uma idade válida entre 1 e 120.",
  }),
});

interface RegistrationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEventId?: string;
  onRegistered?: (payload: { eventId: string; eventTitle?: string }) => void;
}

const readEventItems = (data: any) => {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
};

const normalizeEvent = (event: any) => {
  const eventDate = event?.eventDate || event?.date || "";
  const eventTime = event?.eventTime || event?.time || "";
  const totalSlots = Number(event?.totalSlots ?? event?.totalCapacity ?? event?.capacity ?? 0);
  const availableSlots = Number(event?.availableSlots ?? Math.max(0, totalSlots - Number(event?.currentAttendees ?? 0)));
  return {
    ...event,
    id: String(event?.id ?? ""),
    title: event?.title || "Evento",
    date: eventDate ? new Date(eventDate).toLocaleDateString("pt-BR") : "",
    time: eventTime,
    totalCapacity: totalSlots,
    currentAttendees: Number(event?.currentAttendees ?? Math.max(0, totalSlots - availableSlots)),
  };
};

export const RegistrationFormModal = ({ 
  open, 
  onOpenChange, 
  initialEventId,
  onRegistered,
}: RegistrationFormModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId?.toString() || ""
  );

  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get("/events", { params: { limit: 100 } });
        setEvents(readEventItems(response.data).map(normalizeEvent));
      } catch (error) {
        console.error("Erro ao carregar eventos:", error);
      }
    };
    fetchEvents();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventId: initialEventId?.toString() || "",
      fullName: "",
      phoneNumber: "",
      age: "",
    },
  });

  useEffect(() => {
    // Prefill user data when authenticated
    (async () => {
      try {
        if (isAuthenticated()) {
          const profile = await getUserProfile();
          if (profile) {
            if (profile.nome) form.setValue("fullName", profile.nome);
            if (profile.telefone) form.setValue("phoneNumber", formatPhoneBR(profile.telefone));
          }
        }
      } catch {}
    })();

    if (initialEventId) {
      const eventIdStr = initialEventId.toString();
      setSelectedEventId(eventIdStr);
      form.setValue("eventId", eventIdStr);
    }
  }, [initialEventId, form]);

  const selectedEvent = events.find(e => e.id.toString() === selectedEventId);

async function onSubmit(values: z.infer<typeof formSchema>) {
  setIsSubmitting(true);
  try {
    // Require authentication on action
    // if (!isAuthenticated()) {
    //   setIsSubmitting(false);
    //   redirectToLogin(`register_event:${values.eventId}`);
    //   return;
    // }

    await api.post("/events/registrations", { eventId: values.eventId });
    toast.success("Inscrição realizada com sucesso!");
    onOpenChange(false);
    try {
      onRegistered?.({ eventId: values.eventId, eventTitle: selectedEvent?.title });
    } catch {}
  } catch (error) {
    toast.error("Erro ao realizar inscrição!");
  } finally {
    setIsSubmitting(false);
  }
}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Event Registration</DialogTitle>
          <DialogDescription>
            Fill out the form below to register for your selected event.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selecionar evento</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedEventId(value);
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um evento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedEvent && (
              <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-3">
                <h3 className="font-semibold text-lg">{selectedEvent.title}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium">Data</p>
                      <p className="text-muted-foreground">{selectedEvent.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium">Horário</p>
                      <p className="text-muted-foreground">{selectedEvent.time}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-accent" />
                    <div>
                      <p className="font-medium">Local</p>
                      <p className="text-muted-foreground">{selectedEvent.location}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium">Capacidade</p>
                      <p className="text-muted-foreground">
                        {selectedEvent.currentAttendees} / {selectedEvent.totalCapacity} inscritos
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="João da Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(99) 9999-9999"
                        inputMode="numeric"
                        maxLength={14}
                        {...field}
                        value={formatPhoneBR(field.value)}
                        onChange={(e) => field.onChange(unmaskPhone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Idade</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="25" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full" 
              variant="secondary"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Concluir inscrição"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
