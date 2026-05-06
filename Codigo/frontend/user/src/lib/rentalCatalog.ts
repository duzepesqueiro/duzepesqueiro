import { api } from "@/lib/api";

export type RentalCatalogItem = {
  id: string | number;
  name: string;
  description: string;
  hourlyPrice: number;
  available: number;
  image: string;
  images: string[];
  fullDescription: string;
  unavailableDates: Date[];
};

const FALLBACK_IMAGE = "https://placehold.co/600x600?text=Aluguel";
const TEST_RENTAL_ITEMS: RentalCatalogItem[] = [
  {
    id: "teste-aluguel-1",
    name: "Kit de pesca completo",
    description: "Vara, molinete e acessórios básicos para teste da vitrine.",
    hourlyPrice: 35,
    available: 4,
    image: "https://placehold.co/600x600?text=Kit+Pesca",
    images: ["https://placehold.co/600x600?text=Kit+Pesca"],
    fullDescription: "Item temporário exibido quando o backend não retorna produtos para aluguel.",
    unavailableDates: [],
  },
  {
    id: "teste-aluguel-2",
    name: "Cadeira de pesca",
    description: "Cadeira dobrável para área de pesca.",
    hourlyPrice: 18,
    available: 6,
    image: "https://placehold.co/600x600?text=Cadeira",
    images: ["https://placehold.co/600x600?text=Cadeira"],
    fullDescription: "Item temporário exibido quando o backend não retorna produtos para aluguel.",
    unavailableDates: [],
  },
];

const compactImages = (value: unknown, fallback?: unknown) => {
  const list = Array.isArray(value) ? value : [];
  const images = list
    .map((item: any) => (typeof item === "string" ? item : item?.imageUrl || item?.url))
    .filter((src: unknown): src is string => typeof src === "string" && src.trim().length > 0);
  if (typeof fallback === "string" && fallback.trim() && !images.includes(fallback)) {
    images.unshift(fallback);
  }
  return images.length ? images.slice(0, 10) : [FALLBACK_IMAGE];
};

export const normalizeRentalCatalogItem = (item: any): RentalCatalogItem => {
  const images = compactImages(item?.images, item?.image);
  const name = item?.name || item?.product || "Item de aluguel";
  const description = item?.description || item?.fullDescription || "";

  return {
    id: item?.id,
    name,
    description,
    hourlyPrice: Number(item?.hourlyPrice ?? item?.sellingPrice ?? item?.salePrice ?? item?.unitCost ?? 0),
    available: Number(item?.available ?? item?.currentStock ?? item?.stock ?? item?.stockQuantity ?? 0),
    image: images[0],
    images,
    fullDescription: item?.fullDescription || description,
    unavailableDates: (item?.unavailableDates || []).map((date: string) => new Date(date)),
  };
};

const readItems = (data: any) => (Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);

const canReadAdminInventory = () => {
  if (typeof window === "undefined") return false;
  const token = window.localStorage.getItem("auth_token") || window.localStorage.getItem("auth_access_token");
  const role = (window.localStorage.getItem("auth_role") || "").trim().toUpperCase();
  return Boolean(token && ["ADMIN", "MANAGER", "EMPLOYEE"].includes(role));
};

const getAdminInventoryCatalog = async () => {
  if (!canReadAdminInventory()) return [];

  try {
    const { data } = await api.get("/admin/inventory/items");
    const items = readItems(data);
    const rentals = items.filter((item: any) => {
      const source = String(item?.source || "").toUpperCase();
      const category = String(item?.category || "").toLowerCase();
      return source === "RENTAL" || category.includes("aluguel");
    });

    return (rentals.length ? rentals : items).map(normalizeRentalCatalogItem);
  } catch (error) {
    console.warn("Falha ao carregar imagens do inventário admin para os cards de aluguel", error);
    return [];
  }
};

export const getRentalCatalog = async (): Promise<RentalCatalogItem[]> => {
  const adminItems = await getAdminInventoryCatalog();
  if (adminItems.length) {
    return adminItems;
  }

  try {
    const { data } = await api.get("/user/products/rental", { params: { limit: 100 } });
    const rentalItems = readItems(data);
    if (rentalItems.length) {
      return rentalItems.map(normalizeRentalCatalogItem);
    }
  } catch (error) {
    console.warn("Falha ao carregar itens de aluguel públicos", error);
  }

  try {
    const { data } = await api.get("/user/products/sale", { params: { limit: 100 } });
    const productItems = readItems(data);
    if (productItems.length) {
      return productItems.map(normalizeRentalCatalogItem);
    }
  } catch (error) {
    console.warn("Falha ao carregar produtos existentes para os cards de aluguel", error);
  }

  return TEST_RENTAL_ITEMS;
};
