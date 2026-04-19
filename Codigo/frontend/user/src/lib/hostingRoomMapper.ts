import type { Room } from '@/types/booking';

type ApiRoomLike = {
  id: string;
  name: string;
  description?: string;
  unitType?: string;
  maxGuests?: number;
  amenities?: string[];
  images?: Array<{ imageUrl?: string }> | string[];
  petFriendly?: boolean;
  rooms?: string[];
  notes?: string;
  unavailableDates?: string[];
  [key: string]: unknown;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const resolveEffectiveRoomPrice = (item: Record<string, unknown>): number => {
  const effectiveCandidates = [
    item.currentPrice,
    item.adjustedPrice,
    item.priceWithRule,
    item.priceRuleApplied,
    item.precoAtual,
    item.precoComRegra,
    item.dailyRate,
    item.pricePerNight,
  ];
  for (const candidate of effectiveCandidates) {
    const parsed = toNumberOrNull(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  const baseCandidates = [
    item.basePrice,
    item.precoBase,
    item.originalPrice,
    item.precoOriginal,
  ];
  for (const candidate of baseCandidates) {
    const parsed = toNumberOrNull(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return 0;
};

const mapUnitTypeToRoomType = (value?: string): Room['type'] => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'standard') return 'standard';
  if (normalized === 'deluxe') return 'deluxe';
  if (normalized === 'suite') return 'suite';
  if (normalized === 'cabin' || normalized === 'chale' || normalized === 'chalé') return 'cabin';
  return 'standard';
};

export const mapApiChaletToRoom = (item: ApiRoomLike): Room => ({
  id: item.id,
  name: item.name,
  type: mapUnitTypeToRoomType(item.unitType),
  description: item.description || 'Acomodações preparadas para sua estadia.',
  capacity: Number(item.maxGuests || 2),
  pricePerNight: resolveEffectiveRoomPrice(item),
  amenities: item.amenities && item.amenities.length ? item.amenities : ['Wi-Fi', 'Ar condicionado'],
  petFriendly: Boolean(item.petFriendly),
  images:
    Array.isArray(item.images) && item.images.length
      ? item.images
          .map((img) => (typeof img === 'string' ? img : img?.imageUrl))
          .filter((url): url is string => Boolean(url))
      : [],
  beds: item.rooms && item.rooms.length ? item.rooms.join(', ') : '1 cama queen',
  bathroom: 'Banheiro privativo',
  extras: [],
  rules: item.notes ? [item.notes] : [],
  unavailableDates: item.unavailableDates || [],
});
