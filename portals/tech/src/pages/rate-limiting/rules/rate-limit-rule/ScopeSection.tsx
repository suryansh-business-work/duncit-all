import type { Control } from 'react-hook-form';
import { Box, Divider, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import EnumSelect from './EnumSelect';
import { enumOptions } from '../../labels';
import type { RateLimitOptionsData } from '../../queries';
import type { RateLimitRuleForm } from './rate-limit-rule.types';

interface Props {
  control: Control<RateLimitRuleForm>;
  options: RateLimitOptionsData;
  /** GraphQL fields only mean something on the GraphQL channel, and paths only
   * on REST — the irrelevant half is hidden rather than left to mislead. */
  channel: string;
}

const GRID = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } };

/**
 * Which traffic the rule governs.
 *
 * The app list is served from the systems that have actually called, so a
 * console added last week is already in the dropdown — plus the wildcard,
 * which is what a surface-wide ceiling wants.
 */
export default function ScopeSection({ control, options, channel }: Readonly<Props>) {
  const { t } = useTranslation();
  const anyApp = { value: '*', label: t('tech.rateLimit.field.everyApp') };
  const appOptions = [
    anyApp,
    ...options.apps.map((app) => ({ value: app.app, label: `${app.label} (${app.app})` })),
  ];
  const showGraphql = channel === 'GRAPHQL' || channel === 'ALL';
  const showRest = channel !== 'GRAPHQL';

  return (
    <>
      <Divider textAlign="left">
        <Typography variant="overline">{t('tech.rateLimit.form.scope')}</Typography>
      </Divider>
      <Box sx={GRID}>
        <EnumSelect
          control={control}
          name="surface"
          label={t('tech.rateLimit.field.surface')}
          hint={t('tech.rateLimit.field.surfaceHint')}
          options={enumOptions(t, ['ALL', ...options.surfaces])}
        />
        <EnumSelect
          control={control}
          name="app"
          label={t('tech.rateLimit.field.app')}
          hint={t('tech.rateLimit.field.appHint')}
          options={appOptions}
        />
        <EnumSelect
          control={control}
          name="channel"
          label={t('tech.rateLimit.field.channel')}
          hint={t('tech.rateLimit.field.channelHint')}
          options={enumOptions(t, ['ALL', ...options.channels])}
        />
        <EnumSelect
          control={control}
          name="audience"
          label={t('tech.rateLimit.field.audience')}
          hint={t('tech.rateLimit.field.audienceHint')}
          options={enumOptions(t, options.audiences)}
        />
        {showGraphql && (
          <EnumSelect
            control={control}
            name="operation_type"
            label={t('tech.rateLimit.field.operationType')}
            hint={t('tech.rateLimit.field.operationTypeHint')}
            options={enumOptions(t, options.operation_types)}
          />
        )}
        {showGraphql && (
          <RhfTextField
            control={control}
            name="operations"
            label={t('tech.rateLimit.field.operations')}
            hint={t('tech.rateLimit.field.operationsHint')}
          />
        )}
        {showRest && (
          <RhfTextField
            control={control}
            name="paths"
            label={t('tech.rateLimit.field.paths')}
            hint={t('tech.rateLimit.field.pathsHint')}
          />
        )}
        {showRest && (
          <RhfTextField
            control={control}
            name="methods"
            label={t('tech.rateLimit.field.methods')}
            hint={t('tech.rateLimit.field.methodsHint')}
          />
        )}
      </Box>
    </>
  );
}
