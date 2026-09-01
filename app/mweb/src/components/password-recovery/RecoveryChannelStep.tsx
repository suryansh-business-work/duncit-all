import { Link as RouterLink } from 'react-router';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, FormHelperText, InputAdornment, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs } from '@duncit/tabs';
import {
  PASSWORD_RECOVERY_CHANNELS,
  type ContactDraft,
  type PasswordRecoveryChannel,
  type PasswordRecoveryLabels,
} from '@duncit/utils';
import CountryCodeField from '../../forms/components/CountryCodeField';
import RhfTextField from '../../forms/components/RhfTextField';
import { useTranslation } from '../../i18n/useTranslation';
import { makeRecoveryLookupSchema, type RecoveryLookupValues } from './recovery.types';

interface Props {
  channel: PasswordRecoveryChannel;
  labels: PasswordRecoveryLabels;
  defaultValues: ContactDraft;
  busy: boolean;
  /** True when the destination typed has no account behind it. */
  notFound: boolean;
  onChannel: (channel: PasswordRecoveryChannel) => void;
  onSend: (draft: ContactDraft) => void;
}

const numericInput = { inputMode: 'numeric' as const, maxLength: 15 };

/**
 * Step one: where should the code go?
 *
 * The form is REMOUNTED per channel (`key`), because the two channels validate
 * different boxes — a resolver swapped underneath a live form leaves the
 * previous channel's errors sitting on fields the person can no longer see.
 */
export default function RecoveryChannelStep({
  channel,
  labels,
  defaultValues,
  busy,
  notFound,
  onChannel,
  onSend,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = labels.channel(channel);
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<RecoveryLookupValues, any, RecoveryLookupValues>({
    defaultValues,
    resolver: zodResolver(makeRecoveryLookupSchema(channel, t)) as unknown as Resolver<
      RecoveryLookupValues,
      any,
      RecoveryLookupValues
    >,
    mode: 'onChange',
  });

  const submit = handleSubmit(onSend);

  return (
    <Stack spacing={1.8}>
      <DuncitTabs
        items={PASSWORD_RECOVERY_CHANNELS.map((value) => ({
          value,
          label: labels.channel(value).name,
        }))}
        value={channel}
        onChange={(next) => onChannel(next as PasswordRecoveryChannel)}
      />

      <form noValidate onSubmit={submit}>
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {copy.hint}
          </Typography>

          {channel === 'PHONE' ? (
            <Stack direction="row" spacing={1}>
              <CountryCodeField control={control} name="extension" label={t('mweb.common.code')} />
              <RhfTextField
                control={control}
                name="number"
                label={copy.fieldLabel}
                required
                placeholder={copy.placeholder}
                autoComplete="tel-national"
                size="small"
                slotProps={{ inputLabel: { shrink: true }, htmlInput: numericInput }}
              />
            </Stack>
          ) : (
            <RhfTextField
              control={control}
              name="email"
              type="email"
              label={copy.fieldLabel}
              required
              placeholder={copy.placeholder}
              autoComplete="email"
              size="small"
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}

          {notFound && (
            <FormHelperText error role="alert" sx={{ mx: 1.75 }}>
              {labels.notFound}
            </FormHelperText>
          )}

          <DuncitButton
            type="submit"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            disabled={busy || !isValid}
            sx={{ borderRadius: '16px', py: 1.25, fontWeight: 700, textTransform: 'none' }}
          >
            {busy ? labels.sending : labels.sendCode}
          </DuncitButton>
        </Stack>
      </form>

      {notFound && (
        <Stack spacing={1} sx={{ alignItems: 'center' }}>
          <Alert severity="info" sx={{ width: '100%' }}>
            {labels.newToDuncit}
          </Alert>
          <DuncitButton
            component={RouterLink}
            to="/register"
            variant="contained"
            sx={{ borderRadius: '16px', px: 3, fontWeight: 700, textTransform: 'none' }}
          >
            {labels.createAccount}
          </DuncitButton>
        </Stack>
      )}
    </Stack>
  );
}
