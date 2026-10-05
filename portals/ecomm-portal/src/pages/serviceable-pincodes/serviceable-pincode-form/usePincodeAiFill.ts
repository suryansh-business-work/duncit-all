import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { COUNTRY_OPTIONS } from '@duncit/geo';
import { logs } from '@duncit/logs';
import { PINCODE } from '@duncit/regex';
import { useTranslation } from '@duncit/shell';
import { AI_FILL_LOCATION_AREAS } from '../queries';
import type { ServiceablePincodeValues } from './serviceable-pincode.types';

export interface AreaSuggestion {
  area: string;
  pincode: string;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
/** Which place an answer was asked for. */
const placeOf = (values: Pick<ServiceablePincodeValues, 'country_code' | 'state' | 'city'>) =>
  [values.country_code, values.state, values.city].join('|');

/** The answer's areas that can be saved as they are — only a valid 6-digit pincode passes. */
export function parseAreaSuggestions(raw: string | undefined): AreaSuggestion[] {
  const parsed: { zones?: { zone_name?: unknown; pincode?: unknown }[] } = JSON.parse(raw || '{}');
  return (parsed.zones ?? [])
    .map((zone) => ({ area: text(zone.zone_name), pincode: text(zone.pincode) }))
    .filter((zone) => zone.area && PINCODE.test(zone.pincode));
}

/**
 * Fill with AI: ask for the chosen city's areas, put the first one's area and
 * pincode in the form, and keep the rest to pick from. Suggestions belong to
 * the place they were asked for, so changing Country, State or City drops them.
 */
export function usePincodeAiFill(form: UseFormReturn<ServiceablePincodeValues>) {
  const { t } = useTranslation();
  const { control, getValues, setValue } = form;
  const [run, { loading }] = useMutation(AI_FILL_LOCATION_AREAS);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<{ place: string; suggestions: AreaSuggestion[] } | null>(null);
  const [countryCode, state, city] = useWatch({ control, name: ['country_code', 'state', 'city'] });
  const place = placeOf({ country_code: countryCode, state, city });
  const suggestions = answer?.place === place ? answer.suggestions : [];

  const apply = ({ area, pincode }: AreaSuggestion) => {
    setValue('area', area, { shouldDirty: true, shouldValidate: true });
    setValue('pincode', pincode, { shouldDirty: true, shouldValidate: true });
  };

  const fill = async () => {
    setError(null);
    const values = getValues();
    const country = COUNTRY_OPTIONS.find((option) => option.isoCode === values.country_code)?.name ?? '';
    const input = { country, state: values.state.trim(), city: values.city.trim() };
    if (!input.country || !input.state || !input.city) {
      setError(t('ecommPortal.serviceablePincodes.aiFillNeedsPlace'));
      return;
    }
    try {
      const result = await run({ variables: { input } });
      // The admin moved to another place while the answer was on its way.
      if (placeOf(getValues()) !== placeOf(values)) return;
      const next = parseAreaSuggestions(result.data?.aiFillLocationAreas);
      if (next.length === 0) {
        setError(t('ecommPortal.serviceablePincodes.aiFillEmpty'));
        return;
      }
      setAnswer({ place: placeOf(values), suggestions: next });
      apply(next[0]);
    } catch (error_: unknown) {
      logs.portal['ecomm-portal'].warn('serviceable-pincodes', 'usePincodeAiFill', { error: error_ });
      // The server's reason reads as a sentence; an unreadable answer does not.
      const reason = error_ instanceof Error && !(error_ instanceof SyntaxError) ? error_.message : '';
      setError(reason || t('ecommPortal.serviceablePincodes.aiFillFailed'));
    }
  };

  return { fill, apply, loading, error, suggestions };
}
