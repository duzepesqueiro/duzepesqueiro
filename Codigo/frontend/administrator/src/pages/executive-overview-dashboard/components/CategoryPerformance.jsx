import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Icon from '../../../components/AppIcon';

const CategoryPerformance = ({ categories, className = '' }) => {
  const stableHash = (value) => {
    const str = String(value ?? '');
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const hexToRgb = (hex) => {
    const cleaned = String(hex || '').replace('#', '').trim();
    if (cleaned.length !== 6) return null;
    const r = Number.parseInt(cleaned.slice(0, 2), 16);
    const g = Number.parseInt(cleaned.slice(2, 4), 16);
    const b = Number.parseInt(cleaned.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  };

  const rgbToHsl = ({ r, g, b }) => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      if (max === rn) h = ((gn - bn) / delta) % 6;
      else if (max === gn) h = (bn - rn) / delta + 2;
      else h = (rn - gn) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }

    return { h, s: s * 100, l: l * 100 };
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const palette = [
    '#044C75',
    '#D14343',
    '#2E7D32',
    '#FEC925',
    '#F59E0B',
    '#7C3AED',
    '#06B6D4',
    '#EC4899',
    '#8B5E34',
    '#64748B',
  ];

  const getPaletteColor = (slot, variantIndex) => {
    const baseHex = palette[slot % palette.length];
    if (!variantIndex) return baseHex;

    const rgb = hexToRgb(baseHex);
    if (!rgb) return baseHex;

    const hsl = rgbToHsl(rgb);
    const hueShift = (variantIndex * 34) % 360;
    const lightnessShift = (variantIndex % 2 === 0 ? -10 : 10) * Math.ceil(variantIndex / 2);

    const h = (hsl.h + hueShift) % 360;
    const s = clamp(hsl.s, 55, 78);
    const l = clamp(hsl.l + lightnessShift, 34, 64);
    return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
  };

  const categoriesWithColors = (() => {
    if (!Array.isArray(categories)) return [];
    const used = new Set();
    return categories.map((category) => {
      const name = category?.name ?? '';
      const seed = stableHash(name);
      const paletteLen = palette.length;

      let slot = seed % paletteLen;
      let probe = 0;
      while (probe < paletteLen && used.has(`0:${slot}`)) {
        slot = (slot + 1) % paletteLen;
        probe += 1;
      }

      let variantIndex = 0;
      if (probe >= paletteLen) {
        variantIndex = Math.floor(used.size / paletteLen) + 1;
        slot = seed % paletteLen;
        probe = 0;
        while (probe < paletteLen && used.has(`${variantIndex}:${slot}`)) {
          slot = (slot + 1) % paletteLen;
          probe += 1;
        }
      }

      used.add(`${variantIndex}:${slot}`);
      return {
        ...category,
        fill: getPaletteColor(slot, variantIndex),
      };
    });
  })();

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload?.length) {
      const data = payload?.[0]?.payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-soft-lg">
          <p className="font-body font-medium text-foreground">{data?.name}</p>
          <div className="flex items-center space-x-2 mt-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data?.fill }}
            />
            <span className="text-sm text-muted-foreground">Quantidade:</span>
            <span className="text-sm font-medium text-foreground">{data?.value?.toLocaleString()}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {data?.percentage}% do Total de Vendas
          </div>
        </div>
      );
    }
    return null;
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      'Fishing Equipment': 'Fish',
      'Boat Rentals': 'Anchor',
      'Bait & Tackle': 'Zap',
      'Licenses & Permits': 'FileText',
      'Food & Beverages': 'Coffee',
      'Accessories': 'Package',
      // Portuguese mappings
      'Equipamentos de Pesca': 'Fish',
      'Iscas e Anzóis': 'Zap',
      'Acessórios': 'Package',
      'Equipamentos para Aluguel': 'Anchor',
      'Equipamentos para venda': 'Fish'
    };
    return iconMap?.[category] || 'Circle';
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-success';
    if (change < 0) return 'text-error';
    return 'text-muted-foreground';
  };

  const getChangeIcon = (change) => {
    if (change > 0) return 'TrendingUp';
    if (change < 0) return 'TrendingDown';
    return 'Minus';
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">Desempenho das Categorias</h3>
          <p className="text-sm text-muted-foreground">Distribuição da Receita por Categoria de Produto</p>
        </div>
        <div className="flex items-center space-x-2">
          <Icon name="PieChart" size={20} className="text-muted-foreground" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoriesWithColors}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                stroke="var(--color-card)"
                strokeWidth={2}
              >
                {categoriesWithColors?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry?.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend & Details */}
        <div className="space-y-3">
          {categoriesWithColors?.map((category, index) => {
            const changeInfo = getChangeColor(category?.change);
            const changeIconName = getChangeIcon(category?.change);
            
            return (
              <div key={category?.name} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-smooth">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category?.fill }}
                  />
                  <Icon 
                    name={getCategoryIcon(category?.name)} 
                    size={18} 
                    className="text-muted-foreground" 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-body font-medium text-foreground text-sm truncate">
                    {category?.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {category?.percentage}% do Total
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-body font-semibold text-foreground text-sm">
                    {category?.value?.toLocaleString()}
                  </div>
                  <div className={`flex items-center space-x-1 text-xs ${changeInfo}`}>
                    <Icon name={changeIconName} size={12} />
                    <span>{Math.abs(category?.change)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Melhor Desempenho:</span>
            <span className="font-medium text-success">
              {categories?.length
                ? categories.reduce((best, cat) => (cat?.change > best?.change ? cat : best), categories[0])?.name
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Categorias Totais:</span>
            <span className="font-medium text-foreground">{categories?.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryPerformance;
