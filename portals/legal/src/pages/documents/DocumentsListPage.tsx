import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
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
import { SignWorkflowDialog } from '../../components/signing';
import { DOCUMENT_SIGNING_OPS } from '../../graphql/signing';
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
  const [createDoc, { loading: creating }] = useMutation<any>(CREATE_LEGAL_DOCUMENT);

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
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            New Document
          </DuncitButton>
        }
      />

      <EditDocumentDialog
        doc={editing}
        onClose={() => setEditing(null)}
        onSaved={() => refetchRef.current?.()}
      />

      {/* A document calls its title `name`; the shared dialog asks for `title`,
          so the mapping happens here rather than the workflow branching on what
          it is looking at. */}
      <SignWorkflowDialog
        record={
          signing
            ? { id: signing.id, title: signing.name, signing_status: signing.signing_status }
            : null
        }
        ops={DOCUMENT_SIGNING_OPS}
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
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                Content
              </Typography>
              <DuncitRichTextInput value={content} onChange={setContent} minHeight={220} aiContext="legal document" />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={() => setOpen(false)}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton variant="contained" disabled={creating || !name.trim() || !docType.trim()} onClick={submit}>
            Create
          </DuncitButton>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
