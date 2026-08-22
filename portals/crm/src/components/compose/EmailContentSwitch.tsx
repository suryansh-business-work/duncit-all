import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import NotesIcon from '@mui/icons-material/Notes';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import { useTranslation } from '@duncit/shell';

export type EmailContentType = 'template' | 'text' | 'rich';

interface Props {
  value: EmailContentType;
  onChange: (next: EmailContentType) => void;
}

/** Chooses how the email body is composed: saved template, plain text, or rich text. */
export default function EmailContentSwitch({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_e, v) => v && onChange(v)}
      aria-label={t('crm.components.emailContentType')}
      sx={{ flexWrap: 'wrap' }}
    >
      <ToggleButton value="template"><ArticleIcon fontSize="small" sx={{ mr: 0.5 }} />{t('crm.components.template')}</ToggleButton>
      <ToggleButton value="text"><NotesIcon fontSize="small" sx={{ mr: 0.5 }} />{t('crm.components.simpleText')}</ToggleButton>
      <ToggleButton value="rich"><FormatColorTextIcon fontSize="small" sx={{ mr: 0.5 }} />{t('crm.components.richText')}</ToggleButton>
    </ToggleButtonGroup>
  );
}
