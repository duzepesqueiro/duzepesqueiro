import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Button from '../../../components/ui/Button';

const UsersNewUsersChart = ({ className = '', users = [] }) => {
  const [timeframe, setTimeframe] = useState('month'); // 'week' | 'month' | 'year'

  const parseDate = (d) => {
    if (!d) return null;
    if (d instanceof Date && !isNaN(d.getTime())) return d;
    
    // Handle timestamp numbers
    if (typeof d === 'number') {
      // Heuristic: seconds vs milliseconds (1e10 seconds is year 2286)
      if (d < 10000000000) return new Date(d * 1000);
      return new Date(d);
    }

    // Handle strings
    if (typeof d === 'string') {
      // Check for numeric string
      if (/^\d+$/.test(d)) {
         const num = Number(d);
         if (num < 10000000000) return new Date(num * 1000);
         return new Date(num);
      }
      // Standard formats
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) return dt;
      // Replace space with T for partial ISO support
      if (d.includes(' ')) {
         const dt2 = new Date(d.replace(' ', 'T'));
         if (!isNaN(dt2.getTime())) return dt2;
      }
    }

    // Handle array format [seconds, nanos] or [yyyy, mm, dd...]
    if (Array.isArray(d)) {
       // Instant [seconds, nanos]
       if (d.length === 2 && typeof d[0] === 'number') {
          return new Date(d[0] * 1000 + (d[1] / 1000000));
       }
       // Date array [yyyy, mm, dd, hh, mm, ss]
       if (d.length >= 3) {
          return new Date(d[0], d[1] - 1, d[2], d[3]||0, d[4]||0, d[5]||0);
       }
    }

    return null;
  };

  const data = useMemo(() => {
    const now = new Date();
    const userDates = users
      .map((u) => parseDate(u?.createdAt))
      .filter((d) => d && !isNaN(d.getTime()));

    const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    if (timeframe === 'week') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay(); // 0=Dom .. 6=Sab
      const diffToMonday = (day + 6) % 7; // segunda como início
      startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

      const buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return { date: d, label: weekdayLabels[d.getDay()], count: 0 };
      });

      userDates.forEach((ud) => {
        buckets.forEach((b) => {
          if (
            ud.getFullYear() === b.date.getFullYear() &&
            ud.getMonth() === b.date.getMonth() &&
            ud.getDate() === b.date.getDate()
          ) {
            b.count += 1;
          }
        });
      });

      const total = buckets.reduce((s, b) => s + b.count, 0);
      const avg = buckets.length ? Math.round(total / buckets.length) : 0;
      return buckets.map((b) => ({ period: b.label, newUsers: b.count, avg }));
    }

    if (timeframe === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const daysInMonth = Math.round((nextMonth - monthStart) / (1000 * 60 * 60 * 24));
      const weeksCount = Math.ceil(daysInMonth / 7);
      const buckets = Array.from({ length: weeksCount }, (_, i) => ({ label: `Sem ${i + 1}`, count: 0 }));

      userDates.forEach((ud) => {
        if (ud >= monthStart && ud < nextMonth) {
          const dayIndex = ud.getDate() - 1;
          const weekIdx = Math.floor(dayIndex / 7);
          const idx = Math.min(weekIdx, buckets.length - 1);
          buckets[idx].count += 1;
        }
      });

      const total = buckets.reduce((s, b) => s + b.count, 0);
      const avg = buckets.length ? Math.round(total / buckets.length) : 0;
      return buckets.map((b) => ({ period: b.label, newUsers: b.count, avg }));
    }

    // timeframe === 'year'
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const nextYear = new Date(now.getFullYear() + 1, 0, 1);
    const buckets = Array.from({ length: 12 }, (_, m) => ({ label: monthLabels[m], month: m, count: 0 }));

    userDates.forEach((ud) => {
      if (ud >= yearStart && ud < nextYear) {
        const m = ud.getMonth();
        buckets[m].count += 1;
      }
    });

    const total = buckets.reduce((s, b) => s + b.count, 0);
    const avg = buckets.length ? Math.round(total / buckets.length) : 0;
    return buckets.map((b) => ({ period: b.label, newUsers: b.count, avg }));
  }, [timeframe, users]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload?.length) {
      const barEntry = payload?.find((p) => p?.dataKey === 'newUsers');
      const lineEntry = payload?.find((p) => p?.dataKey === 'avg');
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-soft-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {barEntry && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: barEntry?.color }} />
              <span className="text-muted-foreground">Novos Usuários:</span>
              <span className="font-semibold text-foreground">{barEntry?.value}</span>
            </div>
          )}
          {lineEntry && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: lineEntry?.color }} />
              <span className="text-muted-foreground">Média:</span>
              <span className="font-semibold text-foreground">{lineEntry?.value}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const totalNewUsers = useMemo(() => data?.reduce((sum, d) => sum + (d?.newUsers ?? 0), 0), [data]);
  const averagePerPeriod = useMemo(() => (data?.length ? Math.round(totalNewUsers / data?.length) : 0), [data, totalNewUsers]);

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Novos Usuários Cadastrados</h3>
          <p className="text-sm text-muted-foreground">Evolução com filtro de período</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            {[
              { key: 'week', label: 'Semana' },
              { key: 'month', label: 'Mês' },
              { key: 'year', label: 'Ano' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setTimeframe(opt.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-smooth ${
                  timeframe === opt.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" iconName="RefreshCw" onClick={() => setTimeframe(timeframe)}>
            Atualizar
          </Button>
        </div>
      </div>

      <div className="h-64 md:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="period" stroke="var(--color-muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />

            <Bar dataKey="newUsers" fill="var(--color-primary)" name="Novos Usuários" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="avg" stroke="var(--color-accent)" strokeWidth={3} dot={{ r: 3 }} name="Média" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{totalNewUsers}</div>
          <div className="text-sm text-muted-foreground">Total no período</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{averagePerPeriod}</div>
          <div className="text-sm text-muted-foreground">Média por ponto</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-success">+{Math.max(0, Math.round((totalNewUsers / (data?.length || 1)) * 0.15))}%</div>
          <div className="text-sm text-muted-foreground">Tendência estimada</div>
        </div>
      </div>
    </div>
  );
};

export default UsersNewUsersChart;