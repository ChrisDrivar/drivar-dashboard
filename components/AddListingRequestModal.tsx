'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';

const CHANNEL_OPTIONS = ['Inbound', 'Outbound', 'Messe', 'Empfehlung'];

type VehicleForm = {
  id: string;
  vehicleLabel: string;
  manufacturer: string;
  vehicleType: string;
  comment: string;
};

type ListingRequestForm = {
  date: string;
  channel: string;
  region: string;
  city: string;
  country: string;
  landlord: string;
  comment: string;
  vehicles: VehicleForm[];
};

const createVehicle = (): VehicleForm => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `vehicle-${Math.random().toString(36).slice(2)}`,
  vehicleLabel: '',
  manufacturer: '',
  vehicleType: '',
  comment: '',
});

const INITIAL_FORM: ListingRequestForm = {
  date: '',
  channel: '',
  region: '',
  city: '',
  country: '',
  landlord: '',
  comment: '',
  vehicles: [createVehicle()],
};

type AddListingRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableCountries: string[];
  availableRegions: string[];
  availableCities: string[];
  availableVehicleTypes: string[];
  availableManufacturers: string[];
  defaultCountry?: string;
  defaultRegion?: string;
};

export function AddListingRequestModal({
  isOpen,
  onClose,
  onSuccess,
  availableCountries,
  availableRegions,
  availableCities,
  availableVehicleTypes,
  availableManufacturers,
  defaultCountry,
  defaultRegion,
}: AddListingRequestModalProps) {
  const [form, setForm] = useState<ListingRequestForm>({
    ...INITIAL_FORM,
    date: new Date().toISOString().split('T')[0],
    country: defaultCountry ?? '',
    region: defaultRegion ?? '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...INITIAL_FORM,
        date: new Date().toISOString().split('T')[0],
        country: defaultCountry ?? '',
        region: defaultRegion ?? '',
      });
    }
  }, [isOpen, defaultCountry, defaultRegion]);

  const setField =
    (field: keyof ListingRequestForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const setVehicleField =
    (vehicleId: string, field: keyof VehicleForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((vehicle) =>
          vehicle.id === vehicleId ? { ...vehicle, [field]: value } : vehicle
        ),
      }));
    };

  const addVehicle = () => {
    setForm((prev) => ({
      ...prev,
      vehicles: [...prev.vehicles, createVehicle()],
    }));
  };

  const removeVehicle = (vehicleId: string) => {
    setForm((prev) => {
      if (prev.vehicles.length === 1) return prev;
      return {
        ...prev,
        vehicles: prev.vehicles.filter((vehicle) => vehicle.id !== vehicleId),
      };
    });
  };

  const handleClose = () => {
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.landlord.trim() || !form.city.trim()) {
      toast({ status: 'warning', title: 'Bitte Vermieter und Stadt ausfüllen.' });
      return;
    }

    const vehicles = form.vehicles
      .map((vehicle) => ({
        vehicleLabel: vehicle.vehicleLabel.trim(),
        manufacturer: vehicle.manufacturer.trim(),
        vehicleType: vehicle.vehicleType.trim(),
        comment: vehicle.comment.trim(),
      }))
      .filter((vehicle) => vehicle.vehicleType.length > 0 || vehicle.vehicleLabel.length > 0);

    if (vehicles.length === 0) {
      toast({ status: 'warning', title: 'Bitte mindestens ein Fahrzeug mit Typ erfassen.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/listing-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: {
            date: form.date,
            channel: form.channel,
            region: form.region,
            city: form.city,
            country: form.country,
            landlord: form.landlord.trim(),
            comment: form.comment.trim(),
          },
          vehicles,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Speichern fehlgeschlagen');
      }

      toast({ status: 'success', title: 'Lead gespeichert.' });
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('[listing-request-modal]', error);
      toast({ status: 'error', title: 'Speichern fehlgeschlagen', description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Lead in Bearbeitung</ModalHeader>
        <ModalCloseButton disabled={isSubmitting} />
        <ModalBody display="grid" gap={4}>
          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl>
              <FormLabel>Datum</FormLabel>
              <Input type="date" value={form.date} onChange={setField('date')} />
            </FormControl>
            <FormControl>
              <FormLabel>Kanal</FormLabel>
              <Select placeholder="Auswahl" value={form.channel} onChange={setField('channel')}>
                {CHANNEL_OPTIONS.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Flex>

          <FormControl isRequired>
            <FormLabel>Vermieter</FormLabel>
            <Input value={form.landlord} onChange={setField('landlord')} placeholder="Vermieter" />
          </FormControl>

          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl>
              <FormLabel>Land</FormLabel>
              <Input
                value={form.country}
                onChange={setField('country')}
                list="pending-country-suggestions"
                placeholder="Deutschland"
              />
              <Box as="datalist" id="pending-country-suggestions">
                {availableCountries.map((country) => (
                  <option value={country} key={country} />
                ))}
              </Box>
            </FormControl>
            <FormControl>
              <FormLabel>Region / Bundesland</FormLabel>
              <Input
                value={form.region}
                onChange={setField('region')}
                list="pending-region-suggestions"
                placeholder="Bayern"
              />
              <Box as="datalist" id="pending-region-suggestions">
                {availableRegions.map((region) => (
                  <option value={region} key={region} />
                ))}
              </Box>
            </FormControl>
          </Flex>

          <FormControl isRequired>
            <FormLabel>Stadt</FormLabel>
            <Input
              value={form.city}
              onChange={setField('city')}
              list="pending-city-suggestions"
              placeholder="München"
            />
            <Box as="datalist" id="pending-city-suggestions">
              {availableCities.map((city) => (
                <option value={city} key={city} />
              ))}
            </Box>
          </FormControl>

          <Box>
            <Flex align="center" justify="space-between" mb={3}>
              <Box fontWeight="semibold">Fahrzeuge</Box>
              <Button size="sm" variant="outline" leftIcon={<AddIcon />} onClick={addVehicle}>
                Fahrzeug hinzufügen
              </Button>
            </Flex>
            <Box display="grid" gap={4}>
              {form.vehicles.map((vehicle, index) => (
                <Box
                  key={vehicle.id}
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="2xl"
                  bg="blackAlpha.300"
                  p={4}
                >
                  <Flex align="center" justify="space-between" mb={3}>
                    <Box fontWeight="semibold">Fahrzeug {index + 1}</Box>
                    {form.vehicles.length > 1 && (
                      <IconButton
                        aria-label="Fahrzeug entfernen"
                        icon={<DeleteIcon />}
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVehicle(vehicle.id)}
                      />
                    )}
                  </Flex>
                  <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
                    <FormControl>
                      <FormLabel>Bezeichnung</FormLabel>
                      <Input
                        value={vehicle.vehicleLabel}
                        onChange={setVehicleField(vehicle.id, 'vehicleLabel')}
                        placeholder="BMW M3 Competition"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Hersteller</FormLabel>
                      <Input
                        value={vehicle.manufacturer}
                        onChange={setVehicleField(vehicle.id, 'manufacturer')}
                        list="pending-manufacturer-suggestions"
                        placeholder="BMW"
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Fahrzeugtyp</FormLabel>
                      <Input
                        value={vehicle.vehicleType}
                        onChange={setVehicleField(vehicle.id, 'vehicleType')}
                        list="pending-vehicle-type-suggestions"
                        placeholder="Sportwagen"
                      />
                    </FormControl>
                  </Flex>
                  <FormControl mt={4}>
                    <FormLabel>Kommentar</FormLabel>
                    <Textarea
                      value={vehicle.comment}
                      onChange={setVehicleField(vehicle.id, 'comment')}
                      placeholder="Status oder nächste Schritte zu diesem Fahrzeug"
                      rows={2}
                    />
                  </FormControl>
                </Box>
              ))}
            </Box>
          </Box>

          <FormControl>
            <FormLabel>Allgemeiner Kommentar</FormLabel>
            <Textarea
              value={form.comment}
              onChange={setField('comment')}
              placeholder="Gesamter Status, Follow-ups, nächste Schritte"
              rows={3}
            />
          </FormControl>

          <Box as="datalist" id="pending-manufacturer-suggestions">
            {availableManufacturers.map((manufacturer) => (
              <option value={manufacturer} key={manufacturer} />
            ))}
          </Box>
          <Box as="datalist" id="pending-vehicle-type-suggestions">
            {availableVehicleTypes.map((type) => (
              <option value={type} key={type} />
            ))}
          </Box>
        </ModalBody>
        <ModalFooter>
          <Flex gap={3} justify="flex-end" w="100%">
            <Button onClick={handleClose} variant="ghost" disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button colorScheme="brand" type="submit" isLoading={isSubmitting}>
              Speichern
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
