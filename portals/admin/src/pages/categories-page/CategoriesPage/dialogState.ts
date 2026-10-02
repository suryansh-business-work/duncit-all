import type { CatItem, FormState, Level } from '../queries';
import { isImageIconValue } from '../../../components/IconPickerField';

export interface DialogState {
  open: boolean;
  level: Level;
  parentId: string | null;
  form: FormState;
}

/** The dialog form pre-filled from an existing category. */
export const editFormFor = (item: CatItem): FormState => ({
  id: item.id,
  name: item.name,
  icon: item.icon ?? '',
  iconMode: isImageIconValue(item.icon) ? 'IMAGE' : 'ICON',
  description: item.description ?? '',
  mediaText: item.media.map((m) => m.url).join('\n'),
  sort_order: item.sort_order,
  is_active: item.is_active,
  allow_co_hosts: item.allow_co_hosts ?? false,
  max_co_hosts: item.max_co_hosts ?? 1,
  min_pax: item.min_pax ?? 0,
  icon_layout_mweb: item.icon_layout_mweb ?? null,
  icon_layout_native: item.icon_layout_native ?? null,
  gift_card_image_front: item.gift_card_image_front,
  gift_card_image_back: item.gift_card_image_back,
});
