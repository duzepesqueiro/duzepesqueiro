import logoImage from './logo.png'; 
import './index.css';

export const Header = () => {
  return (
    <header className="main-header">
      <div className="header-container">
        <img src={logoImage} alt="DuZé Pesqueiro" className="header-logo" />
        <nav className="header-nav">
          <a href="#inicio">Início</a>
          <a href="#quartos">Quartos</a>
          <a href="#reservas">Minhas Reservas</a>
        </nav>
      </div>
    </header>
  );
};