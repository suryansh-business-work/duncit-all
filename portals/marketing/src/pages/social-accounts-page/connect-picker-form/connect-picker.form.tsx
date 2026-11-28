import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Avatar, Checkbox, Chip, FormControl, FormControlLabel, FormHelperText, FormLabel, Stack } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { PLATFORM_LABEL } from '../copy';
import type { SocialPendingAccount } from '../queries';
import {
  byPlatform,
  connectPickerSchema,
  defaultPickerValues,
  savedCount,
  type ConnectPickerFormProps,
  type ConnectPickerFormValues,
} from './connect-picker.types';

function AccountLabel({ account, reconnect }: Readonly<{ account: SocialPendingAccount; reconnect: boolean }>) {
  const { t } = useTranslation();
  const name = account.handle && account.handle !== account.name ? `${account.name} (${account.handle})` : account.name || account.handle;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Avatar src={account.avatar_url || undefined} alt="" sx={{ width: 28, height: 28 }}>
        <PlatformIcon platform={account.platform} fontSize="small" />
      </Avatar>
      <span>{t('marketing.socialPicker.accountLine', { vars: { platform: t(PLATFORM_LABEL[account.platform]), name } })}</span>
      {account.connected && (
        <Chip size="small" variant="outlined" label={reconnect ? t('marketing.socialPicker.willRefresh') : t('marketing.socialPicker.connected')} />
      )}
    </Stack>
  );
}

/**
 * The accounts one grant reached, grouped by platform, to tick. Everything
 * new starts ticked; an account already connected is shown ticked and fixed
 * (refreshed on a Reconnect, left alone otherwise).
 */
export default function ConnectPickerForm({ connection, onSubmit, onCancel }: Readonly<ConnectPickerFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => connectPickerSchema(t, connection), [t, connection]);
  const { control, handleSubmit, watch, formState } = useForm<ConnectPickerFormValues, unknown, ConnectPickerFormValues>({
    defaultValues: defaultPickerValues(connection),
    resolver: zodResolver(schema) as unknown as Resolver<ConnectPickerFormValues, unknown, ConnectPickerFormValues>,
  });
  const count = savedCount(connection, watch('keys'));

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values.keys))} data-testid="connect-picker-form">
      <Controller
        control={control}
        name="keys"
        render={({ field, fieldState }) => (
          <Stack spacing={2}>
            {byPlatform(connection.accounts).map((group) => (
              <FormControl key={group.platform} component="fieldset" data-testid={`connect-picker-group-${group.platform.toLowerCase()}`}>
                <FormLabel component="legend">{t(PLATFORM_LABEL[group.platform])}</FormLabel>
                {group.accounts.map((account) => (
                  <FormControlLabel
                    key={account.key}
                    label={<AccountLabel account={account} reconnect={connection.reconnect} />}
                    disabled={account.connected || formState.isSubmitting}
                    control={
                      <Checkbox
                        checked={account.connected || field.value.includes(account.key)}
                        onChange={(_event, on) => field.onChange(on ? [...field.value, account.key] : field.value.filter((key) => key !== account.key))}
                        data-testid={`connect-picker-${account.key}`}
                      />
                    }
                  />
                ))}
              </FormControl>
            ))}
            {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
          </Stack>
        )}
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 3 }}>
        <DuncitButton onClick={onCancel} disabled={formState.isSubmitting}>
          {t('marketing.socialPicker.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" startIcon={<LinkIcon />} loading={formState.isSubmitting} data-testid="connect-picker-submit">
          {t('marketing.socialPicker.connectCount', { count })}
        </DuncitButton>
      </Stack>
    </form>
  );
}
