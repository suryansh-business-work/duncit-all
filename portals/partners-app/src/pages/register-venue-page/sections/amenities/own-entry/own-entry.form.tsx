import { useEffect, useMemo, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { NO_OWN_OPTION_CAP } from '../amenity-options';
import { makeOwnEntrySchema, type OwnEntryFormProps, type OwnEntryValues } from './own-entry.types';

/**
 * The opened "+" chip: one short input that adds the entry on Enter or the tick
 * and closes on Escape or the cross. Not a <form> of its own — it sits inside
 * the setup page's form, so Enter is caught here rather than saving the page.
 */
export default function OwnEntryForm({ groupLabel, maxLength, taken, initial, onAdd, onClose, testId }: Readonly<OwnEntryFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeOwnEntrySchema(t, maxLength, taken), [t, maxLength, taken]);
  const { control, handleSubmit, setFocus } = useForm<OwnEntryValues>({
    resolver: zodResolver(schema),
    defaultValues: { entry: initial },
  });
  // Opened by pressing "+", so the input takes the focus the chip just had.
  useEffect(() => setFocus('entry'), [setFocus]);
  const submit = () =>
    fireAndForget(
      handleSubmit(({ entry }) => onAdd(entry))(),
      logs.portal['partners-app'],
      'venue-amenities',
      'add-own-entry',
    );
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-start' }} data-testid={testId}>
      <RhfTextField
        control={control}
        name="entry"
        size="small"
        fullWidth={false}
        label={t('partners.registerVenuePage.ownEntryLabel', { vars: { group: groupLabel } })}
        hint={maxLength < NO_OWN_OPTION_CAP ? t('partners.registerVenuePage.ownEntryHint', { vars: { max: maxLength } }) : undefined}
        onKeyDown={onKeyDown}
      />
      <DuncitIconButton size="small" aria-label={t('partners.registerVenuePage.addOwnEntry')} onClick={submit}>
        <CheckIcon fontSize="small" />
      </DuncitIconButton>
      <DuncitIconButton size="small" aria-label={t('shell.common.cancel')} onClick={onClose}>
        <CloseIcon fontSize="small" />
      </DuncitIconButton>
    </Stack>
  );
}
