import { markNotificationsAsRead } from './notificationsBackendService';

function isUuidV4(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ''),
  );
}

export async function getReadAlertIds() {
  // Fase 3: leitura não usa mais localStorage; status vem do backend notifications.
  return [];
}

export async function markAlertsAsRead(alertIds) {
  if (!Array.isArray(alertIds) || alertIds.length === 0) return;
  const validIds = alertIds.filter(isUuidV4);
  if (validIds.length === 0) return;
  try {
    await markNotificationsAsRead(validIds);
  } catch (_) {
    return;
  }
}

export async function syncAlertsWithReadStatus() {
  // Fase 3: fontes locais desativadas.
  return [];
}

export async function getInventoryAlerts() {
  return [];
}

export async function getSalesAlerts() {
  return [];
}

export async function getRentalAlerts() {
  return [];
}

export async function getEventAlerts() {
  return [];
}

export async function getPageAlerts() {
  return [];
}
