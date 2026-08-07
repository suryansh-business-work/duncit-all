import { Backdrop, Box, IconButton, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';

interface Props {
  url: string | null;
  onClose: () => void;
}

/**
 * Watch a call recording without leaving the conversation it belongs to.
 *
 * A backdrop rather than a window: this one IS modal — you are watching a
 * recording, not working alongside it — and it is dismissed the moment you
 * click away.
 */
export default function RecordingPlayer({ url, onClose }: Readonly<Props>) {
  return (
    <Backdrop
      open={Boolean(url)}
      onClick={onClose}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 1, bgcolor: 'rgba(0,0,0,0.85)' }}
    >
      {url && (
        <Box
          // The video is not the dismiss target: clicking the scrubber should
          // seek, not close what you are watching.
          onClick={(event) => event.stopPropagation()}
          sx={{ position: 'relative', width: 'min(90vw, 900px)' }}
        >
          <Box
            component="video"
            src={url}
            controls
            autoPlay
            sx={{ width: '100%', borderRadius: 1, display: 'block' }}
          />
          <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
            <Tooltip title="Download">
              <IconButton
                size="small"
                component="a"
                href={url}
                download="call-recording.mp4"
                target="_blank"
                rel="noreferrer"
                sx={{ color: 'common.white', bgcolor: 'rgba(0,0,0,0.5)' }}
                aria-label="Download the recording"
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton
                size="small"
                onClick={onClose}
                sx={{ color: 'common.white', bgcolor: 'rgba(0,0,0,0.5)' }}
                aria-label="Close the recording"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Backdrop>
  );
}
