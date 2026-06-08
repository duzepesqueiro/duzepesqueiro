import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LoadingBar from "./LoadingBar";
import fishingPark1 from "@/assets/duzepesqueiro1.jpeg";
import fishingPark2 from "@/assets/duzepesqueiro2.jpeg";
import fishingPark3 from "@/assets/duzepesqueiro3.jpeg";
import fishingGuide from "@/assets/duzepesqueiro4.jpeg";

const HeroCarousel = () => {
  const navigate = useNavigate();
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
      cardDescription: "Orientação profissional para a pesca perfeita",
    },
    {
      background: fishingPark2,
      title: "Pesca ao Pôr do Sol",
      subtitle: "Descubra momentos mágicos enquanto o sol se põe",
      cardImage: fishingPark1,
      cardTitle: "Locais Premium",
      cardDescription: "Acesso aos melhores pontos de pesca",
    },
    {
      background: fishingPark3,
      title: "Aventuras em Família",
      subtitle: "Crie memórias duradouras com experiências de pesca para toda a família",
      cardImage: fishingPark2,
      cardTitle: "Todas as Idades",
      cardDescription: "Perfeito para iniciantes e especialistas",
    },
  ];

  const handleAdvanceCarousel = () => {
    setCurrentIndex((prevIndex) => (prevIndex === carouselData.length - 1 ? 0 : prevIndex + 1));
  };

  const handleCardClick = (index: number) => {
    if (index === currentIndex || isTransitioning) return;

    setIsTransitioning(true);
    const clickedCard = cardRefs.current[index];

    if (clickedCard) {
      const cardRect = clickedCard.getBoundingClientRect();

      const cardImage = clickedCard.querySelector("img");
      const imageRect = cardImage ? cardImage.getBoundingClientRect() : cardRect;

      const expandingElement = document.createElement("div");
      expandingElement.style.position = "fixed";
      expandingElement.style.left = `${imageRect.left}px`;
      expandingElement.style.top = `${imageRect.top}px`;
      expandingElement.style.width = `${imageRect.width}px`;
      expandingElement.style.height = `${imageRect.height}px`;
      expandingElement.style.backgroundImage = `url(${carouselData[index].cardImage})`;
      expandingElement.style.backgroundSize = "cover";
      expandingElement.style.backgroundPosition = "center";
      expandingElement.style.zIndex = "40";
      expandingElement.style.borderRadius = "0.5rem";
      expandingElement.style.transition = "all 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
      expandingElement.style.transformOrigin = "center";

      document.body.appendChild(expandingElement);

      requestAnimationFrame(() => {
        setTimeout(() => {
          expandingElement.style.left = "0px";
          expandingElement.style.top = "0px";
          expandingElement.style.width = "100vw";
          expandingElement.style.height = "100vh";
          expandingElement.style.borderRadius = "0px";
        }, 50);
      });

      setTimeout(() => {
        setCurrentIndex(index);
        setLoadingKey((prev) => prev + 1);
        setIsTransitioning(false);
        expandingElement.remove();
      }, 850);
    } else {
      setCurrentIndex(index);
      setLoadingKey((prev) => prev + 1);
      setIsTransitioning(false);
    }
  };

  const currentSlide = carouselData[currentIndex];

  return (
    <>
      <LoadingBar key={loadingKey} duration={3000} onComplete={handleAdvanceCarousel} />

      <div className="relative min-h-screen w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-out"
          style={{
            backgroundImage: `url(${currentSlide.background})`,
            opacity: isTransitioning ? 0 : 1,
          }}
        >
          <div className="absolute inset-0 bg-black/30" />
        </div>

        <div className="relative z-10 container mx-auto flex min-h-screen items-center px-4 py-20">
          <div className="grid w-full grid-cols-1 items-center gap-12">
            <div
              className="space-y-6 text-center transition-all duration-500"
              style={{
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? "translateY(20px)" : "translateY(0)",
              }}
            >
              <h1 className="text-4xl font-bold leading-tight text-white drop-shadow-lg md:text-6xl lg:text-7xl">
                {currentSlide.title}
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-white/90 drop-shadow-md md:text-xl">
                {currentSlide.subtitle}
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <button
                  className="btn-hero px-8 py-4 text-lg shadow-xl"
                  onClick={() => navigate("/hospedagem/home")}
                >
                  Reserve Sua Aventura
                </button>
                <button
                  className="rounded-lg border-2 border-white px-8 py-4 text-lg font-semibold text-white shadow-xl transition-all duration-300 hover:bg-white hover:text-primary"
                  onClick={() => navigate("/about")}
                >
                  Saiba Mais
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 transform space-x-3">
          {carouselData.map((_, index) => (
            <button
              key={index}
              onClick={() => handleCardClick(index)}
              className={`h-3 w-3 rounded-full transition-all duration-300 ${
                index === currentIndex ? "bg-primary scale-125" : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Ir para slide ${index + 1}`}
              type="button"
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default HeroCarousel;
