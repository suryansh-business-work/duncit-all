import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { BackHeader } from '@duncit/ui';
import { downloadTextFile } from '@duncit/utils';
import { htmlToText } from '@duncit/rich-text';
import { CLONE_LEGAL_DOCUMENT, DELETE_LEGAL_DOCUMENT, LEGAL_DOCUMENT,
  UPDATE_LEGAL_DOCUMENT, type LegalDocumentDetail } from '../../../graphql/documents';
import { toPrintableHtml } from '../../../lib/printableHtml';
import { copyToClipboard, printHtml, safeFileName } from '../../../lib/docActions';
import { DocumentEditor } from './DocumentEditor';
import { DocumentView } from './DocumentView';
import { DocumentHeaderActions } from './DocumentHeaderActions';
import { useTranslation } from '@duncit/shell';

export default function DocumentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ legalDocument: LegalDocumentDetail | null }>(
    LEGAL_DOCUMENT,
    { variables: { id }, fetchPolicy: 'cache-and-network' }
  );
  const doc = data?.legalDocument;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [docType, setDocType] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [updateDoc, { loading: saving }] = useMutation<unknown>(UPDATE_LEGAL_DOCUMENT, { onCompleted: () => refetch() });
  const [deleteDoc] = useMutation<unknown>(DELETE_LEGAL_DOCUMENT);
  const [cloneDoc] = useMutation<{ cloneLegalDocument?: { id: string } | null }>(CLONE_LEGAL_DOCUMENT);

  useEffect(() => {
    if (doc && !editing) {
      setName(doc.name);
      setDocType(doc.document_type);
      setDescription(doc.description);
      setContent(doc.content);
    }
  }, [doc, editing]);

  const save = async () => {
    /* v8 ignore next -- Save is disabled until name + type are present */
    if (!name.trim() || !docType.trim()) return;
    await updateDoc({
      variables: { id, input: { name: name.trim(), document_type: docType, description, content } },
    });
    setEditing(false);
    setToast(t('legal.documents.saved'));
  };

  const onPrint = () => {
    if (doc) printHtml(toPrintableHtml(doc.name, doc.content));
  };
  const onDownload = () => {
    if (doc) downloadTextFile(toPrintableHtml(doc.name, doc.content), safeFileName(doc.name));
  };
  const onCopy = async () => {
    if (doc) setToast((await copyToClipboard(htmlToText(doc.content))) ? 'Copied to clipboard' : 'Could not copy');
  };
  const onClone = async () => {
    const res = await cloneDoc({ variables: { id } });
    const newId = res.data?.cloneLegalDocument?.id;
    if (newId) navigate(`/documents/${newId}`);
  };
  const doDelete = async () => {
    await deleteDoc({ variables: { id } });
    navigate('/documents');
  };

  const renderBody = () => {
    if (loading && !doc) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      );
    }
    if (!doc) {
      return (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>This document could not be found.
                  </Typography>
      );
    }
    if (editing) {
      return (
        <DocumentEditor
          content={content}
          description={description}
          docType={docType}
          name={name}
          saving={saving}
          onCancel={() => setEditing(false)}
          onContentChange={setContent}
          onDescriptionChange={setDescription}
          onDocTypeChange={setDocType}
          onNameChange={setName}
          onSave={save}
        />
      );
    }
    return <DocumentView doc={doc} onActiveChanged={() => refetch()} />;
  };

  const headerActions =
    doc && !editing ? (
      <DocumentHeaderActions
        onEdit={() => setEditing(true)}
        onPrint={onPrint}
        onDownload={onDownload}
        onCopy={onCopy}
        onClone={onClone}
        onDelete={() => setConfirmDelete(true)}
      />
    ) : undefined;

  return (
    <Stack spacing={2}>
      <BackHeader
        onBack={() => navigate('/documents')}
        title={doc?.name ?? 'Document'}
        titleWeight={800}
        titleNoWrap
        actions={headerActions}
        sx={{ flexWrap: 'wrap' }}
      />

      {renderBody()}

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>{t('legal.documents.deleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This permanently deletes “{doc?.name}” and its history.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={() => setConfirmDelete(false)}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton color="error" variant="contained" onClick={doDelete}>{t('shell.common.delete')}</DuncitButton>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
