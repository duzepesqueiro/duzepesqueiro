// Centraliza lógica de notificações por tela
// Cada função retorna uma lista de alerts no formato esperado por AlertNotificationCenter

import { getReorderSuggestions, getInventoryItems } from './inventoryService';
import { listAdminSales } from './salesManagementService';
import { getAllEvents } from './eventService';
import { getRentalHistory } from './rentalService';

// Helper para criar objeto de alerta consistente
function buildAlert({ id, type, title, message, category, timestamp, isRead = false }) {
  return {
    id,
    type, // 'error' | 'warning' | 'success' | 'info'
    title,
    message,
    timestamp: timestamp || new Date(),
    isRead,
    category, // 'inventory' | 'sales' | 'rental' | 'events' | 'operations'
  };
}

// --- Funções de Persistência de Leitura (Backend) ---

export async function getReadAlertIds() {
  try {
    const raw = localStorage.getItem('admin_read_alert_ids');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export async function markAlertsAsRead(alertIds) {
  try {
    if (!Array.isArray(alertIds) || alertIds.length === 0) return;
    const current = await getReadAlertIds();
    const merged = Array.from(new Set([...current, ...alertIds]));
    localStorage.setItem('admin_read_alert_ids', JSON.stringify(merged));
  } catch (error) {
    return;
  }
}

// Sincroniza os alertas gerados com o status de lido do backend
export async function syncAlertsWithReadStatus(alerts) {
  if (!alerts || alerts.length === 0) return [];
  const readIds = await getReadAlertIds();
  
  // Filtra as notificações para remover as que já foram lidas
  // O requisito é que notificações lidas não apareçam mais ao recarregar
  return alerts.filter(alert => !readIds.includes(alert.id));
}

// INVENTÁRIO: alertas de estoque baixo
export async function getInventoryAlerts() {
  try {
    // Tenta usar sugestões de reposição se disponíveis, senão cai para itens de estoque
    let items = [];
    try {
      const res = await getReorderSuggestions();
      const data = res?.data || res || [];
      items = Array.isArray(data) ? data : (data?.suggestions || []);
    } catch (_) {}

    if (!items || items.length === 0) {
      try {
        const resInv = await getInventoryItems();
        const dataInv = resInv?.data || resInv || [];
        items = Array.isArray(dataInv) ? dataInv : (dataInv?.items || []);
      } catch (_) {}
    }

    const alerts = [];
    const now = new Date();
    (items || []).forEach((item, idx) => {
      const qty = item?.quantity ?? item?.stock ?? item?.available ?? 0;
      const min = item?.minStock ?? item?.minimo ?? 10;
      if (qty <= min) {
        alerts.push(
          buildAlert({
            id: `inv-low-${item?.id || idx}`,
            type: qty === 0 ? 'error' : 'warning',
            title: qty === 0 ? 'Produto esgotado' : 'Estoque baixo',
            message: `${item?.name || item?.produto || 'Item'} com ${qty} unidades (mínimo: ${min}).`,
            category: 'inventory',
            timestamp: now,
          })
        );
      }
    });

    // Fallback caso não tenha dados
    return syncAlertsWithReadStatus(alerts);
  } catch (err) {
    return [];
  }
}

// VENDAS: alertas de vendas confirmadas e canceladas
export async function getSalesAlerts() {
  try {
    const res = await listAdminSales();
    const sales = res?.data || res || [];
    const list = Array.isArray(sales) ? sales : (sales?.content || sales?.sales || []);

    const alerts = [];
    const now = new Date();
    (list || []).forEach((sale, idx) => {
      const status = (sale?.status || sale?.situacao || '').toString().toUpperCase();
      const idBase = sale?.id || sale?.codigo || idx;
      if (status.includes('CONFIRM')) {
        alerts.push(
          buildAlert({
            id: `sale-confirm-${idBase}`,
            type: 'success',
            title: 'Venda confirmada',
            message: `Pedido #${idBase} confirmado. Valor: R$ ${Number(sale?.valorTotal || sale?.total || 0).toFixed(2)}.`,
            category: 'sales',
            timestamp: now,
          })
        );
      }
      if (status.includes('CANCEL')) {
        alerts.push(
          buildAlert({
            id: `sale-cancel-${idBase}`,
            type: 'error',
            title: 'Venda cancelada',
            message: `Pedido #${idBase} foi cancelado pelo usuário ou sistema.`,
            category: 'sales',
            timestamp: now,
          })
        );
      }
    });

    return syncAlertsWithReadStatus(alerts);
  } catch (err) {
    return [];
  }
}

// ALUGUÉIS: novos alugueis e alugueis atrasados
export async function getRentalAlerts() {
  try {
    const list = await getRentalHistory();
    const alerts = [];
    const now = new Date();
    (list || []).forEach((rental, idx) => {
      const idBase = rental?.id || rental?.codigo || idx;
      const start = rental?.startTime ? new Date(rental?.startTime.replace(' ', 'T')) : null;
      const end = rental?.endTime ? new Date(rental?.endTime.replace(' ', 'T')) : null;
      const returned = rental?.status === 'returned';
      const createdRecently = start ? (now - start) < (24 * 60 * 60 * 1000) : false;

      if (createdRecently) {
        alerts.push(
          buildAlert({
            id: `rental-new-${idBase}`,
            type: 'success',
            title: 'Novo aluguel registrado',
            message: `Aluguel #${idBase} iniciado ${start ? start.toLocaleString() : 'recentemente'}.`,
            category: 'rental',
            timestamp: now,
          })
        );
      }

      if (end && now > end && !returned) {
        const diffMs = now - end;
        const hoursLate = Math.floor(diffMs / (1000 * 60 * 60));
        alerts.push(
          buildAlert({
            id: `rental-overdue-${idBase}`,
            type: 'warning',
            title: 'Aluguel atrasado',
            message: `Aluguel #${idBase} vencido há ${hoursLate}h. Contatar cliente para devolução.`,
            category: 'rental',
            timestamp: now,
          })
        );
      }
    });

    return syncAlertsWithReadStatus(alerts);
  } catch (err) {
    return [];
  }
}

// EVENTOS: em breve (<=7 dias) e agendados (futuros)
export async function getEventAlerts() {
  try {
    const data = await getAllEvents({ page: 1, limit: 100 });
    const list = Array.isArray(data) ? data : (data?.items || data?.events || data?.content || data?.data || []);
    const alerts = [];
    const now = new Date();
    const soonThresholdMs = 7 * 24 * 60 * 60 * 1000; // 7 dias

    (list || []).forEach((ev, idx) => {
      const idBase = ev?.id || ev?.codigo || idx;
      const date = ev?.eventDate || ev?.date || ev?.data || ev?.startDate;
      const dt = date ? new Date(date) : null;
      if (!dt) return;

      const diff = dt - now;
      if (diff > 0 && diff <= soonThresholdMs) {
        alerts.push(
          buildAlert({
            id: `event-soon-${idBase}`,
            type: 'warning',
            title: 'Evento em breve',
            message: `${ev?.title || ev?.name || ev?.titulo || 'Evento'} ocorre em ${Math.ceil(diff / (1000 * 60 * 60 * 24))} dias.`,
            category: 'events',
            timestamp: now,
          })
        );
      } else if (diff > 0) {
        alerts.push(
          buildAlert({
            id: `event-scheduled-${idBase}`,
            type: 'info',
            title: 'Evento agendado',
            message: `${ev?.title || ev?.name || ev?.titulo || 'Evento'} agendado para ${dt.toLocaleDateString()}.`,
            category: 'events',
            timestamp: now,
          })
        );
      }
    });

    return syncAlertsWithReadStatus(alerts);
  } catch (err) {
    return [];
  }
}

// Util que retorna alertas conforme a "tela"
export async function getPageAlerts(page) {
  const key = (page || '').toLowerCase();
  let alerts = [];
  
  switch (key) {
    case 'inventory':
    case 'estoque':
      alerts = await getInventoryAlerts();
      break;
    case 'sales':
    case 'vendas':
      alerts = await getSalesAlerts();
      break;
    case 'rental':
    case 'aluguel':
      alerts = await getRentalAlerts();
      break;
    case 'events':
    case 'eventos':
      alerts = await getEventAlerts();
      break;
    default:
      alerts = [];
  }

  // Alerts are already synced in individual functions
  return alerts;
}
