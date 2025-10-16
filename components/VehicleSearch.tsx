'use client';

import type { MouseEvent as ReactMouseEvent } from 'react';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  ButtonGroup,
  Flex,
  Heading,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Link,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Skeleton,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from '@chakra-ui/react';
import { AddIcon, CloseIcon, DeleteIcon } from '@chakra-ui/icons';
import { FiSearch } from 'react-icons/fi';
import type { InventoryEntry } from '@/types/kpis';

type VehicleSearchProps = {
  vehicles: InventoryEntry[];
  isLoading?: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClearQuery?: () => void;
  onAddVehicleClick?: (ownerEntry: InventoryEntry) => void;
  onDeleteOwnerClick?: (ownerEntry: InventoryEntry) => void;
};

type ColumnDef = {
  id: string;
  label: string;
  minWidth?: number;
  defaultWidth?: number;
  render: (vehicle: InventoryEntry) => ReactNode;
};

const formatDate = (value: InventoryEntry['listedAt']) => {
  if (!value) return '–';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string') return value.split('T')[0];
  return '–';
};

const formatIsoDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('de-DE');
};

const COLUMN_DEFS: ColumnDef[] = [
  {
    id: 'vehicle',
    label: 'Fahrzeug',
    minWidth: 180,
    defaultWidth: 240,
    render: (vehicle) => (
      <Flex direction="column" overflow="hidden">
        <Text fontWeight="semibold" noOfLines={1}>
          {vehicle.fahrzeugLabel}
        </Text>
        {vehicle.fahrzeugId && (
          <Text fontSize="xs" color="gray.400" noOfLines={1}>
            {vehicle.fahrzeugId}
          </Text>
        )}
      </Flex>
    ),
  },
  {
    id: 'manufacturer',
    label: 'Hersteller',
    minWidth: 140,
    defaultWidth: 160,
    render: (vehicle) => vehicle.manufacturer ?? '–',
  },
  {
    id: 'type',
    label: 'Typ',
    minWidth: 140,
    defaultWidth: 160,
    render: (vehicle) => vehicle.fahrzeugtyp || '–',
  },
  {
    id: 'city',
    label: 'Stadt',
    minWidth: 140,
    defaultWidth: 160,
    render: (vehicle) => vehicle.stadt || '–',
  },
  {
    id: 'owner',
    label: 'Vermieter',
    minWidth: 180,
    defaultWidth: 220,
    render: (vehicle) => {
      const hasContact = Boolean(
        vehicle.ownerPhone ||
          vehicle.ownerEmail ||
          vehicle.ownerDomain ||
          vehicle.ownerAddress ||
          vehicle.ownerInternationalCustomers ||
          vehicle.ownerCommission ||
          vehicle.ownerRanking ||
          vehicle.ownerExperienceYears ||
          vehicle.ownerNotes ||
          vehicle.ownerLastChange ||
          vehicle.region
      );
      const websiteHref =
        vehicle.ownerDomain && !vehicle.ownerDomain.startsWith('http')
          ? `https://${vehicle.ownerDomain}`
          : vehicle.ownerDomain;
      const formattedLastChange = formatIsoDate(vehicle.ownerLastChange);
      return (
        <Popover trigger="hover" placement="auto" openDelay={150} closeDelay={100}>
          <PopoverTrigger>
            <Text
              fontWeight="semibold"
              noOfLines={1}
              cursor={hasContact ? 'pointer' : 'default'}
              textDecoration={hasContact ? 'underline' : 'none'}
              textDecorationStyle="dotted"
              textDecorationColor="whiteAlpha.400"
            >
              {vehicle.vermieterName}
            </Text>
          </PopoverTrigger>
          {hasContact && (
            <Portal>
              <PopoverContent
                bg="gray.800"
                borderColor="whiteAlpha.200"
                shadow="xl"
                _focus={{ outline: 'none' }}
                maxW="22rem"
              >
                <PopoverArrow bg="gray.800" />
                <PopoverBody display="grid" gap={2} fontSize="sm">
                  {vehicle.ownerAddress && (
                    <Box>
                      <Text textTransform="uppercase" fontSize="xs" color="gray.400" mb={1}>
                        Adresse
                      </Text>
                    <Text whiteSpace="pre-line">{vehicle.ownerAddress}</Text>
                  </Box>
                )}
                {vehicle.region && (
                  <Box>
                    <Text textTransform="uppercase" fontSize="xs" color="gray.400" mb={1}>
                      Standort
                    </Text>
                    <Text>{vehicle.region}</Text>
                  </Box>
                )}
                {vehicle.ownerPhone && (
                  <Box>
                    <Text textTransform="uppercase" fontSize="xs" color="gray.400" mb={1}>
                      Telefon
                    </Text>
                    <Link href={`tel:${vehicle.ownerPhone}`} color="brand.200">
                      {vehicle.ownerPhone}
                    </Link>
                  </Box>
                )}
                {vehicle.ownerEmail && (
                  <Box>
                    <Text textTransform="uppercase" fontSize="xs" color="gray.400" mb={1}>
                      E-Mail
                    </Text>
                    <Link href={`mailto:${vehicle.ownerEmail}`} color="brand.200">
                      {vehicle.ownerEmail}
                    </Link>
                  </Box>
                )}
                {vehicle.ownerDomain && (
                  <Box>
                    <Text textTransform="uppercase" fontSize="xs" color="gray.400" mb={1}>
                      Website
                    </Text>
                    <Link href={websiteHref ?? undefined} isExternal color="brand.200">
                      {vehicle.ownerDomain}
                    </Link>
                  </Box>
                )}
                {vehicle.ownerInternationalCustomers && (
                  <Box>
                    <Text textTransform="uppercase" fontSize="xs" color="gray.400" mb={1}>
                      Internationale Kunden
                    </Text>
                    <Text>{vehicle.ownerInternationalCustomers}</Text>
                  </Box>
                )}
                {vehicle.ownerCommission && (
                  <Box>
                    <Text textTransform="uppercase" fontSize="xs" color="gray.400" mb={1}>
                      Provision
                    </Text>
                    <Text>{vehicle.ownerCommission}</Text>
                  </Box>
                )}
                {vehicle.ownerRanking && (
                  <Box>
                    <Text textTransform="uppercase" fontSize="xs" color="gray.400" mb={1}>
                      Ranking
                    </Text>
                    <Text>{vehicle.ownerRanking}</Text>
                  </Box>
                )}
                {vehicle.ownerExperienceYears && (
                  <Box>
                    <Text textTransform="uppercase" fontSize="xs" color="gray.400" mb={1}>
                      Erfahrung (Jahre)
                    </Text>
                    <Text>{vehicle.ownerExperienceYears}</Text>
                  </Box>
                )}
                {vehicle.ownerNotes && (
                  <Box>
                    <Text textTransform="uppercase" fontSize="xs" color="gray.400" mb={1}>
                      Notizen
                    </Text>
                    <Text whiteSpace="pre-line">{vehicle.ownerNotes}</Text>
                  </Box>
                )}
                {formattedLastChange && (
                  <Box>
                    <Text textTransform="uppercase" fontSize="xs" color="gray.400" mb={1}>
                      Letzte Änderung
                    </Text>
                    <Text>{formattedLastChange}</Text>
                  </Box>
                )}
                </PopoverBody>
              </PopoverContent>
            </Portal>
          )}
        </Popover>
      );
    },
  },
  {
    id: 'listedAt',
    label: 'Seit',
    minWidth: 120,
    defaultWidth: 140,
    render: (vehicle) => formatDate(vehicle.listedAt),
  },
];

