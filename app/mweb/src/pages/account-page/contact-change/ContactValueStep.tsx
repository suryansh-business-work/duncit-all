import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  CONTACT_NUMBER_FIELDS,
  contactValueStepView,
  isPhoneChannel,
  type ContactChangeLabels,
  type ContactChannel,
  type ContactDraft,
  type ContactSnapshot,
} from '@duncit/utils';
import RhfTextField from '../../../forms/components/RhfTextField';
import CountryCodeField from '../../../forms/components/CountryCodeField';
import { useSignupPhoneCheck } from '../../../forms/register/useSignupContactCheck';
import { useTranslation } from '../../../i18n/useTranslation';
import { makeContactValueSchema, type ContactValueValues } from './contact-change.types';

interface Props {
  channel: ContactChannel;
  labels: ContactChangeLabels;
  defaultValues: ContactDraft;
  /** What the account holds now — its own number is never "taken". */
  snapshot: ContactSnapshot;
  /** The box has been changed since it opened (`noteContactEdit`). */
  edited: boolean;
  busy: boolean;
  /** A refusal of the typed value is showing — resending it would only repeat it. */
  blocked: boolean;
  /** PHONE_OTP_FLAG — whether the contact number is proved by an SMS code. */
  phoneOtp: boolean;
  /** May be async: the contact number is stored by this very submit. */
  onSend: (draft: ContactDraft) => void | Promise<void>;
  /** Told on every edit, so a refusal about the old value can be dropped. */
  onEdit: () => void;
}

const numericInput = { inputMode: 'numeric' as const, maxLength: 15 };

/**
 * Step one: the new address or number.
 *
 * A real form (rule 10) rather than a bare box: on the two channels that send
 * a code, a typo caught here costs nothing and one caught after the send costs
 * the person a wait and a wasted code — and on the contact number, which is
 * stored the moment this button is pressed, this form is the only thing
 * between a mistyped digit and the account.
 */
export default function ContactValueStep({
  channel,
  labels,
  defaultValues,
  snapshot,
  edited,
  busy,
  blocked,
  phoneOtp,
  onSend,
  onEdit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = labels.channel(channel);
  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<ContactValueValues, any, ContactValueValues>({
    defaultValues,
    resolver: zodResolver(makeContactValueSchema(channel, t, snapshot)) as unknown as Resolver<ContactValueValues, any, ContactValueValues>,
    mode: 'onChange',
  });

  useEffect(() => {
    const sub = watch(onEdit);
    return () => sub.unsubscribe();
  }, [watch, onEdit]);

  // Asked as the number is typed, so a number another account already holds is
  // a warning beside the box and a shut button — not a refusal after the press.
  // The EMAIL box leaves `number` blank, which never leaves the device.
  const numberStatus = useSignupPhoneCheck(control, CONTACT_NUMBER_FIELDS);
  const view = contactValueStepView(channel, labels, { busy, blocked, isValid, numberStatus, phoneOtp, snapshot, draft: watch(), edited });
  const submit = handleSubmit(onSend);

  return (
    <form data-testid="contact-value-step" noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <Typography data-testid="contact-change-hint-text" variant="body2" sx={{ color: 'text.secondary' }}>
          {view.hint}
        </Typography>
        {isPhoneChannel(channel) ? (
          // Top-aligned and the same box size as the code, so a line under the
          // number never pushes the two boxes out of line.
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <CountryCodeField
              control={control}
              name="extension"
              label={t('mweb.common.code')}
              testId="contact-change-code"
            />
            <RhfTextField
              control={control}
              name="number"
              label={copy.fieldLabel}
              required
              hint={view.numberLines.hint}
              errorText={view.numberLines.error}
              autoComplete="tel-national"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: numericInput }}
            />
          </Stack>
        ) : (
          <RhfTextField
            control={control}
            name="email"
            type="email"
            label={copy.fieldLabel}
            size="small"
            required
            autoComplete="email"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        )}
        <DuncitButton data-testid="contact-change-send" type="submit" variant="contained" disabled={view.disabled}>
          {view.buttonLabel}
        </DuncitButton>
      </Stack>
    </form>
  );
}
