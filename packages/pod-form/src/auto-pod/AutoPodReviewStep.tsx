import type { ReactNode } from 'react';
import { Alert, Chip, Divider, Stack, Typography } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import { useCategoryValue } from '@duncit/category';
import { InfoRow } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { usePodFormData } from '../context';
import { hashtagsOf, linesToMedia } from '../build-input';
import { OCCURRENCES, POD_MODES, type PodFormData, type PodFormValues, type PodKeyedOption } from '../types';
import { useTranslation, type Translate } from '../i18n/useTranslation';

interface ReviewRow {
  label: string;
  value: ReactNode;
}

/** The menu's own name for a stored value, or the value when it is not in the menu. */
function optionLabel(options: PodKeyedOption[], value: string, t: Translate): string {
  const hit = options.find((option) => option.value === value);
  return hit ? t(hit.labelKey) : value;
}

/** A list value as chips, or the "nothing" dash when it is empty. */
function ChipList({ items, empty }: Readonly<{ items: string[]; empty: string }>) {
  if (items.length === 0) return <>{empty}</>;
  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {items.map((item) => (
        <Chip key={item} size="small" variant="outlined" label={item} />
      ))}
    </Stack>
  );
}

/** "12 Sep 2026 · 18:00 – 12 Sep 2026 · 19:30", in the admin-configured format (rule 11). */
function windowLine(fmt: PodFormData['dateFormatter'], start: Date | null, end: Date | null, empty: string): string {
  if (!start) return empty;
  const from = `${fmt.formatDate(start)} · ${fmt.formatTime(start)}`;
  if (!end) return from;
  return `${from} – ${fmt.formatDate(end)} · ${fmt.formatTime(end)}`;
}

/** The meeting rows a virtual pod adds between the economics and the copy. */
function virtualRows(values: PodFormValues, data: PodFormData, t: Translate, empty: string): ReviewRow[] {
  const platform =
    data.meetingPlatforms?.find((option) => option.value === values.meeting_platform)?.label ??
    values.meeting_platform;
  return [
    {
      label: t('podForm.autoPod.reviewWhen'),
      value: windowLine(data.dateFormatter, values.pod_date_time, values.pod_end_date_time, empty),
    },
    { label: t('podForm.autoPod.reviewMeetingPlatform'), value: platform.trim() || empty },
    { label: t('podForm.autoPod.reviewMeetingLink'), value: values.meeting_url.trim() || empty },
    { label: t('podForm.autoPod.reviewMeetingNotes'), value: values.meeting_notes.trim() || empty },
  ];
}

/** "Rackets × 4" per attached product, named off the catalogue the form holds. */
function productLines(values: PodFormValues, products: any[], t: Translate): string[] {
  return values.product_requests
    .filter((request) => request.product_id)
    .map((request) => {
      const product = products.find((item) => String(item?.id) === request.product_id);
      return t('podForm.autoPod.reviewProductLine', {
        vars: { name: product?.product_name ?? request.product_id, quantity: request.quantity },
      });
    });
}

/**
 * Step 3: everything the template will say, read-only, above the roll-out
 * button. Derived from the live form values on every render, so it can never
 * disagree with what step 2 holds.
 */
export default function AutoPodReviewStep() {
  const { t } = useTranslation();
  const data = usePodFormData();
  const { control } = useFormContext<PodFormValues>();
  const values = useWatch({ control }) as PodFormValues;
  const category = useCategoryValue(values.super_category_id, values.sub_category_id);
  const empty = t('podForm.autoPod.reviewNone');
  const isVirtual = values.pod_mode === 'VIRTUAL';
  const hashtags = hashtagsOf(values.pod_hashtag_text);
  const media = linesToMedia(values.media_text);

  const rows: ReviewRow[] = [
    {
      label: t('podForm.autoPod.reviewCategory'),
      value: [category.super_name, category.category_name, category.sub_name].filter(Boolean).join(' › ') || empty,
    },
    { label: t('podForm.autoPod.reviewMode'), value: optionLabel(POD_MODES, values.pod_mode, t) },
    { label: t('podForm.autoPod.reviewTitle'), value: values.pod_title.trim() || empty },
    {
      label: t('podForm.autoPod.reviewPrice'),
      value: formatMoney(Number(values.pod_amount) || 0, { symbol: data.finance?.currency_symbol || '₹' }),
    },
    { label: t('podForm.autoPod.reviewSpots'), value: String(Number(values.no_of_spots) || 0) },
    { label: t('podForm.autoPod.reviewOccurrence'), value: optionLabel(OCCURRENCES, values.pod_occurrence, t) },
    ...(isVirtual ? virtualRows(values, data, t, empty) : []),
    { label: t('podForm.autoPod.reviewDescription'), value: values.pod_description.trim() || empty },
    { label: t('podForm.autoPod.reviewInfo'), value: values.pod_info.trim() || empty },
    { label: t('podForm.autoPod.reviewHashtags'), value: <ChipList items={hashtags} empty={empty} /> },
    { label: t('podForm.autoPod.reviewOffers'), value: <ChipList items={values.what_this_pod_offers} empty={empty} /> },
    { label: t('podForm.autoPod.reviewPerks'), value: <ChipList items={values.available_perks} empty={empty} /> },
    ...(isVirtual
      ? []
      : [{ label: t('podForm.autoPod.reviewProducts'), value: <ChipList items={productLines(values, data.products, t)} empty={empty} /> }]),
    { label: t('podForm.autoPod.reviewMedia'), value: t('podForm.autoPod.reviewMediaCount', { vars: { n: media.length } }) },
    { label: t('podForm.autoPod.reviewReel'), value: values.reel_url.trim() || empty },
  ];

  return (
    <Stack spacing={2} data-testid="auto-pod-review">
      <Alert severity="info">{t('podForm.autoPod.reviewHint')}</Alert>
      <Stack spacing={1.5} divider={<Divider flexItem />}>
        {rows.map((row) => (
          <InfoRow
            key={row.label}
            label={row.label}
            value={<Typography component="div" variant="body2" sx={{ whiteSpace: 'pre-line' }}>{row.value}</Typography>}
            variant="stacked"
          />
        ))}
      </Stack>
    </Stack>
  );
}
