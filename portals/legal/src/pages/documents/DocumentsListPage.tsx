import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useApolloTableFetch } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import {
  CREATE_LEGAL_DOCUMENT,
  LEGAL_DOCUMENTS_TABLE,
  type LegalDocumentListItem,
} from '../../graphql/documents';
import DocumentTypeSelect from '../../components/DocumentTypeSelect';
import RichTextEditor from '../../components/RichTextEditor';
import DocumentsTable from './DocumentsTable';

export default function DocumentsListPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useApolloTableFetch<LegalDocumentListItem>(
    client,
    LEGAL_DOCUMENTS_TABLE,
    'legalDocumentsTable',
  );

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
    else refetchRef.current?.();
  };

  return (
    <Stack spacing={2}>
      <PageHeader title="Documents" subtitle="Create, version and manage legal documents." />

      <DocumentsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onOpen={(d) => navigate(`/documents/${d.id}`)}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            New Document
          </Button>
        }
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New Document</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField label="Document name" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus required />
            <DocumentTypeSelect value={docType} onChange={setDocType} required />
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
