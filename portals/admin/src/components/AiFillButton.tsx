import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const AI_FILL = gql`
  mutation AiFillDummyData($entity: AiDummyEntity!, $prompt: String) {
    aiFillDummyData(entity: $entity, prompt: $prompt)
  }
`;

export type AiDummyEntity = 'CLUB' | 'POD';

const promptPlaceholder = (entity: AiDummyEntity) => {
  if (entity === 'POD') return 'e.g. weekend rooftop chess meetup in Bandra';
  return 'e.g. urban hikers in Bangalore';
};

interface Props {
  entity: AiDummyEntity;
  /** Called with the parsed JSON object returned by OpenAI. */
  onFill: (data: Record<string, any>) => void;
  /** Hide the small label, render icon-only. */
  iconOnly?: boolean;
  /** Override button label. */
  label?: string;
}

export default function AiFillButton({ entity, onFill, iconOnly, label }: Readonly<Props>) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [run, { loading }] = useMutation(AI_FILL);

  const open = Boolean(anchorEl);

  const handleGenerate = async () => {
    setError(null);
    try {
      const res = await run({
        variables: { entity, prompt: prompt.trim() || null },
      });
      const raw = res.data?.aiFillDummyData;
      if (!raw) throw new Error('No data returned');
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error('AI returned invalid JSON');
      }
      onFill(parsed);
      setAnchorEl(null);
      setPrompt('');
    } catch (e: any) {
      setError(e?.message || 'Failed to generate');
    }
  };

  return (
    <>
      {iconOnly ? (
        <Tooltip title="Fill with AI">
          <IconButton
            size="small"
            color="secondary"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <AutoAwesomeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          size="small"
          variant="outlined"
          color="secondary"
          startIcon={<AutoAwesomeIcon fontSize="small" />}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          {label || 'Fill with AI'}
        </Button>
      )}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => {
          if (!loading) {
            setAnchorEl(null);
            setError(null);
          }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, p: 2, width: 340, maxWidth: '92vw' } } }}
      >
        <Stack spacing={1.25}>
          <Box>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <AutoAwesomeIcon fontSize="small" color="secondary" /> Fill with AI
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Optional — describe a topic, vibe, or context. Leave blank for a
              random {entity.toLowerCase()}.
            </Typography>
          </Box>
          <TextField
            autoFocus
            placeholder={promptPlaceholder(entity)}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            multiline
            minRows={2}
            maxRows={4}
            fullWidth
            disabled={loading}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleGenerate();
            }}
            helperText="Tip: Cmd/Ctrl + Enter to generate"
          />
          {error && (
            <Alert severity="error" sx={{ py: 0 }}>
              {error}
            </Alert>
          )}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              size="small"
              onClick={() => {
                setAnchorEl(null);
                setError(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={handleGenerate}
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon fontSize="small" />
              }
            >
              {loading ? 'Generating…' : 'Generate'}
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
}
