import { useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import {
  WA_EXPORT_USER_LEADS,
  WA_IMPORT_USER_LEADS,
  WA_USER_LEADS,
} from '../tools/whatsapp/whatsappQueries';
import CreateLeadDialog from './CreateLeadDialog';

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function downloadBase64Xlsx(base64: string, filename: string) {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** User Leads — auto-imported from WhatsApp + created manually; Excel import/export. */
export default function UserLeadsPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState('');
  const { data, loading, error, refetch } = useQuery(WA_USER_LEADS, {
    variables: { search: search.trim() || null },
    fetchPolicy: 'cache-and-network',
  });
  const [importLeads, importState] = useMutation(WA_IMPORT_USER_LEADS);
  const leads = data?.waUserLeads ?? [];

  const onImport = async (file: File) => {
    const file_base64 = await fileToBase64(file);
    const res = await importLeads({ variables: { file_base64 } });
    const r = res.data?.waImportUserLeads;
    setToast(`Imported ${r?.imported ?? 0} leads${r?.skipped ? `, skipped ${r.skipped}` : ''}.`);
    await refetch();
  };

  const onExport = async () => {
    const res = await client.query({
      query: WA_EXPORT_USER_LEADS,
      variables: { search: search.trim() || null },
      fetchPolicy: 'network-only',
    });
    if (res.data?.waExportUserLeads) downloadBase64Xlsx(res.data.waExportUserLeads, 'user-leads.xlsx');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <PersonSearchIcon color="primary" />
          <Typography variant="h5" fontWeight={800}>
            User Leads
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New
          </Button>
          <Button size="small" startIcon={<UploadFileIcon />} disabled={importState.loading} onClick={() => fileRef.current?.click()}>
            Import
          </Button>
          <Button size="small" startIcon={<DownloadIcon />} onClick={onExport}>
            Export
          </Button>
        </Stack>
      </Stack>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImport(f);
          e.target.value = '';
        }}
      />

      <TextField
        size="small"
        fullWidth
        placeholder="Search by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      {error && <Alert severity="error">{error.message}</Alert>}
      {loading && leads.length === 0 ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : leads.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No user leads yet. Add one with “New”, “Import” an Excel/CSV, or connect
          WhatsApp (Tools → WhatsApp Lead Generator) and Refresh.
        </Alert>
      ) : (
        <List>
          {leads.map((lead: any) => (
            <ListItemButton key={lead.id} onClick={() => navigate(`/user-leads/${lead.id}`)} sx={{ borderRadius: 2, mb: 0.5 }}>
              <ListItemText primary={lead.name || `+${lead.phone}`} secondary={`+${lead.phone}`} />
              <Stack direction="row" spacing={0.5}>
                {lead.source_groups?.length > 0 && <Chip size="small" label={`${lead.source_groups.length} groups`} />}
                {lead.source_communities?.length > 0 && (
                  <Chip size="small" color="primary" variant="outlined" label={`${lead.source_communities.length} communities`} />
                )}
              </Stack>
            </ListItemButton>
          ))}
        </List>
      )}

      <CreateLeadDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => void refetch()} />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
