import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Fish, Heart, Leaf, MapPin, ArrowRight, Users, Star } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import fishingPark1 from "@/assets/duzepesqueiro1.jpeg";
import fishingPark2 from "@/assets/duzepesqueiro2.jpeg";
import fishingPark3 from "@/assets/duzepesqueiro3.jpeg";
import fishingGuide from "@/assets/duzepesqueiro4.jpeg";

const About = () => {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20">
      <Header searchScope="home" transparent />
      
      {/* Hero Section Imersivo */}
      <section className="relative h-[85vh] w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={fishingPark1} 
            alt="Lago do DuZé Pesqueiro ao amanhecer" 
            className="w-full h-full object-cover brightness-[0.65] scale-105 animate-slow-zoom"
          />
        </div>
        <div className="relative z-10 duze-container text-center text-white">
          <span className="inline-block py-1 px-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium tracking-wider mb-6 animate-fade-in-up">
            DESDE 2010
          </span>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight animate-fade-in-up delay-100">
            Onde a Natureza <br className="hidden md:block" /> Encontra a Serenidade
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto mb-10 font-light leading-relaxed animate-fade-in-up delay-200">
            Mais do que um pesqueiro, um refúgio para quem busca conexão, paz e momentos inesquecíveis.
          </p>
          <div className="animate-fade-in-up delay-300">
            <Button asChild size="lg" className="rounded-full px-8 py-6 text-lg bg-white text-black hover:bg-white/90 border-0 transition-transform hover:scale-105">
              <RouterLink to="/events">
                Explorar Eventos
              </RouterLink>
            </Button>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-70">
           <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-white to-transparent"></div>
        </div>
      </section>

      {/* A Jornada (Storytelling) */}
      <section className="py-24 md:py-32">
        <div className="duze-container">
          <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 relative">
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl aspect-[4/5] md:aspect-square">
              <img 
                src={fishingGuide} 
                alt="Fundadores do DuZé Pesqueiro" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 w-2/3 h-2/3 bg-primary/5 rounded-2xl -z-10 hidden md:block"></div>
            <div className="absolute -top-6 -left-6 w-2/3 h-2/3 border-2 border-primary/10 rounded-2xl -z-10 hidden md:block"></div>
          </div>
          
          <div className="order-1 md:order-2 space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Tudo começou com uma <span className="text-primary">simples paixão</span>.
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                A história do DuZé Pesqueiro não é sobre negócios, é sobre legado. O que começou há mais de uma década como um pequeno tanque para amigos e família, floresceu organicamente em um dos destinos de pesca mais queridos da região.
              </p>
              <p>
                O "Zé", fundador e alma deste lugar, acreditava que a pesca era uma forma de meditação ativa — um momento para silenciar o ruído do mundo e ouvir apenas a água e o vento.
              </p>
              <p>
                Hoje, mantemos viva essa essência. Cada canto do pesqueiro foi projetado para honrar a natureza ao redor, criando um santuário onde veteranos da pesca e iniciantes compartilham a mesma alegria ao sentir a linha esticar.
              </p>
            </div>
            <div className="pt-4">
               <div className="flex items-center gap-4">
                 <div className="h-px flex-1 bg-border"></div>
                 <span className="font-handwriting text-2xl text-primary rotate-[-2deg]">A família DuZé</span>
                 <div className="h-px flex-1 bg-border"></div>
               </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Imagem Parallax / Visual Break */}
      <section className="relative py-32 md:py-48 bg-fixed bg-center bg-cover bg-no-repeat" style={{ backgroundImage: `url(${fishingPark3})` }}>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 duze-container text-center">
          <h3 className="text-3xl md:text-5xl font-bold text-white mb-6 max-w-4xl mx-auto leading-tight">
            "A pesca é a arte de esperar com propósito. Aqui, cada espera é recompensada pela beleza ao redor."
          </h3>
          <div className="flex justify-center gap-2 text-primary">
            <Star className="fill-current w-6 h-6" />
            <Star className="fill-current w-6 h-6" />
            <Star className="fill-current w-6 h-6" />
            <Star className="fill-current w-6 h-6" />
            <Star className="fill-current w-6 h-6" />
          </div>
        </div>
      </section>

      {/* Valores e Pilares (Minimalista) */}
      <section className="py-24 bg-muted/20">
        <div className="duze-container">
          <div className="text-center mb-20">
            <span className="text-primary font-medium tracking-widest uppercase text-sm">Nossa Filosofia</span>
            <h2 className="text-4xl font-bold mt-3 mb-6">O que nos guia</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Nossos princípios são a base de cada experiência que proporcionamos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            <div className="group text-center space-y-4 p-6 rounded-2xl hover:bg-background hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Leaf className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Respeito Ambiental</h3>
              <p className="text-muted-foreground leading-relaxed">
                Acreditamos na pesca esportiva e na preservação. Cuidamos do nosso ecossistema para que as futuras gerações também possam desfrutar dele.
              </p>
            </div>

            <div className="group text-center space-y-4 p-6 rounded-2xl hover:bg-background hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Comunidade Viva</h3>
              <p className="text-muted-foreground leading-relaxed">
                Somos um ponto de encontro. Histórias são trocadas, amizades são formadas e o espírito de camaradagem está sempre presente.
              </p>
            </div>

            <div className="group text-center space-y-4 p-6 rounded-2xl hover:bg-background hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Hospitalidade</h3>
              <p className="text-muted-foreground leading-relaxed">
                Recebemos cada visitante como parte da família. Conforto, segurança e um sorriso no rosto são nossas marcas registradas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Localização com Design Visual */}
      <section className="py-0 grid md:grid-cols-2 min-h-[600px]">
        <div className="bg-foreground text-background flex flex-col justify-center p-6 sm:p-10 md:p-24">
           <div className="max-w-md mx-auto md:mx-0">
             <MapPin className="w-12 h-12 text-primary mb-6" />
             <h2 className="text-3xl md:text-4xl font-bold mb-6">Um refúgio perto de você</h2>
             <p className="text-white/70 dark:text-black text-lg mb-8 leading-relaxed">
               Localizado estrategicamente para ser acessível, mas isolado o suficiente para garantir o silêncio e a paz que você precisa.
             </p>
             
             <div className="space-y-4 mb-10">
               <div className="flex flex-col">
                 <span className="text-sm text-primary uppercase tracking-wider font-semibold mb-1">Endereço</span>
                 <span className="text-xl">Fazenda Santa Catarina, 15</span>
                 <span className="text-white/60 dark:text-black">Carreira Comprida, Santa Luzia - MG</span>
               </div>
               <div className="flex flex-col">
                 <span className="text-sm text-primary uppercase tracking-wider font-semibold mb-1">Horários</span>
                 <span className="text-xl">Terça a Domingo</span>
                 <span className="text-white/60 dark:text-black">07:00 às 18:00</span>
               </div>
             </div>

             <Button variant="outline" className="border-white/20 text-white hover:bg-white hover:text-black w-full md:w-auto">
               Ver no Mapa
             </Button>
           </div>
        </div>
        <div className="relative h-full min-h-[400px]">
          <img 
            src={fishingPark2} 
            alt="Vista aérea do pesqueiro" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Final CTA Sutis */}
      <section className="py-32 text-center">
        <div className="duze-container">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">Pronto para sua próxima história?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
            Seja para uma tarde tranquila ou um evento emocionante, estamos esperando por você.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="rounded-full px-8 h-14 text-lg">
              <RouterLink to="/store">
                <Fish className="mr-2 h-5 w-5" />
                Equipar-se na Loja
              </RouterLink>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 h-14 text-lg border-2">
              <RouterLink to="/events">
                <Users className="mr-2 h-5 w-5" />
                Ver Agenda de Eventos
              </RouterLink>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
