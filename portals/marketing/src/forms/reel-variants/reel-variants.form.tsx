import { useEffect, useMemo, useRef } from 'react';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Paper, Stack, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { PLATFORM_LABEL } from '../../pages/social-accounts-page/copy';
import {
  MAX_CAPTION_LENGTH,
  MAX_HASHTAGS_LENGTH,
  MAX_TITLE_LENGTH,
  buildReelVariantsSchema,
  rowToVariant,
  variantsToForm,
  type ReelVariantsFormProps,
  type ReelVariantsFormValues,
} from './reel-variants.types';

/**
 * Every network's caption, editable side by side. There is no Save: the
 * server keeps what it generated, and what is typed here goes with the post
 * when a network's "Use for post" is pressed.
 */
export default function ReelVariantsForm({ variants, onUse }: Readonly<ReelVariantsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelVariantsSchema(t), [t]);
  const { control, reset, trigger, getValues } = useForm<ReelVariantsFormValues, unknown, ReelVariantsFormValues>({
    defaultValues: variantsToForm(variants),
    resolver: zodResolver(schema) as unknown as Resolver<ReelVariantsFormValues, unknown, ReelVariantsFormValues>,
    mode: 'onChange',
  });
  const { fields } = useFieldArray({ control, name: 'variants' });

  // A fresh generation replaces what was being edited: it was asked for. Keyed
  // on the contents, not the array: a parent re-render hands a new array with
  // the same captions and must not wipe what is being typed.
  const latest = useRef(variants);
  latest.current = variants;
  const incoming = useMemo(() => JSON.stringify(variantsToForm(variants)), [variants]);
  useEffect(() => {
    reset(variantsToForm(latest.current));
  }, [incoming, reset]);

  const use = async (index: number) => {
    if (!(await trigger(`variants.${index}`))) return;
    onUse(rowToVariant(getValues(`variants.${index}`)));
  };

  return (
    <Stack component="form" spacing={2} noValidate onSubmit={(event) => event.preventDefault()} data-testid="reel-variants-form">
      {fields.map((field, index) => (
        <Paper key={field.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid={`reel-variant-${field.platform}`}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" component="h3">
              {t(PLATFORM_LABEL[field.platform])}
            </Typography>
            <RhfTextField
              control={control}
              name={`variants.${index}.title`}
              label={t('ai.reels.variants.fieldTitle')}
              size="small"
              slotProps={{ htmlInput: { maxLength: MAX_TITLE_LENGTH, 'data-testid': `reel-variant-title-${field.platform}` } }}
            />
            <RhfTextField
              control={control}
              name={`variants.${index}.caption`}
              label={t('ai.reels.variants.fieldCaption')}
              multiline
              minRows={3}
              size="small"
              slotProps={{ htmlInput: { maxLength: MAX_CAPTION_LENGTH, 'data-testid': `reel-variant-caption-${field.platform}` } }}
            />
            <RhfTextField
              control={control}
              name={`variants.${index}.hashtags`}
              label={t('ai.reels.variants.fieldHashtags')}
              hint={t('ai.reels.variants.fieldHashtagsHint')}
              size="small"
              slotProps={{ htmlInput: { maxLength: MAX_HASHTAGS_LENGTH, 'data-testid': `reel-variant-hashtags-${field.platform}` } }}
            />
            <DuncitButton
              size="small"
              variant="outlined"
              startIcon={<SendIcon />}
              onClick={() => use(index)}
              sx={{ alignSelf: 'flex-start' }}
              data-testid={`reel-variant-use-${field.platform}`}
            >
              {t('ai.reels.variants.useForPost')}
            </DuncitButton>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
