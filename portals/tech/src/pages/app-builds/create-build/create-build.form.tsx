import { useEffect, useRef } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { AppBuildArtifactKind, AppBuildPlatform, AppBuildTriggerConfig } from '../queries';
import {
  createBuildSchema,
  defaultRefFor,
  PLATFORM_ARTIFACTS,
  type CreateBuildValues,
} from './create-build.types';

interface Props {
  platform: AppBuildPlatform;
  config: AppBuildTriggerConfig;
  onSubmit: (values: CreateBuildValues) => void;
}

/** Submits this form from outside it — the dialog owns the action buttons. */
export const CREATE_BUILD_FORM_ID = 'create-build-form';

interface ArtifactFieldProps {
  control: Control<CreateBuildValues>;
  kinds: AppBuildArtifactKind[];
  label: string;
}

/**
 * Which files to produce. Android only — iOS can make exactly one thing, and a
 * choice with a single option is a question not worth asking.
 */
function ArtifactField({ control, kinds, label }: Readonly<ArtifactFieldProps>) {
  return (
    <Controller
      control={control}
      name="artifacts"
      render={({ field, fieldState }) => (
        <FormControl component="fieldset" error={!!fieldState.error}>
          <FormLabel component="legend" sx={{ fontSize: 14 }}>
            {label}
          </FormLabel>
          <FormGroup row>
            {kinds.map((kind) => (
              <FormControlLabel
                key={kind}
                control={
                  <Checkbox
                    checked={field.value.includes(kind)}
                    onChange={(e) => {
                      // Rebuilt from the platform's own order, so the primary
                      // artifact stays first however the boxes were ticked.
                      const next = e.target.checked
                        ? kinds.filter((k) => k === kind || field.value.includes(k))
                        : field.value.filter((k) => k !== kind);
                      field.onChange(next);
                    }}
                  />
                }
                label={kind}
              />
            ))}
          </FormGroup>
          {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}

export default function CreateBuildForm({ platform, config, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const kinds = PLATFORM_ARTIFACTS[platform];
  const { control, handleSubmit, watch, setValue } = useForm<CreateBuildValues>({
    defaultValues: {
      app_env: 'PRODUCTION',
      artifacts: kinds,
      ref: config.production_ref,
    },
    resolver: zodResolver(
      createBuildSchema({
        refFormat: t('tech.appBuilds.refFormat'),
        artifactsRequired: t('tech.appBuilds.artifactsRequired'),
      })
    ),
    mode: 'all',
  });

  const appEnv = watch('app_env');
  // Follow the env until the operator types their own branch, then stop —
  // silently replacing a hand-typed ref because the env changed would build
  // something they did not ask for.
  const refEdited = useRef(false);
  useEffect(() => {
    if (refEdited.current) return;
    setValue('ref', defaultRefFor(appEnv, config), { shouldValidate: true });
  }, [appEnv, config, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate id={CREATE_BUILD_FORM_ID}>
      <Stack spacing={2.5} sx={{ pt: 1 }}>
        <Controller
          control={control}
          name="app_env"
          render={({ field }) => (
            <TextField {...field} select label={t('tech.appBuilds.envLabel')} fullWidth>
              <MenuItem value="PRODUCTION">{t('tech.appBuilds.envProduction')}</MenuItem>
              <MenuItem value="STAGING">{t('tech.appBuilds.envStaging')}</MenuItem>
            </TextField>
          )}
        />

        {/* The env is compiled in and cannot be changed once the app is
            installed, which is the one thing an operator must know before
            handing the build to a tester. */}
        <Alert severity={appEnv === 'STAGING' ? 'warning' : 'info'} variant="outlined">
          {appEnv === 'STAGING'
            ? t('tech.appBuilds.envStagingHint')
            : t('tech.appBuilds.envProductionHint')}
        </Alert>

        {kinds.length > 1 && (
          <ArtifactField control={control} kinds={kinds} label={t('tech.appBuilds.artifactsLabel')} />
        )}

        <Controller
          control={control}
          name="ref"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              onChange={(e) => {
                refEdited.current = true;
                field.onChange(e);
              }}
              label={t('tech.appBuilds.refLabel')}
              fullWidth
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? t('tech.appBuilds.refHint')}
            />
          )}
        />
      </Stack>
    </form>
  );
}
