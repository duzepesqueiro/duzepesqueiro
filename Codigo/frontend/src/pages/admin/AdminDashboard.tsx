import { motion } from 'framer-motion';
import { useAdmin } from '@/contexts/AdminContext';
import { BedDouble, Users, CalendarX, DollarSign, TrendingUp, Ban } from 'lucide-react';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const statusColors: Record<string, string> = {
  free: 'hsl(160, 30%, 28%)',
  occupied: 'hsl(38, 80%, 55%)',
  reserved: 'hsl(217, 91%, 60%)',
  blocked: 'hsl(0, 72%, 51%)',
};

const statusLabels: Record<string, string> = {
  free: 'Livre',
  occupied: 'Ocupado',
  reserved: 'Reservado',
  blocked: 'Bloqueado',
};

const AdminDashboard = () => {
  const { rooms, reservations, getRoomStatus } = useAdmin();

  const metrics = useMemo(() => {
    const statuses = rooms.map(r => getRoomStatus(r.id));
    const occupied = statuses.filter(s => s === 'occupied').length;
    const reserved = statuses.filter(s => s === 'reserved').length;
    const blocked = statuses.filter(s => s === 'blocked').length;
    const free = statuses.filter(s => s === 'free').length;
    const activeRes = reservations.filter(r => r.status !== 'cancelled');
    const cancelledRes = reservations.filter(r => r.status === 'cancelled');
    const totalRevenue = activeRes.reduce((sum, r) => sum + r.totalPrice, 0);

    return {
      totalRooms: rooms.length,
      occupied,
      reserved,
      blocked,
      free,
      occupancyRate: rooms.length ? Math.round(((occupied + reserved) / rooms.length) * 100) : 0,
      totalRevenue,
      avgDailyRate: activeRes.length ? Math.round(totalRevenue / activeRes.length) : 0,
      activeReservations: activeRes.length,
      cancelledReservations: cancelledRes.length,
    };
  }, [rooms, reservations, getRoomStatus]);

  const pieData = [
    { name: 'Livre', value: metrics.free, color: statusColors.free },
    { name: 'Ocupado', value: metrics.occupied, color: statusColors.occupied },
    { name: 'Reservado', value: metrics.reserved, color: statusColors.reserved },
    { name: 'Bloqueado', value: metrics.blocked, color: statusColors.blocked },
  ].filter(d => d.value > 0);

  const revenueByRoom = rooms.map(room => {
    const roomRevenue = reservations
      .filter(r => r.bookingData.roomId === room.id && r.status !== 'cancelled')
      .reduce((sum, r) => sum + r.totalPrice, 0);
    return { name: room.name, revenue: roomRevenue };
  });

  const cards = [
    { icon: BedDouble, label: 'Total de Chalés', value: metrics.totalRooms, color: 'text-primary' },
    { icon: Users, label: 'Ocupados', value: metrics.occupied, color: 'text-accent' },
    { icon: TrendingUp, label: 'Taxa de Ocupação', value: `${metrics.occupancyRate}%`, color: 'text-primary' },
    { icon: DollarSign, label: 'Receita Total', value: `R$ ${metrics.totalRevenue.toLocaleString('pt-BR')}`, color: 'text-accent' },
    { icon: CalendarX, label: 'Reservas Ativas', value: metrics.activeReservations, color: 'text-primary' },
    { icon: Ban, label: 'Canceladas', value: metrics.cancelledReservations, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard Executivo</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do estabelecimento</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-4 border border-border"
          >
            <card.icon className={`h-5 w-5 ${card.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl p-6 border border-border"
        >
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Ocupação Geral</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 justify-center">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl p-6 border border-border"
        >
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Receita por Chalé</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByRoom}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 20%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
                <Bar dataKey="revenue" fill="hsl(160, 30%, 28%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Visual occupancy grid RF-16 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-card rounded-xl p-6 border border-border"
      >
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Mapa de Ocupação</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rooms.map(room => {
            const status = getRoomStatus(room.id);
            const bgMap: Record<string, string> = {
              free: 'bg-primary/10 border-primary/30',
              occupied: 'bg-accent/10 border-accent/30',
              reserved: 'bg-ring/10 border-ring/30',
              blocked: 'bg-destructive/10 border-destructive/30',
            };
            const dotMap: Record<string, string> = {
              free: 'bg-primary',
              occupied: 'bg-accent',
              reserved: 'bg-ring',
              blocked: 'bg-destructive',
            };
            return (
              <div key={room.id} className={`rounded-lg border-2 p-4 ${bgMap[status]}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-foreground">{room.name}</span>
                  <div className={`w-3 h-3 rounded-full ${dotMap[status]}`} />
                </div>
                <p className="text-xs text-muted-foreground">Capacidade: {room.capacity}</p>
                <p className="text-xs font-medium mt-1" style={{ color: statusColors[status] }}>
                  {statusLabels[status]}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
