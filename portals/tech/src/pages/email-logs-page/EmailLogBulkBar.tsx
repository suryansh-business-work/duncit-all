import { useMutation } from '@apollo/client';
import { Button, Paper, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { notify, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { DELETE_ALL_EMAIL_LOGS, DELETE_EMAIL_LOGS, type EmailLogRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

const rowWord = (n: number) => (n === 1 ? 'row' : 'rows');

/**
 * A delete is reported with the count the SERVER returned. Asking for twenty ids
 * and being told twenty went is an assumption; a row someone else already deleted
 * makes it a false one, and this page is read by people chasing exactly that kind
 * of discrepancy.
 */
async function runDelete(exec: () => Promise<number>, onDeleted: () => void) {
  try {
    const gone = await exec();
    notify(`Deleted ${gone} log ${rowWord(gone)}`, 'success');
    onDeleted();
  } catch (err) {
    notify(parseApiError(err), 'error');
  }
}

interface BarProps {
  /** The rows ticked on the page on screen — never a total carried across pages. */
  selected: EmailLogRow[];
  onClear: () => void;
  /** Drop the ticks and reload, once rows have actually gone. */
  onDeleted: () => void;
}

export default function EmailLogBulkBar({ selected, onClear, onDeleted }: Readonly<BarProps>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [deleteLogs, { loading }] = useMutation<{ deleteEmailLogs: number }>(DELETE_EMAIL_LOGS);
  const count = selected.length;

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${count} selected ${rowWord(count)}?`,
      message: `The ${count} ${rowWord(count)} ticked on this page will be deleted permanently. Nothing else is touched.`,
      confirmLabel: t('shell.common.delete'),
      destructive: true,
    });
    if (!ok) return;
    await runDelete(async () => {
      const res = await deleteLogs({ variables: { ids: selected.map((row) => row.id) } });
      return res.data?.deleteEmailLogs ?? 0;
    }, onDeleted);
  };

  if (count === 0) return null;

  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1, mb: 1.5 }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        {/* The grid drops its ticks on every page turn, so the count only ever
            describes this page. Saying "selected" alone would read as a total. */}
        <Typography variant="body2" sx={{ flex: 1 }}>
          {count} selected on this page
        </Typography>
        <Button size="small" onClick={onClear} disabled={loading}>
          Clear
        </Button>
        <Button
          size="small"
          color="error"
          variant="contained"
          startIcon={<DeleteOutlineIcon />}
          onClick={remove}
          disabled={loading}
        >
          Delete
        </Button>
      </Stack>
    </Paper>
  );
}

interface DeleteAllProps {
  /** Every row ever recorded — the scale the confirm has to be honest about. */
  total: number;
  onDeleted: () => void;
}

export function EmailLogDeleteAllButton({ total, onDeleted }: Readonly<DeleteAllProps>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [deleteAll, { loading }] = useMutation<{ deleteAllEmailLogs: number }>(DELETE_ALL_EMAIL_LOGS);

  const removeAll = async () => {
    const ok = await confirm({
      title: t('tech.emailLogs.deleteEveryEmailLog'),
      message: `This deletes all ${total.toLocaleString()} rows ever recorded — the entire history, not the page on screen. Your search and filters do not narrow it, and there is no undo.`,
      confirmLabel: t('tech.common.deleteEverything'),
      destructive: true,
    });
    if (!ok) return;
    await runDelete(async () => {
      const res = await deleteAll();
      return res.data?.deleteAllEmailLogs ?? 0;
    }, onDeleted);
  };

  return (
    <Button
      size="small"
      color="error"
      startIcon={<DeleteSweepIcon />}
      onClick={removeAll}
      disabled={loading}
    >
      Delete all
    </Button>
  );
}
