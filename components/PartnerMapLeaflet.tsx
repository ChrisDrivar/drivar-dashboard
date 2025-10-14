'use client';

import { Fragment, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import type { CircleMarkerProps } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LatLngExpression } from 'leaflet';
import { Box, Flex, Heading, Skeleton, Text } from '@chakra-ui/react';
import type { GeoLocationPoint } from '@/types/kpis';

export type PartnerMapProps = {
  locations: GeoLocationPoint[];
  country?: string;
  isLoading?: boolean;
  showHalo?: boolean;
  radiusKm?: number;
};

type BoundsControllerProps = {
  bounds: L.LatLngBoundsExpression | null;
  fallbackCenter: LatLngExpression;
};

function BoundsController({ bounds, fallbackCenter }: BoundsControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else {
      map.setView(fallbackCenter, 2);
    }
  }, [bounds, fallbackCenter, map]);

  return null;
}

const circleStyle: Pick<CircleMarkerProps, 'pathOptions'> = {
  pathOptions: {
    stroke: true,
    color: '#E2E8F0',
    weight: 1,
    fill: true,
    fillColor: '#4D82FF',
    fillOpacity: 0.9,
  },
};

export default function PartnerMapLeaflet({
  locations,
  country,
  isLoading = false,
  showHalo = false,
  radiusKm,
}: PartnerMapProps) {
  const coords = useMemo(() => {
    return locations
      .filter((item) => typeof item.latitude === 'number' && typeof item.longitude === 'number')
      .map((item) => [item.latitude, item.longitude] as [number, number]);
  }, [locations]);

  const bounds = useMemo(() => {
    if (!coords.length) return null;
    return L.latLngBounds(coords);
  }, [coords]);

  const fallbackCenter = useMemo<LatLngExpression>(() => {
    if (coords.length) {
      const [sumLat, sumLon] = coords.reduce<[number, number]>(
        (acc, [lat, lon]) => [acc[0] + lat, acc[1] + lon],
        [0, 0]
      );
      return [sumLat / coords.length, sumLon / coords.length] as LatLngExpression;
    }
    return [20, 10];
  }, [coords]);

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
        <Flex align="flex-start" justify="space-between" mb={4}>
          <Box>
            <Heading size="md">Standorte der Vermieter</Heading>
            <Text mt={1} fontSize="sm" color="gray.400">
              {country ? `Markt: ${country}` : 'Weltweite Verteilung der aktiven Standorte'}
            </Text>
          </Box>
          <Box textAlign="right">
            <Text fontSize="sm" color="gray.300">
              {locations.length} Standorte
            </Text>
          </Box>
        </Flex>

        <Box h={{ base: '20rem', md: '24rem' }}>
          <MapContainer
            center={fallbackCenter}
            zoom={3}
            scrollWheelZoom
            style={{ height: '100%', width: '100%', borderRadius: '1.5rem' }}
            preferCanvas
          >
            <BoundsController bounds={bounds} fallbackCenter={fallbackCenter} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {locations.map((location) => {
              const position: LatLngExpression = [location.latitude, location.longitude];
              return (
                <Fragment key={`${location.latitude}-${location.longitude}`}>
                  {showHalo && (
                    <Circle
                      center={position}
                      radius={(radiusKm ?? 50) * 1000}
                      pathOptions={{ color: '#4D82FF', weight: 1.5, opacity: 0.35, fillOpacity: 0 }}
                    />
                  )}
                  <CircleMarker
                    center={position}
                    radius={6}
                    pathOptions={circleStyle.pathOptions}
                  >
                    <Tooltip direction="top" offset={[0, -8]} opacity={0.9} sticky>
                      <Box>
                        <Text fontWeight="bold">{location.stadt || 'Unbekannte Stadt'}</Text>
                        {location.land && (
                          <Text fontSize="sm" color="gray.200">
                            {location.land}
                          </Text>
                        )}
                        <Text fontSize="sm" mt={1}>
                          {location.vehicles} Fahrzeuge
                        </Text>
                        <Text fontSize="sm">{location.ownerCount} Vermieter</Text>
                      </Box>
                    </Tooltip>
                  </CircleMarker>
                </Fragment>
              );
            })}
          </MapContainer>
        </Box>
      </Box>
    </Skeleton>
  );
}
