import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { RegisterVenueValues } from './register-venue.types';

interface SavedDish {
  id: string;
  name: string;
}

/**
 * A dish saved for the first time gets its id from the server, and the form is
 * not re-hydrated after a section save — so without this the next save would
 * send the dish with no id again and the server would mint it a new identity.
 *
 * The server keeps the order it was sent, so a row adopts the id at its own
 * position — only when the menus line up (same length, same name there) and no
 * other row already holds that id. An unrelated refetch while the menu has
 * unsaved edits therefore never hands a new dish someone else's id.
 */
export function useAdoptSavedFoodIds(form: UseFormReturn<RegisterVenueValues>, savedMenu: SavedDish[] | undefined) {
  useEffect(() => {
    const saved = savedMenu ?? [];
    const rows = form.getValues('food_menu');
    if (saved.length === 0 || saved.length !== rows.length) return;
    const taken = new Set(rows.map((row) => row.item_id).filter(Boolean));
    rows.forEach((row, index) => {
      const match = saved[index];
      if (row.item_id || taken.has(match.id) || match.name !== row.name.trim()) return;
      form.setValue(`food_menu.${index}.item_id`, match.id);
    });
  }, [savedMenu, form]);
}
