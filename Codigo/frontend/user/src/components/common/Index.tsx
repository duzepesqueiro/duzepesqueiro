import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronDown, ShieldCheck, Trees, Building2, Sparkles } from 'lucide-react';
import SearchBox from '@/components/common/booking/SearchBox';
import Header from '@/components/common/layout/Header';
import { api } from '@/lib/api';
import heroImg from './hero-home.jpg';
import logoImg from '@/assets/logo.jpg';
import styles from './home.module.css';

type BlockedApiItem = {
  startDate?: string;
  endDate?: string;
  dataInicio?: string;
  dataFim?: string;
  reason?: string;
};

const Index = () => {
  const { data: blockedDates = [], isLoading: loadingBlocked } = useQuery(
    ['hosting-blocked-dates'],
    async () => {
      try {
        // Usa endpoint já existente no backend (bloqueios). Guarda falhas com fallback seguro.
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
    { staleTime: 1000 * 60 * 5, retry: 1 }
  );

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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative h-[90vh] min-h-[620px] flex items-center justify-center overflow-hidden">
        <img
          src={heroImg}
          alt="Quarto de hotel com vista para a montanha"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className={styles.heroOverlay} />
        <div className={styles.logoWrap}>
          <img src={logoImg} alt="Du Zé Pesqueiro" className={styles.logo} />
        </div>

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
            <ChevronDown className="h-5 w-5 animate-bounce" />
            Role para conhecer mais
          </div>
        </div>
      </section>

      <section id="destaques" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl space-y-12">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-center text-foreground"
          >
            Por que iniciar por aqui?
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

      <section className="py-16 px-4 bg-card/60 backdrop-blur-sm">
        <div className="container mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8">
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

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl space-y-10">
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

      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © 2026 Du Zé Pesqueiro. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Index;
