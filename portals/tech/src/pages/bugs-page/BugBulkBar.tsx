import { useMutation } from '@apollo/client';
import { Button, Paper, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { notify, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { DELETE_ALL_BUGS, DELETE_BUGS, type BugRow } from './queries';

const bugWord = (n: number) => (n === 1 ? 'bug' : 'bugs');

/** A delete is reported with the count the SERVER returned, not the count asked for. */
async function runDelete(exec: () => Promise<number>, onDeleted: () => void) {
  try {
    const gone = await exec();
    notify(`Deleted ${gone} ${bugWord(gone)}`, 'success');
    onDeleted();
  } catch (err) {
    notify(parseApiError(err), 'error');
  }
}

/** The per-row delete — one bug, confirmed by its title so the row is unmistakable. */
export function useDeleteSingleBug(onDeleted: () => void) {
  const confirm = useConfirm();
  const [deleteBugs] = useMutation<{ deleteBugs: number }>(DELETE_BUGS);
  return async (bug: BugRow) => {
    const ok = await confirm({
      title: 'Delete this bug?',
      message: `"${bug.title}" and its ${bug.occurrence_count} recorded occurrences roll-up will be deleted permanently. If the error happens again it reappears as a fresh bug.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await runDelete(async () => {
      const res = await deleteBugs({ variables: { ids: [bug.id] } });
      return res.data?.deleteBugs ?? 0;
    }, onDeleted);
  };
}

interface BarProps {
  /** The rows ticked on the page on screen — never a total carried across pages. */
  selected: BugRow[];
  onClear: () => void;
  /** Drop the ticks and reload, once rows have actually gone. */
  onDeleted: () => void;
}

export default function BugBulkBar({ selected, onClear, onDeleted }: Readonly<BarProps>) {
  const confirm = useConfirm();
  const [deleteBugs, { loading }] = useMutation<{ deleteBugs: number }>(DELETE_BUGS);
  const count = selected.length;

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${count} selected ${bugWord(count)}?`,
      message: `The ${count} ${bugWord(count)} ticked on this page will be deleted permanently. Nothing else is touched.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await runDelete(async () => {
      const res = await deleteBugs({ variables: { ids: selected.map((row) => row.id) } });
      return res.data?.deleteBugs ?? 0;
    }, onDeleted);
  };

  if (count === 0) return null;

  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
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
  onDeleted: () => void;
}

export function BugDeleteAllButton({ onDeleted }: Readonly<DeleteAllProps>) {
  const confirm = useConfirm();
  const [deleteAll, { loading }] = useMutation<{ deleteAllBugs: number }>(DELETE_ALL_BUGS);

  const removeAll = async () => {
    const ok = await confirm({
      title: 'Delete every bug?',
      message:
        'This deletes the entire bug history — every rolled-up bug ever recorded, not the page on screen. Your search and filters do not narrow it, and there is no undo. Errors that happen again reappear as fresh bugs.',
      confirmLabel: 'Delete everything',
      destructive: true,
    });
    if (!ok) return;
    await runDelete(async () => {
      const res = await deleteAll();
      return res.data?.deleteAllBugs ?? 0;
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
