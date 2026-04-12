import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import LoadingBar from "./LoadingBar";
import fishingPark1 from "@/assets/duzepesqueiro1.jpeg";
import fishingPark2 from "@/assets/duzepesqueiro2.jpeg";
import fishingPark3 from "@/assets/duzepesqueiro3.jpeg";
import fishingGuide from "@/assets/duzepesqueiro4.jpeg";

const HeroCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loadingKey, setLoadingKey] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const carouselData = [
    {
      background: fishingPark1,
      title: "Bem-vindo ao Du Zé Pesqueiro",
      subtitle: "Experimente a serenidade do melhor destino de pesca da natureza",
      cardImage: fishingGuide,
      cardTitle: "Guias Especializados",
      cardDescription: "Orientação profissional para a pesca perfeita"
    },
    {
      background: fishingPark2,
      title: "Pesca ao Pôr do Sol",
      subtitle: "Descubra momentos mágicos enquanto o sol se põe",
      cardImage: fishingPark1,
      cardTitle: "Locais Premium",
      cardDescription: "Acesso aos melhores pontos de pesca"
    },
    {
      background: fishingPark3,
      title: "Aventuras em Família",
      subtitle: "Crie memórias duradouras com experiências de pesca para toda a família",
      cardImage: fishingPark2,
      cardTitle: "Todas as Idades",
      cardDescription: "Perfeito para iniciantes e especialistas"
    }
  ];

  // Auto-advance carousel every 3 seconds
  const handleAdvanceCarousel = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === carouselData.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleCardClick = (index: number) => {
    if (index === currentIndex || isTransitioning) return;
    
    setIsTransitioning(true);
    const clickedCard = cardRefs.current[index];
    
    if (clickedCard) {
      // Get card position for transition effect
      const cardRect = clickedCard.getBoundingClientRect();
      
      // Find the image element within the card
      const cardImage = clickedCard.querySelector('img');
      const imageRect = cardImage ? cardImage.getBoundingClientRect() : cardRect;
      
      const expandingElement = document.createElement('div');
      expandingElement.style.position = 'fixed';
      expandingElement.style.left = `${imageRect.left}px`;
      expandingElement.style.top = `${imageRect.top}px`;
      expandingElement.style.width = `${imageRect.width}px`;
      expandingElement.style.height = `${imageRect.height}px`;
      expandingElement.style.backgroundImage = `url(${carouselData[index].cardImage})`;
      expandingElement.style.backgroundSize = 'cover';
      expandingElement.style.backgroundPosition = 'center';
      expandingElement.style.zIndex = '40';
      expandingElement.style.borderRadius = '0.5rem';
      expandingElement.style.transition = 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
      expandingElement.style.transformOrigin = 'center';
      
      document.body.appendChild(expandingElement);
      
      // Trigger expansion with a slight delay for better visual effect
      requestAnimationFrame(() => {
        setTimeout(() => {
          expandingElement.style.left = '0px';
          expandingElement.style.top = '0px';
          expandingElement.style.width = '100vw';
          expandingElement.style.height = '100vh';
          expandingElement.style.borderRadius = '0px';
        }, 50);
      });
      
      // Complete transition
      setTimeout(() => {
        setCurrentIndex(index);
        setLoadingKey(prev => prev + 1); // Reset loading bar
        setIsTransitioning(false);
        try {
          document.body.removeChild(expandingElement);
        } catch (e) {
          // Element already removed
        }
      }, 850);
    } else {
      setCurrentIndex(index);
      setLoadingKey(prev => prev + 1); // Reset loading bar
      setIsTransitioning(false);
    }
  };

  const currentSlide = carouselData[currentIndex];

  return (
    <>
      {/* Loading Bar */}
      <LoadingBar key={loadingKey} duration={3000} onComplete={handleAdvanceCarousel} />
      
      <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-out"
        style={{ 
          backgroundImage: `url(${currentSlide.background})`,
          opacity: isTransitioning ? 0 : 1,
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 container mx-auto px-4 py-20 min-h-screen flex items-center">
        <div className="grid grid-cols-1 gap-12 items-center w-full">
          
          {/* Left Side - Title and Subtitle */}
          <div 
            className="text-center space-y-6 transition-all duration-500"
            style={{ opacity: isTransitioning ? 0 : 1, transform: isTransitioning ? 'translateY(20px)' : 'translateY(0)' }}
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight drop-shadow-lg">
              {currentSlide.title}
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
              {currentSlide.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-hero px-8 py-4 text-lg shadow-xl">
                  Reserve Sua Aventura
                </button>
                <button className="px-8 py-4 text-lg border-2 border-white text-white hover:bg-white hover:text-primary transition-all duration-300 rounded-lg font-semibold shadow-xl">
                  Saiba Mais
                </button>
            </div>
          </div>

        </div>
      </div>

      {/* Carousel Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3">
        {carouselData.map((_, index) => (
          <button
            key={index}
            onClick={() => handleCardClick(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-primary scale-125' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>
      </div>
    </>
  );
};

export default HeroCarousel;