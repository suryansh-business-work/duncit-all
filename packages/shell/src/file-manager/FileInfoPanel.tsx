import { Box, Button, Chip, Divider, Link, Stack, Typography } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';
import DownloadIcon from '@mui/icons-material/Download';
import { formatBytes } from '@duncit/media-picker';
import type { MediaItem } from './queries';
import { downloadUrl, thumbUrl } from './transform';

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Box sx={{ py: 0.4 }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: "block"
        }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * Everything ImageKit records about the file, under a look at the file itself.
 *
 * The fileId and version are here because they are what a support conversation
 * with ImageKit actually needs, and there is nowhere else in the product to
 * read them.
 */
export default function FileInfoPanel({ file }: Readonly<{ file: MediaItem }>) {
  const { t } = useTranslation();
  const isImage = file.fileType === 'image';
  // Hoisted out of the Type row's template so the two do not nest.
  const mimeSuffix = file.mime ? ` · ${file.mime}` : '';

  return (
    <Stack spacing={1}>
      {isImage && (
        <Box
          sx={{
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={thumbUrl(file.url, 480)}
            alt={file.name}
            sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </Box>
      )}

      {/* ImageKit's own attachment flag rather than the `download` attribute,
          which browsers ignore across origins — the file would open in a tab
          instead of saving. */}
      <Button
        size="small"
        variant="outlined"
        startIcon={<DownloadIcon />}
        href={downloadUrl(file.url)}
        target="_blank"
        rel="noreferrer"
      >
        Download
      </Button>

      <Divider sx={{ my: 0.5 }} />

      <Row label={t('shell.fileManager.infoName')} value={file.name} />
      <Row label={t('shell.fileManager.infoPath')} value={file.filePath} />
      <Row label={t('shell.fileManager.infoType')} value={`${file.fileType ?? file.type}${mimeSuffix}`} />
      <Row label={t('shell.fileManager.infoSize')} value={formatBytes(file.size)} />
      <Row
        label={t('shell.fileManager.infoDimensions')}
        value={file.width ? `${file.width} × ${file.height} px` : 'not an image'}
      />
      <Row label={t('shell.fileManager.infoUploaded')} value={when(file.createdAt)} />
      <Row label={t('shell.fileManager.infoUpdated')} value={when(file.updatedAt)} />
      <Row label={t('shell.fileManager.infoFileId')} value={file.fileId} />
      <Row label={t('shell.fileManager.infoVersion')} value={file.versionId ?? '—'} />

      <Divider sx={{ my: 1 }} />

      <Box>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block",
            mb: 0.5
          }}>
          Tags
        </Typography>
        {file.tags.length > 0 ? (
          <Stack direction="row" spacing={0.5} useFlexGap sx={{
            flexWrap: "wrap"
          }}>
            {file.tags.map((tag) => (
              <Chip key={tag} size="small" label={tag} />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            None
          </Typography>
        )}
      </Box>

      <Box sx={{ pt: 1 }}>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block"
          }}>
          Original
        </Typography>
        <Link href={file.url} target="_blank" rel="noreferrer" variant="body2" sx={{ wordBreak: 'break-all' }}>
          {file.url}
        </Link>
      </Box>
    </Stack>
  );
}
