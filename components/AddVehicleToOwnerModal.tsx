'use client';

import { useEffect, useMemo, useState } from 'react';
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

type OwnerOption = {
  name: string;
  country?: string;
  region?: string;
  city?: string;
  street?: string;
  postalCode?: string;
  address?: string;
};

type VehicleForm = {
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
  address: string;
  vehicles: VehicleForm[];
};

const createVehicle = (): VehicleForm => ({
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

const createInitialForm = (owner?: OwnerOption | null): FormState => ({
  ownerName: owner?.name ?? '',
  country: owner?.country ?? '',
  region: owner?.region ?? '',
  city: owner?.city ?? '',
  street: owner?.street ?? '',
  postalCode: owner?.postalCode ?? '',
  address: owner?.address ?? '',
  vehicles: [createVehicle()],
});

type AddVehicleToOwnerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  owners: OwnerOption[];
  initialOwner?: OwnerOption | null;
  availableVehicleTypes: string[];
  availableManufacturers: string[];
};

export function AddVehicleToOwnerModal({
  isOpen,
  onClose,
  onSuccess,
  owners,
  initialOwner,
  availableVehicleTypes,
  availableManufacturers,
}: AddVehicleToOwnerModalProps) {
  const normalizeName = (value: string) => value.trim().toLowerCase();
  const [form, setForm] = useState<FormState>(() => createInitialForm(initialOwner));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const ownerOptions = useMemo(
    () => [...owners].sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [owners]
  );
  const ownerLookup = useMemo(
    () =>
      new Map(
        owners.map((owner) => [
          normalizeName(owner.name),
          owner,
        ])
      ),
    [owners]
  );

  useEffect(() => {
    if (isOpen) {
      setForm(createInitialForm(initialOwner));
    }
  }, [isOpen, initialOwner]);

  const handleOwnerSelect = (value: string) => {
    const normalized = normalizeName(value);
    const owner = ownerLookup.get(normalized);
    setForm((prev) => ({
      ...prev,
      ownerName: value,
      country: owner?.country ?? prev.country,
      region: owner?.region ?? prev.region,
      city: owner?.city ?? prev.city,
      street: owner?.street ?? prev.street,
      postalCode: owner?.postalCode ?? prev.postalCode,
      address: owner?.address ?? prev.address,
    }));
  };

  const handleFieldChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleVehicleChange =
    (vehicleId: string, field: keyof VehicleForm) =>
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
      if (prev.vehicles.length === 1) return prev;
      return {
        ...prev,
        vehicles: prev.vehicles.filter((vehicle) => vehicle.id !== vehicleId),
      };
    });
  };

  const resetAndClose = () => {
    setForm(createInitialForm(initialOwner));
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const ownerName = form.ownerName.trim();
    const country = form.country.trim();
    const city = form.city.trim();

    const preparedVehicles = form.vehicles
      .map((vehicle) => ({
        label: vehicle.label.trim(),
        vehicleType: vehicle.vehicleType.trim(),
        manufacturer: vehicle.manufacturer.trim(),
        status: vehicle.status.trim() || 'aktiv',
        notes: vehicle.notes.trim(),
      }))
      .filter((vehicle) => vehicle.label.length > 0 || vehicle.vehicleType.length > 0);

    if (!ownerName || !country || !city || preparedVehicles.length === 0) {
      toast({
        status: 'warning',
        title: 'Bitte Vermieter, Standort und mindestens ein Fahrzeug ausfüllen.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: {
            name: ownerName,
            country,
            region: form.region.trim(),
            city,
            street: form.street.trim(),
            postalCode: form.postalCode.trim(),
            address: form.address.trim(),
            lastChangeIso: new Date().toISOString().split('T')[0],
          },
          vehicles: preparedVehicles,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Speichern fehlgeschlagen');
      }

      toast({ status: 'success', title: 'Fahrzeug(e) hinzugefügt.' });
      onSuccess();
      resetAndClose();
    } catch (error) {
      console.error('[add-vehicle-existing-owner]', error);
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
    <Modal isOpen={isOpen} onClose={resetAndClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Fahrzeuge bei Vermieter anlegen</ModalHeader>
        <ModalCloseButton disabled={isSubmitting} />
        <ModalBody display="grid" gap={6}>
          <Box>
            <FormControl isRequired>
              <FormLabel>Vermieter</FormLabel>
              <Select
                placeholder="Auswahl"
                value={form.ownerName}
                onChange={(event) => handleOwnerSelect(event.target.value)}
              >
                {ownerOptions.map((owner) => (
                  <option value={owner.name} key={owner.name}>
                    {owner.name}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl isRequired>
              <FormLabel>Land</FormLabel>
              <Input value={form.country} onChange={handleFieldChange('country')} placeholder="z. B. Deutschland" />
            </FormControl>
            <FormControl>
              <FormLabel>Bundesland</FormLabel>
              <Input value={form.region} onChange={handleFieldChange('region')} placeholder="z. B. Bayern" />
            </FormControl>
          </Flex>

          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl isRequired>
              <FormLabel>Stadt</FormLabel>
              <Input value={form.city} onChange={handleFieldChange('city')} placeholder="z. B. München" />
            </FormControl>
            <FormControl>
              <FormLabel>PLZ</FormLabel>
              <Input value={form.postalCode} onChange={handleFieldChange('postalCode')} placeholder="optional" />
            </FormControl>
          </Flex>

          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl>
              <FormLabel>Straße / Hausnummer</FormLabel>
              <Input
                value={form.street}
                onChange={handleFieldChange('street')}
                placeholder="optional"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Adresse (frei)</FormLabel>
              <Input
                value={form.address}
                onChange={handleFieldChange('address')}
                placeholder="z. B. Musterstraße 1, 10115 Berlin"
              />
            </FormControl>
          </Flex>

          <Box>
            <Flex align="center" justify="space-between" mb={3}>
              <Box fontWeight="semibold">Fahrzeuge</Box>
              <Button leftIcon={<AddIcon />} onClick={addVehicle} size="sm" variant="outline">
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
                        size="sm"
                        variant="ghost"
                        onClick={() => removeVehicle(vehicle.id)}
                      />
                    )}
                  </Flex>
                  <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
                    <FormControl isRequired>
                      <FormLabel>Bezeichnung</FormLabel>
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
                        list="existing-vehicle-type-suggestions"
                        placeholder="z. B. Sportwagen"
                      />
                    </FormControl>
                  </Flex>
                  <Flex gap={4} direction={{ base: 'column', md: 'row' }} mt={4}>
                    <FormControl>
                      <FormLabel>Hersteller</FormLabel>
                      <Input
                        value={vehicle.manufacturer}
                        onChange={handleVehicleChange(vehicle.id, 'manufacturer')}
                        list="existing-manufacturer-suggestions"
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
                  </Flex>
                  <FormControl mt={4}>
                    <FormLabel>Notizen</FormLabel>
                    <Textarea
                      value={vehicle.notes}
                      onChange={handleVehicleChange(vehicle.id, 'notes')}
                      placeholder="Optionale interne Notizen zum Fahrzeug"
                      rows={2}
                    />
                  </FormControl>
                </Box>
              ))}
            </Box>
            <Box as="datalist" id="existing-vehicle-type-suggestions">
              {availableVehicleTypes.map((type) => (
                <option value={type} key={type} />
              ))}
            </Box>
            <Box as="datalist" id="existing-manufacturer-suggestions">
              {availableManufacturers.map((manufacturer) => (
                <option value={manufacturer} key={manufacturer} />
              ))}
            </Box>
          </Box>
        </ModalBody>
        <ModalFooter>
          <Flex gap={3} w="100%" justify="flex-end">
            <Button onClick={resetAndClose} variant="ghost" disabled={isSubmitting}>
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
