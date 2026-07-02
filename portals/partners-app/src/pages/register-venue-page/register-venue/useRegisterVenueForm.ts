import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FINAL, STEP1, STEP2, STEP3, UPDATE_APPROVED_VENUE } from '../queries';
import { SECTION_FIELDS, registerVenueSchema } from './register-venue.schema';
import {
  toApprovedUpdateInput,
  toStep1Input,
  toStep2Input,
  toStep3Input,
  venueToValues,
} from './register-venue.mappers';
import {
  blankRegisterVenueValues,
  type RegisterVenueMode,
  type RegisterVenueValues,
  type VenueSectionKey,
} from './register-venue.types';

export type EditableSectionKey = Exclude<VenueSectionKey, 'review' | 'leaves'>;
export type SectionState = 'complete' | 'incomplete';

const SECTION_ORDER: VenueSectionKey[] = [
  'details',
  'type-capacity',
  'amenities',
  'documents',
  'owner',
  'leaves',
  'review',
];

/** Sections updateApprovedVenue can persist (amenities are locked post-approval). */
const APPROVED_EDIT_SECTIONS = new Set<EditableSectionKey>([
  'details',
  'type-capacity',
  'documents',
  'owner',
]);

interface Options {
  venue: any | null;
  locations: any[];
  account: { name: string; email: string };
  mode: RegisterVenueMode;
  onPersisted: () => Promise<unknown>;
}

