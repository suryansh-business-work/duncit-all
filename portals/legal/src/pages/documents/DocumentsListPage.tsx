import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { formatDistanceToNow } from 'date-fns';
import {
  CREATE_LEGAL_DOCUMENT,
  LEGAL_DOCUMENTS,
  type LegalDocumentListItem,
} from '../../graphql/documents';
import DocumentTypeSelect from '../../components/DocumentTypeSelect';
import RichTextEditor from '../../components/RichTextEditor';

export default function DocumentsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const filter = useMemo(() => (search.trim() ? { search: search.trim() } : undefined), [search]);

  const { data, loading, refetch } = useQuery<{ legalDocuments: LegalDocumentListItem[] }>(
    LEGAL_DOCUMENTS,
    { variables: { filter }, fetchPolicy: 'cache-and-network' }
  );
  const items = data?.legalDocuments ?? [];

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [docType, setDocType] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [createDoc, { loading: creating }] = useMutation(CREATE_LEGAL_DOCUMENT);

  const reset = () => {
    setName('');
    setDocType('');
    setDescription('');
    setContent('');
  };

  const submit = async () => {
    /* v8 ignore next -- Create is disabled until name + type are present */
    if (!name.trim() || !docType.trim()) return;
    const res = await createDoc({
      variables: { input: { name: name.trim(), document_type: docType, description, content } },
    });
    const id = res.data?.createLegalDocument?.id;
    setOpen(false);
    reset();
    if (id) navigate(`/documents/${id}`);
    else refetch();
  };

  const renderBody = () => {
    if (loading && !items.length) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      );
    }
    if (!items.length) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No documents yet.
        </Typography>
      );
    }
    return (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Updated by</TableCell>
            <TableCell>Versions</TableCell>
            <TableCell>Last updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((d) => (
            <TableRow
              key={d.id}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/documents/${d.id}`)}
            >
              <TableCell sx={{ fontWeight: 700 }}>{d.name}</TableCell>
              <TableCell>{d.document_type}</TableCell>
              <TableCell>{d.updated_by_name || '—'}</TableCell>
              <TableCell>{d.version_count}</TableCell>
              <TableCell>{formatDistanceToNow(new Date(d.updated_at), { addSuffix: true })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap">
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Documents
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create, version and manage legal documents.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, type or description"
            sx={{ minWidth: 220 }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            New Document
          </Button>
        </Stack>
      </Stack>

      {renderBody()}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New Document</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField label="Document name" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus />
            <DocumentTypeSelect value={docType} onChange={setDocType} />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Content
              </Typography>
              <RichTextEditor value={content} onChange={setContent} placeholder="Write the document…" minHeight={220} />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={creating || !name.trim() || !docType.trim()} onClick={submit}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
