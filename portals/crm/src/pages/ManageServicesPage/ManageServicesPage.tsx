import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HandymanIcon from '@mui/icons-material/Handyman';
import { DuncitButton } from '@duncit/buttons';
import type { CrmServiceKind } from '../../api/crm.types';
import { ConfirmDialog } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { useManageServices } from './useManageServices';
import { ServiceDraftRow } from './ServiceDraftRow';
import { ServiceRow } from './ServiceRow';

interface Props {
  /** Catalogue this page edits — `VENUE` for /venue-leads/services, `HOST` for /host-leads/services. */
  kind: CrmServiceKind;
  title?: string;
  subtitle?: string;
}

export default function ManageServicesPage({
  kind,
  title = { VENUE: 'Manage Venue Services', HOST: 'Manage Host Services', ECOMM: 'Manage Ecomm Services' }[kind],
  subtitle = {
    VENUE: 'Edit the catalogue used by the "Services Offered" dropdown on Venue Leads. Independent from the other catalogues.',
    HOST: 'Edit the catalogue used by the "Services Offered" dropdown on Host Leads. Independent from the other catalogues.',
    ECOMM: 'Edit the catalogue used by the "Services Offered" dropdown on Ecomm Leads. Independent from the other catalogues.',
  }[kind],
}: Readonly<Props>) {
  const { t } = useTranslation();
  const {
    loading,
    error,
    rows,
    draft,
    setDraft,
    removing,
    setRemoving,
    formError,
    setFormError,
    startCreate,
    startEdit,
    cancelDraft,
    saveDraft,
    confirmDelete,
    toggleActive,
    busy,
    deleting,
  } = useManageServices(kind);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <HandymanIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography component="h1" variant="h6" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {subtitle}
          </Typography>
        </Box>
        <DuncitButton
          variant="contained"
          startIcon={<AddIcon />}
          onClick={startCreate}
          disabled={busy || !!draft}
        >
          Add service
        </DuncitButton>
      </Stack>

      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {formError && (
        <Alert severity="error" onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading && rows.length === 0 ? (
            <Stack
              sx={{
                alignItems: "center",
                py: 6
              }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 80 }}>{t('shell.common.order')}</TableCell>
                  <TableCell>{t('crm.page.serviceName')}</TableCell>
                  <TableCell sx={{ width: 110 }}>{t('crm.common.active')}</TableCell>
                  <TableCell sx={{ width: 140 }} align="right">{t('shell.common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {draft && !draft.id && (
                  <ServiceDraftRow
                    draft={draft}
                    setDraft={setDraft}
                    saveDraft={saveDraft}
                    cancelDraft={cancelDraft}
                    busy={busy}
                  />
                )}

                {rows.length === 0 && !draft && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          py: 3
                        }}>
                        No services yet. Click "Add service" to create the first one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {rows.map((row) => (
                  <ServiceRow
                    key={row.id}
                    row={row}
                    draft={draft}
                    setDraft={setDraft}
                    saveDraft={saveDraft}
                    cancelDraft={cancelDraft}
                    startEdit={startEdit}
                    setRemoving={setRemoving}
                    toggleActive={toggleActive}
                    busy={busy}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!removing}
        title={t('crm.common.deleteService')}
        message={
          removing
            ? `Delete "${removing.name}"? Existing leads keep their entries — only the dropdown is affected.`
            : ''
        }
        confirmLabel={t('shell.common.delete')}
        destructive
        busyLabel="Working…"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setRemoving(null)}
      />
    </Stack>
  );
}
