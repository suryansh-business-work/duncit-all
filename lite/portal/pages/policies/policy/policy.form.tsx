import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormHelperText, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { usePortalT } from '../../../../shared/i18n';
import { FormDialog } from '../../../components/FormDialog';
import { RhfSwitch } from '../../../components/RhfSwitch';
import type { LiteAdminPolicy } from '../../../graphql/policies';
import { emptyPolicyValues, makePolicySchema, policyValuesFrom, type PolicyFormValues } from './policy.types';

interface Props {
  open: boolean;
  initial: LiteAdminPolicy | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: PolicyFormValues) => Promise<void>;
}

/**
 * Title, link, order, live switch and the policy text in the shared rich-text
 * editor. Its AI rewrite and picture upload call the main Duncit API, which the
 * console does not talk to, so both are off here.
 */
export function PolicyForm({ open, initial, busy, onClose, onSubmit }: Readonly<Props>) {
  const { t } = usePortalT();
  const schema = useMemo(() => makePolicySchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<PolicyFormValues, unknown, PolicyFormValues>({
    defaultValues: emptyPolicyValues(),
    resolver: zodResolver(schema) as Resolver<PolicyFormValues, unknown, PolicyFormValues>,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) reset(initial ? policyValuesFrom(initial) : emptyPolicyValues());
  }, [open, initial, reset]);

  const title = initial ? t('litePortal.policies.editTitle', { vars: { name: initial.title } }) : t('litePortal.policies.newTitle');

  return (
    <FormDialog open={open} title={title} onSubmit={handleSubmit(onSubmit)} onClose={onClose} busy={busy} maxWidth="md" testId="policy-dialog">
      <Stack spacing={1.5}>
        <RhfTextField control={control} name="title" label={t('litePortal.policies.titleLabel')} required disabled={busy} slotProps={{ htmlInput: { maxLength: 120, 'data-testid': 'policy-title' } }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <RhfTextField control={control} name="slug" label={t('litePortal.common.slug')} hint={t('litePortal.policies.slugHint')} disabled={busy} slotProps={{ htmlInput: { 'data-testid': 'policy-slug' } }} />
          <RhfTextField
            control={control}
            name="sort_order"
            label={t('litePortal.common.sortOrder')}
            hint={t('litePortal.common.sortOrderHint')}
            disabled={busy}
            slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'policy-sort-order' } }}
          />
        </Stack>
        <Controller
          control={control}
          name="content"
          render={({ field, fieldState }) => (
            <Stack spacing={0.75} data-testid="policy-content">
              <Typography variant="subtitle2" component="p">
                {t('litePortal.policies.content')}
              </Typography>
              <DuncitRichTextInput
                value={field.value}
                onChange={(html) => field.onChange(html)}
                ariaLabel={t('litePortal.policies.content')}
                minHeight={280}
                disabled={busy}
                aiImprove={false}
                images={false}
              />
              <FormHelperText error={Boolean(fieldState.error)} role={fieldState.error ? 'alert' : undefined} sx={{ mx: 0 }}>
                {fieldState.error?.message ?? t('litePortal.policies.contentHint')}
              </FormHelperText>
            </Stack>
          )}
        />
        <RhfSwitch control={control} name="is_active" label={t('litePortal.common.active')} hint={t('litePortal.policies.activeHint')} disabled={busy} testId="policy-active" />
      </Stack>
    </FormDialog>
  );
}
