import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { DuncitRichTextInput } from '@duncit/rich-text';
import DocumentTypeSelect from '../../../components/DocumentTypeSelect';
import { useTranslation } from '@duncit/shell';

interface Props {
  content: string;
  description: string;
  docType: string;
  name: string;
  saving: boolean;
  onCancel: () => void;
  onContentChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDocTypeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSave: () => void;
}

export function DocumentEditor(props: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <TextField
          label={t('legal.documents.documentName')}
          value={props.name}
          onChange={(event) => props.onNameChange(event.target.value)}
          fullWidth
          required
        />
        <DocumentTypeSelect value={props.docType} onChange={props.onDocTypeChange} required />
        <TextField
          label={t('shell.common.description')}
          value={props.description}
          onChange={(event) => props.onDescriptionChange(event.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
        <Box>
          <Typography variant="caption" color="text.secondary">
            Content
          </Typography>
          <DuncitRichTextInput
            value={props.content}
            onChange={props.onContentChange}
            minHeight={260}
            aiContext="legal document"
          />
        </Box>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={props.onCancel}>{t('shell.common.cancel')}</Button>
          <Button
            variant="contained"
            disabled={props.saving || !props.name.trim() || !props.docType.trim()}
            onClick={props.onSave}
          >
            Save
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
