export type ShipmentStatus = "terkirim" | "tertunda" | "gagal";

export interface Shipment {
  id: string;
  noSuratJalan: string;
  perusahaan: string;
  tujuan: string;
  supir: string;
  tanggalKirim: string;
  tanggalTiba: string | null;
  waktuTiba: string | null;
  status: ShipmentStatus;
  kendala: string | null;
  updatedBy?: string | null;
  qty: number;
  trackingUrl?: string | null;
}

export interface Driver {
  id: string;
  name: string;
}

export interface FilterOptions {
  dateRange: [Date | null, Date | null];
  status: ShipmentStatus | "all";
  driver: string | "all";
  company?: string | "all";
  searchQuery?: string;
}

export interface ConstraintItem {
  name: string;
  count: number;
}

export interface SupabaseShipment {
  id: string;
  no_surat_jalan: string;
  perusahaan: string;
  tujuan: string;
  supir: string;
  tanggal_kirim: string;
  tanggal_tiba: string | null;
  waktu_tiba: string | null;
  status: ShipmentStatus;
  kendala: string | null;
  qty: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  tracking_url: string | null;
}

export interface UserProfile {
  id: string;
  role: 'admin' | 'user';
  name: string | null;
  created_at: string;
}

export interface StatusHistoryItem {
  id: string;
  shipment_id: string;
  previous_status: ShipmentStatus;
  new_status: ShipmentStatus;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

// Note interface for the forum feature
export interface Note {
  id: string;
  content: string;
  author_name: string;
  user_id?: string | null;
  created_at: string;
  image_url?: string | null;
}

// Analytics interfaces
export interface CompanyShipmentSummary {
  company: string;
  total: number;
  delivered: number;
  pending: number;
  failed: number;
}

export interface DelayAnalytics {
  company: string;
  averageDelay: number; // in days
  totalShipments: number;
}

export interface CommonConstraint {
  issue: string;
  count: number;
}

// Dashboard navigation
export type DashboardView = "dashboard" | "shipments" | "notes";
