'use client';

import { ReactNode, useCallback, useMemo, useState } from 'react';
import {
  Box,
  Center,
  Flex,
  Heading,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Button,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiltersBar } from '@/components/FiltersBar';
import { KpiCard } from '@/components/KpiCard';
import { OnboardingTable } from '@/components/OnboardingTable';
import { PartnerMap } from '@/components/PartnerMap';
import { Shell } from '@/components/Shell';
import { VehicleSearch } from '@/components/VehicleSearch';
import { AddPartnerModal } from '@/components/AddPartnerModal';
import { AddMissingInventoryModal } from '@/components/AddMissingInventoryModal';
import { MissingInventoryTable } from '@/components/MissingInventoryTable';
import { AddListingRequestModal } from '@/components/AddListingRequestModal';
import { PendingLeadsTable } from '@/components/PendingLeadsTable';
import type { LeadStatus } from '@/lib/leadStatus';
import type { PendingLeadEntry } from '@/types/kpis';
import type { KpiFilters } from '@/hooks/useKpiFilters';
import { useKpiFilters } from '@/hooks/useKpiFilters';
import { useKpis } from '@/hooks/useKpis';
import { normaliseLand } from '@/lib/geo';

const numberFormatter = new Intl.NumberFormat('de-DE');
const MAJOR_CITIES_BY_COUNTRY: Record<string, string[]> = {
  de: [
    'Berlin',
    'Hamburg',
    'München',
    'Köln',
    'Frankfurt',
    'Stuttgart',
    'Düsseldorf',
    'Leipzig',
    'Dortmund',
    'Essen',
    'Bremen',
    'Dresden',
    'Hannover',
    'Nürnberg',
    'Duisburg',
  ],
  at: ['Wien', 'Salzburg', 'Graz', 'Innsbruck', 'Linz', 'Klagenfurt', 'Bregenz', 'St. Pölten'],
  ch: ['Zürich', 'Genf', 'Basel', 'Bern', 'Lausanne', 'Luzern', 'St. Gallen', 'Lugano'],
  uk: ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Edinburgh', 'Liverpool', 'Bristol', 'Leeds'],
  us: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'San Francisco', 'Dallas', 'Houston', 'Las Vegas'],
  ae: ['Dubai', 'Abu Dhabi', 'Sharjah'],
  au: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast'],
};
const cardConfig = [
  {
    key: 'vehicles',
    label: 'Fahrzeuge gesamt',
    getValue: (payload: ReturnType<typeof useKpis>['kpis']) => payload?.totals.vehicles ?? 0,
  },
  {
    key: 'owners',
    label: 'Vermieter aktiv',
    getValue: (payload: ReturnType<typeof useKpis>['kpis']) => payload?.totals.owners ?? 0,
  },
  {
    key: 'inquiries',
    label: 'Anfragen',
    getValue: (payload: ReturnType<typeof useKpis>['kpis']) => payload?.totals.inquiries ?? 0,
  },
  {
    key: 'rentals',
    label: 'Mieten',
    getValue: (payload: ReturnType<typeof useKpis>['kpis']) => payload?.totals.rentals ?? 0,
  },
];

type SectionProps = {
  title: string;
  description?: string;
  isLoaded: boolean;
  children: ReactNode;
};

function SectionCard({ title, description, isLoaded, children }: SectionProps) {
  return (
    <Skeleton isLoaded={isLoaded} borderRadius="3xl">
      <Box
        borderRadius="3xl"
        border="1px solid"
        borderColor="whiteAlpha.200"
        bg="blackAlpha.400"
        backdropFilter="blur(6px)"
        p={6}
        minH="18rem"
      >
        <Flex align="flex-start" justify="space-between" mb={4}>
          <Box>
            <Heading size="md">{title}</Heading>
            {description && (
              <Text mt={1} fontSize="sm" color="gray.400">
                {description}
              </Text>
            )}
          </Box>
        </Flex>
        {isLoaded ? children : <Box h="12rem" />}
      </Box>
    </Skeleton>
  );
}

