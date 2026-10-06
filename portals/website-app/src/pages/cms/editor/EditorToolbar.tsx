import { Chip, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  title: string;
  dirty: boolean;
  busy: 'save' | 'publish' | null;
  disabled: boolean;
  onBack: () => void;
  onSave: () => void;
  onPublish: () => void;
}

/** Back, what is open, whether it is saved, and the two ways to keep the work. */
export default function EditorToolbar({ title, dirty, busy, disabled, onBack, onSave, onPublish }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ px: 1.5, py: 1 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <DuncitButton startIcon={<ArrowBackIcon />} onClick={onBack}>
          {t('websiteApp.cms.editor.back')}
        </DuncitButton>
        <Typography component="h1" variant="subtitle1" sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
          {title}
        </Typography>
        <Chip
          size="small"
          variant="outlined"
          color={dirty ? 'warning' : 'default'}
          label={dirty ? t('websiteApp.cms.editor.unsaved') : t('websiteApp.cms.editor.allSaved')}
          role="status"
        />
        <DuncitButton variant="outlined" startIcon={<SaveIcon />} loading={busy === 'save'} disabled={disabled || busy !== null} onClick={onSave} data-testid="cms-editor-save">
          {t('websiteApp.cms.editor.save')}
        </DuncitButton>
        <DuncitButton variant="contained" startIcon={<PublishIcon />} loading={busy === 'publish'} disabled={disabled || busy !== null} onClick={onPublish} data-testid="cms-editor-publish">
          {t('websiteApp.cms.editor.publish')}
        </DuncitButton>
      </Stack>
    </Paper>
  );
}
