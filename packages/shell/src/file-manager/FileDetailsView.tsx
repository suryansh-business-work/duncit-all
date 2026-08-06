import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CustomizePanel from './CustomizePanel';
import FileInfoPanel from './FileInfoPanel';
import { RENAME_MEDIA_FILE, UPDATE_MEDIA_FILE, type MediaItem } from './queries';
import { EMPTY_TRANSFORM, type Transform } from './transform';

interface Props {
  file: MediaItem;
  /** False for a reader — the write mutations are role-guarded server-side. */
  canWrite: boolean;
  onBack: () => void;
  onCopy: (url: string) => void;
  onDelete: (file: MediaItem) => void;
  /** A rename or a tag edit returns the new record; the grid takes it. */
  onChanged: (file: MediaItem) => void;
  onError: (message: string) => void;
  /**
   * The ticked files, in grid order, when this one is among them.
   *
   * Ticking five images and stepping through them is the reason this panel is
   * beside the grid rather than over it — going back to find the next one each
   * time is the part that made copying five links tedious.
   */
  siblings?: MediaItem[];
  onNavigate?: (file: MediaItem) => void;
}

type TabKey = 'info' | 'customize' | 'edit';

/**
 * One file, opened INSIDE the dialog rather than in a drawer over it.
 *
 * A drawer on top of a dialog is two overlapping surfaces with two ways to
 * close them, and the one underneath is still scrollable behind the one you are
 * reading. This is a narrow column beside the grid instead, so the file you
 * came from is still on screen while you read the one you opened.
 *
 * Info is first because the commonest visit is "what is this and where is it";
 * Customize builds a link at the size you need; Edit is the only tab that
 * changes anything stored, and it is not shown to someone who cannot use it.
 */
export default function FileDetailsView({
  file,
  canWrite,
  onBack,
  onCopy,
  onDelete,
  onChanged,
  onError,
  siblings,
  onNavigate,
}: Readonly<Props>) {
  const [tab, setTab] = useState<TabKey>('info');
  const [transform, setTransform] = useState<Transform>(EMPTY_TRANSFORM);
  const [name, setName] = useState(file.name);
  const [tags, setTags] = useState(file.tags.join(', '));
  const [rename, renameState] = useMutation(RENAME_MEDIA_FILE);
  const [update, updateState] = useMutation(UPDATE_MEDIA_FILE);

  useEffect(() => {
    // A different file means a fresh panel: carrying the previous file's crop
    // over would hand someone a link to dimensions they never asked for.
    setTransform(EMPTY_TRANSFORM);
    setTab('info');
    setName(file.name);
    setTags(file.tags.join(', '));
  }, [file]);

  const busy = renameState.loading || updateState.loading;

  // Only when this file is actually one of the ticked ones — a stepper that
  // cannot say where you are in the set is worse than none.
  const list = siblings ?? [];
  const at = list.findIndex((item) => item.fileId === file.fileId);
  const stepping = at !== -1 && list.length > 1 && Boolean(onNavigate);
  const step = (delta: number) => onNavigate?.(list[at + delta]);

  const saveName = async () => {
    if (!name.trim() || name === file.name) return;
    try {
      const res = await rename({
        variables: { fileId: file.fileId, newFileName: name.trim(), purgeCache: true },
      });
      onChanged(res.data.renameMediaFile);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  const saveTags = async () => {
    const next = tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    try {
      const res = await update({ variables: { fileId: file.fileId, tags: next } });
      onChanged(res.data.updateMediaFile);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save tags');
    }
  };

  return (
    <Box>
      {stepping && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 0.5 }}
        >
          <IconButton
            size="small"
            onClick={() => step(-1)}
            disabled={at === 0}
            aria-label="Previous selected file"
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" color="text.secondary">
            {at + 1} of {list.length} selected
          </Typography>
          <IconButton
            size="small"
            onClick={() => step(1)}
            disabled={at === list.length - 1}
            aria-label="Next selected file"
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}

      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
        <Typography variant="subtitle2" noWrap sx={{ flex: 1, minWidth: 0 }} title={file.name}>
          {file.name}
        </Typography>
        <IconButton size="small" onClick={onBack} aria-label="Close file details">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
        <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => onCopy(file.url)}>
          Copy
        </Button>
        {canWrite && (
          <Button
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => onDelete(file)}
          >
            Delete
          </Button>
        )}
      </Stack>

      <Tabs
        value={tab}
        onChange={(_event, next) => setTab(next)}
        variant="scrollable"
        scrollButtons={false}
        sx={{ minHeight: 36 }}
      >
        <Tab value="info" label="Info" sx={{ minHeight: 36, minWidth: 0, px: 1 }} />
        <Tab value="customize" label="Customize" sx={{ minHeight: 36, minWidth: 0, px: 1 }} />
        {canWrite && <Tab value="edit" label="Edit" sx={{ minHeight: 36, minWidth: 0, px: 1 }} />}
      </Tabs>
      <Divider sx={{ mb: 2 }} />

      {tab === 'info' && <FileInfoPanel file={file} />}
      {tab === 'customize' && (
        <CustomizePanel url={file.url} value={transform} onChange={setTransform} onCopy={onCopy} />
      )}
      {tab === 'edit' && canWrite && (
        <Stack spacing={2}>
          <Stack spacing={1} alignItems="flex-start">
            <TextField
              fullWidth
              size="small"
              label="File name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              helperText="Renaming purges the CDN copy so the link updates."
            />
            <Button size="small" onClick={saveName} disabled={busy || name === file.name}>
              Save
            </Button>
          </Stack>
          <Stack spacing={1} alignItems="flex-start">
            <TextField
              fullWidth
              size="small"
              label="Tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              helperText="Comma separated. Tags are searchable in ImageKit."
            />
            <Button size="small" onClick={saveTags} disabled={busy}>
              Save
            </Button>
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
