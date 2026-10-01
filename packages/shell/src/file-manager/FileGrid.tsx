import { Box, Typography } from '@mui/material';
import FileCard from './FileCard';
import type { MediaItem } from './queries';
import { useTranslation } from '../i18n/useTranslation';

const GRID_SX = {
  display: 'grid',
  gap: 1.5,
  gridTemplateColumns: {
    xs: 'repeat(2, 1fr)',
    sm: 'repeat(3, 1fr)',
    md: 'repeat(5, 1fr)',
    lg: 'repeat(6, 1fr)',
  },
};

interface Props {
  files: MediaItem[];
  /** The ticked files' ids. */
  selected: string[];
  loading: boolean;
  /** The search in force — it decides which "nothing here" line is true. */
  search: string;
  onToggle: (fileId: string) => void;
  onOpen: (file: MediaItem) => void;
  onCopy: (url: string) => void;
}

/** The page of tiles, or the sentence that says why there are none. */
export default function FileGrid({
  files,
  selected,
  loading,
  search,
  onToggle,
  onOpen,
  onCopy,
}: Readonly<Props>) {
  const { t } = useTranslation();

  if (files.length === 0 && !loading) {
    return (
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          py: 6,
          textAlign: 'center'
        }}>
        {search ? t('shell.fileManager.noMatches', { vars: { query: search } }) : t('shell.fileManager.emptyUploads')}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        ...GRID_SX,
        opacity: loading ? 0.5 : 1,
        transition: (theme) => theme.transitions.create('opacity'),
      }}
    >
      {files.map((file) => (
        <FileCard
          key={file.fileId}
          file={file}
          selected={selected.includes(file.fileId)}
          onToggle={onToggle}
          onOpen={onOpen}
          onCopy={(item) => onCopy(item.url)}
        />
      ))}
    </Box>
  );
}
