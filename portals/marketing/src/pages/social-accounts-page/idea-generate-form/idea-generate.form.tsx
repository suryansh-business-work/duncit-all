import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel, MenuItem, Stack } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { PLATFORMS, PLATFORM_LABEL } from '../copy';
import type { SocialPlatform } from '../queries';
import {
  IDEA_COUNTS,
  blankIdeaGenerateValues,
  ideaGenerateSchema,
  type IdeaGenerateFormProps,
  type IdeaGenerateFormValues,
} from './idea-generate.types';

/** What the ideas should be about, for which networks, and how many. */
export default function IdeaGenerateForm({ onSubmit }: Readonly<IdeaGenerateFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => ideaGenerateSchema(t), [t]);
  const { control, handleSubmit } = useForm<IdeaGenerateFormValues, any, IdeaGenerateFormValues>({
    defaultValues: blankIdeaGenerateValues(),
    resolver: zodResolver(schema) as unknown as Resolver<IdeaGenerateFormValues, any, IdeaGenerateFormValues>,
    mode: 'onChange',
  });

  const generate = async () => {
    await handleSubmit(onSubmit)();
  };

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} data-testid="social-idea-form">
      <Stack spacing={2}>
        <RhfTextField
          control={control}
          name="brief"
          label={t('marketing.social.ideaBrief')}
          hint={t('marketing.social.ideaBriefHint')}
          multiline
          minRows={2}
        />
        <Controller
          control={control}
          name="platforms"
          render={({ field }) => {
            const chosen = new Set(field.value);
            const toggle = (platform: SocialPlatform) =>
              field.onChange(chosen.has(platform) ? field.value.filter((p) => p !== platform) : [...field.value, platform]);
            return (
              <FormControl component="fieldset">
                <FormLabel component="legend">{t('marketing.social.ideaNetworks')}</FormLabel>
                <FormGroup row>
                  {PLATFORMS.map((platform) => (
                    <FormControlLabel
                      key={platform}
                      control={<Checkbox checked={chosen.has(platform)} onChange={() => toggle(platform)} />}
                      label={
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                          <PlatformIcon platform={platform} fontSize="small" sx={{ color: 'text.secondary' }} />
                          <span>{t(PLATFORM_LABEL[platform])}</span>
                        </Stack>
                      }
                    />
                  ))}
                </FormGroup>
              </FormControl>
            );
          }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' } }}>
          <RhfTextField control={control} name="count" label={t('marketing.social.ideaCount')} select sx={{ minWidth: 160 }}>
            {IDEA_COUNTS.map((count) => (
              <MenuItem key={count} value={count}>
                {count}
              </MenuItem>
            ))}
          </RhfTextField>
          <DuncitButton variant="contained" startIcon={<AutoAwesomeIcon />} onClick={generate} data-testid="social-idea-generate">
            {t('marketing.social.generateIdeas')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
