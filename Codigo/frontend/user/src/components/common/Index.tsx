import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Building2,
  ChevronDown,
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
import heroImg from '@/assets/hero-home.jpg';
import roomSuite from '@/assets/room-suite.jpg';
import styles from './home.module.css';

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

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: blockedDates = [], isLoading: loadingBlocked } = useQuery<BlockedDate[]>({
    queryKey: ['hosting-blocked-dates'],
    queryFn: async (): Promise<BlockedDate[]> => {
      try {
        const { data, status } = await api.get('/api/bloqueios', {
          params: { isActive: true },
          validateStatus: () => true,
        });
        if (status >= 400 || !Array.isArray(data)) return [];
        return data
          .map((item: BlockedApiItem) => {
            const start = item.startDate || item.dataInicio;
            const end = item.endDate || item.dataFim;
            if (!start || !end) return null;
            return { start: new Date(start), end: new Date(end), reason: item.reason };
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

  const scrollToHighlights = () => {
    document.getElementById('destaques')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className={styles.pageBackdrop} aria-hidden="true" />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Main content with margin to accommodate sidebar */}
      <main className={`relative z-10 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <section className="relative h-[90vh] min-h-[620px] flex items-center justify-center overflow-hidden">
          <img
            src={heroImg}
            alt="DuZé Pesqueiro"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className={styles.heroOverlay} />
          <div className="relative z-10 text-center px-4 w-full max-w-6xl mx-auto space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-tight drop-shadow-lg"
            >
              Sua estadia dos sonhos
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.8 }}
              className="text-lg md:text-xl text-primary-foreground/85 max-w-3xl mx-auto leading-relaxed"
            >
              Descubra o refúgio perfeito em Du Zé. Quartos exclusivos, natureza exuberante e experiências inesquecíveis — tudo começa escolhendo as datas certas.
            </motion.p>

            <div className="w-full flex justify-center">
              <SearchBox
                blockedDates={blockedDates}
                isLoadingBlocked={loadingBlocked}
                className={`${styles.searchCard} max-w-5xl`}
              />
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-primary-foreground/90 text-sm">
              <div className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Datas passadas e períodos bloqueados são desabilitados.
              </div>
              <span className="hidden md:inline text-primary-foreground/60">•</span>
              <Link
                to="/hospedagem/my-reservations"
                className="underline decoration-1 underline-offset-4 hover:text-primary-foreground"
              >
                Já reservou antes? Abra Minhas Reservas
              </Link>
            </div>

            <div className={styles.scrollHint}>
              <button
                type="button"
                onClick={scrollToHighlights}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/95 shadow-lg backdrop-blur-md transition hover:bg-white/15 hover:text-white"
              >
                <ChevronDown className="h-5 w-5 animate-bounce" />
                Role para ver mais
              </button>
            </div>
          </div>
        </section>

        <section id="destaques" className="relative overflow-hidden py-20 px-4">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(242,193,78,0.08),transparent_28%),linear-gradient(180deg,#f8f4ed_0%,#f2ebdf_100%)]"
            aria-hidden="true"
          />
          <div className="relative container mx-auto max-w-5xl space-y-12">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-display text-3xl md:text-4xl font-bold text-center text-foreground"
            >
              Por que escolher o DuZé Pesqueiro?
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featureItems.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="nature-card text-center p-6"
                >
                  <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                    {f.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-16 px-4 bg-card/60 backdrop-blur-sm">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.46)_0%,rgba(246,239,228,0.9)_100%)]"
            aria-hidden="true"
          />
          <div className="relative container mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8">
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
                desc: 'Ative o toggle de pets e mostramos apenas acomodações com a flag pet_friendly = true.',
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl p-6 bg-card shadow-sm border border-border/60"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">{card.icon}</div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{card.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden py-16 px-4">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(242,193,78,0.07),transparent_26%),linear-gradient(180deg,#f4efe5_0%,#fbf8f2_100%)]"
            aria-hidden="true"
          />
          <div className="relative container mx-auto max-w-5xl space-y-10">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-display text-3xl font-bold text-center text-foreground"
            >
              Como funciona o fluxo de reserva
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  className="p-5 rounded-xl border border-border bg-card"
                >
                  <p className="text-sm font-semibold text-primary mb-1">{item.step}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-24 px-4">
          <div className="mx-auto max-w-[1840px]">
            <div
              className="relative overflow-hidden rounded-[2.5rem] border border-white/10 px-6 py-8 shadow-2xl md:px-10 md:py-12"
              style={{ background: 'linear-gradient(135deg, #07111d 0%, #0b1e31 46%, #10304d 100%)' }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_42%)]" />
              <div className="absolute inset-y-0 left-0 w-1/3 bg-white/5 blur-3xl" />

              <div className="relative grid gap-12 lg:grid-cols-[0.95fr_1.15fr] lg:items-center">
                <motion.div
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.55 }}
                  className="space-y-6 text-primary-foreground"
                >
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/90">
                    Hospedagem
                  </span>

                  <div className="space-y-4">
                    <h2 className="font-display text-3xl md:text-4xl font-bold text-white leading-tight">
                      Conforto simples para uma estadia sem complicação
                    </h2>
                    <p className="max-w-xl text-white/75 leading-relaxed">
                      Escolha as datas, veja os quartos disponíveis e finalize sua reserva de forma direta. A área de hospedagem foi pensada para ser clara, bonita e fácil de usar.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        icon: <ShieldCheck className="h-4 w-4 text-white/90" />,
                        title: 'Reserva guiada',
                        desc: 'Datas e regras validam antes de seguir.',
                      },
                      {
                        icon: <Trees className="h-4 w-4 text-white/90" />,
                        title: 'Ambiente tranquilo',
                        desc: 'Natureza e conforto no mesmo espaço.',
                      },
                      {
                        icon: <Sparkles className="h-4 w-4 text-white/90" />,
                        title: 'Fluxo rápido',
                        desc: 'Escolha, revise e conclua sem atrito.',
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md"
                      >
                        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white">
                          {item.icon}
                        </div>
                        <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-white/75">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-center gap-3">
                    <Link to="/hospedagem/rooms" className="btn-gold">
                      Ver quartos
                    </Link>
                    <Link
                      to="/hospedagem/my-reservations"
                      className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
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
                  <div className="absolute -bottom-6 -right-6 hidden h-2/3 w-2/3 rounded-[2rem] border border-white/10 md:block" />
                  <div className="absolute -top-6 -left-6 hidden h-2/3 w-2/3 rounded-[2rem] bg-white/5 md:block" />

                  <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)]">
                    <img
                      src={roomSuite}
                      alt="Hospedagem Du Zé Pesqueiro"
                      className="h-[520px] w-full object-cover object-center md:h-[620px] lg:h-[700px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/18 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800">
                        Natureza
                      </span>
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800">
                        Conforto
                      </span>
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800">
                        Estadia tranquila
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        <footer className="relative overflow-hidden border-t border-white/10 px-4 py-16 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(242,193,78,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,#07111d_0%,#06101a_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_0%,transparent_26%,transparent_74%,rgba(255,255,255,0.05)_100%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.7fr_0.8fr_0.95fr]">
            <div className="space-y-4">
              <Link to="/hospedagem" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-white">
                Du Zé Pesqueiro
              </Link>
              <p className="max-w-md text-sm leading-relaxed text-white/75">
                Hospedagem pensada para descanso, conforto e reservas simples. Escolha seu quarto, acompanhe sua estadia e fale com a equipe sempre que precisar.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
                  Reserva online
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
                  Atendimento rápido
                </span>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
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
                      className="group inline-flex items-center gap-2 text-white/75 transition hover:text-white"
                    >
                      <ArrowUpRight className="h-4 w-4 text-white/35 transition group-hover:text-white/80" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
                Contato
              </h3>
              <div className="space-y-3 text-sm text-white/75">
                <a
                  href="mailto:contato@duzpesqueiro.com"
                  className="flex items-center gap-3 transition hover:text-white"
                >
                  <Mail className="h-4 w-4 text-white/60" />
                  contato@duzpesqueiro.com
                </a>
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 transition hover:text-white"
                >
                  <MessageCircle className="h-4 w-4 text-white/60" />
                  WhatsApp +55 11 99999-9999
                </a>
                <p className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-white/60" />
                  Atendimento todos os dias, das 8h às 18h
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] backdrop-blur-md">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
                Próximo passo
              </h3>
              <p className="text-sm leading-relaxed text-white/75">
                Veja os quartos disponíveis, escolha as datas e siga para a reserva sem perder o fluxo da hospedagem.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/hospedagem/rooms" className="btn-gold">
                  Ver quartos
                </Link>
                <button
                  type="button"
                  onClick={scrollToTop}
                  className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  Voltar ao topo
                  <ChevronUp className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="relative mx-auto mt-12 flex max-w-6xl flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/65 md:flex-row md:items-center md:justify-between">
            <p>© 2026 Du Zé Pesqueiro. Todos os direitos reservados.</p>
            <p className="text-white/55">
              Hospedagem online, reservas simples e atendimento direto com a equipe.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
