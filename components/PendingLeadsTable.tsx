'use client';

import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Skeleton,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import type { PendingLeadEntry } from '@/types/kpis';
import { LEAD_STATUS_COLORS, LEAD_STATUS_VALUES, type LeadStatus } from '@/lib/leadStatus';

function formatDate(value?: string) {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('de-DE');
}

type PendingLeadsTableProps = {
  rows: PendingLeadEntry[];
  isLoading?: boolean;
  onStatusChange?: (lead: PendingLeadEntry, status: LeadStatus) => void | Promise<void>;
  updatingRow?: number | null;
  onEdit?: (lead: PendingLeadEntry) => void;
};

export function PendingLeadsTable({
  rows,
  isLoading = false,
  onStatusChange,
  updatingRow,
  onEdit,
}: PendingLeadsTableProps) {
  const handleStatusClick = async (lead: PendingLeadEntry, status: LeadStatus) => {
    if (!onStatusChange) return;
    if (status === lead.status) return;
    await onStatusChange(lead, status);
  };

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
        <Flex align="center" justify="space-between" mb={4}>
          <Heading size="md">Leads in Verhandlung</Heading>
          <Text color="gray.400" fontSize="sm">
            {rows.length} offene Leads
          </Text>
        </Flex>
        {rows.length === 0 ? (
          <Flex minH="8rem" align="center" justify="center">
            <Text color="gray.400">Aktuell keine offenen Leads.</Text>
          </Flex>
        ) : (
          <TableContainer maxH="20rem" overflowY="auto">
            <Table size="sm" variant="simple">
              <Thead position="sticky" top={0} bg="rgba(17, 24, 39, 0.95)" zIndex={1}>
                <Tr>
                  <Th>Datum</Th>
                  <Th>Vermieter</Th>
                  <Th>Stadt</Th>
                  <Th>Land</Th>
                  <Th>Bundesland</Th>
                  <Th>Fahrzeug</Th>
                  <Th>Typ</Th>
                  <Th>Kanal</Th>
                  <Th>Status</Th>
                  <Th>Kommentar</Th>
                  <Th>Aktion</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row, index) => (
                  <Tr key={`${row.vermieterName}-${row.fahrzeugLabel}-${index}`}>
                    <Td>{formatDate(row.datum)}</Td>
                    <Td>{row.vermieterName}</Td>
                    <Td>{row.stadt || '–'}</Td>
                    <Td>{row.land || '–'}</Td>
                    <Td>{row.region || '–'}</Td>
                    <Td>
                      <Box>
                        <Text noOfLines={1}>{row.fahrzeugLabel || '–'}</Text>
                        {row.manufacturer && (
                          <Badge mt={1} colorScheme="purple" variant="subtle">
                            {row.manufacturer}
                          </Badge>
                        )}
                      </Box>
                    </Td>
                    <Td>{row.fahrzeugtyp || '–'}</Td>
                    <Td>{row.kanal || '–'}</Td>
                    <Td>
                      {onStatusChange ? (
                        <Menu>
                          <MenuButton
                            as={Button}
                            size="sm"
                            variant="outline"
                            isDisabled={Boolean(updatingRow && updatingRow !== row.sheetRowIndex)}
                            isLoading={updatingRow === row.sheetRowIndex}
                            colorScheme={LEAD_STATUS_COLORS[(row.status as LeadStatus) ?? 'Angefragt'] ?? 'gray'}
                          >
                            {row.status}
                          </MenuButton>
                          <MenuList>
                            {LEAD_STATUS_VALUES.map((status) => (
                              <MenuItem
                                key={status}
                                onClick={() => handleStatusClick(row, status)}
                              >
                                {status}
                              </MenuItem>
                            ))}
                          </MenuList>
                        </Menu>
                      ) : (
                        <Badge colorScheme={LEAD_STATUS_COLORS[(row.status as LeadStatus) ?? 'Angefragt'] ?? 'gray'}>
                          {row.status}
                        </Badge>
                      )}
                    </Td>
                    <Td maxW="24rem">
                      <Text noOfLines={2}>{row.kommentar || '–'}</Text>
                    </Td>
                    <Td>
                      {row.status === 'In Verhandlung' && onEdit ? (
                        <Button size="sm" variant="ghost" onClick={() => onEdit(row)}>
                          Ändern
                        </Button>
                      ) : (
                        <Text color="gray.500">–</Text>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Skeleton>
  );
}