const MAX_VISIBLE_ROWS = 200;

export function VehicleSearch({
  vehicles,
  isLoading = false,
  query,
  onQueryChange,
  onClearQuery,
  onAddVehicleClick,
  onDeleteOwnerClick,
}: VehicleSearchProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      COLUMN_DEFS.map((column) => [
        column.id,
        column.defaultWidth ?? column.minWidth ?? 160,
      ])
    )
  );
  const resizingColumnRef = useRef<{ id: string; startX: number; startWidth: number } | null>(null);

  const filteredVehicles = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return vehicles;
    const tokens = trimmed.split(/\s+/).filter(Boolean);

    return vehicles.filter((vehicle) => {
      const fields = [
        vehicle.fahrzeugLabel,
        vehicle.fahrzeugId,
        vehicle.vermieterName,
        vehicle.stadt,
        vehicle.region,
        vehicle.land,
        vehicle.manufacturer,
        vehicle.fahrzeugtyp,
        vehicle.ownerEmail,
        vehicle.ownerPhone,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      if (fields.length === 0) return false;

      const base = fields.join(' ');
      const collapsed = fields
        .map((field) => field.replace(/[\s\-_/]/g, ''))
        .join(' ');

      return tokens.every((token) => {
        const collapsedToken = token.replace(/[\s\-_/]/g, '');
        return base.includes(token) || collapsed.includes(collapsedToken);
      });
    });
  }, [vehicles, query]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const current = resizingColumnRef.current;
      if (!current) return;
      setColumnWidths((prev) => {
        const column = COLUMN_DEFS.find((item) => item.id === current.id);
        const minWidth = column?.minWidth ?? 120;
        const nextWidth = Math.max(minWidth, current.startWidth + (event.clientX - current.startX));
        if (prev[current.id] === nextWidth) return prev;
        return { ...prev, [current.id]: nextWidth };
      });
    };

    const handleMouseUp = () => {
      resizingColumnRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizing = (event: ReactMouseEvent<HTMLDivElement>, columnId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const width =
      columnWidths[columnId] ??
      COLUMN_DEFS.find((column) => column.id === columnId)?.defaultWidth ??
      160;
    resizingColumnRef.current = {
      id: columnId,
      startX: event.clientX,
      startWidth: width,
    };
  };

  const visibleVehicles = filteredVehicles.slice(0, MAX_VISIBLE_ROWS);
  const hasOwnerActions = Boolean(onAddVehicleClick || onDeleteOwnerClick);
  const seenOwners = new Set<string>();

  return (
    <Skeleton isLoaded={!isLoading} borderRadius="3xl">
      <Box
        borderRadius="3xl"
        border="1px solid"
        borderColor="whiteAlpha.200"
        bg="blackAlpha.400"
        backdropFilter="blur(6px)"
        p={6}
      >
        <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" gap={4} mb={4}>
          <Box>
            <Heading size="md">Fahrzeug-Suche</Heading>
            <Text mt={1} fontSize="sm" color="gray.400">
              {filteredVehicles.length} von {vehicles.length} Fahrzeugen in der aktuellen Auswahl
            </Text>
          </Box>
          <InputGroup maxW={{ base: '100%', md: '18rem' }}>
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color="gray.500" />
            </InputLeftElement>
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Suchen nach Modell, Vermieter, Stadt..."
              variant="filled"
              bg="whiteAlpha.200"
              _hover={{ bg: 'whiteAlpha.300' }}
            />
            {query && (
              <InputRightElement>
                <IconButton
                  aria-label="Suche zurücksetzen"
                  size="sm"
                  variant="ghost"
                  icon={<CloseIcon />}
                  onClick={() => {
                    if (onClearQuery) {
                      onClearQuery();
                    } else {
                      onQueryChange('');
                    }
                  }}
                />
              </InputRightElement>
            )}
          </InputGroup>
        </Flex>

        {visibleVehicles.length === 0 ? (
          <Flex h="12rem" align="center" justify="center">
            <Text color="gray.400">Keine Fahrzeuge gefunden</Text>
          </Flex>
        ) : (
          <TableContainer maxH="24rem" overflowY="auto" overflowX="auto">
            <Table variant="simple" size="sm" sx={{ tableLayout: 'fixed', minWidth: '100%' }}>
              <Thead position="sticky" top={0} bg="rgba(17, 24, 39, 0.95)" zIndex={1}>
                <Tr>
                  {COLUMN_DEFS.map((column) => {
                    const width = columnWidths[column.id] ?? column.minWidth ?? 160;
                    return (
                      <Th
                        key={column.id}
                        position="relative"
                        style={{
                          width,
                          minWidth: column.minWidth,
                          maxWidth: 640,
                          userSelect: 'none',
                        }}
                        pr={6}
                      >
                        {column.label}
                        <Box
                          role="separator"
                          aria-label={`Spaltenbreite für ${column.label} anpassen`}
                          position="absolute"
                          right="0"
                          top="0"
                          bottom="0"
                          width="3"
                          cursor="col-resize"
                          onMouseDown={(event) => startResizing(event, column.id)}
                          _hover={{ bg: 'whiteAlpha.300' }}
                        />
                      </Th>
                    );
                  })}
                  {hasOwnerActions && <Th minW={120}>Aktion</Th>}
                </Tr>
              </Thead>
              <Tbody>
                {visibleVehicles.map((vehicle, index) => {
                  const rowKey =
                    vehicle.fahrzeugId ||
                    `${vehicle.vermieterName}-${vehicle.fahrzeugLabel}-${index}`;
                  const normalizedOwner = (vehicle.vermieterName || '').trim().toLowerCase();
                  const isFirstOccurrence =
                    normalizedOwner.length > 0 && !seenOwners.has(normalizedOwner);
                  if (isFirstOccurrence) {
                    seenOwners.add(normalizedOwner);
                  }

                  return (
                    <Tr key={rowKey}>
                      {COLUMN_DEFS.map((column) => {
                        const width = columnWidths[column.id] ?? column.minWidth ?? 160;
                        return (
                          <Td
                            key={column.id}
                            style={{
                              width,
                              minWidth: column.minWidth,
                              maxWidth: 640,
                              whiteSpace: 'nowrap',
                              overflow: column.id === 'owner' ? 'visible' : 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {column.render(vehicle)}
                          </Td>
                        );
                      })}
                      {hasOwnerActions && (
                        <Td minW="7rem">
                          {isFirstOccurrence ? (
                            <ButtonGroup size="sm" variant="ghost">
                              {onAddVehicleClick && (
                                <Tooltip label="Fahrzeug hinzufügen">
                                  <IconButton
                                    aria-label="Fahrzeug hinzufügen"
                                    icon={<AddIcon />}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      onAddVehicleClick(vehicle);
                                    }}
                                  />
                                </Tooltip>
                              )}
                              {onDeleteOwnerClick && (
                                <Tooltip label="Vermieter löschen">
                                  <IconButton
                                    aria-label="Vermieter löschen"
                                    icon={<DeleteIcon />}
                                    colorScheme="red"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      onDeleteOwnerClick(vehicle);
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </ButtonGroup>
                          ) : (
                            <Text color="gray.500">–</Text>
                          )}
                        </Td>
                      )}
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Skeleton>
  );
}
