import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { LegalDocumentDetail } from '../../../graphql/documents';
import DocumentActiveSwitch from '../DocumentActiveSwitch';

interface Props {
  doc: LegalDocumentDetail;
  onActiveChanged: () => void;
}

/** Read-only view of a document: meta row, content and update history. */
export function DocumentView({ doc, onActiveChanged }: Readonly<Props>) {
  const { t } = useTranslation();
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
          onChanged={onActiveChanged}
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
}
