/**
 * Mounts one registration section on a real form: the same RHF + Zod resolver
 * `useRegisterVenueForm` builds, seeded with blank values plus the given
 * defaults, so a section suite sees real validation messages.
 */
import type { ReactElement } from 'react';
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerVenueSchema } from '../../register-venue/register-venue.schema';
import {
  blankRegisterVenueValues,
  type RegisterVenueValues,
  type VenueRegistrationConfig,
} from '../../register-venue/register-venue.types';
import { renderWithProviders, type RenderOptions } from '../../../../__tests__/render';

export type SectionForm = UseFormReturn<RegisterVenueValues>;
export type FormRef = { current: SectionForm | null };

export const sectionConfig: VenueRegistrationConfig = {
  venue_types: ['Cafe', 'Banquet hall'],
  doc_types: ['PAN Card', 'Trade License'],
  capacity_item_limit: 2,
  amenities: ['AC', 'Wi-Fi'],
  facilities: ['Parking'],
  security: ['CCTV Surveillance'],
};

interface HarnessProps {
  defaults?: Partial<RegisterVenueValues>;
  formRef: FormRef;
  render: (form: SectionForm) => ReactElement;
}

function SectionHarness({ defaults, formRef, render }: Readonly<HarnessProps>) {
  const form = useForm<RegisterVenueValues, any, RegisterVenueValues>({
    resolver: zodResolver(registerVenueSchema()) as unknown as Resolver<RegisterVenueValues, any, RegisterVenueValues>,
    defaultValues: { ...blankRegisterVenueValues, ...defaults },
    mode: 'onBlur',
  });
  formRef.current = form;
  return render(form);
}

/** Renders `render(form)` under the portal providers; returns the live form. */
export function mountSection(
  render: (form: SectionForm) => ReactElement,
  defaults: Partial<RegisterVenueValues> = {},
  options: RenderOptions = {}
) {
  const formRef: FormRef = { current: null };
  const view = renderWithProviders(<SectionHarness defaults={defaults} formRef={formRef} render={render} />, options);
  const form = () => {
    if (!formRef.current) throw new Error('section form not mounted');
    return formRef.current;
  };
  return { ...view, form };
}
