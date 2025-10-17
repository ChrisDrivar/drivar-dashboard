export type InventoryEntry = {
  land: string;
  region: string;
  vermieterId?: string;
  vermieterName: string;
  sheetRowIndex?: number;
  postalCode?: string;
  street?: string;
  fahrzeugId?: string;
  fahrzeugLabel: string;
  fahrzeugtyp: string;
  stadt: string;
  manufacturer?: string;
  listedAt: Date | string | null;
  offboardedAt: Date | string | null;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerDomain?: string;
  ownerAddress?: string;
  ownerInternationalCustomers?: string;
  ownerCommission?: string;
  ownerRanking?: string;
  ownerExperienceYears?: string;
  ownerNotes?: string;
  ownerLastChange?: string;
  ownerRegion?: string;
  ownerCity?: string;
  ownerPostalCode?: string;
  ownerStreet?: string;
  ownerSheetRowIndex?: number;
};

export type InquiryEntry = {
  fahrzeugId: string;
  fahrzeugtyp: string;
  stadt: string;
  anfragen: number;
  mieten: number;
  createdAt: Date | null;
};

export type OnboardingRow = {
  fahrzeugId?: string;
  fahrzeugLabel: string;
  vermieterName: string;
  land: string;
  stadt: string;
  fahrzeugtyp: string;
  manufacturer?: string;
  ageDays: number | null;
  listedAt: string | null;
};

export type OwnerContact = {
  vermieterId?: string;
  vermieterName: string;
  land: string;
  region?: string;
  stadt?: string;
  telefon?: string;
  email?: string;
  domain?: string;
  adresse?: string;
  plz?: string;
  strasse?: string;
  partnerSince?: string;
  status?: string;
  internationaleKunden?: string;
  provision?: string;
  ranking?: string;
  erfahrungJahre?: string;
  notizen?: string;
  letzteAenderung?: string;
  sheetRowIndex?: number;
};

export type MissingInventoryEntry = {
  land: string;
  region: string;
  stadt: string;
  fahrzeugtyp: string;
  anzahl: number;
  prio?: string;
  kommentar?: string;
};

export type ListingRequestEntry = {
  datum?: string;
  kanal: string;
  region: string;
  fahrzeugtyp: string;
  anfragen: number;
  inserate: number;
};

export type PendingLeadEntry = {
  datum?: string;
  kanal?: string;
  region?: string;
  vermieterName: string;
  fahrzeugLabel?: string;
  manufacturer?: string;
  fahrzeugtyp?: string;
  stadt?: string;
  land?: string;
  kommentar?: string;
  street?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  internationalCustomers?: string;
  commission?: string;
  ranking?: string;
  experienceYears?: string;
  ownerNotes?: string;
  status: string;
  statusUpdatedAt?: string;
  sheetRowIndex: number;
};

export type GeoLocationPoint = {
  latitude: number;
  longitude: number;
  stadt: string;
  land: string;
  vehicles: number;
  ownerCount: number;
};

export type KpiPayload = {
  totals: {
    vehicles: number;
    owners: number;
    inquiries: number;
    rentals: number;
  };
  byCountry: {
    vehicles: Record<string, number>;
    owners: Record<string, number>;
    averageVehiclesPerOwner: Array<{ land: string; average: number }>;
    vehiclesByRegion: Record<string, Record<string, number>>;
  };
  deltas: {
    vehicles: number;
    owners: number;
  };
  onboarding: OnboardingRow[];
  inquiries: {
    byVehicleType: Record<string, { anfragen: number; mieten: number }>;
  };
  inventory: InventoryEntry[];
  geo: {
    locations: GeoLocationPoint[];
  };
  missingInventory: MissingInventoryEntry[];
  pendingLeads: PendingLeadEntry[];
  meta: {
    availableCountries: string[];
    availableRegions: string[];
    availableCities: string[];
    availableVehicleTypes: string[];
    availableManufacturers: string[];
    totalInventoryRows: number;
    filteredInventoryRows: number;
  };
};
