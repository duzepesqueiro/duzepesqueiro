/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { api, getUserProfile } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

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
import { Input } from "@/components/ui/input";
import { formatPhoneBR, unmaskPhone } from "@/lib/phone";

const formSchema = z.object({
  fullName: z.string().min(2, {
    message: "Nome completo deve ter ao menos 2 caracteres.",
  }).max(100, {
    message: "Nome completo deve ter no máximo 100 caracteres.",
  }),
  phoneNumber: z.string().min(11, {
    message: "Informe um telefone celular válido (11 dígitos).",
  }).max(11, {
    message: "Telefone deve ter no máximo 11 dígitos.",
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
  initialEventTitle?: string;
  onRegistered?: (payload: { eventId: string; eventTitle?: string }) => void;
}

export const RegistrationFormModal = ({
  open,
  onOpenChange,
  initialEventId,
  initialEventTitle,
  onRegistered,
}: RegistrationFormModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      age: "",
    },
  });

  useEffect(() => {
    let mounted = true;

    const prefillUserData = async () => {
      if (open && isAuthenticated()) {
        try {
          const profile = await getUserProfile();
          if (mounted && profile) {
            if (profile.nome) form.setValue("fullName", profile.nome);
            if (profile.telefone) form.setValue("phoneNumber", unmaskPhone(profile.telefone));
          }
        } catch (error) {
          console.warn("Erro ao buscar dados do usuário para o modal de eventos", error);
        }
      }
    };

    prefillUserData();

    return () => { mounted = false; };
  }, [open, form]);

  async function onSubmit(_values: z.infer<typeof formSchema>) {
    if (!initialEventId) {
      toast.error("Evento não identificado.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/events/registrations", { eventId: initialEventId });
      toast.success("Inscrição realizada com sucesso!");
      onOpenChange(false);
      try {
        onRegistered?.({ eventId: initialEventId, eventTitle: initialEventTitle });
      } catch {}
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      toast.error(msg || "Erro ao realizar inscrição!");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden border border-border/50 bg-card/95 backdrop-blur-sm p-0">
        <div className="max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogTitle className="font-display text-2xl font-semibold">Inscrição no evento</DialogTitle>
            {initialEventTitle ? (
              <DialogDescription className="text-sm sm:text-base font-medium text-foreground">
                {initialEventTitle}
              </DialogDescription>
            ) : (
              <DialogDescription className="text-sm sm:text-base">
                Preencha seus dados para concluir a inscrição.
              </DialogDescription>
            )}
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input className="h-11" placeholder="João da Silva" {...field} />
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
                          className="h-11"
                          placeholder="(99) 99999-9999"
                          inputMode="numeric"
                          maxLength={16}
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
                      <Input className="h-11" type="number" placeholder="25" min={1} max={120} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Button type="submit" variant="secondary" className="w-full h-11 font-semibold" disabled={isSubmitting || !initialEventId}>
                  {isSubmitting ? "Enviando..." : "Concluir inscrição"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Seus dados são usados apenas para registrar a inscrição.
                </p>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
