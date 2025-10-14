import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  fonts: {
    heading: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    body: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  colors: {
    brand: {
      50: '#e5f0ff',
      100: '#c0d6ff',
      200: '#99baff',
      300: '#739eff',
      400: '#4d82ff',
      500: '#3368e6',
      600: '#264fb4',
      700: '#1a3681',
      800: '#0e1d4f',
      900: '#02031f',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'gray.900',
        color: 'gray.50',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: '999px',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: { bg: 'brand.400' },
          _active: { bg: 'brand.600' },
        },
      },
    },
    Stat: {
      baseStyle: {
        container: {
          borderRadius: 'lg',
          bg: 'gray.800',
        },
      },
    },
  },
});
