'use client';

import {
  Box,
  Flex,
  Heading,
  Skeleton,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Badge,
} from '@chakra-ui/react';
import type { PendingLeadEntry } from '@/types/kpis';

function formatDate(value?: string) {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('de-DE');
}

type PendingLeadsTableProps = {
  rows: PendingLeadEntry[];
  isLoading?: boolean;
};

export function PendingLeadsTable({ rows, isLoading = false }: PendingLeadsTableProps) {
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
                  <Th>Fahrzeug</Th>
                  <Th>Typ</Th>
                  <Th>Kanal</Th>
                  <Th>Kommentar</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row, index) => (
                  <Tr key={`${row.vermieterName}-${row.fahrzeugLabel}-${index}`}>
                    <Td>{formatDate(row.datum)}</Td>
                    <Td>{row.vermieterName}</Td>
                    <Td>{row.stadt || '–'}</Td>
                    <Td>{row.land || '–'}</Td>
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
                    <Td maxW="24rem">
                      <Text noOfLines={2}>{row.kommentar || '–'}</Text>
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
