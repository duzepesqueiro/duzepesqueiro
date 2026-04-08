import { motion } from 'framer-motion';
import heroImg from '@/assets/hero-hotel.jpg';
import SearchBox from '@/components/booking/SearchBox';
import Header from '@/components/layout/Header';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <img
          src={heroImg}
          alt="Villa Serena"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'var(--gradient-hero)' }}
        />

        <div className="relative z-10 text-center px-4 w-full max-w-5xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-4 leading-tight"
          >
            Sua estadia dos sonhos
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.8 }}
            className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto"
          >
            Descubra o refúgio perfeito na Villa Serena. Quartos exclusivos, natureza exuberante e experiências inesquecíveis.
          </motion.p>

          <SearchBox />
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-center text-foreground mb-12"
          >
            Por que escolher a Villa Serena?
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Natureza Preservada', desc: 'Rodeado por mata nativa e paisagens deslumbrantes, longe do estresse da cidade.' },
              { title: 'Conforto Premium', desc: 'Quartos equipados com o que há de melhor em hotelaria e amenidades exclusivas.' },
              { title: 'Experiências Únicas', desc: 'Trilhas, gastronomia local e atividades personalizadas para toda a família.' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center p-6"
              >
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © 2026 Villa Serena. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Index;
