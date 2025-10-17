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
} from '@chakra-ui/react';
import type { PendingLeadEntry } from '@/types/kpis';

const CHANNEL_OPTIONS = ['Inbound', 'Outbound', 'Messe', 'Empfehlung'];
const INTERNATIONAL_OPTIONS = ['ja', 'nein'];
const RANKING_OPTIONS = ['A', 'B', 'C', 'D'];
const EXPERIENCE_OPTIONS = ['0-1', ...Array.from({ length: 25 }, (_, index) => String(index + 1))];

type LeadFormState = {
  date: string;
  channel: string;
  region: string;
  country: string;
  city: string;
  landlord: string;
  street: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  internationalCustomers: string;
  commission: string;
  ranking: string;
  experienceYears: string;
  comment: string;
  ownerNotes: string;
  vehicleLabel: string;
  manufacturer: string;
  vehicleType: string;
};

const toDateInputValue = (value?: string) => {
  if (!value) {
    return new Date().toISOString().split('T')[0];
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString().split('T')[0];
};

const createInitialForm = (lead?: PendingLeadEntry | null): LeadFormState => ({
  date: toDateInputValue(lead?.datum),
  channel: lead?.kanal ?? '',
  region: lead?.region ?? '',
  country: lead?.land ?? '',
  city: lead?.stadt ?? '',
  landlord: lead?.vermieterName ?? '',
  street: lead?.street ?? '',
  postalCode: lead?.postalCode ?? '',
  phone: lead?.phone ?? '',
  email: lead?.email ?? '',
  website: lead?.website ?? '',
  internationalCustomers: lead?.internationalCustomers ?? '',
  commission: lead?.commission ?? '',
  ranking: lead?.ranking ?? '',
  experienceYears: lead?.experienceYears ?? '',
  comment: lead?.kommentar ?? '',
  ownerNotes: lead?.ownerNotes ?? '',
  vehicleLabel: lead?.fahrzeugLabel ?? '',
  manufacturer: lead?.manufacturer ?? '',
  vehicleType: lead?.fahrzeugtyp ?? '',
});

export type LeadUpdatePayload = LeadFormState;

type EditLeadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lead: PendingLeadEntry | null;
  onSubmit: (payload: LeadUpdatePayload) => Promise<void>;
  isSubmitting: boolean;
  availableCountries: string[];
  availableRegions: string[];
  availableCities: string[];
  availableVehicleTypes: string[];
  availableManufacturers: string[];
};