export function useRegisterVenueForm({ venue, locations, account, mode, onPersisted }: Readonly<Options>) {
  const [active, setActive] = useState<VenueSectionKey>('details');
  const [venueId, setVenueId] = useState<string | null>(venue?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const hydratedFor = useRef<string | null>(null);
  // Documents the venue already had — those rows are append-only after approval.
  const originalDocCount = venue?.documents?.length ?? 0;

  const form = useForm<RegisterVenueValues>({
    resolver: zodResolver(registerVenueSchema),
    defaultValues: blankRegisterVenueValues,
    mode: 'onBlur',
  });

  // Hydrate once per venue+account combo; refetches after a section save keep
  // the same venue id, so unsaved edits in other sections are not clobbered.
  // When /new gains an id from the first save, adopt the id without resetting —
  // the form itself is the source of the just-saved values.
  useEffect(() => {
    const key = `${venue?.id ?? 'new'}:${account.email}`;
    if (hydratedFor.current === key) return;
    const adoptingFreshSave =
      Boolean(hydratedFor.current?.startsWith('new:')) && Boolean(venue?.id) && form.formState.isDirty;
    hydratedFor.current = key;
    setVenueId(venue?.id ?? null);
    if (!adoptingFreshSave) form.reset(venueToValues(venue, locations, account));
  }, [venue, locations, account, form]);

  const [saveStep1, s1] = useMutation(STEP1);
  const [saveStep2, s2] = useMutation(STEP2);
  const [saveStep3, s3] = useMutation(STEP3);
  const [submitFinal, sf] = useMutation(FINAL);
  const [saveApproved, sa] = useMutation(UPDATE_APPROVED_VENUE);
  const busy = s1.loading || s2.loading || s3.loading || sf.loading || sa.loading;

  // Live section completion for the rail: map zod issue paths back to sections.
  // watch() subscribes this hook to every change; compute per render (no memo —
  // RHF may hand back a mutated stable reference, which would go stale in one).
  const values = form.watch();
  const sectionState: Record<EditableSectionKey, SectionState> = {
    details: 'complete',
    'type-capacity': 'complete',
    amenities: 'complete',
    documents: 'complete',
    owner: 'complete',
  };
  const parsed = registerVenueSchema.safeParse(values);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const root = String(issue.path[0] ?? '');
      for (const section of Object.keys(SECTION_FIELDS) as EditableSectionKey[]) {
        if ((SECTION_FIELDS[section] as string[]).includes(root)) sectionState[section] = 'incomplete';
      }
    }
  }

  const persistStep1 = async () => {
    const res = await saveStep1({
      variables: { input: toStep1Input(form.getValues()), venue_id: venueId },
    });
    const id = res.data?.submitVenueStep1?.id;
    if (id) setVenueId(id);
    return id as string | null;
  };

  const persistSection = async (section: EditableSectionKey) => {
    if (section === 'details' || section === 'type-capacity') {
      await persistStep1();
    } else {
      // Details are validated by now; saving them first keeps the server's
      // step gate satisfied and gives us the venue id for a brand-new draft
      // (state alone would be stale within this call).
      const id = venueId ?? (await persistStep1());
      if (section === 'documents') {
        await saveStep2({ variables: { input: toStep2Input(form.getValues()), venue_id: id } });
      } else {
        await saveStep3({
          variables: { input: toStep3Input(form.getValues(), account.email), venue_id: id },
        });
      }
    }
    await onPersisted();
  };

  /** Both details sections live in server step 1, and later steps are gated on
   * it server-side — steer the user to the blocking section instead of
   * surfacing a raw server error. */
  const requireDetailsFirst = async (section: EditableSectionKey) => {
    if (section === 'details') return false;
    const detailsOk = await form.trigger(SECTION_FIELDS.details);
    if (detailsOk) return false;
    setActive('details');
    setError('Complete the Venue Details section first.');
    return true;
  };

  const saveSection = async (section: EditableSectionKey) => {
    setError(null);
    setSaved(null);
    if (await requireDetailsFirst(section)) return false;
    const ok = await form.trigger(SECTION_FIELDS[section], { shouldFocus: true });
    if (!ok) return false;
    try {
      await persistSection(section);
      const next = SECTION_ORDER[SECTION_ORDER.indexOf(section) + 1];
      if (next) setActive(next);
      return true;
    } catch (mutationError: any) {
      setError(mutationError.message);
      return false;
    }
  };

  /** Post-approval edit: persists only the active section's editable fields
   * through updateApprovedVenue. Never advances sections — the owner is
   * spot-editing, not walking a wizard. */
  const saveApprovedSection = async (section: EditableSectionKey) => {
    setError(null);
    setSaved(null);
    if (!venueId || !APPROVED_EDIT_SECTIONS.has(section)) return false;
    const ok = await form.trigger(SECTION_FIELDS[section], { shouldFocus: true });
    if (!ok) return false;
    try {
      await saveApproved({
        variables: {
          venue_id: venueId,
          input: toApprovedUpdateInput(
            section as 'details' | 'type-capacity' | 'documents' | 'owner',
            form.getValues(),
            originalDocCount
          ),
        },
      });
      await onPersisted();
      setSaved('Changes saved.');
      return true;
    } catch (mutationError: any) {
      setError(mutationError.message);
      return false;
    }
  };

  /** Review & Submit persists every step from the current form state (so
   * unsaved edits are never silently dropped), then submits for review.
   * Returns the submitted venue id, or null when validation/saving failed. */
  const submitAll = async (): Promise<string | null> => {
    setError(null);
    const ok = await form.trigger();
    if (!ok) {
      const parsed = registerVenueSchema.safeParse(form.getValues());
      const firstPath = parsed.success ? '' : String(parsed.error.issues[0]?.path[0] ?? '');
      const section = (Object.keys(SECTION_FIELDS) as EditableSectionKey[]).find((key) =>
        (SECTION_FIELDS[key] as string[]).includes(firstPath)
      );
      if (section) setActive(section);
      setError('Fix the highlighted fields before submitting.');
      return null;
    }
    try {
      const id = (await persistStep1()) ?? venueId;
      await saveStep2({ variables: { input: toStep2Input(form.getValues()), venue_id: id } });
      await saveStep3({
        variables: { input: toStep3Input(form.getValues(), account.email), venue_id: id },
      });
      const res = await submitFinal({ variables: { venue_id: id } });
      await onPersisted();
      return res.data?.submitVenueFinal?.id ?? id;
    } catch (mutationError: any) {
      setError(mutationError.message);
      return null;
    }
  };

  return {
    form,
    active,
    setActive,
    error,
    saved,
    busy,
    mode,
    venueId,
    sectionState,
    saveSection,
    saveApprovedSection,
    submitAll,
  };
}
