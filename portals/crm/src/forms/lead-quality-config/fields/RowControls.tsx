import { Stack } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  /** The row's name as a reader hears it ("Move Instagram up"). */
  label: string;
  index: number;
  count: number;
  disabled?: boolean;
  /** Omit for a list whose order does not matter (bands). */
  onMove?: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  testId: string;
}

/** Move up / move down / delete for one row of a list, each named after the row (WCAG 2.5.7, 4.1.2). */
export default function RowControls({ label, index, count, disabled, onMove, onRemove, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" sx={{ alignItems: 'center', flexShrink: 0 }}>
      {onMove && (
        <>
          <DuncitIconButton
            size="small"
            aria-label={t('crm.a11y.moveUpNamed', { vars: { name: label } })}
            disabled={disabled || index === 0}
            onClick={() => onMove(index, index - 1)}
            data-testid={`${testId}-up`}
          >
            <ArrowUpwardIcon fontSize="small" />
          </DuncitIconButton>
          <DuncitIconButton
            size="small"
            aria-label={t('crm.a11y.moveDownNamed', { vars: { name: label } })}
            disabled={disabled || index === count - 1}
            onClick={() => onMove(index, index + 1)}
            data-testid={`${testId}-down`}
          >
            <ArrowDownwardIcon fontSize="small" />
          </DuncitIconButton>
        </>
      )}
      <DuncitIconButton
        size="small"
        color="error"
        aria-label={t('crm.common.deleteNamed', { vars: { name: label } })}
        disabled={disabled}
        onClick={() => onRemove(index)}
        data-testid={`${testId}-delete`}
      >
        <DeleteIcon fontSize="small" />
      </DuncitIconButton>
    </Stack>
  );
}
