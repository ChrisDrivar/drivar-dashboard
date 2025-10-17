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
  useToast,
} from '@chakra-ui/react';

type CustomLocationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: {
    label: string;
    latitude: number;
    longitude: number;
    city: string;
    postalCode?: string;
    country?: string;
  }) => void;
  defaultCountry?: string;
  availableCountries: string[];
};

type FormState = {
  country: string;
  city: string;
  postalCode: string;
  region: string;
};

const INITIAL_FORM: FormState = {
  country: '',
  city: '',
  postalCode: '',
  region: '',
};

export function CustomLocationModal({
  isOpen,
  onClose,
  onSelect,
  defaultCountry,
  availableCountries,
}: CustomLocationModalProps) {
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM, country: defaultCountry ?? '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...INITIAL_FORM,
        country: defaultCountry ?? '',
      });
    }
  }, [isOpen, defaultCountry]);

  const setField =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.country.trim() || !form.city.trim()) {
      toast({ status: 'warning', title: 'Bitte Land und Stadt ausfüllen.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: form.country.trim(),
          city: form.city.trim(),
          postalCode: form.postalCode.trim(),
          region: form.region.trim(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Ort konnte nicht gefunden werden.');
      }

      const payload = await response.json();
      const label =
        typeof payload?.label === 'string' && payload.label.trim().length > 0
          ? payload.label.trim()
          : [payload?.postalCode, payload?.city].filter(Boolean).join(' ') || payload?.city;

      onSelect({
        label,
        latitude: Number(payload?.latitude),
        longitude: Number(payload?.longitude),
        city: payload?.city ?? form.city.trim(),
        postalCode: payload?.postalCode ?? form.postalCode.trim(),
        country: payload?.country ?? form.country.trim(),
      });

      toast({ status: 'success', title: 'Standort übernommen.' });
    } catch (error) {
      console.error('[custom-location-modal]', error);
      toast({
        status: 'error',
        title: 'Geocoding fehlgeschlagen',
        description: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Custom Standort</ModalHeader>
        <ModalCloseButton disabled={isSubmitting} />
        <ModalBody display="grid" gap={4}>
          <FormControl isRequired>
            <FormLabel>Land</FormLabel>
            <Select
              placeholder="Auswahl"
              value={form.country}
              onChange={setField('country')}
            >
              {[...new Set([defaultCountry, ...availableCountries])].filter(Boolean).map((country) => (
                <option value={country!} key={country}>
                  {country}
                </option>
              ))}
            </Select>
          </FormControl>
          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl isRequired>
              <FormLabel>Stadt</FormLabel>
              <Input value={form.city} onChange={setField('city')} placeholder="z. B. Bad Sachsa" />
            </FormControl>
            <FormControl>
              <FormLabel>PLZ</FormLabel>
              <Input value={form.postalCode} onChange={setField('postalCode')} placeholder="optional" />
            </FormControl>
          </Flex>
          <FormControl>
            <FormLabel>Bundesland / Region</FormLabel>
            <Input value={form.region} onChange={setField('region')} placeholder="optional" />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} variant="ghost" disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button colorScheme="brand" type="submit" ml={3} isLoading={isSubmitting}>
            Übernehmen
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
