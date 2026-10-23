/**
 * Mounts one registration section on a real form: the same RHF + Zod resolver
 * `useRegisterVenueForm` builds, seeded with blank values plus the given
 * defaults, so a section suite sees real validation messages.
 */
import type { ReactElement } from 'react';
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerVenueSchema, type VenueSchemaScope } from '../../register-venue/register-venue.schema';
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
  gstin_doc_type: '',
  pan_doc_type: '',
  capacity_item_limit: 2,
  amenities: ['AC', 'Wi-Fi'],
  facilities: ['Parking'],
  security: ['CCTV Surveillance'],
  food_diets: ['VEG', 'NON_VEG'],
  food_spice_levels: ['NONE', 'MILD'],
  food_menu_limit: 5,
  food_image_limit: 2,
  food_price_max: 10000,
  food_discount_max_pct: 50,
  food_video_limit: 2,
  food_table_limit: 10,
};

interface HarnessProps {
  defaults?: Partial<RegisterVenueValues>;
  scope: VenueSchemaScope;
  formRef: FormRef;
  render: (form: SectionForm) => ReactElement;
}

function SectionHarness({ defaults, scope, formRef, render }: Readonly<HarnessProps>) {
  const form = useForm<RegisterVenueValues, any, RegisterVenueValues>({
    resolver: zodResolver(registerVenueSchema(undefined, undefined, undefined, undefined, scope)) as unknown as Resolver<RegisterVenueValues, any, RegisterVenueValues>,
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
  options: RenderOptions = {},
  /** 'setup' for a section edited on a Venue Options page, which requires its fields. */
  scope: VenueSchemaScope = 'registration'
) {
  const formRef: FormRef = { current: null };
  const view = renderWithProviders(<SectionHarness defaults={defaults} scope={scope} formRef={formRef} render={render} />, options);
  const form = () => {
    if (!formRef.current) throw new Error('section form not mounted');
    return formRef.current;
  };
  return { ...view, form };
}
