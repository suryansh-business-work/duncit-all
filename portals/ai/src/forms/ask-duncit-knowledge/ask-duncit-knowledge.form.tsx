import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Chip, MenuItem, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { roleLabelKey } from '@duncit/utils';
import { ROLE_KEYS } from '../../pages/ask-duncit/shared/types';
import {
  buildAskDuncitKnowledgeSchema,
  KNOWLEDGE_KINDS,
  KNOWLEDGE_STATUSES,
  type AskDuncitKnowledgeFormProps,
  type AskDuncitKnowledgeValues,
} from './ask-duncit-knowledge.types';

type KnowledgeResolver = Resolver<AskDuncitKnowledgeValues, unknown, AskDuncitKnowledgeValues>;

/** One knowledge-base article or SOP (RHF + Zod). The dialog's submit button targets the form by id. */
export default function AskDuncitKnowledgeForm({ formId, initialValues, onSubmit }: Readonly<AskDuncitKnowledgeFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildAskDuncitKnowledgeSchema(t), [t]);
  const { control, handleSubmit } = useForm<AskDuncitKnowledgeValues, unknown, AskDuncitKnowledgeValues>({
    defaultValues: initialValues,
    resolver: zodResolver(schema) as unknown as KnowledgeResolver,
    mode: 'onTouched',
  });

  return (
    <Stack component="form" id={formId} noValidate spacing={2} onSubmit={handleSubmit(onSubmit)} data-testid="ask-duncit-knowledge-form" sx={{ pt: 1 }}>
      <RhfTextField control={control} name="title" label={t('ai.askDuncit.knowledge.titleLabel')} fullWidth required />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField control={control} name="kind" select label={t('ai.askDuncit.knowledge.kind')} fullWidth>
          {KNOWLEDGE_KINDS.map((kind) => (
            <MenuItem key={kind} value={kind}>
              {kind}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField control={control} name="status" select label={t('ai.askDuncit.knowledge.status')} fullWidth>
          {KNOWLEDGE_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField control={control} name="locale" label={t('ai.askDuncit.knowledge.locale')} hint={t('ai.askDuncit.knowledge.localeHint')} fullWidth />
      </Stack>
      <Controller
        control={control}
        name="audience_roles"
        render={({ field }) => (
          <Stack spacing={0.75}>
            <Typography id="ask-duncit-audience" variant="subtitle2" sx={{ color: 'text.secondary' }}>
              {t('ai.askDuncit.knowledge.audience')}
            </Typography>
            <Stack direction="row" useFlexGap role="group" aria-labelledby="ask-duncit-audience" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
              {ROLE_KEYS.map((role) => {
                const on = field.value.includes(role);
                return (
                  <Chip
                    key={role}
                    label={t(roleLabelKey(role))}
                    color={on ? 'primary' : 'default'}
                    aria-pressed={on}
                    onClick={() => field.onChange(on ? field.value.filter((r) => r !== role) : [...field.value, role])}
                  />
                );
              })}
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('ai.askDuncit.knowledge.audienceHint')}
            </Typography>
          </Stack>
        )}
      />
      <RhfTextField control={control} name="tags" label={t('ai.askDuncit.knowledge.tags')} hint={t('ai.askDuncit.knowledge.tagsHint')} fullWidth />
      <RhfTextField control={control} name="body" label={t('ai.askDuncit.knowledge.body')} hint={t('ai.askDuncit.knowledge.bodyHint')} multiline minRows={10} fullWidth required />
    </Stack>
  );
}
