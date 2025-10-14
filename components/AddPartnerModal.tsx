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
  SimpleGrid,
  Stack,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';

type VehicleFormState = {
  id: string;
  label: string;
  vehicleType: string;
  manufacturer: string;
  status: string;
  notes: string;
};

type FormState = {
  ownerName: string;
  country: string;
  region: string;
  city: string;
  street: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  ownerNotes: string;
  internationalCustomers: string;
  commission: string;
  ranking: string;
  experienceYears: string;
  vehicles: VehicleFormState[];
};

const createVehicle = (): VehicleFormState => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `vehicle-${Math.random().toString(36).slice(2)}`,
  label: '',
  vehicleType: '',
  manufacturer: '',
  status: 'aktiv',
  notes: '',
});

const createInitialForm = (defaultCountry?: string): FormState => ({
  ownerName: '',
  country: defaultCountry ?? '',
  region: '',
  city: '',
  street: '',
  postalCode: '',
  phone: '',
  email: '',
  website: '',
  ownerNotes: '',
  internationalCustomers: '',
  commission: '',
  ranking: '',
  experienceYears: '',
  vehicles: [createVehicle()],
});

const EXPERIENCE_OPTIONS = ['0-1', ...Array.from({ length: 25 }, (_, index) => String(index + 1))];
const RANKING_OPTIONS = ['A', 'B', 'C', 'D'];

type AddPartnerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableCountries: string[];
  availableVehicleTypes: string[];
  availableManufacturers: string[];
  defaultCountry?: string;
};

