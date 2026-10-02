import {
  Alert,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitButton } from '@duncit/buttons';
import type { CrmManagedOptionGroup } from '../../../../api/data.gql';
import { ConfirmDialog } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import ManagedOptionEditRow from '../ManagedOptionEditRow';
import ManagedOptionRow from '../ManagedOptionRow';
import { useTranslation } from '@duncit/shell';
import { useManagedOptions } from './useManagedOptions';

interface Props {
  group: CrmManagedOptionGroup;
  addLabel: string;
  placeholder: string;
  searchPlaceholder: string;
}

/** Inline-editable flat list for one managed-option group (Amenity / Suitability). */
export default function ManagedOptionList({ group, addLabel, placeholder, searchPlaceholder }: Readonly<Props>) {
  const { t } = useTranslation();
  const {
    loading,
    error,
    updateMut,
    deleting,
    draft,
    setDraft,
    removing,
    setRemoving,
    formError,
    setFormError,
    search,
    setSearch,
    rows,
    visible,
    busy,
    startCreate,
    save,
    confirmDelete,
  } = useManagedOptions(group);

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap",
            mb: 1.5
          }}>
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220, flex: 1 }}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
              htmlInput: { 'aria-label': searchPlaceholder },
            }}
          />
          <DuncitButton variant="outlined" startIcon={<AddIcon />} onClick={startCreate} disabled={busy || !!draft}>
            {addLabel}
          </DuncitButton>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 1 }}>{parseApiError(error)}</Alert>}
        {formError && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setFormError(null)}>{formError}</Alert>}

        {loading && rows.length === 0 ? (
          <Stack
            sx={{
              alignItems: "center",
              py: 4
            }}><CircularProgress /></Stack>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 80 }}>{t('shell.common.order')}</TableCell>
                <TableCell>Name</TableCell>
                <TableCell sx={{ width: 90 }}>{t('crm.common.active')}</TableCell>
                <TableCell sx={{ width: 110 }} align="right">{t('shell.common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {draft && !draft.id && (
                <ManagedOptionEditRow draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)} busy={busy} placeholder={placeholder} />
              )}
              {rows.length === 0 && !draft && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        py: 2
                      }}>Nothing here yet. Click "{addLabel}".</Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.length > 0 && visible.length === 0 && !draft && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        py: 2
                      }}>{t('crm.data.noMatchesForYourSearch')}</Typography>
                  </TableCell>
                </TableRow>
              )}
              {visible.map((row) =>
                draft?.id === row.id ? (
                  <ManagedOptionEditRow key={row.id} draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)} busy={busy} placeholder={placeholder} />
                ) : (
                  <ManagedOptionRow
                    key={row.id}
                    row={row}
                    busy={busy}
                    disableActions={busy || !!draft}
                    onToggleActive={() => updateMut({ variables: { id: row.id, input: { is_active: !row.is_active } } })}
                    onEdit={() => { setDraft({ id: row.id, name: row.name, sort_order: String(row.sort_order), is_active: row.is_active }); setFormError(null); }}
                    onDelete={() => setRemoving(row)}
                  />
                )
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!removing}
        title={`Delete "${removing?.name ?? ''}"`}
        message={t('crm.data.existingLeadsKeepTheirEntriesOnly')}
        confirmLabel={t('shell.common.delete')}
        destructive
        busyLabel="Working…"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setRemoving(null)}
      />
    </Card>
  );
}
