import { Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { AisensyTemplate } from '../queries';

interface Props {
  template: AisensyTemplate;
  busy: boolean;
  onDelete: (template: AisensyTemplate) => void;
}

/**
 * Delete, which is the only thing that can be done to a template after it is
 * submitted — AiSensy has no update endpoint. A row AiSensy gave no id for
 * cannot be addressed at all, so the button says so by being unavailable rather
 * than by failing on click.
 */
export default function TemplateRowActions({ template, busy, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const label = t('marketingWhatsapp.deleteTemplate');

  return (
    <Tooltip title={label}>
      <span>
        <DuncitIconButton
          size="small"
          color="error"
          aria-label={label}
          disabled={busy || !template.id}
          onClick={() => onDelete(template)}
        >
          <DeleteOutlineIcon fontSize="small" />
        </DuncitIconButton>
      </span>
    </Tooltip>
  );
}
