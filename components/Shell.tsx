'use client';

import { Box, Flex, Heading, IconButton, Spacer, Text, useColorMode } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';

type ShellProps = {
  children: React.ReactNode;
};

export function Shell({ children }: ShellProps) {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Flex direction="column" minH="100vh" bg="gray.900" px={{ base: 4, md: 10 }} py={6} gap={8}>
      <Flex align="center" gap={4}>
        <Box>
          <Heading fontSize={{ base: '2xl', md: '3xl' }}>DRIVAR Performance Dashboard</Heading>
          <Text color="gray.400" fontSize="sm">
            Überblick über Vermieter, Fahrzeuge und Conversion
          </Text>
        </Box>
        <Spacer />
        <IconButton
          aria-label="Farbschema wechseln"
          icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
          onClick={toggleColorMode}
          variant="ghost"
        />
      </Flex>
      <Box flex="1" pb={10}>
        {children}
      </Box>
    </Flex>
  );
}
