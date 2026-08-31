import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Chip,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import TranslateIcon from '@mui/icons-material/Translate';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import LocaleDialog, { type LocaleFormValues } from './LocaleDialog';
import { DELETE_LOCALE, LOCALES, UPSERT_LOCALE, type LocaleRow } from './queries';
import { useTranslation } from '@duncit/shell';

/** Locales — the languages/country locales the platform can render in. */
export default function LocalesPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(LOCALES, { fetchPolicy: 'cache-and-network' });
  const [upsert] = useMutation<any>(UPSERT_LOCALE, { refetchQueries: ['Locales'] });
  const [remove] = useMutation<any>(DELETE_LOCALE, { refetchQueries: ['Locales'] });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LocaleRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const rows: LocaleRow[] = data?.locales ?? [];

  const submit = async (values: LocaleFormValues) => {
    setSaving(true);
    setOpError(null);
    try {
      await upsert({ variables: { input: values } });
      setToast(editing ? 'Locale updated' : 'Locale added');
      setOpen(false);
    } catch (e) {
      setOpError(e instanceof Error ? e.message : t('admin.localization.saveLocaleFailed'));
    } finally {
      setSaving(false);
    }
  };

  const del = async (row: LocaleRow) => {
    setOpError(null);
    try {
      await remove({ variables: { code: row.code } });
      setToast(`${row.code} removed`);
    } catch (e) {
      setOpError(e instanceof Error ? e.message : t('admin.localization.removeLocaleFailed'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between"
        }}>
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "center"
        }}>
          <TranslateIcon color="primary" />
          <Box>
            <Typography variant="h5" sx={{
              fontWeight: 700
            }}>
              Locales
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Languages offered across the apps, portals and websites. The default is the
              source language every other falls back to.
            </Typography>
          </Box>
        </Stack>
        <DuncitButton
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add locale
        </DuncitButton>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}
      {opError && <Alert severity="error">{opError}</Alert>}
      {!loading && rows.length === 0 && (
        <Alert severity="info">{t('admin.localization.localesEmpty')}</Alert>
      )}

      {rows.length > 0 && (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>{t('admin.localization.language')}</TableCell>
                <TableCell>{t('admin.localization.englishName')}</TableCell>
                <TableCell>{t('admin.localization.colFlags')}</TableCell>
                <TableCell align="right">{t('shell.common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.label}</TableCell>
                  <TableCell>{row.english_label || '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {row.is_default && <Chip size="small" color="primary" label={t('admin.roles.default')} />}
                      {row.is_rtl && <Chip size="small" label="RTL" />}
                      <Chip
                        size="small"
                        color={row.is_active ? 'success' : 'default'}
                        label={row.is_active ? t('admin.profile.active') : 'Off'}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <DuncitIconButton
                      size="small"
                      onClick={() => {
                        setEditing(row);
                        setOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </DuncitIconButton>
                    <Tooltip
                      title={row.is_default ? 'The default locale cannot be removed' : 'Remove'}
                    >
                      <span>
                        <DuncitIconButton
                          size="small"
                          color="error"
                          disabled={row.is_default}
                          onClick={() => del(row)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </DuncitIconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <LocaleDialog
        open={open}
        editing={editing}
        saving={saving}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      />
      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
