'use client';

import { Stat, StatHelpText, StatLabel, StatNumber } from '@chakra-ui/react';

type Props = {
  label: string;
  value: number | string;
  delta?: number;
};

export function KpiCard({ label, value, delta }: Props) {
  return (
    <Stat
      bg="linear-gradient(135deg, rgba(51,104,230,0.25), rgba(10,10,30,0.9))"
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="2xl"
      p={6}
      shadow="xl"
    >
      <StatLabel textTransform="uppercase" letterSpacing="wide" color="gray.400" fontSize="sm">
        {label}
      </StatLabel>
      <StatNumber fontSize="3xl" fontWeight="extrabold">
        {value}
      </StatNumber>
      {typeof delta === 'number' && (
        <StatHelpText color={delta >= 0 ? 'green.300' : 'red.300'}>
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(1)}% vs. Vorperiode
        </StatHelpText>
      )}
    </Stat>
  );
}
