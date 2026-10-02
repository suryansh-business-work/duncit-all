/** Own query key — this dialog opens over pages that own `selectedtab`. */
const PICKER_TABS = ['device', 'photos', 'videos'] as const;
export type PickerTab = (typeof PICKER_TABS)[number];
