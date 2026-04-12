import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../../../components/AppIcon';

const menuItems = [
  { label: 'Dashboard', path: '/hospedagem' },
  { label: 'Chalés', path: '/hospedagem/chales' },
  { label: 'Reservas', path: '/hospedagem/reservas' },
  { label: 'Preços', path: '/hospedagem/precos' },
];

const normalizePath = (pathname) => pathname?.replace(/^\/admin(?=\/hospedagem)/, '') || '';

const HostingSidebarMenu = ({ isOpen, onClose }) => {
  const location = useLocation();
  const currentPath = useMemo(() => normalizePath(location?.pathname), [location?.pathname]);
  const [isExpanded, setIsExpanded] = useState(() => currentPath.startsWith('/hospedagem'));

  const isParentActive = currentPath.startsWith('/hospedagem');
  const getItemActive = (path) => currentPath === path;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-[1005] transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 h-screen w-72 z-[1010] pt-16 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full bg-card border-r border-border shadow-soft-md overflow-y-auto">
          <div className="p-4">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`w-full flex items-center justify-between px-4 py-4 text-left transition-smooth rounded-lg ${
            isParentActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
          }`}
        >
          <span className="flex items-center gap-2 font-heading font-semibold">
            <Icon name={isExpanded ? 'FolderOpen' : 'Folder'} size={18} />
            Hospedagem
          </span>
          <Icon
            name="ChevronDown"
            size={18}
            className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
          />
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="py-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`block mx-2 mb-1 pl-4 pr-3 py-2 rounded-md border-l-2 text-sm font-body transition-smooth ${
                  getItemActive(item.path)
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default HostingSidebarMenu;
