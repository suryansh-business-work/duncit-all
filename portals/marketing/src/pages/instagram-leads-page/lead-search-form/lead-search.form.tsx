import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MenuItem, Stack } from '@mui/material';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import {
  RESULT_COUNTS,
  blankLeadSearchValues,
  leadSearchSchema,
  type LeadSearchFormProps,
  type LeadSearchFormValues,
} from './lead-search.types';

/** The leads wanted, in the marketer's own words, and how many to add at most. */
export default function LeadSearchForm({ disabled, onSubmit }: Readonly<LeadSearchFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => leadSearchSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<LeadSearchFormValues, unknown, LeadSearchFormValues>({
    defaultValues: blankLeadSearchValues(),
    resolver: zodResolver(schema) as unknown as Resolver<LeadSearchFormValues, unknown, LeadSearchFormValues>,
    mode: 'onChange',
  });

  const find = async () => {
    await handleSubmit(async (values) => {
      if (await onSubmit(values)) reset(blankLeadSearchValues());
    })();
  };

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} data-testid="ig-lead-search-form">
      <Stack spacing={2}>
        <RhfTextField
          control={control}
          name="brief"
          label={t('marketing.igLeads.brief')}
          hint={t('marketing.igLeads.briefHint')}
          multiline
          minRows={3}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' } }}>
          <RhfTextField control={control} name="max_results" label={t('marketing.igLeads.maxResults')} select sx={{ minWidth: 180 }}>
            {RESULT_COUNTS.map((count) => (
              <MenuItem key={count} value={count}>
                {count}
              </MenuItem>
            ))}
          </RhfTextField>
          <DuncitButton variant="contained" startIcon={<TravelExploreIcon />} disabled={disabled} onClick={find} data-testid="ig-lead-search-start">
            {t('marketing.igLeads.findLeads')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
