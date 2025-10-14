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
} from '@chakra-ui/react';
import type { MissingInventoryEntry } from '@/types/kpis';

type MissingInventoryTableProps = {
  rows: MissingInventoryEntry[];
  isLoading?: boolean;
};

export function MissingInventoryTable({ rows, isLoading = false }: MissingInventoryTableProps) {
  const hasRows = rows.length > 0;

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
          <Heading size="md">Fehlende Fahrzeuge</Heading>
          <Text color="gray.400" fontSize="sm">
            {rows.length} offene Bedarfe
          </Text>
        </Flex>
        {hasRows ? (
          <TableContainer maxH="20rem" overflowY="auto">
            <Table size="sm" variant="simple">
              <Thead position="sticky" top={0} bg="rgba(17, 24, 39, 0.95)" zIndex={1}>
                <Tr>
                  <Th>Stadt</Th>
                  <Th>Bundesland</Th>
                  <Th>Land</Th>
                  <Th>Fahrzeugtyp</Th>
                  <Th isNumeric>Anzahl</Th>
                  <Th>Priorität</Th>
                  <Th>Kommentar</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row, index) => (
                  <Tr key={`${row.stadt}-${row.fahrzeugtyp}-${index}`}>
                    <Td>{row.stadt || '–'}</Td>
                    <Td>{row.region || '–'}</Td>
                    <Td>{row.land || '–'}</Td>
                    <Td>{row.fahrzeugtyp}</Td>
                    <Td isNumeric>{row.anzahl}</Td>
                    <Td textTransform="capitalize">{row.prio || '–'}</Td>
                    <Td maxW="24rem">
                      <Text noOfLines={2}>{row.kommentar || '–'}</Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        ) : (
          <Flex minH="8rem" align="center" justify="center">
            <Text color="gray.400">Aktuell sind keine fehlenden Fahrzeuge erfasst.</Text>
          </Flex>
        )}
      </Box>
    </Skeleton>
  );
}
