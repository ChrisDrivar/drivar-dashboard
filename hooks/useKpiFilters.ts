'use client';

import { useMemo, useState } from 'react';

export type KpiFilters = {
  country: string;
  region: string;
  city: string;
  vehicleType: string;
  manufacturer: string;
  radius: string;
};

const DEFAULT_FILTERS: KpiFilters = {
  country: '',
  region: '',
  city: '',
  vehicleType: '',
  manufacturer: '',
  radius: '',
};

export function useKpiFilters(initial?: Partial<KpiFilters>) {
  const [filters, setFilters] = useState<KpiFilters>({
    ...DEFAULT_FILTERS,
    ...initial,
  });

  const updateFilter = (key: keyof KpiFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const filterParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (filters.country) params.country = filters.country;
    if (filters.region) params.region = filters.region;
    if (filters.city) params.city = filters.city;
    if (filters.vehicleType) params.vehicleType = filters.vehicleType;
    if (filters.manufacturer) params.manufacturer = filters.manufacturer;
    if (filters.radius) params.radius = filters.radius;
    return params;
  }, [filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    filterParams,
  };
}
