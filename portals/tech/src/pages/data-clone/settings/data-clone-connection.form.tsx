import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InputAdornment, Stack, TextField, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { CloneConnection } from '../queries';
import { dataCloneConnectionSchema, type DataCloneConnectionValues } from './data-clone-connection.types';

interface Props {
  connection: CloneConnection;
  busy: boolean;
  onSubmit: (values: DataCloneConnectionValues) => void;
}

/**
 * One end's credentials: the Atlas connection string and the database on it.
 *
 * Saving and connecting are the same action — a string that was never used is
 * not evidence of anything, so there is no way to leave a connection saved but
 * unproved.
 */
export default function DataCloneConnectionForm({ connection, busy, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const [reveal, setReveal] = useState(false);

  const messages = {
    uriRequired: t('tech.dataClone.uriRequired'),
    uriFormat: t('tech.dataClone.uriFormat'),
    databaseRequired: t('tech.dataClone.databaseRequired'),
  };
  const { control, handleSubmit, reset } = useForm<DataCloneConnectionValues>({
    defaultValues: { uri: '', database: connection.database },
    resolver: zodResolver(dataCloneConnectionSchema(connection.hasUri, messages)),
    mode: 'all',
  });

  // Re-armed on every round trip the server completed (lastTestedAt), which is
  // what clears the typed connection string once it has actually been stored —
  // a save that only changed the database name changes nothing else here. A
  // REJECTED save leaves it untouched, so a typo can be corrected in place.
  useEffect(() => {
    reset({ uri: '', database: connection.database });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.database, connection.hasUri, connection.lastTestedAt]);

  const uriHelper = connection.hasUri
    ? t('tech.dataClone.uriHintSaved', { vars: { uri: connection.uriMasked } })
    : t('tech.dataClone.uriHint');
  const revealLabel = reveal ? t('tech.dataClone.hideUri') : t('tech.dataClone.showUri');

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2}>
        <Controller
          control={control}
          name="uri"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label={t('tech.dataClone.uriLabel')}
              type={reveal ? 'text' : 'password'}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? uriHelper}
              fullWidth
              required={!connection.hasUri}
              autoComplete="new-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={revealLabel}>
                        <DuncitIconButton
                          aria-label={revealLabel}
                          edge="end"
                          size="small"
                          onClick={() => setReveal((v) => !v)}
                        >
                          {reveal ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </DuncitIconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                },

                htmlInput: {
                  autoComplete: 'new-password',
                  'data-1p-ignore': true,
                  'data-lpignore': true,
                }
              }} />
          )}
        />
        <Controller
          control={control}
          name="database"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label={t('tech.dataClone.databaseLabel')}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? t('tech.dataClone.databaseHint')}
              fullWidth
              required
              autoComplete="off"
              slotProps={{
                htmlInput: { autoComplete: 'off', 'data-1p-ignore': true, 'data-lpignore': true }
              }}
            />
          )}
        />
        <Stack direction="row" sx={{
          justifyContent: "flex-end"
        }}>
          <DuncitButton type="submit" variant="contained" disabled={busy}>
            {busy ? t('tech.dataClone.connecting') : t('tech.dataClone.connect')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
