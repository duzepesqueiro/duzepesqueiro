import { useState } from "react";
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

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log("Registration submitted:", values);
      toast.success("Inscrição realizada com sucesso!", {
        description: `Você foi inscrito no evento em ${format(values.eventDate, "PPP")}`,
      });
      form.reset();
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
                    <Input placeholder="+55 (11) 91234-5678" {...field} />
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