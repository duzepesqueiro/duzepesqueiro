import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import ThemeToggle from './ThemeToggle';
import api from '../../utils/api';

const Header = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminValidated, setIsAdminValidated] = useState(false);
  const logoSrc = `${import.meta.env.BASE_URL}assets/images/logo.jpg`;

  const navigationItems = [
    { label: 'Visão Geral', path: '/executive-overview-dashboard', icon: 'BarChart3' },
    { label: 'Hospedagem', path: '/hospedagem', icon: 'Building2' },
    { label: 'Estoque', path: '/inventory-management-dashboard', icon: 'Package' },
    { label: 'Vendas', path: '/sales-analytics-dashboard', icon: 'TrendingUp' },
    { label: 'Aluguéis', path: '/rental-operations-dashboard', icon: 'Calendar' },
    { label: 'Eventos', path: '/events-management-dashboard', icon: 'Ticket' },
    { label: 'Usuários', path: '/users-management-dashboard', icon: 'Users' },
  ];

  const normalizedPath = location?.pathname?.replace(/^\/admin(?=\/hospedagem)/, '') || '';
  const isActivePath = (path) => normalizedPath === path || normalizedPath?.startsWith(`${path}/`);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    let mounted = true;
    const validateAdmin = async () => {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('auth_access_token');
      if (!token) {
        if (mounted) {
          setIsAdminValidated(false);
        }
        return;
      }
      try {
        await api.get('/api/auth/admin-check');
        if (mounted) {
          setIsAdminValidated(true);
        }
      } catch {
        if (mounted) {
          setIsAdminValidated(false);
        }
      }
    };
    validateAdmin();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {}

    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_access_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_email');
    window.location.assign('/auth/');
  };

  const handleSwitchFrontend = () => {
    if (!isAdminValidated) {
      return;
    }
    window.location.assign('/user/');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[1000] bg-card/95 backdrop-blur-sm border-b border-border theme-transition">
        <div className="flex items-center justify-between h-16 px-8">
          {/* Logo */}
          <Link to="/executive-overview-dashboard" className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg theme-transition">
              <img src={logoSrc} alt="Logo DuZe pesqueiro" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-heading font-semibold text-foreground theme-transition">
                DuZé pesqueiro
              </span>
              <span className="text-xs font-caption text-muted-foreground theme-transition">
                Inteligência de Negócios
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems?.map((item) => (
              <Link
                key={item?.path}
                to={item?.path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-body font-medium text-sm theme-transition ${
                  isActivePath(item?.path)
                    ? 'bg-secondary text-secondary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon name={item?.icon} size={16} />
                <span>{item?.label}</span>
              </Link>
            ))}
          </nav>

          {/* Header Controls */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <ThemeToggle />
            {isAdminValidated && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSwitchFrontend}
                aria-label="Trocar para frontend de usuário"
              >
                <Icon name="ArrowRightLeft" size={18} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Sair"
            >
              <Icon name="LogOut" size={18} />
            </Button>
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={toggleMobileMenu}
              aria-label="Alternar menu de navegação"
            >
              <Icon name={isMobileMenuOpen ? 'X' : 'Menu'} size={20} />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[1200] md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={closeMobileMenu} />
          <div className="fixed top-0 left-0 right-0 bg-card border-b border-border animate-slide-in-from-top theme-transition">
            <div className="flex items-center justify-between h-16 px-8">
              <Link to="/executive-overview-dashboard" className="flex items-center space-x-3" onClick={closeMobileMenu}>
                <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg theme-transition">
                  <img src={logoSrc} alt="Logo DuZe pesqueiro" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-heading font-semibold text-foreground theme-transition">
                    DuZé pesqueiro
                  </span>
                  <span className="text-xs font-caption text-muted-foreground theme-transition">
                    Inteligência de Negócios
                  </span>
                </div>
              </Link>
              
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                {isAdminValidated && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSwitchFrontend}
                    aria-label="Trocar para frontend de usuário"
                  >
                    <Icon name="ArrowRightLeft" size={18} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Sair"
                >
                  <Icon name="LogOut" size={18} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeMobileMenu}
                  aria-label="Fechar menu de navegação"
                >
                  <Icon name="X" size={20} />
                </Button>
              </div>
            </div>
            <nav className="px-8 py-4 space-y-2">
              {navigationItems?.map((item) => (
                <Link
                  key={item?.path}
                  to={item?.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-body font-medium text-base theme-transition ${
                    isActivePath(item?.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon name={item?.icon} size={20} />
                  <span>{item?.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
