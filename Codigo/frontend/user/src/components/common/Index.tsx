import { useMemo } from 'react';
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
import Header from '@/components/common/layout/Header';
import { api } from '@/lib/api';
import heroImg from '@/assets/duzepesqueiro3.jpeg';
import roomSuite from '@/assets/duzepesqueiro4.jpeg';
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#E9F2F1' }}>
      <div className={styles.pageBackdrop} aria-hidden="true" />
      <Header transparent />

      <main className="relative z-10">
        <section className="relative h-[90vh] min-h-[620px] flex items-center justify-center overflow-hidden">
          <img
            src={heroImg}
            alt="DuZé Pesqueiro"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="relative z-10 text-center px-4 w-full max-w-6xl mx-auto space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-tight"
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

          </div>
        </section>

        <section id="destaques" className="relative overflow-hidden py-24 px-4">
          <div
            className="pointer-events-none absolute inset-0 bg-[#F2F0CE]/70"
            aria-hidden="true"
          />
          <div className="relative container mx-auto max-w-6xl space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mx-auto max-w-3xl space-y-4 text-center"
            >
              <span className="inline-flex items-center rounded-full border border-[#0D5673]/25 bg-[#E9F2F1] px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#0D5673]">
                Destaques da hospedagem
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-[#0D5673]">
                Por que escolher o DuZé Pesqueiro?
              </h2>
              <p className="text-sm md:text-base leading-relaxed text-[#0D5673]/85">
                Experiência planejada para facilitar sua reserva, com clareza nas etapas e conforto em cada detalhe da estadia.
              </p>
              <div className="mx-auto h-1 w-24 rounded-full bg-[#F2AB27]" aria-hidden="true" />
            </motion.div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-7">
              {featureItems.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="group relative overflow-hidden rounded-2xl border-2 border-[#0D5673]/20 bg-[#E9F2F1] p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#0D5673]/45"
                >
                  <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#0D5673]/25 bg-[#F2F0CE] text-sm font-bold text-[#0D5673]">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="mb-3 font-display text-xl font-semibold text-[#0D5673]">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#0D5673]/82">
                    {f.desc}
                  </p>
                  <div className="mt-5 h-[2px] w-14 bg-[#F2AB27]" aria-hidden="true" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-24 px-4 bg-card/60">
          <div
            className="pointer-events-none absolute inset-0 bg-[#E9F2F1]/80"
            aria-hidden="true"
          />
          <div className="relative container mx-auto max-w-6xl space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mx-auto max-w-3xl space-y-4 text-center"
            >
              <span className="inline-flex items-center rounded-full border border-[#0D5673]/25 bg-[#F2F0CE] px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#0D5673]">
                Beneficios da estadia
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-[#0D5673]">
                O que voce encontra ao reservar
              </h2>
              <p className="text-sm md:text-base leading-relaxed text-[#0D5673]/85">
                Recursos desenhados para facilitar sua decisao e deixar toda a jornada de hospedagem mais previsivel.
              </p>
              <div className="mx-auto h-1 w-24 rounded-full bg-[#F2AB27]" aria-hidden="true" />
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
                desc: 'Ative o toggle de pets e mostramos apenas acomodações com a flag pet_friendly = true.',
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border-2 border-[#0D5673]/20 bg-[#F2F0CE] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#0D5673]/45"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#0D5673]/25 bg-[#E9F2F1] text-[#0D5673]">
                    {card.icon}
                  </div>
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-[#0D5673]/25 bg-[#E9F2F1] px-2 text-xs font-bold text-[#0D5673]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mb-3 font-display text-xl font-semibold text-[#0D5673]">{card.title}</h3>
                <p className="text-sm leading-relaxed text-[#0D5673]/82">{card.desc}</p>
                <div className="mt-5 h-[2px] w-14 bg-[#F2AB27]" aria-hidden="true" />
              </motion.div>
            ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden pt-24 pb-14 px-4">
          <div
            className="pointer-events-none absolute inset-0 bg-[#F2F0CE]/65"
            aria-hidden="true"
          />
          <div className="relative container mx-auto max-w-6xl space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mx-auto max-w-3xl space-y-4 text-center"
            >
              <span className="inline-flex items-center rounded-full border border-[#0D5673]/25 bg-[#E9F2F1] px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#0D5673]">
                Fluxo de reserva
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-[#0D5673]">
                Como funciona o fluxo de reserva
              </h2>
              <p className="text-sm md:text-base leading-relaxed text-[#0D5673]/85">
                Em tres etapas voce chega ao quarto ideal, valida datas e acompanha tudo sem perder o contexto.
              </p>
              <div className="mx-auto h-1 w-24 rounded-full bg-[#F2AB27]" aria-hidden="true" />
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
                  className="group relative overflow-hidden rounded-2xl border-2 border-[#0D5673]/20 bg-[#E9F2F1] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#0D5673]/45"
                >
                  <span className="mb-4 inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[#0D5673]/25 bg-[#F2F0CE] px-2 text-xs font-bold text-[#0D5673]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="mb-2 font-display text-lg font-semibold text-[#0D5673]">{item.step}</p>
                  <p className="text-sm leading-relaxed text-[#0D5673]/82">{item.text}</p>
                  <div className="mt-5 h-[2px] w-14 bg-[#F2AB27]" aria-hidden="true" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden pt-0 pb-0">
          <div className="w-full">
            <div
              className="relative overflow-hidden rounded-none border border-[#F2F0CE] px-6 py-8 md:px-10 md:py-12"
              style={{ backgroundColor: '#0D5673' }}
            >
              <div className="absolute inset-0 bg-[#E9F2F1]/8" />
              <div className="absolute inset-y-0 left-0 w-1/3 bg-[#F2F0CE]/12" />

              <div className="relative grid gap-12 lg:grid-cols-[0.95fr_1.15fr] lg:items-center">
                <motion.div
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.55 }}
                  className="space-y-6 text-primary-foreground"
                >
                  <span className="inline-flex items-center rounded-full bg-[#E9F2F1]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#E9F2F1]">
                    Hospedagem
                  </span>

                  <div className="space-y-4">
                    <h2 className="font-display text-3xl md:text-4xl font-bold text-[#E9F2F1] leading-tight">
                      Conforto simples para uma estadia sem complicação
                    </h2>
                    <p className="max-w-xl text-[#E9F2F1]/85 leading-relaxed">
                      Escolha as datas, veja os quartos disponíveis e finalize sua reserva de forma direta. A área de hospedagem foi pensada para ser clara, bonita e fácil de usar.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        icon: <ShieldCheck className="h-4 w-4 text-[#E9F2F1]" />,
                        title: 'Reserva guiada',
                        desc: 'Datas e regras validam antes de seguir.',
                      },
                      {
                        icon: <Trees className="h-4 w-4 text-[#E9F2F1]" />,
                        title: 'Ambiente tranquilo',
                        desc: 'Natureza e conforto no mesmo espaço.',
                      },
                      {
                        icon: <Sparkles className="h-4 w-4 text-[#E9F2F1]" />,
                        title: 'Fluxo rápido',
                        desc: 'Escolha, revise e conclua sem atrito.',
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-[#F2F0CE]/60 bg-[#E9F2F1]/14 p-4 backdrop-blur-md"
                      >
                        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#E9F2F1]/18 text-[#E9F2F1]">
                          {item.icon}
                        </div>
                        <h3 className="text-sm font-semibold text-[#E9F2F1]">{item.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-[#E9F2F1]/82">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-center gap-3">
                    <Link to="/hospedagem/rooms" className="btn-gold">
                      Ver quartos
                    </Link>
                    <Link
                      to="/hospedagem/my-reservations"
                      className="inline-flex items-center justify-center rounded-lg border border-[#F2F0CE]/60 bg-[#E9F2F1]/16 px-5 py-3 text-sm font-medium text-[#E9F2F1] transition hover:bg-[#E9F2F1]/22"
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
                  <div className="absolute -bottom-6 -right-6 hidden h-2/3 w-2/3 rounded-none border border-[#F2F0CE]/55 md:block" />
                  <div className="absolute -top-6 -left-6 hidden h-2/3 w-2/3 rounded-none bg-[#E9F2F1]/12 md:block" />

                  <div className="relative overflow-hidden rounded-none border border-[#F2F0CE]/60 bg-[#0D5673]">
                    <img
                      src={roomSuite}
                      alt="Hospedagem Du Zé Pesqueiro"
                      className="h-[520px] w-full object-cover object-center md:h-[620px] lg:h-[700px]"
                    />
                    <div className="absolute inset-0 bg-[#0D5673]/42" />
                    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#E9F2F1] px-3 py-1 text-xs font-semibold text-[#0D5673]">
                        Natureza
                      </span>
                      <span className="rounded-full bg-[#E9F2F1] px-3 py-1 text-xs font-semibold text-[#0D5673]">
                        Conforto
                      </span>
                      <span className="rounded-full bg-[#E9F2F1] px-3 py-1 text-xs font-semibold text-[#0D5673]">
                        Estadia tranquila
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-[linear-gradient(180deg,rgba(13,86,115,0)_0%,rgba(2,64,89,0.95)_100%)]"
            aria-hidden="true"
          />
        </section>

        <footer className="relative overflow-hidden border-t border-[#F2F0CE]/50 px-4 pt-10 pb-16 text-[#E9F2F1]">
          <div className="absolute inset-0 bg-[#024059]" />
          <div className="absolute inset-0 bg-[#E9F2F1]/5" />
          <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.7fr_0.8fr_0.95fr]">
            <div className="space-y-4">
              <Link to="/hospedagem" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-[#E9F2F1]">
                Du Zé Pesqueiro
              </Link>
              <p className="max-w-md text-sm leading-relaxed text-[#E9F2F1]/82">
                Hospedagem pensada para descanso, conforto e reservas simples. Escolha seu quarto, acompanhe sua estadia e fale com a equipe sempre que precisar.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[#F2F0CE]/60 bg-[#E9F2F1]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#E9F2F1]">
                  Reserva online
                </span>
                <span className="rounded-full border border-[#F2F0CE]/60 bg-[#E9F2F1]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#E9F2F1]">
                  Atendimento rápido
                </span>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#F2F0CE]">
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
                      className="group inline-flex items-center gap-2 text-[#E9F2F1]/82 transition hover:text-[#E9F2F1]"
                    >
                      <ArrowUpRight className="h-4 w-4 text-[#F2F0CE]/75 transition group-hover:text-[#F2AB27]" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#F2F0CE]">
                Contato
              </h3>
              <div className="space-y-3 text-sm text-[#E9F2F1]/82">
                <a
                  href="mailto:contato@duzpesqueiro.com"
                  className="flex items-center gap-3 transition hover:text-[#E9F2F1]"
                >
                  <Mail className="h-4 w-4 text-[#F2F0CE]" />
                  contato@duzpesqueiro.com
                </a>
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 transition hover:text-[#E9F2F1]"
                >
                  <MessageCircle className="h-4 w-4 text-[#F2F0CE]" />
                  WhatsApp +55 11 99999-9999
                </a>
                <p className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-[#F2F0CE]" />
                  Atendimento todos os dias, das 8h às 18h
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#F2F0CE]/55 bg-[#E9F2F1]/12 p-5 backdrop-blur-md">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#F2F0CE]">
                Próximo passo
              </h3>
              <p className="text-sm leading-relaxed text-[#E9F2F1]/82">
                Veja os quartos disponíveis, escolha as datas e siga para a reserva sem perder o fluxo da hospedagem.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/hospedagem/rooms" className="btn-gold">
                  Ver quartos
                </Link>
                <button
                  type="button"
                  onClick={scrollToTop}
                  className="inline-flex items-center justify-center rounded-lg border border-[#F2F0CE]/60 bg-[#E9F2F1]/12 px-4 py-3 text-sm font-medium text-[#E9F2F1] transition hover:bg-[#E9F2F1]/20"
                >
                  Voltar ao topo
                  <ChevronUp className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="relative mx-auto mt-12 flex max-w-6xl flex-col gap-4 border-t border-[#F2F0CE]/50 pt-6 text-sm text-[#E9F2F1]/88 md:flex-row md:items-center md:justify-between">
            <p>© 2026 Du Zé Pesqueiro. Todos os direitos reservados.</p>
            <p className="text-[#E9F2F1]/72">
              Hospedagem online, reservas simples e atendimento direto com a equipe.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
