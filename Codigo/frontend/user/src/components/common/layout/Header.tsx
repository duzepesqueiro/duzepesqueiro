import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, Bed, ChevronLeft, ChevronRight, Home, Menu } from 'lucide-react';

import logo from '@/assets/logo.jpg';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type HeaderProps = {
  transparent?: boolean;
  open?: boolean;
  setOpen?: (value: boolean) => void;
};

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  { to: '/hospedagem/home', label: 'Início', icon: <Home /> },
  { to: '/hospedagem/rooms', label: 'Quartos', icon: <Bed /> },
  { to: '/hospedagem/my-reservations', label: 'Minhas reservas', icon: <BookOpen /> },
];

const normalizePath = (path: string) => path.replace(/\/+$/, '') || '/';

const isActivePath = (pathname: string, to: string) => {
  const current = normalizePath(pathname);
  const target = normalizePath(to);

  if (target === '/hospedagem/home') {
    return current === '/hospedagem' || current === '/hospedagem/home';
  }

  return current === target || current.startsWith(`${target}/`);
};

const Header = ({ transparent = false, open = false, setOpen }: HeaderProps) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const hasRailControls = typeof setOpen === 'function';

  if (hasRailControls) {
    const toggleRail = () => {
      if (!setOpen) return;
      setOpen(!open);
    };

    return (
      <motion.aside
        animate={{ width: open ? 256 : 64 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 h-screen z-50 glass border-r border-border flex flex-col"
        onMouseEnter={() => setOpen?.(true)}
      >
        <div className="h-16 flex items-center justify-between px-3 border-b border-border">
          {open && (
            <Link
              to="/hospedagem"
              className="font-display text-lg font-bold text-foreground tracking-tight"
            >
              DuZé<span className="text-accent">Pesqueiro</span>
            </Link>
          )}

          <button
            type="button"
            onClick={toggleRail}
            className="p-2 text-foreground"
            aria-label={open ? 'Recolher navegação' : 'Expandir navegação'}
          >
            {open ? <ChevronLeft /> : <ChevronRight />}
          </button>
        </div>

        <nav className="flex flex-col gap-2 p-2">
          {navItems.map((item) => {
            const active = isActivePath(location.pathname, item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-3 rounded-md transition-all ${
                  active
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="text-lg">{item.icon}</span>

                {open && (
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </motion.aside>
    );
  }

  const transparentRoot = transparent
    ? 'bg-transparent text-white border-transparent backdrop-blur-sm shadow-none'
    : 'bg-background/85 text-navbar-foreground border-b border-border/40 backdrop-blur-sm shadow-sm';
  const linkBase = transparent
    ? 'font-medium text-white/90 transition-colors duration-200 drop-shadow-sm'
    : 'font-medium hover:text-[#F2C14E] transition-colors duration-200';
  const linkActive = transparent
    ? 'bg-[#F2AB27] text-[#024059] shadow-sm'
    : 'bg-primary text-primary-foreground shadow-sm';
  const mobileButton = transparent
    ? 'border-white/30 text-white hover:bg-white/10'
    : 'border-border text-foreground hover:bg-accent';
  const quickLink = transparent
    ? 'inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15'
    : 'btn-gold inline-flex items-center gap-2 whitespace-nowrap';

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors ${transparentRoot}`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className={`flex min-w-0 items-center gap-3 ${transparent ? 'text-white' : 'text-foreground'}`}>
          {transparent && (
            <Link
              to="/"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Voltar para a página inicial do pesque e pague"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}

          <Link
            to="/hospedagem"
            className="flex min-w-0 items-center space-x-3"
            aria-label="Ir para a página inicial da hospedagem"
          >
            <img
              src={logo}
              alt="DuZé Pesqueiro"
              className={`h-10 w-10 rounded-md object-cover shadow-md ${transparent ? 'ring-1 ring-white/30' : ''}`}
            />
            <div className="min-w-0">
              <h1 className={`truncate text-xl font-semibold tracking-wide ${transparent ? 'text-white drop-shadow-sm' : ''}`}>
                DuZé Pesqueiro
              </h1>
              <p className={`text-[10px] uppercase tracking-[0.24em] ${transparent ? 'text-white/80 drop-shadow-sm' : 'text-muted-foreground'}`}>
                Hospedagem
              </p>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => {
            const active = isActivePath(location.pathname, item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`${linkBase} ${active ? linkActive : ''} rounded-full px-4 py-2`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <Link
            to="/hospedagem/rooms"
            className={quickLink}
          >
            Ver quartos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className={`md:hidden ml-2 ${mobileButton}`}
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menu da hospedagem"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[85vw] sm:max-w-sm">
          <SheetHeader className="text-left">
            <SheetTitle>Hospedagem</SheetTitle>
            <SheetDescription>Atalhos rápidos da área de hospedagem</SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex flex-col gap-4">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const active = isActivePath(location.pathname, item.to);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span className="text-sm">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <Separator />

            <Link
              to="/hospedagem/rooms"
              onClick={() => setMobileMenuOpen(false)}
              className={quickLink}
            >
              Ver quartos
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </motion.header>
  );
};

export default Header;
