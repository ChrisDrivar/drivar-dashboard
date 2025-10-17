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
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
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
import { AddVehicleToOwnerModal } from '@/components/AddVehicleToOwnerModal';
import { DeleteOwnerDialog } from '@/components/DeleteOwnerDialog';
import { DeleteVehicleDialog } from '@/components/DeleteVehicleDialog';
import { EditOwnerModal } from '@/components/EditOwnerModal';
import { EditLeadModal, type LeadUpdatePayload } from '@/components/EditLeadModal';
import { ChevronDownIcon } from '@chakra-ui/icons';
import type { LeadStatus } from '@/lib/leadStatus';
import type { InventoryEntry, PendingLeadEntry } from '@/types/kpis';
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

type ExistingOwnerOption = {
  name: string;
  country?: string;
  region?: string;
  city?: string;
  street?: string;
  postalCode?: string;
  address?: string;
};

type OwnerSummary = ExistingOwnerOption & {
  vehicleCount: number;
  phone?: string;
  email?: string;
  website?: string;
  internationalCustomers?: string;
  commission?: string;
  ranking?: string;
  experienceYears?: string;
  notes?: string;
  sheetRowIndex?: number;
};

const normalizeOwnerName = (value: string) => value.trim().toLowerCase();

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
  const {
    isOpen: isAddVehicleModalOpen,
    onOpen: onOpenAddVehicleModal,
    onClose: onCloseAddVehicleModal,
  } = useDisclosure();
  const {
    isOpen: isDeleteOwnerDialogOpen,
    onOpen: onOpenDeleteOwnerDialog,
    onClose: onCloseDeleteOwnerDialog,
  } = useDisclosure();
  const {
    isOpen: isEditLeadModalOpen,
    onOpen: onOpenEditLeadModal,
    onClose: onCloseEditLeadModal,
  } = useDisclosure();
  const {
    isOpen: isDeleteVehicleDialogOpen,
    onOpen: onOpenDeleteVehicleDialog,
    onClose: onCloseDeleteVehicleDialog,
  } = useDisclosure();
  const {
    isOpen: isEditOwnerModalOpen,
    onOpen: onOpenEditOwnerModal,
    onClose: onCloseEditOwnerModal,
  } = useDisclosure();
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [leadUpdatingRow, setLeadUpdatingRow] = useState<number | null>(null);
  const [initialOwnerForVehicleModal, setInitialOwnerForVehicleModal] = useState<ExistingOwnerOption | null>(null);
  const [ownerToDelete, setOwnerToDelete] = useState<OwnerSummary | null>(null);
  const [isDeletingOwner, setIsDeletingOwner] = useState(false);
  const [editingLead, setEditingLead] = useState<PendingLeadEntry | null>(null);
  const [isUpdatingLeadDetails, setIsUpdatingLeadDetails] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<InventoryEntry | null>(null);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);
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
  const inventoryList = useMemo(() => kpis?.inventory ?? [], [kpis?.inventory]);
  const missingInventoryList = kpis?.missingInventory ?? [];
  const pendingLeadsList = kpis?.pendingLeads ?? [];
  const ownerMap = useMemo(() => {
    const map = new Map<string, OwnerSummary>();
    inventoryList.forEach((item) => {
      const name = (item.vermieterName ?? '').trim();
      if (!name) return;
      const key = normalizeOwnerName(name);
      const existing = map.get(key);
      const ownerRegion = item.ownerRegion ?? item.region ?? '';
      const ownerCity = item.ownerCity ?? item.stadt ?? '';
      const ownerStreet = item.ownerStreet ?? item.street ?? '';
      const ownerPostal = item.ownerPostalCode ?? item.postalCode ?? '';
      const ownerAddress = item.ownerAddress ?? [ownerStreet, ownerPostal, ownerCity].filter(Boolean).join(', ');
      if (existing) {
        existing.vehicleCount += 1;
        if (!existing.country && item.land) existing.country = item.land;
        if (!existing.region && ownerRegion) existing.region = ownerRegion;
        if (!existing.city && ownerCity) existing.city = ownerCity;
        if (!existing.address && ownerAddress) existing.address = ownerAddress;
        if (!existing.street && ownerStreet) existing.street = ownerStreet;
        if (!existing.postalCode && ownerPostal) existing.postalCode = ownerPostal;
        if (!existing.phone && item.ownerPhone) existing.phone = item.ownerPhone;
        if (!existing.email && item.ownerEmail) existing.email = item.ownerEmail;
        if (!existing.website && item.ownerDomain) existing.website = item.ownerDomain;
        if (!existing.internationalCustomers && item.ownerInternationalCustomers) {
          existing.internationalCustomers = item.ownerInternationalCustomers;
        }
        if (!existing.commission && item.ownerCommission) existing.commission = item.ownerCommission;
        if (!existing.ranking && item.ownerRanking) existing.ranking = item.ownerRanking;
        if (!existing.experienceYears && item.ownerExperienceYears) {
          existing.experienceYears = item.ownerExperienceYears;
        }
        if (!existing.notes && item.ownerNotes) existing.notes = item.ownerNotes;
        if (!existing.sheetRowIndex && item.ownerSheetRowIndex) {
          existing.sheetRowIndex = item.ownerSheetRowIndex;
        }
        return;
      }
      map.set(key, {
        name,
        country: item.land ?? '',
        region: ownerRegion,
        city: ownerCity,
        street: ownerStreet,
        postalCode: ownerPostal,
        address: ownerAddress,
        phone: item.ownerPhone,
        email: item.ownerEmail,
        website: item.ownerDomain,
        internationalCustomers: item.ownerInternationalCustomers,
        commission: item.ownerCommission,
        ranking: item.ownerRanking,
        experienceYears: item.ownerExperienceYears,
        notes: item.ownerNotes,
        sheetRowIndex: item.ownerSheetRowIndex,
        vehicleCount: 1,
      });
    });
    return map;
  }, [inventoryList]);
  const ownerSummaries = useMemo(() => Array.from(ownerMap.values()), [ownerMap]);
  const ownerOptionsList = useMemo<ExistingOwnerOption[]>(
    () =>
      ownerSummaries.map(({ name, country, region, city, street, postalCode, address }) => ({
        name,
        country,
        region,
        city,
        street,
        postalCode,
        address,
      })),
    [ownerSummaries]
  );
  const ownerDetailsList = useMemo(
    () => ownerSummaries.map(({ vehicleCount: _vehicleCount, ...rest }) => rest),
    [ownerSummaries]
  );

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

  const handleAddVehicleModalClose = useCallback(() => {
    setInitialOwnerForVehicleModal(null);
    onCloseAddVehicleModal();
  }, [onCloseAddVehicleModal]);

