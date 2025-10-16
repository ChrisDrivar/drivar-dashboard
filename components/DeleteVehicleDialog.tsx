'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Checkbox,
  Flex,
  Input,
  Text,
} from '@chakra-ui/react';

type DeleteVehicleDialogProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  vehicleLabel: string | null;
  ownerName?: string | null;
};

export function DeleteVehicleDialog({
  isOpen,
  onCancel,
  onConfirm,
  isDeleting = false,
  vehicleLabel,
  ownerName,
}: DeleteVehicleDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const [ackChecked, setAckChecked] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAckChecked(false);
      setConfirmationInput('');
    }
  }, [isOpen, vehicleLabel]);

  const normalizedLabel = (vehicleLabel ?? '').trim().toLowerCase();
  const normalizedInput = confirmationInput.trim().toLowerCase();
  const hasSelection = normalizedLabel.length > 0;
  const isConfirmDisabled = !ackChecked || !hasSelection || normalizedLabel !== normalizedInput;

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onCancel} isCentered>
      <AlertDialogOverlay />
      <AlertDialogContent>
        <AlertDialogHeader fontSize="lg" fontWeight="bold">
          Fahrzeug löschen
        </AlertDialogHeader>
        <AlertDialogBody display="grid" gap={4}>
          <Text>
            {hasSelection ? (
              <>
                Das Fahrzeug <strong>{vehicleLabel}</strong>
                {ownerName ? (
                  <>
                    {' '}des Vermieters <strong>{ownerName}</strong>
                  </>
                ) : null}{' '}
                wird dauerhaft aus dem Inventar entfernt.
              </>
            ) : (
              'Bitte wähle ein Fahrzeug aus.'
            )}
          </Text>
          <Text color="orange.300">
            Dieser Vorgang kann nicht rückgängig gemacht werden. Bestätige den Löschvorgang bewusst.
          </Text>
          <Checkbox
            isChecked={ackChecked}
            onChange={(event) => setAckChecked(event.target.checked)}
            isDisabled={!hasSelection}
          >
            Ich habe verstanden, dass das Fahrzeug entfernt wird.
          </Checkbox>
          <Flex direction="column" gap={2}>
            <Text fontSize="sm" color="gray.300">
              Tippe zur Bestätigung die Fahrzeugbezeichnung ein:
            </Text>
            <Input
              value={confirmationInput}
              onChange={(event) => setConfirmationInput(event.target.value)}
              placeholder={vehicleLabel ?? ''}
              variant="filled"
              isDisabled={!hasSelection}
            />
          </Flex>
        </AlertDialogBody>
        <AlertDialogFooter>
          <Button ref={cancelRef} onClick={onCancel} variant="ghost" disabled={isDeleting}>
            Abbrechen
          </Button>
          <Button
            colorScheme="red"
            onClick={onConfirm}
            ml={3}
            isDisabled={isConfirmDisabled || isDeleting}
            isLoading={isDeleting}
          >
            Endgültig löschen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
