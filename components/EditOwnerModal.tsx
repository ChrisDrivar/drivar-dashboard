'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
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

type OwnerDetails = {
  name: string;
  country?: string;
  region?: string;
  city?: string;
  street?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  internationalCustomers?: string;
  commission?: string;
  ranking?: string;
  experienceYears?: string;
  notes?: string;
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
  internationalCustomers: string;
  commission: string;
  ranking: string;
  experienceYears: string;
  ownerNotes: string;
  applyToInventory: boolean;
};

const RANKING_OPTIONS = ['A', 'B', 'C', 'D'];
const EXPERIENCE_OPTIONS = ['0-1', ...Array.from({ length: 25 }, (_, index) => String(index + 1))];
const INTERNATIONAL_OPTIONS = ['ja', 'nein'];

const createInitialForm = (owner?: OwnerDetails | null): FormState => ({
  ownerName: owner?.name ?? '',
  country: owner?.country ?? '',
  region: owner?.region ?? '',
  city: owner?.city ?? '',
  street: owner?.street ?? '',
  postalCode: owner?.postalCode ?? '',
  phone: owner?.phone ?? '',
  email: owner?.email ?? '',
  website: owner?.website ?? '',
  internationalCustomers: owner?.internationalCustomers ?? '',
  commission: owner?.commission ?? '',
  ranking: owner?.ranking ?? '',
  experienceYears: owner?.experienceYears ?? '',
  ownerNotes: owner?.notes ?? '',
  applyToInventory: true,
});

type EditOwnerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedName?: string) => void;
  owners: OwnerDetails[];
  availableCountries: string[];
  availableRegions: string[];
};

export function EditOwnerModal({
  isOpen,
  onClose,
  onSuccess,
  owners,
  availableCountries,
  availableRegions,
}: EditOwnerModalProps) {
  const toast = useToast();
  const sortedOwners = useMemo(
    () => [...owners].sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [owners]
  );
  const [selectedOwnerName, setSelectedOwnerName] = useState<string>('');
  const [form, setForm] = useState<FormState>(() => createInitialForm(sortedOwners[0]));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && sortedOwners.length > 0) {
      const defaultOwner = sortedOwners.find((owner) => owner.name === selectedOwnerName) ?? sortedOwners[0];
      setSelectedOwnerName(defaultOwner?.name ?? '');
      setForm(createInitialForm(defaultOwner));
    }
    if (!isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen, sortedOwners, selectedOwnerName]);

  const handleOwnerChange = (value: string) => {
    setSelectedOwnerName(value);
    const owner = sortedOwners.find((item) => item.name === value);
    setForm(createInitialForm(owner));
  };

  const handleFieldChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value =
        event.target instanceof HTMLInputElement && event.target.type === 'checkbox'
          ? (event.target as HTMLInputElement).checked
          : event.target.value;
      setForm((prev) => ({ ...prev, [field]: value as FormState[keyof FormState] }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const originalName = selectedOwnerName.trim();
    if (!originalName) {
      toast({ status: 'warning', title: 'Bitte Vermieter auswählen.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/partners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: originalName,
          updates: {
            name: form.ownerName.trim() || originalName,
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
            notes: form.ownerNotes.trim(),
          },
          applyToInventory: form.applyToInventory,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Aktualisierung fehlgeschlagen');
      }

      const payload = await response.json().catch(() => ({}));
      const updatedName = typeof payload?.ownerName === 'string' ? payload.ownerName : form.ownerName;

      toast({ status: 'success', title: 'Vermieter aktualisiert.' });
      onSuccess(updatedName?.trim() || originalName);
      onClose();
    } catch (error) {
      console.error('[edit-owner-modal]', error);
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>Vermieter ändern</ModalHeader>
        <ModalCloseButton disabled={isSubmitting} />
        <ModalBody display="grid" gap={4}>
          <FormControl isRequired>
            <FormLabel>Vermieter auswählen</FormLabel>
            <Select
              value={selectedOwnerName}
              onChange={(event) => handleOwnerChange(event.target.value)}
              placeholder="Auswahl"
            >
              {sortedOwners.map((owner) => (
                <option value={owner.name} key={owner.name}>
                  {owner.name}
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Vermietername</FormLabel>
            <Input
              value={form.ownerName}
              onChange={handleFieldChange('ownerName')}
              placeholder="Vermieter"
            />
          </FormControl>

          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl>
              <FormLabel>Land</FormLabel>
              <Input
                value={form.country}
                onChange={handleFieldChange('country')}
                list="edit-owner-country"
                placeholder="z. B. Deutschland"
              />
              <Box as="datalist" id="edit-owner-country">
                {availableCountries.map((country) => (
                  <option value={country} key={country} />
                ))}
              </Box>
            </FormControl>
            <FormControl>
              <FormLabel>Bundesland</FormLabel>
              <Input
                value={form.region}
                onChange={handleFieldChange('region')}
                list="edit-owner-region"
                placeholder="z. B. Bayern"
              />
              <Box as="datalist" id="edit-owner-region">
                {availableRegions.map((region) => (
                  <option value={region} key={region} />
                ))}
              </Box>
            </FormControl>
          </Flex>

          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl>
              <FormLabel>Stadt</FormLabel>
              <Input
                value={form.city}
                onChange={handleFieldChange('city')}
                placeholder="z. B. München"
              />
            </FormControl>
            <FormControl>
              <FormLabel>PLZ</FormLabel>
              <Input
                value={form.postalCode}
                onChange={handleFieldChange('postalCode')}
                placeholder="z. B. 10115"
              />
            </FormControl>
          </Flex>

          <FormControl>
            <FormLabel>Straße / Hausnummer</FormLabel>
            <Input
              value={form.street}
              onChange={handleFieldChange('street')}
              placeholder="z. B. Musterstraße 1"
            />
          </FormControl>

          <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl>
              <FormLabel>Telefon</FormLabel>
              <Input
                value={form.phone}
                onChange={handleFieldChange('phone')}
                placeholder="+49 ..."
              />
            </FormControl>
            <FormControl>
              <FormLabel>E-Mail</FormLabel>
              <Input
                value={form.email}
                onChange={handleFieldChange('email')}
                type="email"
                placeholder="kontakt@example.com"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Website</FormLabel>
              <Input
                value={form.website}
                onChange={handleFieldChange('website')}
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
                onChange={handleFieldChange('internationalCustomers')}
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
                onChange={handleFieldChange('commission')}
                placeholder="z. B. 15 %"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Ranking</FormLabel>
              <Select
                placeholder="Auswahl"
                value={form.ranking}
                onChange={handleFieldChange('ranking')}
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
                onChange={handleFieldChange('experienceYears')}
              >
                {EXPERIENCE_OPTIONS.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Flex>

          <FormControl>
            <FormLabel>Notizen</FormLabel>
            <Textarea
              value={form.ownerNotes}
              onChange={handleFieldChange('ownerNotes')}
              placeholder="Interne Hinweise zum Vermieter"
              rows={3}
            />
          </FormControl>

          <Checkbox
            isChecked={form.applyToInventory}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, applyToInventory: event.target.checked }))
            }
          >
            Änderungen auf alle Fahrzeuge übertragen
          </Checkbox>
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
