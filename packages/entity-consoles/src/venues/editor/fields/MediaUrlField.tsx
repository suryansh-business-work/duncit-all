import { InputAdornment, TextField } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import { DuncitButton } from '@duncit/buttons';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

/**
 * One stored URL, with the upload dialog beside it.
 *
 * The field stays editable text as well as a picker: a venue's paperwork is
 * often already hosted somewhere, and forcing a re-upload to record it would
 * make the honest answer the slow one.
 */
export interface MediaUrlFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  hint?: string;
  /** Opens the shared media dialog and resolves with the chosen URL. */
  onPick: () => Promise<string | null>;
  pickLabel: string;
}

export default function MediaUrlField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  onPick,
  pickLabel,
}: Readonly<MediaUrlFieldProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          label={label}
          size="small"
          fullWidth
          value={(field.value as string) ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? hint ?? ' '}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <DuncitButton
                    size="small"
                    startIcon={<UploadIcon />}
                    onClick={async () => {
                      const url = await onPick();
                      if (url) field.onChange(url);
                    }}
                  >
                    {pickLabel}
                  </DuncitButton>
                </InputAdornment>
              ),
            },
          }}
        />
      )}
    />
  );
}
