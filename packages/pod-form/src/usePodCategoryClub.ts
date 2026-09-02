import { useFormContext, useWatch } from 'react-hook-form';
import { usePodFormData } from './context';
import type { PodFormValues } from './types';

/**
 * The club-shaped object the product rules match against.
 *
 * A pod's category is its club's Super + Sub, so the product picker and the
 * cascade that prunes it both read the selected club. An Auto Pod has no club
 * yet — its category is the pair the form holds — so this hands back a stand-in
 * carrying the same two fields, and every product rule stays written once.
 */
export function usePodCategoryClub(): any {
  const { clubs, config } = usePodFormData();
  const { control } = useFormContext<PodFormValues>();
  const clubId = useWatch({ control, name: 'club_id' });
  const superId = useWatch({ control, name: 'super_category_id' });
  const subId = useWatch({ control, name: 'sub_category_id' });
  if (config.autoPod) return { super_category_id: superId, category_id: subId };
  return clubs.find((club) => String(club?.id) === String(clubId));
}
