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

type DeleteOwnerDialogProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  ownerName: string | null;
  vehiclesCount?: number;
};

export function DeleteOwnerDialog({
  isOpen,
  onCancel,
  onConfirm,
  isDeleting = false,
  ownerName,
  vehiclesCount = 0,
}: DeleteOwnerDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const [ackChecked, setAckChecked] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAckChecked(false);
      setConfirmationInput('');
    }
  }, [isOpen]);

  const normalizedOwner = (ownerName ?? '').trim().toLowerCase();
  const normalizedInput = confirmationInput.trim().toLowerCase();
  const isConfirmDisabled = !ackChecked || normalizedOwner.length === 0 || normalizedOwner !== normalizedInput;

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onCancel} isCentered>
      <AlertDialogOverlay />
      <AlertDialogContent>
        <AlertDialogHeader fontSize="lg" fontWeight="bold">
          Vermieter löschen
        </AlertDialogHeader>
        <AlertDialogBody display="grid" gap={4}>
          <Text>
            Der Vermieter <strong>{ownerName}</strong> wird vollständig entfernt. Dazu gehören alle zugeordneten Fahrzeuge
            (aktuell {vehiclesCount}) sowie Stammdaten im Tab <em>owners</em>.
          </Text>
          <Text color="orange.300">
            Dieser Vorgang kann nicht rückgängig gemacht werden. Bitte bestätige den Löschvorgang bewusst.
          </Text>
          <Checkbox
            isChecked={ackChecked}
            onChange={(event) => setAckChecked(event.target.checked)}
          >
            Ich habe verstanden, dass alle Daten dauerhaft entfernt werden.
          </Checkbox>
          <Flex direction="column" gap={2}>
            <Text fontSize="sm" color="gray.300">
              Tippe zur Bestätigung den Vermieternamen ein:
            </Text>
            <Input
              value={confirmationInput}
              onChange={(event) => setConfirmationInput(event.target.value)}
              placeholder={ownerName ?? ''}
              variant="filled"
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
