import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  isPhoneChannel,
  type ContactChangeLabels,
  type ContactChannel,
  type ContactDraft,
} from '@duncit/utils';
import RhfTextField from '../../../forms/components/RhfTextField';
import CountryCodeField from '../../../forms/components/CountryCodeField';
import { useTranslation } from '../../../i18n/useTranslation';
import { makeContactValueSchema, type ContactValueValues } from './contact-change.types';

interface Props {
  channel: ContactChannel;
  labels: ContactChangeLabels;
  defaultValues: ContactDraft;
  busy: boolean;
  onSend: (draft: ContactDraft) => void;
}

const numericInput = { inputMode: 'numeric' as const, maxLength: 15 };

/**
 * Step one: the new address or number.
 *
 * A real form (rule 10) rather than a bare box, because this is the value a
 * code is about to be sent to — a typo caught here costs nothing, and one
 * caught after the send costs the person a wait and a wasted code.
 */
export default function ContactValueStep({
  channel,
  labels,
  defaultValues,
  busy,
  onSend,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = labels.channel(channel);
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<ContactValueValues>({
    defaultValues,
    resolver: zodResolver(makeContactValueSchema(channel)),
    mode: 'onChange',
  });

  const submit = handleSubmit(onSend);

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {copy.changeHint}
        </Typography>
        {isPhoneChannel(channel) ? (
          <Stack direction="row" spacing={1}>
            <CountryCodeField control={control} name="extension" label={t('mweb.common.code')} />
            <RhfTextField
              control={control}
              name="number"
              label={copy.fieldLabel}
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
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        )}
        <DuncitButton type="submit" variant="contained" disabled={busy || !isValid}>
          {busy ? labels.sending : labels.sendCode}
        </DuncitButton>
      </Stack>
    </form>
  );
}
