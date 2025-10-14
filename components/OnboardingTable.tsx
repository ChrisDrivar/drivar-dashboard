'use client';

import {
  Box,
  Flex,
  Heading,
  Icon,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { FiClock } from 'react-icons/fi';
import type { OnboardingRow } from '@/types/kpis';

type Props = {
  rows?: OnboardingRow[];
};

export function OnboardingTable({ rows = [] }: Props) {
  const mostRecent = rows
    .filter((row) => typeof row.ageDays === 'number')
    .sort((a, b) => (a.ageDays ?? 0) - (b.ageDays ?? 0))
    .slice(0, 15);

  return (
    <Box
      borderRadius="3xl"
      border="1px solid"
      borderColor="whiteAlpha.200"
      bg="blackAlpha.400"
      backdropFilter="blur(6px)"
      p={6}
    >
      <Flex align="center" justify="space-between" mb={4}>
        <Heading size="md">Neu an Bord</Heading>
        <Text color="gray.400" fontSize="sm">
          Die jüngsten Listings im Überblick
        </Text>
      </Flex>
      <TableContainer>
        <Table variant="simple" size="md">
          <Thead>
            <Tr>
              <Th>Fahrzeug</Th>
              <Th>Vermieter</Th>
              <Th>Hersteller</Th>
              <Th>Typ</Th>
              <Th>Land</Th>
              <Th>Stadt</Th>
              <Th>Seit</Th>
            </Tr>
          </Thead>
          <Tbody>
            {mostRecent.map((row) => (
              <Tr key={`${row.vermieterName}-${row.fahrzeugLabel}`}>
                <Td>{row.fahrzeugId ?? row.fahrzeugLabel}</Td>
                <Td>{row.vermieterName}</Td>
                <Td>{row.manufacturer ?? '–'}</Td>
                <Td>{row.fahrzeugtyp}</Td>
                <Td>{row.land}</Td>
                <Td>{row.stadt}</Td>
                <Td>
                  <Flex align="center" gap={2}>
                    <Icon as={FiClock} />
                    <Text>
                      {row.ageDays != null ? `${row.ageDays} Tage` : 'N/A'}
                      {row.listedAt ? ` (${row.listedAt.split('T')[0]})` : ''}
                    </Text>
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}
