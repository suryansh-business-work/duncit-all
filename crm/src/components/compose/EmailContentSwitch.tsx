import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import NotesIcon from '@mui/icons-material/Notes';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';

export type EmailContentType = 'template' | 'text' | 'rich';

interface Props {
  value: EmailContentType;
  onChange: (next: EmailContentType) => void;
}

/** Chooses how the email body is composed: saved template, plain text, or rich text. */
export default function EmailContentSwitch({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_e, v) => v && onChange(v)}
      aria-label="Email content type"
      sx={{ flexWrap: 'wrap' }}
    >
      <ToggleButton value="template"><ArticleIcon fontSize="small" sx={{ mr: 0.5 }} />Template</ToggleButton>
      <ToggleButton value="text"><NotesIcon fontSize="small" sx={{ mr: 0.5 }} />Simple Text</ToggleButton>
      <ToggleButton value="rich"><FormatColorTextIcon fontSize="small" sx={{ mr: 0.5 }} />Rich Text</ToggleButton>
    </ToggleButtonGroup>
  );
}