export default function DashboardPage() {
  const { filters, setFilters, resetFilters, filterParams } = useKpiFilters();
  const { kpis, isLoading, isError, mutate } = useKpis(filterParams);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isMissingInventoryOpen,
    onOpen: onOpenMissingInventory,
    onClose: onCloseMissingInventory,
  } = useDisclosure();
  const {
    isOpen: isLeadModalOpen,
    onOpen: onOpenLeadModal,
    onClose: onCloseLeadModal,
  } = useDisclosure();
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [leadUpdatingRow, setLeadUpdatingRow] = useState<number | null>(null);
  const toast = useToast();

  const vehiclesByCity = useMemo(() => {
    if (!kpis?.inventory) return [];
    const counts = new Map<string, number>();
    kpis.inventory.forEach((item) => {
      const rawCity = (item.stadt || '').trim();
      const city = rawCity && rawCity !== '/' ? rawCity : 'Unbekannt';
      counts.set(city, (counts.get(city) ?? 0) + 1);
    });

    const normalizedCountry = filters.country ? normaliseLand(filters.country) : undefined;
    const majorCities = normalizedCountry ? MAJOR_CITIES_BY_COUNTRY[normalizedCountry] ?? [] : [];
    const combinedCities = new Set<string>([...counts.keys(), ...majorCities]);

    const data = Array.from(combinedCities)
      .map((city) => ({
        city,
        vehicles: counts.get(city) ?? 0,
      }))
      .sort((a, b) => b.vehicles - a.vehicles || a.city.localeCompare(b.city, 'de'));

    if (!normalizedCountry) {
      return data.slice(0, 20);
    }

    return data;
  }, [kpis, filters.country]);

  const availableCountries = kpis?.meta.availableCountries ?? [];
  const availableRegions = kpis?.meta.availableRegions ?? [];
  const availableCities = kpis?.meta.availableCities ?? [];
  const availableVehicleTypes = kpis?.meta.availableVehicleTypes ?? [];
  const availableManufacturers = kpis?.meta.availableManufacturers ?? [];
  const geoLocations = kpis?.geo.locations ?? [];
  const inventoryList = kpis?.inventory ?? [];
  const missingInventoryList = kpis?.missingInventory ?? [];
  const pendingLeadsList = kpis?.pendingLeads ?? [];

  const handleFilterUpdate = useCallback(
    (nextFilters: KpiFilters) => {
      setFilters(nextFilters);
    },
    [setFilters]
  );

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setVehicleQuery('');
  }, [resetFilters]);

  const handleLeadStatusChange = useCallback(
    async (lead: PendingLeadEntry, nextStatus: LeadStatus) => {
      setLeadUpdatingRow(lead.sheetRowIndex);
      try {
        const response = await fetch('/api/listing-requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rowIndex: lead.sheetRowIndex,
            status: nextStatus,
            createPartner: nextStatus === 'Vertrag unterschrieben',
            lead: {
              date: lead.datum,
              channel: lead.kanal,
              region: lead.region,
              city: lead.stadt,
              country: lead.land,
              landlord: lead.vermieterName,
              street: lead.street,
              postalCode: lead.postalCode,
              comment: lead.kommentar,
            },
            vehicles: [
              {
                vehicleLabel: lead.fahrzeugLabel,
                manufacturer: lead.manufacturer,
                vehicleType: lead.fahrzeugtyp,
                comment: lead.kommentar,
              },
            ],
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Status konnte nicht aktualisiert werden.');
        }

        toast({
          status: 'success',
          title:
            nextStatus === 'Vertrag unterschrieben'
              ? 'Vermieter angelegt'
              : 'Status aktualisiert',
        });
        await mutate();
      } catch (error) {
        console.error('[pending-leads-status]', error);
        toast({
          status: 'error',
          title: 'Aktualisierung fehlgeschlagen',
          description: (error as Error).message,
        });
      } finally {
        setLeadUpdatingRow(null);
      }
    },
    [mutate, toast]
  );

  if (isError) {
    return (
      <Shell>
        <Center flex="1">
          <Text color="red.300" fontSize="lg">
            Die KPIs konnten nicht geladen werden. Bitte später erneut versuchen.
          </Text>
        </Center>
      </Shell>
    );
  }

  return (
    <>
      <Shell>
        <Stack spacing={8}>
          <Stack spacing={4}>
            <FiltersBar
              filters={filters}
              onChange={handleFilterUpdate}
              onReset={handleResetFilters}
              countries={availableCountries}
              regions={availableRegions}
              cities={availableCities}
              vehicleTypes={availableVehicleTypes}
              manufacturers={availableManufacturers}
            />
          <Flex
            justify={{ base: 'stretch', md: 'flex-end' }}
            gap={3}
            direction={{ base: 'column', md: 'row' }}
            wrap={{ md: 'wrap' }}
          >
            <Button colorScheme="brand" onClick={onOpen} w={{ base: '100%', md: 'auto' }}>
              Vermieter hinzufügen
            </Button>
            <Button variant="outline" onClick={onOpenLeadModal} w={{ base: '100%', md: 'auto' }}>
              Akquise Vermieter
            </Button>
            <Button variant="outline" onClick={onOpenMissingInventory} w={{ base: '100%', md: 'auto' }}>
              Fahrzeugbedarf erfassen
            </Button>
          </Flex>
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={6}>
          <Skeleton isLoaded={!isLoading} borderRadius="2xl">
            <KpiCard
              label="Fehlende Fahrzeuge"
              value={numberFormatter.format(
                missingInventoryList.reduce((sum, entry) => sum + entry.anzahl, 0)
              )}
            />
          </Skeleton>
          <Skeleton isLoaded={!isLoading} borderRadius="2xl">
            <KpiCard
              label="Vermieter in Verhandlung"
              value={numberFormatter.format(pendingLeadsList.length)}
            />
          </Skeleton>
          {cardConfig
            .filter((card) => card.key === 'vehicles' || card.key === 'owners')
            .map((config) => (
              <Skeleton key={config.key} isLoaded={!isLoading} borderRadius="2xl">
                <KpiCard
                  label={config.label}
                  value={
                    kpis ? numberFormatter.format(config.getValue(kpis)) : numberFormatter.format(0)
                  }
                />
              </Skeleton>
            ))}
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={6}>
          <PartnerMap
            locations={geoLocations}
            country={filters.country || undefined}
            isLoading={isLoading}
            showHalo={Boolean(filters.city && filters.radius)}
            radiusKm={filters.radius ? Number(filters.radius) : undefined}
          />
          <SectionCard
            title="Fahrzeuge nach Stadt"
            description={
              filters.country
                ? 'Alle erfassten Städte im ausgewählten Land (inkl. definierter Kernstädte)'
                : 'Top-Städte weltweit'
            }
            isLoaded={!isLoading}
          >
            {vehiclesByCity.length > 0 ? (
              <Box overflowX="auto">
                <Box minW={`${Math.max(vehiclesByCity.length * 120, 600)}px`} h="18rem">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vehiclesByCity} margin={{ left: 0, right: 16, top: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="city" tick={{ fill: '#E2E8F0', fontSize: 12 }} interval={0} angle={-20} dy={20} />
                      <YAxis tick={{ fill: '#E2E8F0', fontSize: 12 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1A202C', borderRadius: 12, border: 'none' }}
                        formatter={(value: number) => numberFormatter.format(value)}
                        labelFormatter={(label: string) => `Stadt: ${label}`}
                      />
                      <Bar dataKey="vehicles" fill="#739EFF" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            ) : (
              <Center h="12rem">
                <Text color="gray.400">Keine Daten für die aktuelle Auswahl</Text>
              </Center>
            )}
          </SectionCard>
        </SimpleGrid>

        <VehicleSearch
          vehicles={inventoryList}
          isLoading={isLoading}
          query={vehicleQuery}
          onQueryChange={setVehicleQuery}
          onClearQuery={() => setVehicleQuery('')}
        />

        <MissingInventoryTable rows={missingInventoryList} isLoading={isLoading} />

        <PendingLeadsTable
          rows={pendingLeadsList}
          isLoading={isLoading}
          onStatusChange={handleLeadStatusChange}
          updatingRow={leadUpdatingRow}
        />

        <Skeleton isLoaded={!isLoading} borderRadius="3xl">
          <OnboardingTable rows={kpis?.onboarding ?? []} />
        </Skeleton>
      </Stack>
      </Shell>
      <AddPartnerModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={() => {
          mutate();
          setVehicleQuery('');
        }}
        availableCountries={availableCountries}
        availableVehicleTypes={availableVehicleTypes}
        availableManufacturers={availableManufacturers}
        defaultCountry={filters.country}
      />
      <AddMissingInventoryModal
        isOpen={isMissingInventoryOpen}
        onClose={() => {
          onCloseMissingInventory();
        }}
        onSuccess={() => mutate()}
        availableCountries={availableCountries}
        availableRegions={availableRegions}
        availableCities={availableCities}
        availableVehicleTypes={availableVehicleTypes}
        defaultCountry={filters.country}
        defaultRegion={filters.region}
      />
      <AddListingRequestModal
        isOpen={isLeadModalOpen}
        onClose={() => {
          onCloseLeadModal();
        }}
        onSuccess={() => mutate()}
        availableCountries={availableCountries}
        availableRegions={availableRegions}
        availableCities={availableCities}
        availableVehicleTypes={availableVehicleTypes}
        availableManufacturers={availableManufacturers}
        defaultCountry={filters.country}
        defaultRegion={filters.region}
      />
    </>
  );
}
