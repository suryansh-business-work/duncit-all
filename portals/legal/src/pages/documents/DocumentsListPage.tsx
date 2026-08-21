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
import { DuncitRichTextInput } from '@duncit/rich-text';
import {
  CREATE_LEGAL_DOCUMENT,
  LEGAL_DOCUMENTS_TABLE,
  type LegalDocumentListItem,
} from '../../graphql/documents';
import DocumentTypeSelect from '../../components/DocumentTypeSelect';
import DocumentsTable from './DocumentsTable';
import EditDocumentDialog from './EditDocumentDialog';
import SignContractDialog from './SignContractDialog';
import { useTranslation } from '@duncit/shell';

export default function DocumentsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useApolloTableFetch<LegalDocumentListItem>(
    client,
    LEGAL_DOCUMENTS_TABLE,
    'legalDocumentsTable',
  );

  const [open, setOpen] = useState(false);
  const [signing, setSigning] = useState<LegalDocumentListItem | null>(null);
  const [editing, setEditing] = useState<LegalDocumentListItem | null>(null);
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
      <PageHeader title={t('legal.documents.title')} subtitle={t('legal.documents.subtitle')} />

      <DocumentsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onOpen={(d) => navigate(`/documents/${d.id}`)}
        onEdit={setEditing}
        onSign={setSigning}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            New Document
          </Button>
        }
      />

      <EditDocumentDialog
        doc={editing}
        onClose={() => setEditing(null)}
        onSaved={() => refetchRef.current?.()}
      />

      <SignContractDialog
        doc={signing}
        onClose={() => setSigning(null)}
        onSigned={() => refetchRef.current?.()}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t('legal.documents.create')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField label={t('legal.documents.documentName')} value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus required />
            <DocumentTypeSelect value={docType} onChange={setDocType} required />
            <TextField
              label={t('shell.common.description')}
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
              <DuncitRichTextInput value={content} onChange={setContent} minHeight={220} aiContext="legal document" />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('shell.common.cancel')}</Button>
          <Button variant="contained" disabled={creating || !name.trim() || !docType.trim()} onClick={submit}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
