import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

interface Props {
  description?: string | null;
  info?: string | null;
}

const TRUNCATE = 320;

export default function PodAboutSection({ description, info }: Props) {
  const [expanded, setExpanded] = useState(false);
  const text = (description ?? '').trim();
  const isLong = text.length > TRUNCATE;
  const shown = !isLong || expanded ? text : text.slice(0, TRUNCATE) + '\u2026';

  return (
    <Stack spacing={1.5}>
      {text ? (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {shown}
          </Typography>
          {isLong && (
            <Button size="small" onClick={() => setExpanded((v) => !v)} sx={{ mt: 0.5, p: 0 }}>
              {expanded ? 'Show less' : 'Read more'}
            </Button>
          )}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No description provided.
        </Typography>
      )}
      {info && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            What to expect
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {info}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
