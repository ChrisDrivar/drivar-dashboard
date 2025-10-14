'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
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

type MissingInventoryForm = {
  country: string;
  region: string;
  city: string;
  vehicleType: string;
  count: string;
  priority: string;
  comment: string;
};

const INITIAL_FORM: MissingInventoryForm = {
  country: '',
  region: '',
  city: '',
  vehicleType: '',
  count: '',
  priority: '',
  comment: '',
};

type AddMissingInventoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableCountries: string[];
  availableRegions: string[];
  availableCities: string[];
  availableVehicleTypes: string[];
  defaultCountry?: string;
  defaultRegion?: string;
};

const PRIORITY_OPTIONS = ['hoch', 'mittel', 'niedrig'];

export function AddMissingInventoryModal({
  isOpen,
  onClose,
  onSuccess,
  availableCountries,
  availableRegions,
  availableCities,
  availableVehicleTypes,
  defaultCountry,
  defaultRegion,
}: AddMissingInventoryModalProps) {
  const [form, setForm] = useState<MissingInventoryForm>({
    ...INITIAL_FORM,
    country: defaultCountry ?? '',
    region: defaultRegion ?? '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...INITIAL_FORM,
        country: defaultCountry ?? '',
        region: defaultRegion ?? '',
      });
    }
  }, [isOpen, defaultCountry, defaultRegion]);

  const handleClose = () => {
    setForm({
      ...INITIAL_FORM,
      country: defaultCountry ?? '',
      region: defaultRegion ?? '',
    });
    onClose();
  };

  const setField =
    (field: keyof MissingInventoryForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.city.trim() || !form.vehicleType.trim() || !form.count.trim()) {
      toast({
        status: 'warning',
        title: 'Bitte Stadt, Fahrzeugtyp und Anzahl ausfüllen.',
      });
      return;
    }

    const count = Number(form.count);
    if (Number.isNaN(count) || count <= 0) {
      toast({
        status: 'warning',
        title: 'Anzahl muss größer als 0 sein.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/missing-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: form.country.trim(),
          region: form.region.trim(),
          city: form.city.trim(),
          vehicleType: form.vehicleType.trim(),
          count,
          priority: form.priority.trim(),
          comment: form.comment.trim(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Speichern fehlgeschlagen');
      }

      toast({ status: 'success', title: 'Bedarf erfolgreich erfasst.' });
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('[missing-inventory-modal]', error);
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
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Fahrzeugbedarf erfassen</ModalHeader>
        <ModalCloseButton disabled={isSubmitting} />
        <ModalBody display="grid" gap={4}>
          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl>
              <FormLabel>Land</FormLabel>
              <Input
                value={form.country}
                onChange={setField('country')}
                list="missing-country-suggestions"
                placeholder="z. B. Deutschland"
              />
              <Box as="datalist" id="missing-country-suggestions">
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
                list="missing-region-suggestions"
                placeholder="z. B. Bayern"
              />
              <Box as="datalist" id="missing-region-suggestions">
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
              list="missing-city-suggestions"
              placeholder="z. B. München"
            />
            <Box as="datalist" id="missing-city-suggestions">
              {availableCities.map((city) => (
                <option value={city} key={city} />
              ))}
            </Box>
          </FormControl>

  <FormControl isRequired>
            <FormLabel>Fahrzeugtyp</FormLabel>
            <Input
              value={form.vehicleType}
              onChange={setField('vehicleType')}
              list="missing-vehicle-type-suggestions"
              placeholder="z. B. Sportwagen"
            />
            <Box as="datalist" id="missing-vehicle-type-suggestions">
              {availableVehicleTypes.map((type) => (
                <option value={type} key={type} />
              ))}
            </Box>
          </FormControl>

          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl isRequired>
              <FormLabel>Anzahl fehlend</FormLabel>
              <Input
                value={form.count}
                onChange={setField('count')}
                type="number"
                min="1"
                step="1"
                placeholder="z. B. 5"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Prio</FormLabel>
              <Select placeholder="Auswahl" value={form.priority} onChange={setField('priority')}>
                {PRIORITY_OPTIONS.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Flex>

          <FormControl>
            <FormLabel>Kommentar</FormLabel>
            <Textarea
              value={form.comment}
              onChange={setField('comment')}
              placeholder="Weitere Hinweise oder Quellen"
              rows={3}
            />
          </FormControl>
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
