import type { Ref } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { COLLABORATOR_CAP, uniqueHandles } from './collaborators';

interface Props {
  value: string[];
  onChange: (handles: string[]) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  /** The validation message, when the list is wrong. */
  error?: string;
  /** Shown under the field instead of the default cap note. */
  hint?: string;
  disabled?: boolean;
  testId: string;
}

/**
 * Instagram usernames typed as chips: Enter (or leaving the field) adds one,
 * a leading `@` is dropped and duplicates collapse. The cap is said under the
 * field, so it is known before the server refuses a fourth.
 */
export default function CollaboratorsField({ value, onChange, onBlur, inputRef, error, hint, disabled, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  const full = value.length >= COLLABORATOR_CAP;
  return (
    <Autocomplete<string, true, false, true>
      multiple
      freeSolo
      autoSelect
      disabled={disabled}
      options={[]}
      value={value}
      onChange={(_event, next) => onChange(uniqueHandles(next))}
      onBlur={onBlur}
      data-testid={testId}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          label={t('marketing.social.collaborators')}
          placeholder={full ? undefined : t('marketing.social.collaboratorsPlaceholder')}
          error={!!error}
          helperText={error ?? hint ?? t('marketing.social.collaboratorsHint', { vars: { max: COLLABORATOR_CAP } })}
        />
      )}
    />
  );
}