export function EditLeadModal({
  isOpen,
  onClose,
  lead,
  onSubmit,
  isSubmitting,
  availableCountries,
  availableRegions,
  availableCities,
  availableVehicleTypes,
  availableManufacturers,
}: EditLeadModalProps) {
  const [form, setForm] = useState<LeadFormState>(() => createInitialForm(lead));

  useEffect(() => {
    if (isOpen) {
      setForm(createInitialForm(lead));
    }
  }, [isOpen, lead]);

  const setField =
    (field: keyof LeadFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.landlord.trim() || !form.city.trim()) {
      return;
    }
    await onSubmit({
      ...form,
      landlord: form.landlord.trim(),
      country: form.country.trim(),
      region: form.region.trim(),
      city: form.city.trim(),
      street: form.street.trim(),
      postalCode: form.postalCode.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      website: form.website.trim(),
      internationalCustomers: form.internationalCustomers,
      commission: form.commission.trim(),
      ranking: form.ranking,
      experienceYears: form.experienceYears,
      comment: form.comment.trim(),
      ownerNotes: form.ownerNotes.trim(),
      vehicleLabel: form.vehicleLabel.trim(),
      manufacturer: form.manufacturer.trim(),
      vehicleType: form.vehicleType.trim(),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Lead bearbeiten</ModalHeader>
        <ModalCloseButton disabled={isSubmitting} />
        <ModalBody display="grid" gap={4}>
          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl>
              <FormLabel>Datum</FormLabel>
              <Input type="date" value={form.date} onChange={setField('date')} />
            </FormControl>
            <FormControl>
              <FormLabel>Kanal</FormLabel>
              <Select value={form.channel} onChange={setField('channel')} placeholder="Auswahl">
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
                list="edit-lead-country"
                placeholder="z. B. Deutschland"
              />
              <Box as="datalist" id="edit-lead-country">
                {availableCountries.map((country) => (
                  <option value={country} key={country} />
                ))}
              </Box>
            </FormControl>
            <FormControl>
              <FormLabel>Bundesland</FormLabel>
              <Input
                value={form.region}
                onChange={setField('region')}
                list="edit-lead-region"
                placeholder="z. B. Bayern"
              />
              <Box as="datalist" id="edit-lead-region">
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
              list="edit-lead-city"
              placeholder="z. B. München"
            />
            <Box as="datalist" id="edit-lead-city">
              {availableCities.map((city) => (
                <option value={city} key={city} />
              ))}
            </Box>
          </FormControl>
          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl>
              <FormLabel>Straße / Hausnummer</FormLabel>
              <Input value={form.street} onChange={setField('street')} placeholder="optional" />
            </FormControl>
            <FormControl>
              <FormLabel>PLZ</FormLabel>
              <Input value={form.postalCode} onChange={setField('postalCode')} placeholder="optional" />
            </FormControl>
          </Flex>
          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl>
              <FormLabel>Telefon</FormLabel>
              <Input
                value={form.phone}
                onChange={setField('phone')}
                placeholder="+49 ..."
              />
            </FormControl>
            <FormControl>
              <FormLabel>E-Mail</FormLabel>
              <Input
                value={form.email}
                onChange={setField('email')}
                type="email"
                placeholder="kontakt@example.com"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Website</FormLabel>
              <Input
                value={form.website}
                onChange={setField('website')}
                placeholder="https://"
              />
            </FormControl>
          </Flex>
          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl>
              <FormLabel>Internationale Kunden</FormLabel>
              <Select
                placeholder="Auswahl"
                value={form.internationalCustomers}
                onChange={setField('internationalCustomers')}
              >
                {INTERNATIONAL_OPTIONS.map((option) => (
                  <option value={option} key={option}>
                    {option.toUpperCase()}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Provision</FormLabel>
              <Input
                value={form.commission}
                onChange={setField('commission')}
                placeholder="z. B. 15 %"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Ranking</FormLabel>
              <Select
                placeholder="Auswahl"
                value={form.ranking}
                onChange={setField('ranking')}
              >
                {RANKING_OPTIONS.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Erfahrung (Jahre)</FormLabel>
              <Select
                placeholder="Auswahl"
                value={form.experienceYears}
                onChange={setField('experienceYears')}
              >
                {EXPERIENCE_OPTIONS.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Flex>
          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl>
              <FormLabel>Fahrzeug</FormLabel>
              <Input
                value={form.vehicleLabel}
                onChange={setField('vehicleLabel')}
                placeholder="Fahrzeugbezeichnung"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Hersteller</FormLabel>
              <Input
                value={form.manufacturer}
                onChange={setField('manufacturer')}
                list="edit-lead-manufacturer"
                placeholder="z. B. BMW"
              />
              <Box as="datalist" id="edit-lead-manufacturer">
                {availableManufacturers.map((manufacturer) => (
                  <option value={manufacturer} key={manufacturer} />
                ))}
              </Box>
            </FormControl>
          </Flex>
          <FormControl>
            <FormLabel>Fahrzeugtyp</FormLabel>
            <Input
              value={form.vehicleType}
              onChange={setField('vehicleType')}
              list="edit-lead-vehicle-type"
              placeholder="z. B. Sportwagen"
            />
            <Box as="datalist" id="edit-lead-vehicle-type">
              {availableVehicleTypes.map((type) => (
                <option value={type} key={type} />
              ))}
            </Box>
          </FormControl>
          <FormControl>
            <FormLabel>Notizen zum Vermieter</FormLabel>
            <Textarea
              value={form.ownerNotes}
              onChange={setField('ownerNotes')}
              placeholder="Interne Hinweise, Besonderheiten"
              rows={2}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Kommentar</FormLabel>
            <Textarea
              value={form.comment}
              onChange={setField('comment')}
              placeholder="Gesamter Status, Follow-ups, nächste Schritte"
              rows={3}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Flex gap={3} justify="flex-end" w="100%">
            <Button onClick={onClose} variant="ghost" disabled={isSubmitting}>
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
