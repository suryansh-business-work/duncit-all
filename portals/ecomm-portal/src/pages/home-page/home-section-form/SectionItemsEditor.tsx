import type { Control } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import RhfFieldList, { type ListColumn } from '../../../components/form/FieldList';
import type { SectionKind } from '../queries';
import { ITEM_IMAGE_PRESETS } from '../image-presets';
import { ITEM_HINT_KEYS, MOBILE_IMAGE_KINDS, OPTIONAL_ITEM_KINDS } from '../section-kinds';
import { BLANK_SECTION_ITEM, type HomeSectionValues } from './home-section.types';
import { useLinkOptions } from './useLinkOptions';

interface SectionItemsEditorProps {
  kind: SectionKind;
  control: Control<HomeSectionValues>;
}

/** Banner slides, promo tiles, range cards, pet tiles or USP points — each with its pictures, words and link. */
export default function SectionItemsEditor({ kind, control }: Readonly<SectionItemsEditorProps>) {
  const { t } = useTranslation();
  const linkOptions = useLinkOptions();
  const preset = ITEM_IMAGE_PRESETS[kind];
  const hintKey = ITEM_HINT_KEYS[kind];
  const columns: ListColumn[] = [
    { key: 'image_url', label: t('ecommPortal.form.image'), kind: 'image', fit: preset?.image },
    ...(MOBILE_IMAGE_KINDS.has(kind)
      ? [{ key: 'mobile_image_url', label: t('ecommPortal.homePage.mobileImage'), kind: 'image' as const, fit: preset?.mobile }]
      : []),
    { key: 'eyebrow', label: t('ecommPortal.homePage.eyebrow') },
    { key: 'title', label: t('shell.common.title') },
    { key: 'subtitle', label: t('ecommPortal.homePage.subtitleField') },
    { key: 'cta_label', label: t('ecommPortal.homePage.ctaLabel') },
    { key: 'link', label: t('ecommPortal.homePage.link'), kind: 'link', options: linkOptions, hint: t('ecommPortal.homePage.linkHint') },
  ];
  const emptyKey = OPTIONAL_ITEM_KINDS.has(kind) ? 'ecommPortal.homePage.noTilesAuto' : 'ecommPortal.homePage.noItems';
  return (
    <Stack spacing={1}>
      {hintKey && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t(hintKey)}
        </Typography>
      )}
      <RhfFieldList
        control={control}
        name="items"
        blank={BLANK_SECTION_ITEM}
        max={24}
        columns={columns}
        addLabel={t('ecommPortal.homePage.addItem')}
        itemLabel={(position) => t('ecommPortal.homePage.itemN', { vars: { n: position } })}
        emptyText={t(emptyKey)}
      />
    </Stack>
  );
}