export function AddPartnerModal({
  isOpen,
  onClose,
  onSuccess,
  availableCountries,
  availableVehicleTypes,
  availableManufacturers,
  defaultCountry,
}: AddPartnerModalProps) {
  const [form, setForm] = useState<FormState>(() => createInitialForm(defaultCountry));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setForm(createInitialForm(defaultCountry));
    }
  }, [isOpen, defaultCountry]);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleVehicleChange =
    (vehicleId: string, field: keyof VehicleFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      if (prev.vehicles.length === 1) {
        return prev;
      }
      return {
        ...prev,
        vehicles: prev.vehicles.filter((vehicle) => vehicle.id !== vehicleId),
      };
    });
  };

  const resetForm = () => {
    setForm(createInitialForm(defaultCountry));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const ownerName = form.ownerName.trim();
    const country = form.country.trim();
    const city = form.city.trim();

    const preparedVehicles = form.vehicles
      .map((vehicle) => ({
        ...vehicle,
        label: vehicle.label.trim(),
        vehicleType: vehicle.vehicleType.trim(),
        manufacturer: vehicle.manufacturer.trim(),
        status: vehicle.status || 'aktiv',
        notes: vehicle.notes.trim(),
      }))
      .filter((vehicle) => vehicle.label.length > 0);

    if (!ownerName || !country || !city || preparedVehicles.length === 0) {
      toast({
        status: 'warning',
        title: 'Bitte Vermieter, Standort und mindestens ein Fahrzeug ausfüllen.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const region = form.region.trim();
      const street = form.street.trim();
      const postalCode = form.postalCode.trim();
      const address = [street, postalCode, city].filter(Boolean).join(', ');

      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: {
            name: ownerName,
            country,
            region,
            city,
            street,
            postalCode,
            address,
            phone: form.phone.trim(),
            email: form.email.trim(),
            website: form.website.trim(),
            internationalCustomers: form.internationalCustomers,
            commission: form.commission.trim(),
            ranking: form.ranking,
            experienceYears: form.experienceYears,
            notes: form.ownerNotes.trim(),
            lastChangeIso: new Date().toISOString().split('T')[0],
          },
          vehicles: preparedVehicles.map((vehicle) => ({
            label: vehicle.label,
            vehicleType: vehicle.vehicleType,
            manufacturer: vehicle.manufacturer,
            status: vehicle.status,
            notes: vehicle.notes,
          })),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Speichern fehlgeschlagen');
      }

      toast({ status: 'success', title: 'Vermieter erfolgreich angelegt.' });
      onSuccess();
      resetForm();
      onClose();
    } catch (error) {
      console.error('[add-partner-modal]', error);
      toast({
        status: 'error',
        title: 'Speichern fehlgeschlagen',
        description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      size="xl"
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Vermieter hinzufügen</ModalHeader>
        <ModalCloseButton disabled={isSubmitting} />
        <ModalBody display="grid" gap={6}>
          <Box>
            <Box fontWeight="semibold" mb={3}>
              Vermieter
            </Box>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={form.ownerName}
                  onChange={handleChange('ownerName')}
                  placeholder="Vermieter"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Land</FormLabel>
                <Input
                  value={form.country}
                  onChange={handleChange('country')}
                  list="country-suggestions"
                  placeholder="Deutschland"
                />
                <Box as="datalist" id="country-suggestions">
                  {availableCountries.map((countryOption) => (
                    <option value={countryOption} key={countryOption} />
                  ))}
                </Box>
              </FormControl>
              <FormControl>
                <FormLabel>Bundesland</FormLabel>
                <Input
                  value={form.region}
                  onChange={handleChange('region')}
                  placeholder="z. B. Bayern"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Stadt</FormLabel>
                <Input
                  value={form.city}
                  onChange={handleChange('city')}
                  placeholder="z. B. München"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Straße / Hausnummer</FormLabel>
                <Input
                  value={form.street}
                  onChange={handleChange('street')}
                  placeholder="z. B. Musterstraße 1"
                />
              </FormControl>
              <FormControl>
                <FormLabel>PLZ</FormLabel>
                <Input
                  value={form.postalCode}
                  onChange={handleChange('postalCode')}
                  placeholder="z. B. 10115"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Telefon</FormLabel>
                <Input
                  value={form.phone}
                  onChange={handleChange('phone')}
                  placeholder="+49 ..."
                />
              </FormControl>
              <FormControl>
                <FormLabel>E-Mail</FormLabel>
                <Input
                  value={form.email}
                  onChange={handleChange('email')}
                  type="email"
                  placeholder="kontakt@example.com"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Website</FormLabel>
                <Input
                  value={form.website}
                  onChange={handleChange('website')}
                  placeholder="https://"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Internationale Kunden</FormLabel>
                <Select
                  placeholder="Auswahl"
                  value={form.internationalCustomers}
                  onChange={handleChange('internationalCustomers')}
                >
                  <option value="ja">Ja</option>
                  <option value="nein">Nein</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Provision</FormLabel>
                <Input
                  value={form.commission}
                  onChange={handleChange('commission')}
                  placeholder="z. B. 15 %"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Ranking</FormLabel>
                <Select
                  placeholder="Auswahl"
                  value={form.ranking}
                  onChange={handleChange('ranking')}
                >
                  {RANKING_OPTIONS.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Erfahrung in Jahren</FormLabel>
                <Select
                  placeholder="Auswahl"
                  value={form.experienceYears}
                  onChange={handleChange('experienceYears')}
                >
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </SimpleGrid>
            <FormControl mt={4}>
              <FormLabel>Notizen</FormLabel>
              <Textarea
                value={form.ownerNotes}
                onChange={handleChange('ownerNotes')}
                placeholder="Optionale interne Notizen zum Vermieter"
                rows={3}
              />
            </FormControl>
          </Box>

          <Box>
            <Flex align="center" justify="space-between" mb={3}>
              <Box fontWeight="semibold">Fahrzeuge</Box>
              <Button
                leftIcon={<AddIcon />}
                onClick={addVehicle}
                variant="outline"
                size="sm"
              >
                Fahrzeug hinzufügen
              </Button>
            </Flex>
            <Stack spacing={4}>
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
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Fahrzeugbezeichnung</FormLabel>
                      <Input
                        value={vehicle.label}
                        onChange={handleVehicleChange(vehicle.id, 'label')}
                        placeholder="z. B. BMW M3 Competition"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Fahrzeugtyp</FormLabel>
                      <Input
                        value={vehicle.vehicleType}
                        onChange={handleVehicleChange(vehicle.id, 'vehicleType')}
                        list="vehicle-type-suggestions"
                        placeholder="z. B. Sportwagen"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Hersteller</FormLabel>
                      <Input
                        value={vehicle.manufacturer}
                        onChange={handleVehicleChange(vehicle.id, 'manufacturer')}
                        list="manufacturer-suggestions"
                        placeholder="z. B. BMW"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={vehicle.status}
                        onChange={handleVehicleChange(vehicle.id, 'status')}
                      >
                        <option value="aktiv">aktiv</option>
                        <option value="inaktiv">inaktiv</option>
                      </Select>
                    </FormControl>
                  </SimpleGrid>
                  <FormControl mt={4}>
                    <FormLabel>Notizen</FormLabel>
                    <Textarea
                      value={vehicle.notes}
                      onChange={handleVehicleChange(vehicle.id, 'notes')}
                      placeholder="Optionale interne Notizen zum Fahrzeug"
                      rows={3}
                    />
                  </FormControl>
                </Box>
              ))}
            </Stack>
            <Box as="datalist" id="vehicle-type-suggestions">
              {availableVehicleTypes.map((type) => (
                <option value={type} key={type} />
              ))}
            </Box>
            <Box as="datalist" id="manufacturer-suggestions">
              {availableManufacturers.map((manufacturer) => (
                <option value={manufacturer} key={manufacturer} />
              ))}
            </Box>
          </Box>
        </ModalBody>
        <ModalFooter>
          <Flex gap={3} w="100%" justify="flex-end">
            <Button
              onClick={() => {
                resetForm();
                onClose();
              }}
              variant="ghost"
              disabled={isSubmitting}
            >
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
