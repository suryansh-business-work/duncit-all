import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Paper, Snackbar, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitButton } from '@duncit/buttons';
import { BackHeader } from '@duncit/ui';
import { downloadTextFile } from '@duncit/utils';
import { DuncitRichTextInput, htmlToText } from '@duncit/rich-text';
import { CLONE_LEGAL_DOCUMENT, DELETE_LEGAL_DOCUMENT, LEGAL_DOCUMENT,
  UPDATE_LEGAL_DOCUMENT, type LegalDocumentDetail } from '../../graphql/documents';
import { toPrintableHtml } from '../../lib/printableHtml';
import { copyToClipboard, printHtml, safeFileName } from '../../lib/docActions';
import { DocumentEditor } from './DocumentDetailPage/DocumentEditor';
import DocumentActiveSwitch from './DocumentActiveSwitch';

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

  const [updateDoc, { loading: saving }] = useMutation(UPDATE_LEGAL_DOCUMENT, { onCompleted: () => refetch() });
  const [deleteDoc] = useMutation(DELETE_LEGAL_DOCUMENT);
  const [cloneDoc] = useMutation(CLONE_LEGAL_DOCUMENT);

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
    return (
      <>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            flexWrap: "wrap"
          }}>
          <Chip size="small" color="primary" label={doc.document_type} />
          <DocumentActiveSwitch
            documentId={doc.id}
            isActive={doc.is_active}
            onChanged={() => refetch()}
          />
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Updated by {doc.updated_by_name || '—'} · v{doc.version_count}
          </Typography>
        </Stack>
        {doc.description && <Typography variant="body2">{doc.description}</Typography>}

        <Paper variant="outlined" sx={{ p: 2 }}>
          {doc.content ? (
            <DuncitRichTextInput value={doc.content} onChange={() => undefined} readOnly bare />
          ) : (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>{t('legal.documents.noContent')}</Typography>
          )}
        </Paper>

        <Divider />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Update history
          </Typography>
          {doc.versions.length === 0 ? (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              No edits yet — this is the original version.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {doc.versions.map((v) => (
                <Stack key={v.id} direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {v.updated_by_name || 'Unknown'}
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: "text.secondary"
                  }}>
                    {formatDateTime(v.created_at)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </>
    );
  };

  const headerActions =
    doc && !editing ? (
      <Stack direction="row" spacing={0.5} sx={{
        flexWrap: "wrap"
      }}>
        <DuncitButton size="small" startIcon={<EditIcon />} onClick={() => setEditing(true)}>{t('shell.common.edit')}</DuncitButton>
        <DuncitButton size="small" startIcon={<PrintIcon />} onClick={onPrint}>{t('legal.documents.print')}</DuncitButton>
        <DuncitButton size="small" startIcon={<DownloadIcon />} onClick={onDownload}>{t('legal.documents.download')}</DuncitButton>
        <DuncitButton size="small" startIcon={<ContentCopyIcon />} onClick={onCopy}>{t('shell.common.copy')}</DuncitButton>
        <DuncitButton size="small" startIcon={<FileCopyIcon />} onClick={onClone}>{t('legal.documents.clone')}</DuncitButton>
        <DuncitButton size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)}>{t('shell.common.delete')}</DuncitButton>
      </Stack>
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
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
