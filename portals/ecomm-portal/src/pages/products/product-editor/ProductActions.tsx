import { useState } from 'react';
import { Paper, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import PublishIcon from '@mui/icons-material/Publish';
import EditNoteIcon from '@mui/icons-material/EditNote';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ProductStatus } from '../../../lib/status';
import type { SubmitAs } from './product-form';

type ActionKey = 'archive' | 'draft' | 'publish' | 'unpublish' | 'save' | 'restore';

interface ActionSpec {
  /** The status the product is saved as. */
  status: ProductStatus;
  labelKey: string;
  Icon: SvgIconComponent;
  variant: 'text' | 'outlined' | 'contained';
}

const ACTIONS: Record<ActionKey, ActionSpec> = {
  archive: { status: 'ARCHIVED', labelKey: 'ecommPortal.productEditor.archive', Icon: ArchiveOutlinedIcon, variant: 'text' },
  draft: { status: 'DRAFT', labelKey: 'ecommPortal.productEditor.saveDraft', Icon: SaveOutlinedIcon, variant: 'outlined' },
  publish: { status: 'PUBLISHED', labelKey: 'ecommPortal.productEditor.publish', Icon: PublishIcon, variant: 'contained' },
  unpublish: { status: 'DRAFT', labelKey: 'ecommPortal.productEditor.moveToDraft', Icon: EditNoteIcon, variant: 'outlined' },
  save: { status: 'PUBLISHED', labelKey: 'shell.common.save', Icon: SaveIcon, variant: 'contained' },
  restore: { status: 'DRAFT', labelKey: 'ecommPortal.productEditor.restore', Icon: UnarchiveOutlinedIcon, variant: 'contained' },
};

/** The buttons each state offers, left to right — the main one last. `NEW` is a product not saved yet. */
const ACTIONS_BY_STATE: Record<'NEW' | ProductStatus, readonly ActionKey[]> = {
  NEW: ['draft', 'publish'],
  DRAFT: ['archive', 'draft', 'publish'],
  PUBLISHED: ['archive', 'unpublish', 'save'],
  ARCHIVED: ['restore'],
};

interface ProductActionsProps {
  /** `null` for a product not saved yet. */
  status: ProductStatus | null;
  submitAs: SubmitAs;
}

/**
 * The editor's action bar, pinned to the bottom of the screen: every action
 * saves the page as it stands, as the status it names.
 */
export default function ProductActions({ status, submitAs }: Readonly<ProductActionsProps>) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<ActionKey | null>(null);
  const run = async (key: ActionKey) => {
    setPending(key);
    await submitAs(ACTIONS[key].status);
    setPending(null);
  };
  return (
    <Paper
      variant="outlined"
      role="region"
      aria-label={t('ecommPortal.productEditor.actions')}
      sx={{ position: 'sticky', bottom: 0, zIndex: 2, mt: 3, p: 1.5 }}
      data-testid="product-actions"
    >
      <Stack direction="row" spacing={1} useFlexGap sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {ACTIONS_BY_STATE[status ?? 'NEW'].map((key) => {
          const { Icon, labelKey, variant } = ACTIONS[key];
          return (
            <DuncitButton
              key={key}
              variant={variant}
              startIcon={<Icon />}
              loading={pending === key}
              disabled={pending !== null && pending !== key}
              onClick={() => run(key)}
              data-testid={`product-action-${key}`}
            >
              {t(labelKey)}
            </DuncitButton>
          );
        })}
      </Stack>
    </Paper>
  );
}
