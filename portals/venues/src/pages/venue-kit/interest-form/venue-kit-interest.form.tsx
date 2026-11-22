import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox, Chip, FormControlLabel, InputAdornment, Stack, TextField } from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import SmsIcon from '@mui/icons-material/Sms';
import VerifiedIcon from '@mui/icons-material/Verified';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import VenueKitCodeStep from './VenueKitCodeStep';
import {
  VENUE_KIT_DIAL_CODE,
  venueKitCodeSchema,
  venueKitInterestDefaults,
  venueKitInterestSchema,
  type VenueKitInterestFormProps,
  type VenueKitInterestOutput,
  type VenueKitInterestValues,
} from './venue-kit-interest.types';

/**
 * Venues console → Venue Kit → register a venue's interest. Email code first
 * (required), then the +91 mobile with an optional SMS code. Presentational:
 * the proofs and the server calls arrive as `state` / `actions`.
 */
export default function VenueKitInterestForm({ state, actions }: Readonly<VenueKitInterestFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => venueKitInterestSchema(t), [t]);
  const codeSchema = useMemo(() => venueKitCodeSchema(t), [t]);
  const { control, handleSubmit, trigger, getValues, setError, clearErrors, reset, watch, formState } = useForm<
    VenueKitInterestValues,
    unknown,
    VenueKitInterestOutput
  >({ resolver: zodResolver(schema), mode: 'onSubmit', defaultValues: venueKitInterestDefaults });
  const { errors } = formState;
  const emailProved = state.emailToken !== null;
  const phoneProved = state.phoneToken !== null;
  const verifyPhone = watch('verify_phone');

  const email = () => getValues('email').trim().toLowerCase();
  const phone = () => schema.shape.phone_number.parse(getValues('phone_number'));

  /** The typed code, or null after the field has been told why not. */
  const codeIn = (name: 'email_code' | 'phone_code') => {
    const parsed = codeSchema.safeParse(getValues(name));
    if (parsed.success) {
      clearErrors(name);
      return parsed.data;
    }
    setError(name, { message: parsed.error.issues[0]?.message });
    return null;
  };

  const sendEmail = async () => {
    if (await trigger(['name', 'email'])) await actions.sendEmail(getValues('name').trim(), email());
  };
  const verifyEmail = async () => {
    const code = codeIn('email_code');
    if (code) await actions.verifyEmail(email(), code);
  };
  const sendPhone = async () => {
    if (await trigger('phone_number')) await actions.sendPhone(phone());
  };
  const verifyPhoneCode = async () => {
    const code = codeIn('phone_code');
    if (code) await actions.verifyPhone(phone(), code);
  };
  const changeEmail = () => {
    actions.reset();
    reset({ ...getValues(), email_code: '', phone_code: '', verify_phone: false });
  };
  const submit = handleSubmit(async (values) => {
    if (await actions.submit({ name: values.name, phone_number: values.phone_number })) reset(venueKitInterestDefaults);
  });

  const text = (name: 'name' | 'email' | 'phone_number', label: string, extra: Partial<Parameters<typeof TextField>[0]> = {}) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          size="small"
          label={label}
          required
          fullWidth
          error={Boolean(errors[name])}
          helperText={errors[name]?.message ?? extra.helperText}
          {...extra}
          slotProps={{ ...extra.slotProps, htmlInput: { 'data-testid': `venue-kit-${name}` } }}
        />
      )}
    />
  );

  return (
    <form onSubmit={submit} noValidate data-testid="venue-kit-interest-form">
      <Stack spacing={2}>
        {text('name', t('venueKit.form.nameLabel'), { helperText: t('venueKit.form.nameHint'), autoComplete: 'name' })}
        {text('email', t('venueKit.form.emailLabel'), { type: 'email', disabled: emailProved || state.emailNote !== null })}
        {text('phone_number', t('venueKit.form.phoneLabel'), {
          helperText: t('venueKit.form.phoneHint'),
          // Held while its code is out or proved; unticking the SMS step frees it again.
          disabled: phoneProved || (verifyPhone && state.phoneNote !== null),
          slotProps: { input: { startAdornment: <InputAdornment position="start">{VENUE_KIT_DIAL_CODE}</InputAdornment> } },
        })}

        {!emailProved && state.emailNote === null && (
          <DuncitButton variant="outlined" startIcon={<MarkEmailReadIcon />} onClick={sendEmail} loading={state.busy === 'sendEmail'} sx={{ alignSelf: 'flex-start' }} data-testid="venue-kit-send-email">
            {t('venueKit.form.sendEmailCode')}
          </DuncitButton>
        )}
        {!emailProved && state.emailNote !== null && (
          <Controller
            name="email_code"
            control={control}
            render={({ field }) => (
              <VenueKitCodeStep
                note={state.emailNote ?? ''}
                value={field.value}
                error={errors.email_code?.message}
                onChange={field.onChange}
                onVerify={verifyEmail}
                onResend={sendEmail}
                verifying={state.busy === 'verifyEmail'}
                resending={state.busy === 'sendEmail'}
                verifyLabel={t('venueKit.form.verifyEmail')}
                testId="venue-kit-email-code"
              />
            )}
          />
        )}
        {(emailProved || state.emailNote !== null) && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            {emailProved && <Chip color="success" icon={<VerifiedIcon />} label={t('venueKit.form.emailVerified')} />}
            <DuncitButton variant="text" onClick={changeEmail} data-testid="venue-kit-change-email">
              {t('venueKit.form.changeEmail')}
            </DuncitButton>
          </Stack>
        )}

        {emailProved && (
          <Stack spacing={1.5}>
            <Controller
              name="verify_phone"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={(_e, checked) => field.onChange(checked)} disabled={phoneProved} slotProps={{ input: { 'aria-label': t('venueKit.form.verifyPhoneToggle') } }} />}
                  label={t('venueKit.form.verifyPhoneToggle')}
                />
              )}
            />
            {phoneProved && <Chip color="success" icon={<VerifiedIcon />} label={t('venueKit.form.phoneVerified')} sx={{ alignSelf: 'flex-start' }} />}
            {verifyPhone && !phoneProved && state.phoneNote === null && (
              <DuncitButton variant="outlined" startIcon={<SmsIcon />} onClick={sendPhone} loading={state.busy === 'sendPhone'} sx={{ alignSelf: 'flex-start' }} data-testid="venue-kit-send-phone">
                {t('venueKit.form.sendPhoneCode')}
              </DuncitButton>
            )}
            {verifyPhone && !phoneProved && state.phoneNote !== null && (
              <Controller
                name="phone_code"
                control={control}
                render={({ field }) => (
                  <VenueKitCodeStep
                    note={state.phoneNote ?? ''}
                    value={field.value}
                    error={errors.phone_code?.message}
                    onChange={field.onChange}
                    onVerify={verifyPhoneCode}
                    onResend={sendPhone}
                    verifying={state.busy === 'verifyPhone'}
                    resending={state.busy === 'sendPhone'}
                    verifyLabel={t('venueKit.form.verifyPhone')}
                    testId="venue-kit-phone-code"
                  />
                )}
              />
            )}
          </Stack>
        )}

        <DuncitButton type="submit" variant="contained" disabled={!emailProved} loading={state.busy === 'submit'} sx={{ alignSelf: 'flex-start' }} data-testid="venue-kit-submit">
          {t('venueKit.form.submit')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
