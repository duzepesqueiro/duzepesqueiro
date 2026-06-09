import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Building2,
  ChevronUp,
  Clock,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Trees,
} from 'lucide-react';
import { motion } from 'framer-motion';
import SearchBox from '@/components/common/booking/SearchBox';
import Sidebar from '@/components/common/layout/Header';
import { api } from '@/lib/api';
import heroImg from '@/assets/duzepesqueiro3.jpeg';
import roomSuite from '@/assets/duzepesqueiro4.jpeg';
import styles from './home.module.css';
import { useIsMobile } from '@/hooks/use-mobile';

type BlockedApiItem = {
  startDate?: string;
  endDate?: string;
  dataInicio?: string;
  dataFim?: string;
  reason?: string;
};

type BlockedDate = {
  start: Date;
  end: Date;
  reason?: string;
};

const parseLocalDate = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
};

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data: blockedDates = [], isLoading: loadingBlocked } = useQuery<BlockedDate[]>({
    queryKey: ['hosting-blocked-dates', 'global'],
    queryFn: async (): Promise<BlockedDate[]> => {
      try {
        const { data, status } = await api.get('/api/bloqueios/global', {
          params: { isActive: true },
          validateStatus: () => true,
        });
        if (status >= 400 || !Array.isArray(data)) return [];
        return data
          .map((item: BlockedApiItem) => {
            const start = item.startDate || item.dataInicio;
            const end = item.endDate || item.dataFim;
            if (!start || !end) return null;
            const startDate = parseLocalDate(start);
            const endDate = parseLocalDate(end);
            if (!startDate || !endDate) return null;
            return { start: startDate, end: endDate, reason: item.reason };
          })
          .filter(Boolean) as Array<{ start: Date; end: Date; reason?: string }>;
      } catch (error) {
        console.warn('Falha ao carregar datas bloqueadas', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: 1
  });

  const featureItems = useMemo(
    () => [
      {
        title: 'Reserva guiada',
        desc: 'Validação automática de datas e regras antes de avançar para a listagem.',
      },
      {
        title: 'Quartos sob medida',
        desc: 'Filtro imediato por hóspedes e pet friendly para mostrar só o que comporta você.',
      },
      {
        title: 'Gestão completa',
        desc: 'Acesse suas reservas a qualquer momento para checar status ou ajustar detalhes.',
      },
    ],
    []
  );

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-muted">
      <div className={styles.pageBackdrop} aria-hidden="true" />
      {!isMobile ? <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} /> : null}

      {/* Main content with margin to accommodate sidebar */}
      <main
        className={`relative z-10 transition-all duration-300 ${
          isMobile ? '' : sidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        <section className="relative flex min-h-[640px] items-center justify-center overflow-hidden pt-24 md:min-h-[720px]">
          <img
            src={heroImg}
            alt="DuZé Pesqueiro"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-4 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-display text-4xl font-bold leading-tight text-primary-foreground drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)] md:text-6xl lg:text-7xl"
            >
              Sua estadia dos sonhos
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.8 }}
              className="mx-auto max-w-3xl text-base leading-relaxed text-primary-foreground/90 drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)] md:text-xl"
            >
              Escolha o período da sua hospedagem e veja apenas quartos realmente disponíveis. Um fluxo simples, com validação de datas e filtros que ajudam você a decidir com segurança.
            </motion.p>

            <div className="w-full flex justify-center">
              <SearchBox
                blockedDates={blockedDates}
                isLoadingBlocked={loadingBlocked}
                className={`${styles.searchCard} max-w-5xl`}
              />
            </div>

            <div className="flex flex-col items-center justify-center gap-3 text-sm text-primary-foreground/90 md:flex-row">
              <div className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Datas passadas e períodos bloqueados ficam indisponíveis automaticamente.
              </div>
              <span className="hidden md:inline text-primary-foreground/60">•</span>
              <Link
                to="/hospedagem/my-reservations"
                className="underline decoration-1 underline-offset-4 transition-colors hover:text-primary-foreground"
              >
                Já reservou antes? Abra Minhas Reservas
              </Link>
            </div>

          </div>
        </section>

        <section id="destaques" className="relative overflow-hidden py-24 px-4">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-muted to-muted/40" aria-hidden="true" />
          <div className="relative container mx-auto max-w-6xl space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mx-auto max-w-3xl space-y-4 text-center"
            >
              <span className="inline-flex items-center rounded-full border border-border bg-card px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground shadow-sm">
                Destaques da hospedagem
              </span>
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                Por que escolher o DuZé Pesqueiro?
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                Um fluxo claro do início ao fim: escolha o período, filtre por preferências e reserve com confiança.
              </p>
              <div className="mx-auto h-1 w-24 rounded-full bg-secondary" aria-hidden="true" />
            </motion.div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-7">
              {featureItems.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 text-left shadow-sm transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.55)]"
                >
                  <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/15 text-sm font-bold text-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="mb-3 font-display text-xl font-semibold text-foreground">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {f.desc}
                  </p>
                  <div className="mt-5 h-[2px] w-14 bg-secondary" aria-hidden="true" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-muted/30 py-24 px-4">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-card/40 to-muted/30" aria-hidden="true" />
          <div className="relative container mx-auto max-w-6xl space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mx-auto max-w-3xl space-y-4 text-center"
            >
              <span className="inline-flex items-center rounded-full border border-border bg-card px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground shadow-sm">
                Benefícios da estadia
              </span>
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                O que você encontra ao reservar
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                Recursos desenhados para reduzir dúvidas e manter previsibilidade em cada etapa da hospedagem.
              </p>
              <div className="mx-auto h-1 w-24 rounded-full bg-secondary" aria-hidden="true" />
            </motion.div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-7">
            {[
              {
                icon: <Trees className="h-5 w-5 text-primary" />,
                title: 'Natureza e conforto',
                desc: 'Chalés e suítes cercados por verde, com ar-condicionado, Wi‑Fi e amenities premium.',
              },
              {
                icon: <Building2 className="h-5 w-5 text-primary" />,
                title: 'Disponibilidade em tempo real',
                desc: 'Calendário bloqueia datas cheias e impede check-in no passado antes de você avançar.',
              },
              {
                icon: <Sparkles className="h-5 w-5 text-primary" />,
                title: 'Pet friendly opcional',
                desc: 'Ative a opção de pets e mostramos apenas acomodações compatíveis.',
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.55)]"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-primary">
                    {card.icon}
                  </div>
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-border bg-muted px-2 text-xs font-bold text-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mb-3 font-display text-xl font-semibold text-foreground">{card.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
                <div className="mt-5 h-[2px] w-14 bg-secondary" aria-hidden="true" />
              </motion.div>
            ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden px-4 pb-14 pt-24">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-muted/30 to-muted/60" aria-hidden="true" />
          <div className="relative container mx-auto max-w-6xl space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mx-auto max-w-3xl space-y-4 text-center"
            >
              <span className="inline-flex items-center rounded-full border border-border bg-card px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground shadow-sm">
                Fluxo de reserva
              </span>
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                Como funciona o fluxo de reserva
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                Em três etapas você chega ao quarto ideal, valida datas e conclui a reserva sem perder o contexto.
              </p>
              <div className="mx-auto h-1 w-24 rounded-full bg-secondary" aria-hidden="true" />
            </motion.div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-7">
              {[
                {
                  step: '1. Escolha datas, hóspedes e pets',
                  text: 'Validação imediata de datas bloqueadas e mínimo de 1 hóspede antes de prosseguir.',
                },
                {
                  step: '2. Veja apenas o que comporta você',
                  text: 'A listagem já aplica capacidade e pet friendly, ocultando quartos incompatíveis.',
                },
                {
                  step: '3. Finalize ou retome reservas',
                  text: 'Entre em Minhas Reservas para acompanhar, ajustar ou cancelar uma estadia ativa.',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.55)]"
                >
                  <span className="mb-4 inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-border bg-secondary/15 px-2 text-xs font-bold text-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="mb-2 font-display text-lg font-semibold text-foreground">{item.step}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                  <div className="mt-5 h-[2px] w-14 bg-secondary" aria-hidden="true" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden pt-0 pb-0">
          <div className="w-full">
            <div
              className="relative overflow-hidden rounded-none border-y border-border bg-primary px-6 py-8 md:px-10 md:py-12"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary to-primary/80" />
              <div className="absolute inset-0 bg-black/10" />

              <div className="relative grid gap-12 lg:grid-cols-[0.95fr_1.15fr] lg:items-center">
                <motion.div
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.55 }}
                  className="space-y-6 text-primary-foreground"
                >
                  <span className="inline-flex items-center rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground">
                    Hospedagem
                  </span>

                  <div className="space-y-4">
                    <h2 className="font-display text-3xl font-bold leading-tight text-primary-foreground md:text-4xl">
                      Conforto e tranquilidade para uma estadia sem complicação
                    </h2>
                    <p className="max-w-xl leading-relaxed text-primary-foreground/90">
                      Escolha as datas, veja os quartos disponíveis e finalize sua reserva em poucos passos. Tudo com clareza, contraste e foco no que importa: a sua experiência.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        icon: <ShieldCheck className="h-4 w-4 text-primary-foreground" />,
                        title: 'Reserva guiada',
                        desc: 'Validação antes de avançar.',
                      },
                      {
                        icon: <Trees className="h-4 w-4 text-primary-foreground" />,
                        title: 'Ambiente tranquilo',
                        desc: 'Natureza e conforto no mesmo espaço.',
                      },
                      {
                        icon: <Sparkles className="h-4 w-4 text-primary-foreground" />,
                        title: 'Fluxo rápido',
                        desc: 'Escolha, revise e conclua sem atrito.',
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 backdrop-blur-md"
                      >
                        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground">
                          {item.icon}
                        </div>
                        <h3 className="text-sm font-semibold text-primary-foreground">{item.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-primary-foreground/85">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-center gap-3">
                    <Link to="/hospedagem/rooms" className="btn-gold">
                      Ver quartos
                    </Link>
                    <Link
                      to="/hospedagem/my-reservations"
                      className="inline-flex items-center justify-center rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                    >
                      Minhas reservas
                    </Link>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.55, delay: 0.08 }}
                  className="relative"
                >
                  <div className="absolute -bottom-6 -right-6 hidden h-2/3 w-2/3 rounded-none border border-primary-foreground/15 md:block" />
                  <div className="absolute -top-6 -left-6 hidden h-2/3 w-2/3 rounded-none bg-primary-foreground/10 md:block" />

                  <div className="relative overflow-hidden rounded-none border border-primary-foreground/15 bg-primary">
                    <img
                      src={roomSuite}
                      alt="Hospedagem Du Zé Pesqueiro"
                      className="h-[520px] w-full object-cover object-center md:h-[620px] lg:h-[700px]"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                        Natureza
                      </span>
                      <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                        Conforto
                      </span>
                      <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                        Estadia tranquila
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-primary/0 to-primary" aria-hidden="true" />
        </section>

        <footer className="relative overflow-hidden border-t border-border bg-primary px-4 pb-16 pt-10 text-primary-foreground">
          <div className="pointer-events-none absolute inset-0 bg-black/10" />
          <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.7fr_0.8fr_0.95fr]">
            <div className="space-y-4">
              <Link to="/hospedagem" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-primary-foreground">
                Du Zé Pesqueiro
              </Link>
              <p className="max-w-md text-sm leading-relaxed text-primary-foreground/85">
                Hospedagem pensada para descanso, conforto e reservas simples. Escolha seu quarto, acompanhe sua estadia e fale com a equipe sempre que precisar.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground">
                  Reserva online
                </span>
                <span className="rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground">
                  Atendimento rápido
                </span>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
                Atalhos
              </h3>
              <ul className="space-y-3 text-sm">
                {[
                  { to: '/hospedagem', label: 'Início' },
                  { to: '/hospedagem/rooms', label: 'Quartos' },
                  { to: '/hospedagem/my-reservations', label: 'Minhas reservas' },
                  { to: '/events', label: 'Eventos' },
                  { to: '/store', label: 'Loja' },
                ].map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="group inline-flex items-center gap-2 text-primary-foreground/85 transition-colors hover:text-primary-foreground"
                    >
                      <ArrowUpRight className="h-4 w-4 text-secondary/80 transition-colors group-hover:text-secondary" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
                Contato
              </h3>
              <div className="space-y-3 text-sm text-primary-foreground/85">
                <a
                  href="mailto:contato@duzpesqueiro.com"
                  className="flex items-center gap-3 transition-colors hover:text-primary-foreground"
                >
                  <Mail className="h-4 w-4 text-secondary" />
                  contato@duzpesqueiro.com
                </a>
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 transition-colors hover:text-primary-foreground"
                >
                  <MessageCircle className="h-4 w-4 text-secondary" />
                  WhatsApp +55 11 99999-9999
                </a>
                <p className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-secondary" />
                  Atendimento todos os dias, das 8h às 18h
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-primary-foreground/15 bg-primary-foreground/10 p-5 backdrop-blur-md">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
                Próximo passo
              </h3>
              <p className="text-sm leading-relaxed text-primary-foreground/85">
                Veja os quartos disponíveis, escolha as datas e siga para a reserva sem perder o fluxo da hospedagem.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/hospedagem/rooms" className="btn-gold">
                  Ver quartos
                </Link>
                <button
                  type="button"
                  onClick={scrollToTop}
                  className="inline-flex items-center justify-center rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                >
                  Voltar ao topo
                  <ChevronUp className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="relative mx-auto mt-12 flex max-w-6xl flex-col gap-4 border-t border-primary-foreground/15 pt-6 text-sm text-primary-foreground/90 md:flex-row md:items-center md:justify-between">
            <p>© 2026 Du Zé Pesqueiro. Todos os direitos reservados.</p>
            <p className="text-primary-foreground/75">
              Hospedagem online, reservas simples e atendimento direto com a equipe.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
