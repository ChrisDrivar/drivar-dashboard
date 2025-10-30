'use client';

import { Fragment, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import type { CircleMarkerProps } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LatLngExpression, type LeafletMouseEvent } from 'leaflet';
import { Box, Button, Flex, Heading, Skeleton, Stack, Text } from '@chakra-ui/react';
import type { GeoLocationPoint } from '@/types/kpis';

export type PartnerMapProps = {
  locations: GeoLocationPoint[];
  country?: string;
  isLoading?: boolean;
  showHalo?: boolean;
  radiusKm?: number;
  activeOwnerKeys?: string[];
  selectedOwners?: string[];
  onLocationSelect?: (location: GeoLocationPoint) => void;
  onClearSelection?: () => void;
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

const MARKER_COLOR = '#ce7ad5';

const circleStyle: Pick<CircleMarkerProps, 'pathOptions'> = {
  pathOptions: {
    stroke: true,
    color: MARKER_COLOR,
    weight: 1.5,
    fill: true,
    fillColor: MARKER_COLOR,
    fillOpacity: 0.92,
  },
};

const activeCircleStyle: Pick<CircleMarkerProps, 'pathOptions'> = {
  pathOptions: {
    stroke: true,
    color: '#f7cfff',
    weight: 2.5,
    fill: true,
    fillColor: '#f0a2f1',
    fillOpacity: 0.98,
  },
};

export default function PartnerMapLeaflet({
  locations,
  country,
  isLoading = false,
  showHalo = false,
  radiusKm,
  activeOwnerKeys,
  selectedOwners,
  onLocationSelect,
  onClearSelection,
}: PartnerMapProps) {
  const coords = useMemo(() => {
    return locations
      .filter((item) => typeof item.latitude === 'number' && typeof item.longitude === 'number')
      .map((item) => [item.latitude, item.longitude] as [number, number]);
  }, [locations]);

  const activeOwnerKeySet = useMemo(() => new Set(activeOwnerKeys ?? []), [activeOwnerKeys]);

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
        <Flex align="flex-start" justify="space-between" mb={4} gap={4}>
          <Box>
            <Heading size="md">Standorte der Vermieter</Heading>
            <Text mt={1} fontSize="sm" color="gray.400">
              {country ? `Markt: ${country}` : 'Weltweite Verteilung der aktiven Standorte'}
            </Text>
          </Box>
          <Box textAlign="right" minW="12rem">
            <Stack spacing={2} align="flex-end">
              <Text fontSize="sm" color="gray.300">
                {locations.length} Standorte
              </Text>
              {selectedOwners && selectedOwners.length > 0 && (
                <Stack spacing={1} align="flex-end">
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase">
                    Kartenfilter
                  </Text>
                  <Text fontSize="sm" color="gray.100" maxW="20rem">
                    {selectedOwners.slice(0, 3).join(', ')}
                    {selectedOwners.length > 3 &&
                      `, +${selectedOwners.length - 3} weitere`}
                  </Text>
                  {onClearSelection && (
                    <Button size="xs" variant="outline" onClick={onClearSelection}>
                      Filter löschen
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
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
              const isActive =
                location.owners?.some((owner) => activeOwnerKeySet.has(owner.key)) ?? false;
              const markerStyle = isActive ? activeCircleStyle : circleStyle;
              const ownerPreview = location.owners?.slice(0, 4) ?? [];
              const remainingOwners =
                location.owners && location.owners.length > ownerPreview.length
                  ? location.owners.length - ownerPreview.length
                  : 0;
              return (
                <Fragment key={`${location.latitude}-${location.longitude}`}>
                  {showHalo && (
                    <Circle
                      center={position}
                      radius={(radiusKm ?? 50) * 1000}
                      pathOptions={{ color: MARKER_COLOR, weight: 1.2, opacity: 0.25, fillOpacity: 0 }}
                      interactive={false}
                    />
                  )}
                  <CircleMarker
                    center={position}
                    radius={6}
                    pathOptions={markerStyle.pathOptions}
                    eventHandlers={
                      onLocationSelect
                        ? {
                            click: () => onLocationSelect(location),
                            mouseover: (event: LeafletMouseEvent) => {
                              const target = event.target as L.Path & { _map?: L.Map };
                              target.setStyle({ weight: 3 });
                              target._map?.getContainer().style.setProperty('cursor', 'pointer');
                            },
                            mouseout: (event: LeafletMouseEvent) => {
                              const target = event.target as L.Path & { _map?: L.Map };
                              target.setStyle(markerStyle.pathOptions ?? {});
                              target._map?.getContainer().style.removeProperty('cursor');
                            },
                          }
                        : undefined
                    }
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
                        {ownerPreview.length > 0 && (
                          <Box mt={2}>
                            <Text fontSize="xs" color="gray.300" textTransform="uppercase">
                              Vermieter
                            </Text>
                            {ownerPreview.map((owner) => (
                              <Text key={owner.key} fontSize="sm" color="gray.100">
                                {owner.name}
                              </Text>
                            ))}
                            {remainingOwners > 0 && (
                              <Text fontSize="xs" color="gray.400">
                                +{remainingOwners} weitere
                              </Text>
                            )}
                          </Box>
                        )}
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
