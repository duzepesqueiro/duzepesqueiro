import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

// FontAwesome via react-icons
import { FaChevronLeft, FaChevronRight, FaHome, FaBed, FaBook } from 'react-icons/fa';

const Sidebar = ({ open, setOpen }) => {
  const location = useLocation();

  const links = [
    { to: '/hospedagem/home', label: 'Início', icon: <FaHome /> },
    { to: '/hospedagem/rooms', label: 'Quartos', icon: <FaBed /> },
    { to: '/hospedagem/my-reservations', label: 'Minhas Reservas', icon: <FaBook /> },
  ];

  return (
    <motion.aside
      animate={{ width: open ? 256 : 64 }}
      transition={{ duration: 0.3 }}
      className="fixed top-[72px] left-0 h-[calc(100vh-72px)] z-40 glass border-r border-border flex flex-col"
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-3 border-b border-border">
        {open && (
          <Link
            to="/hospedagem"
            className="font-display text-lg font-bold text-foreground tracking-tight"
          >
            DuZe<span className="text-accent">Pesqueiro</span>
          </Link>
        )}

        <button onClick={() => setOpen(!open)} className="p-2 text-foreground">
          {open ? <FaChevronLeft /> : <FaChevronRight />}
        </button>
      </div>

      {/* Links */}
      <nav className="flex flex-col gap-2 p-2">
        {links.map((l) => {
          const active = location.pathname === l.to;

          return (
            <Link
              key={l.to}
              to={l.to}
              className={`flex items-center gap-3 px-3 py-3 rounded-md transition-all ${
                active
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="text-lg">{l.icon}</span>

              {open && (
                <span className="text-sm font-medium whitespace-nowrap">
                  {l.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
};

export default Sidebar;
