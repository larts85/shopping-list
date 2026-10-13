import type { Unit } from "./units";

export interface Product {
  id: string;
  name: string;
  id_category: string;
  checked: boolean;
  unit?: Unit;
  availableUnits?: Unit[];
}

export interface ProductChecked {
  idProduct: string;
  checked: boolean;
  unit?: Unit;
}

export interface AddProduct {
  name: string;
  idCategory: string;
  unit?: Unit;
  availableUnits?: Unit[];
}

export interface Category {
  id: string;
  name: string;
}

export interface EditCategoryParams {
  idCategory: string;
  newNameCategory: string;
}

export interface IList {
  id: string;
  id_product: string | null;
  name: string;
  id_category: string;
  cantidad: string;
  medida: string;
  precio: string;
  precioTotal: string;
  precioKg: string;
  kgTotal: string;
  comprado: string;
  unit?: Unit;
  productUnit?: Unit;
  availableUnits?: Unit[];
  isProvisional?: boolean;
  createdBy?: string | null;
  catalogRequestEmail?: string | null;
  catalogRequestStatus?: "pending" | "approved" | "rejected" | null;
}
