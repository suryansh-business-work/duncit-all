import { Controller, type Control } from 'react-hook-form';
import { Box, Divider, FormControlLabel, Switch, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import EnumSelect from './EnumSelect';
import { enumOptions } from '../../labels';
import type { RateLimitOptionsData } from '../../queries';
import type { RateLimitRuleForm } from './rate-limit-rule.types';

interface Props {
  control: Control<RateLimitRuleForm>;
  options: RateLimitOptionsData;
}

const GRID = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } };

/** What happens on a breach, and who never trips one. */
export default function ResponseSection({ control, options }: Readonly<Props>) {
  const { t } = useTranslation();
  const roleOptions = options.roles.map((role) => ({ value: role.key, label: role.name }));

  return (
    <>
      <Divider textAlign="left">
        <Typography variant="overline">{t('tech.rateLimit.form.response')}</Typography>
      </Divider>
      <Box sx={GRID}>
        <EnumSelect
          control={control}
          name="mode"
          label={t('tech.rateLimit.field.mode')}
          hint={t('tech.rateLimit.field.modeHint')}
          options={enumOptions(t, options.modes)}
        />
        <RhfTextField
          control={control}
          name="priority"
          type="number"
          label={t('tech.rateLimit.field.priority')}
          hint={t('tech.rateLimit.field.priorityHint')}
          slotProps={{ htmlInput: { min: 0 } }}
        />
        <EnumSelect
          control={control}
          name="exempt_roles"
          label={t('tech.rateLimit.field.exemptRoles')}
          hint={t('tech.rateLimit.field.exemptRolesHint')}
          options={roleOptions}
          multiple
        />
        <RhfTextField
          control={control}
          name="exempt_ips"
          label={t('tech.rateLimit.field.exemptIps')}
          hint={t('tech.rateLimit.field.exemptIpsHint')}
        />
      </Box>
      <RhfTextField
        control={control}
        name="message"
        label={t('tech.rateLimit.field.message')}
        hint={t('tech.rateLimit.field.messageHint')}
        multiline
        minRows={2}
      />
      <Controller
        control={control}
        name="notify_slack"
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch checked={Boolean(field.value)} onChange={(_, v) => field.onChange(v)} />
            }
            label={t('tech.rateLimit.field.notifySlack')}
          />
        )}
      />
    </>
  );
}
