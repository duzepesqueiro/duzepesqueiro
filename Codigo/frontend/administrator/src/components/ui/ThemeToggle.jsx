import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Icon from '../AppIcon';
import Button from './Button';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`relative overflow-hidden transition-all duration-300 ${className}`}
      aria-label={`Alternar para modo ${isDark ? 'claro' : 'escuro'}`}
      title={`Alternar para modo ${isDark ? 'claro' : 'escuro'}`}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Sun Icon */}
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isDark 
              ? 'opacity-0 rotate-90 scale-0' :'opacity-100 rotate-0 scale-100'
          }`}
        >
          <Icon 
            name="Sun" 
            size={18} 
            className="text-amber-500 dark:text-amber-400" 
          />
        </div>
        
        {/* Moon Icon */}
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isDark 
              ? 'opacity-100 rotate-0 scale-100' :'opacity-0 -rotate-90 scale-0'
          }`}
        >
          <Icon 
            name="Moon" 
            size={18} 
            className="text-blue-600 dark:text-blue-400" 
          />
        </div>
      </div>
    </Button>
  );
};

export default ThemeToggle;