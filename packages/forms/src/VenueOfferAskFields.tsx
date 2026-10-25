import type { ReactNode } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Stack } from '@mui/material';
import { VENUE_OFFER_ASK_LIMITS } from '@duncit/utils';
import RhfTextField from './RhfTextField';

/** The four lines the fields read. A label is a node so a surface can add its own required marker. */
export interface VenueOfferAskLabels {
  offerings: ReactNode;
  offeringsHint: string;
  note: ReactNode;
  noteHint: string;
}

/** `TOut` is whatever the form's resolver transforms the values into — the fields only read and write `T`. */
export interface VenueOfferAskFieldsProps<T extends FieldValues, TOut = T> {
  control: Control<T, unknown, TOut>;
  /** Where the form holds the points (one per line) and the note, both as typed. */
  offeringsName: Path<T>;
  noteName: Path<T>;
  labels: VenueOfferAskLabels;
  /** Prefixes the test ids, and keeps two forms on one page apart. */
  idPrefix: string;
  /** Marks the points as required (MUI's asterisk). The schema is what enforces it. */
  required?: boolean;
  disabled?: boolean;
}

/**
 * What a host asks of a venue beside the price: the points it should provide,
 * one per line, and an optional note. Create Pod on mWeb, the Partners pod form
 * and the resubmit dialog all draw these two fields; the rules are
 * `@duncit/forms/schemas`' `offeringsTextField` / `offerNoteField` (or
 * `makeVenueOfferAskSchema`), and `venueOfferInput` turns the text into the
 * offer's `offerings` and `note`.
 */
export default function VenueOfferAskFields<T extends FieldValues, TOut = T>({
  control,
  offeringsName,
  noteName,
  labels,
  idPrefix,
  required = false,
  disabled = false,
}: Readonly<VenueOfferAskFieldsProps<T, TOut>>) {
  return (
    <Stack spacing={1.5} data-testid={`${idPrefix}-offer-ask`}>
      <RhfTextField
        control={control}
        name={offeringsName}
        label={labels.offerings}
        hint={labels.offeringsHint}
        required={required}
        disabled={disabled}
        multiline
        minRows={3}
        data-testid={`${idPrefix}-offer-offerings`}
      />
      <RhfTextField
        control={control}
        name={noteName}
        label={labels.note}
        hint={labels.noteHint}
        disabled={disabled}
        multiline
        minRows={2}
        data-testid={`${idPrefix}-offer-note`}
        slotProps={{ htmlInput: { maxLength: VENUE_OFFER_ASK_LIMITS.note } }}
      />
    </Stack>
  );
}
