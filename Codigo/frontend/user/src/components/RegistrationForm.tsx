import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPhoneBR, unmaskPhone } from "@/lib/phone";

// Importando as funções da sua API e de Autenticação (Ajuste o caminho se necessário)
import { getUserProfile } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

const formSchema = z.object({
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
  eventDate: z.date({
    required_error: "Selecione uma data do evento.",
  }),
});

export const RegistrationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      age: "",
    },
  });

  // --- NOVA LÓGICA: Pré-preencher os dados do usuário ---
  useEffect(() => {
    let mounted = true;
    const fetchUserData = async () => {
      if (isAuthenticated()) {
        try {
          const profile = await getUserProfile();
          if (mounted && profile) {
            // Atualizamos os campos do react-hook-form dinamicamente
            if (profile.nome) {
              form.setValue("fullName", profile.nome);
            }
            if (profile.telefone) {
              form.setValue("phoneNumber", formatPhoneBR(profile.telefone)); 
            }
          }
        } catch (error) {
          console.warn("Não foi possível carregar os dados do usuário para o formulário de evento.", error);
        }
      }
    };

    fetchUserData();
    return () => { mounted = false; };
  }, [form]);
  // ------------------------------------------------------

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log("Registration submitted:", values);
      toast.success("Inscrição realizada com sucesso!", {
        description: `Você foi inscrito no evento em ${format(values.eventDate, "PPP")}`,
      });
      // Importante: Ao resetar o form após o sucesso, os dados do usuário sumiriam. 
      // Se quiser manter o nome/telefone na tela após o sucesso, você pode passar os valores atuais no reset:
      form.reset({
        ...form.getValues(), // Mantém Nome, Telefone e Idade
        eventDate: undefined, // Limpa apenas a data
      });
      // Ou deixe apenas form.reset(); se quiser limpar tudo.
      
      setIsSubmitting(false);
    }, 1000);
  }

  return (
    <Card className="shadow-soft border-border/50">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Inscreva-se em um Evento</CardTitle>
        <CardDescription>
          Preencha o formulário abaixo para garantir sua vaga em um de nossos eventos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="eventDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data do Evento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Escolha uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (!date) {
                            field.onChange(undefined);
                            return;
                          }
                          const withNoTZShift = new Date(
                            date.getFullYear(),
                            date.getMonth(),
                            date.getDate(),
                            12,
                            0,
                            0,
                            0
                          );
                          field.onChange(withNoTZShift);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Selecione a data do evento que deseja participar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    {/* Alterei o onChange aqui para que ele aplique a sua máscara unmaskPhone -> formatPhoneBR enquanto o usuário digita */}
                    <Input 
                        placeholder="+55 (11) 91234-5678" 
                        {...field} 
                        onChange={(e) => {
                            const unmasked = unmaskPhone(e.target.value);
                            field.onChange(formatPhoneBR(unmasked));
                        }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              variant="gradient"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Inscrever agora"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};