'use client';

import {
  Box,
  Button,
  Flex,
  HStack,
  Select,
  Stack,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import { KpiFilters } from '@/hooks/useKpiFilters';

type FiltersBarProps = {
  filters: KpiFilters;
  onChange: (filters: KpiFilters) => void;
  onReset?: () => void;
  countries?: string[];
  regions?: string[];
  cities?: string[];
  vehicleTypes?: string[];
  manufacturers?: string[];
};

const RADIUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Kein Radius' },
  { value: '25', label: '25 km' },
  { value: '50', label: '50 km' },
  { value: '75', label: '75 km' },
  { value: '100', label: '100 km' },
  { value: '125', label: '125 km' },
  { value: '150', label: '150 km' },
  { value: '175', label: '175 km' },
  { value: '200', label: '200 km' },
];

export function FiltersBar({
  filters,
  onChange,
  onReset,
  countries = [],
  regions = [],
  cities = [],
  vehicleTypes = [],
  manufacturers = [],
}: FiltersBarProps) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  const setFilter = (key: keyof KpiFilters, value: string) => {
    if (key === 'country') {
      onChange({ ...filters, country: value, region: '', city: '', radius: '' });
      return;
    }
    if (key === 'region') {
      onChange({ ...filters, region: value, city: '', radius: '' });
      return;
    }
    if (key === 'city') {
      onChange({ ...filters, city: value, radius: '' });
      return;
    }
    onChange({ ...filters, [key]: value });
  };

  const hasFilters =
    Boolean(filters.country) ||
    Boolean(filters.region) ||
    Boolean(filters.city) ||
    Boolean(filters.vehicleType) ||
    Boolean(filters.manufacturer) ||
    Boolean(filters.radius);

  const Controls = (
    <>
      <Box flex="1">
        <Text fontSize="xs" textTransform="uppercase" color="gray.400" mb={1}>
          Land
        </Text>
        <Select
          placeholder="Alle Länder"
          value={filters.country}
          onChange={(event) => setFilter('country', event.target.value)}
        >
          {countries.map((country) => (
            <option value={country} key={country}>
              {country}
            </option>
          ))}
        </Select>
      </Box>
      <Box flex="1">
        <Text fontSize="xs" textTransform="uppercase" color="gray.400" mb={1}>
          Region
        </Text>
        <Select
          placeholder="Alle Regionen"
          value={filters.region}
          onChange={(event) => setFilter('region', event.target.value)}
        >
          {regions.map((value) => (
            <option value={value} key={value}>
              {value}
            </option>
          ))}
        </Select>
      </Box>
      <Box flex="1">
        <Text fontSize="xs" textTransform="uppercase" color="gray.400" mb={1}>
          Stadt
        </Text>
        <Select
          placeholder="Alle Städte"
          value={filters.city}
          onChange={(event) => setFilter('city', event.target.value)}
        >
          {cities.map((value) => (
            <option value={value} key={value}>
              {value}
            </option>
          ))}
        </Select>
      </Box>
      <Box flex="1">
        <Text fontSize="xs" textTransform="uppercase" color="gray.400" mb={1}>
          Fahrzeugtyp
        </Text>
        <Select
          placeholder="Alle Typen"
          value={filters.vehicleType}
          onChange={(event) => setFilter('vehicleType', event.target.value)}
        >
          {vehicleTypes.map((type) => (
            <option value={type} key={type}>
              {type}
            </option>
          ))}
        </Select>
      </Box>
      <Box flex="1">
        <Text fontSize="xs" textTransform="uppercase" color="gray.400" mb={1}>
          Hersteller
        </Text>
        <Select
          placeholder="Alle Hersteller"
          value={filters.manufacturer}
          onChange={(event) => setFilter('manufacturer', event.target.value)}
        >
          {manufacturers.map((value) => (
            <option value={value} key={value}>
              {value}
            </option>
          ))}
        </Select>
      </Box>
      <Box flex="1">
        <Text fontSize="xs" textTransform="uppercase" color="gray.400" mb={1}>
          Umkreis
        </Text>
        <Select
          value={filters.radius}
          onChange={(event) => setFilter('radius', event.target.value)}
          isDisabled={!filters.city}
        >
          {RADIUS_OPTIONS.map((option) => (
            <option key={option.value || 'none'} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Box>
    </>
  );

  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="3xl"
      px={6}
      py={4}
      bg="blackAlpha.400"
      backdropFilter="blur(6px)"
    >
      <Stack direction={{ base: 'column', md: 'row' }} align="center" spacing={4}>
        {isMobile ? <Stack spacing={3}>{Controls}</Stack> : <Flex w="100%" gap={4}>{Controls}</Flex>}
        {hasFilters && onReset && (
          <HStack>
            <Button variant="outline" onClick={onReset}>
              Zurücksetzen
            </Button>
          </HStack>
        )}
      </Stack>
    </Box>
  );
}