const handleDeleteOwnerDialogClose = useCallback(() => {
  setOwnerToDelete(null);
  onCloseDeleteOwnerDialog();
}, [onCloseDeleteOwnerDialog]);

const handleEditLeadModalClose = useCallback(() => {
  setEditingLead(null);
  onCloseEditLeadModal();
}, [onCloseEditLeadModal]);

  const handleEditOwnerModalOpen = useCallback(() => {
    onOpenEditOwnerModal();
  }, [onOpenEditOwnerModal]);

  const handleEditOwnerModalClose = useCallback(() => {
    onCloseEditOwnerModal();
  }, [onCloseEditOwnerModal]);

  const handleDeleteVehicleDialogClose = useCallback(() => {
    setVehicleToDelete(null);
    onCloseDeleteVehicleDialog();
  }, [onCloseDeleteVehicleDialog]);

  const handleOwnerSelectionChange = useCallback(
    (selection: string | null) => {
      if (!selection) {
        setOwnerToDelete(null);
        return;
      }
      const normalized = normalizeOwnerName(selection);
      const summary = ownerMap.get(normalized) ?? null;
      setOwnerToDelete(summary ? { ...summary } : null);
    },
    [ownerMap]
  );

  const handleConfirmDeleteOwner = useCallback(async () => {
    if (!ownerToDelete) {
      toast({ status: 'warning', title: 'Bitte einen Vermieter auswählen.' });
      return;
    }
    setIsDeletingOwner(true);
    try {
      const response = await fetch('/api/partners', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerName: ownerToDelete.name }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Löschung fehlgeschlagen.');
      }

      toast({
        status: 'success',
        title: 'Vermieter gelöscht.',
      });
      await mutate();
      setOwnerToDelete(null);
      onCloseDeleteOwnerDialog();
    } catch (error) {
      console.error('[owner-delete]', error);
      toast({
        status: 'error',
        title: 'Löschung fehlgeschlagen',
        description: (error as Error).message,
      });
    } finally {
      setIsDeletingOwner(false);
    }
  }, [mutate, onCloseDeleteOwnerDialog, ownerToDelete, toast]);

  const handleEditOwnerSuccess = useCallback(() => {
    mutate();
  }, [mutate]);

  const handleDeleteVehicleRequest = useCallback(
    (vehicle: InventoryEntry) => {
      const derivedIndex = inventoryList.indexOf(vehicle);
      const computedRowIndex =
        vehicle.sheetRowIndex ?? (derivedIndex >= 0 ? derivedIndex + 2 : undefined);

      if (!computedRowIndex) {
        toast({ status: 'warning', title: 'Zeile für dieses Fahrzeug fehlt.' });
        return;
      }

      setVehicleToDelete({ ...vehicle, sheetRowIndex: computedRowIndex });
      onOpenDeleteVehicleDialog();
    },
    [inventoryList, onOpenDeleteVehicleDialog, toast]
  );

  const handleConfirmDeleteVehicle = useCallback(async () => {
    if (!vehicleToDelete?.sheetRowIndex) {
      toast({ status: 'warning', title: 'Kein Fahrzeug ausgewählt.' });
      return;
    }
    setIsDeletingVehicle(true);
    try {
      const response = await fetch('/api/inventory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: vehicleToDelete.sheetRowIndex }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Fahrzeug konnte nicht gelöscht werden.');
      }

      toast({ status: 'success', title: 'Fahrzeug gelöscht.' });
      await mutate();
      setVehicleToDelete(null);
      onCloseDeleteVehicleDialog();
    } catch (error) {
      console.error('[inventory-delete]', error);
      toast({
        status: 'error',
        title: 'Löschung fehlgeschlagen',
        description: (error as Error).message,
      });
    } finally {
      setIsDeletingVehicle(false);
    }
  }, [mutate, onCloseDeleteVehicleDialog, toast, vehicleToDelete]);

  const handleLeadEditRequest = useCallback(
    (lead: PendingLeadEntry) => {
      setEditingLead(lead);
      onOpenEditLeadModal();
    },
    [onOpenEditLeadModal]
  );

  const handleLeadDetailsUpdate = useCallback(
    async (payload: LeadUpdatePayload) => {
      if (!editingLead) return;
      setIsUpdatingLeadDetails(true);
      try {
        const response = await fetch('/api/listing-requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rowIndex: editingLead.sheetRowIndex,
            status: editingLead.status,
            createPartner: false,
            lead: {
              date: payload.date,
              channel: payload.channel,
              region: payload.region,
              city: payload.city,
              country: payload.country,
              landlord: payload.landlord,
              street: payload.street,
              postalCode: payload.postalCode,
              phone: payload.phone,
              email: payload.email,
              website: payload.website,
              internationalCustomers: payload.internationalCustomers,
              commission: payload.commission,
              ranking: payload.ranking,
              experienceYears: payload.experienceYears,
              comment: payload.comment,
              ownerNotes: payload.ownerNotes,
            },
            vehicles: [
              {
                vehicleLabel: payload.vehicleLabel || editingLead.fahrzeugLabel,
                manufacturer: payload.manufacturer || editingLead.manufacturer,
                vehicleType: payload.vehicleType || editingLead.fahrzeugtyp,
                comment: payload.comment,
              },
            ],
          }),
        });

        if (!response.ok) {
          const payloadResponse = await response.json().catch(() => ({}));
          throw new Error(payloadResponse.error || 'Lead konnte nicht aktualisiert werden.');
        }

        toast({ status: 'success', title: 'Lead aktualisiert.' });
        await mutate();
        setEditingLead(null);
        onCloseEditLeadModal();
      } catch (error) {
        console.error('[pending-leads-edit]', error);
        toast({
          status: 'error',
          title: 'Aktualisierung fehlgeschlagen',
          description: (error as Error).message,
        });
      } finally {
        setIsUpdatingLeadDetails(false);
      }
    },
    [editingLead, mutate, onCloseEditLeadModal, toast]
  );

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
              phone: lead.phone,
              email: lead.email,
              website: lead.website,
              internationalCustomers: lead.internationalCustomers,
              commission: lead.commission,
              ranking: lead.ranking,
              experienceYears: lead.experienceYears,
              comment: lead.kommentar,
              ownerNotes: lead.ownerNotes,
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
            justify={{ base: 'flex-start', md: 'flex-end' }}
            gap={3}
            direction={{ base: 'column', md: 'row' }}
            wrap={{ md: 'wrap' }}
          >
            <Menu>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="outline">
                Vermieter
              </MenuButton>
              <MenuList>
                <MenuItem onClick={onOpen}>Vermieter hinzufügen</MenuItem>
                <MenuItem
                  onClick={() => {
                    setInitialOwnerForVehicleModal(null);
                    onOpenAddVehicleModal();
                  }}
                  isDisabled={ownerOptionsList.length === 0}
                >
                  Fahrzeug zu Vermieter
                </MenuItem>
                <MenuItem onClick={handleEditOwnerModalOpen} isDisabled={ownerDetailsList.length === 0}>
                  Vermieter ändern
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  onClick={() => {
                    setOwnerToDelete(null);
                    onOpenDeleteOwnerDialog();
                  }}
                  isDisabled={ownerSummaries.length === 0}
                  color="red.400"
                  _hover={{ bg: 'red.500', color: 'white' }}
                >
                  Vermieter löschen
                </MenuItem>
              </MenuList>
            </Menu>
            <Menu>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="outline">
                Leads
              </MenuButton>
              <MenuList>
                <MenuItem onClick={onOpenLeadModal}>Akquise Vermieter</MenuItem>
              </MenuList>
            </Menu>
            <Menu>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="outline">
                Bedarf
              </MenuButton>
              <MenuList>
                <MenuItem onClick={onOpenMissingInventory}>Fahrzeugbedarf erfassen</MenuItem>
              </MenuList>
            </Menu>
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
          onDeleteVehicleClick={handleDeleteVehicleRequest}
        />

        <MissingInventoryTable rows={missingInventoryList} isLoading={isLoading} />

        <PendingLeadsTable
          rows={pendingLeadsList}
          isLoading={isLoading}
          onStatusChange={handleLeadStatusChange}
          updatingRow={leadUpdatingRow}
          onEdit={handleLeadEditRequest}
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
      <EditOwnerModal
        isOpen={isEditOwnerModalOpen && ownerDetailsList.length > 0}
        onClose={handleEditOwnerModalClose}
        onSuccess={handleEditOwnerSuccess}
        owners={ownerDetailsList}
        availableCountries={availableCountries}
        availableRegions={availableRegions}
      />
      <AddVehicleToOwnerModal
        isOpen={isAddVehicleModalOpen}
        onClose={handleAddVehicleModalClose}
        onSuccess={() => mutate()}
        owners={ownerOptionsList}
        initialOwner={initialOwnerForVehicleModal}
        availableVehicleTypes={availableVehicleTypes}
        availableManufacturers={availableManufacturers}
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
      <EditLeadModal
        isOpen={isEditLeadModalOpen && Boolean(editingLead)}
        onClose={handleEditLeadModalClose}
        lead={editingLead}
        onSubmit={handleLeadDetailsUpdate}
        isSubmitting={isUpdatingLeadDetails}
        availableCountries={availableCountries}
        availableRegions={availableRegions}
        availableCities={availableCities}
        availableVehicleTypes={availableVehicleTypes}
        availableManufacturers={availableManufacturers}
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
      <DeleteOwnerDialog
        isOpen={isDeleteOwnerDialogOpen && ownerSummaries.length > 0}
        onCancel={handleDeleteOwnerDialogClose}
        onConfirm={handleConfirmDeleteOwner}
        isDeleting={isDeletingOwner}
        ownerName={ownerToDelete?.name ?? null}
        vehiclesCount={ownerToDelete?.vehicleCount ?? 0}
        owners={ownerSummaries}
        onOwnerChange={handleOwnerSelectionChange}
      />
      <DeleteVehicleDialog
        isOpen={isDeleteVehicleDialogOpen && Boolean(vehicleToDelete)}
        onCancel={handleDeleteVehicleDialogClose}
        onConfirm={handleConfirmDeleteVehicle}
        isDeleting={isDeletingVehicle}
        vehicleLabel={vehicleToDelete?.fahrzeugLabel ?? null}
        ownerName={vehicleToDelete?.vermieterName}
      />
    </>
  );
}
