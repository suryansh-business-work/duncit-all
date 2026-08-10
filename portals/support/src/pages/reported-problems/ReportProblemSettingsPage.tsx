import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  Switch,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader } from '@duncit/ui';
import {
  REPORT_PROBLEM_CONFIG,
  UPDATE_REPORT_PROBLEM_CONFIG,
  type ReportProblemCategory,
  type ReportProblemConfig,
} from '../../graphql/reported-problems';

/**
 * What the app renders on Report a Problem.
 *
 * The chips and the prompt were hardcoded in the app, so adding a category meant
 * a release. Editing them here changes what every reporter sees on their next
 * open — the app reads this config rather than its own constants.
 */
export default function ReportProblemSettingsPage() {
  const { data, loading, error } = useQuery<{ reportProblemConfig: ReportProblemConfig }>(
    REPORT_PROBLEM_CONFIG,
    { fetchPolicy: 'cache-and-network' }
  );
  const [save, saveState] = useMutation(UPDATE_REPORT_PROBLEM_CONFIG, {
    refetchQueries: [REPORT_PROBLEM_CONFIG],
  });

  const [categories, setCategories] = useState<ReportProblemCategory[]>([]);
  const [messageLabel, setMessageLabel] = useState('');
  const [messageHint, setMessageHint] = useState('');
  const [minLength, setMinLength] = useState(10);
  const [allowMedia, setAllowMedia] = useState(true);
  const [maxMedia, setMaxMedia] = useState(5);
  const [newChip, setNewChip] = useState('');
  const [saved, setSaved] = useState(false);

  const config = data?.reportProblemConfig;
  useEffect(() => {
    if (!config) return;
    setCategories(config.categories);
    setMessageLabel(config.message_label);
    setMessageHint(config.message_hint);
    setMinLength(config.message_min_length);
    setAllowMedia(config.allow_media);
    setMaxMedia(config.max_media);
  }, [config]);

  const addChip = () => {
    const label = newChip.trim();
    if (!label) return;
    setCategories((prev) => [
      ...prev,
      // No key: the server derives a stable one from the label. Renaming later
      // keeps the key, so reports already filed under it are never orphaned.
      { key: '', label, is_active: true, sort_order: prev.length },
    ]);
    setNewChip('');
  };

  const submit = () => {
    save({
      variables: {
        input: {
          categories: categories.map((c, index) => ({
            key: c.key || undefined,
            label: c.label,
            is_active: c.is_active,
            sort_order: index,
          })),
          message_label: messageLabel,
          message_hint: messageHint,
          message_min_length: minLength,
          allow_media: allowMedia,
          max_media: maxMedia,
        },
      },
    })
      .then(() => setSaved(true))
      .catch(() => undefined);
  };

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Configure Report a Problem"
        subtitle="The categories and prompt the app shows when someone reports a problem."
      />

      {error && <Alert severity="error">{error.message}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={700}>
              Categories
            </Typography>
            <Typography variant="body2" color="text.secondary">
              These are the chips a reporter picks from. Turning one off hides it from the app
              without touching the reports already filed under it.
            </Typography>

            <Stack spacing={1}>
              {categories.map((category, index) => (
                <Stack
                  key={category.key || `new-${index}`}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                >
                  <TextField
                    size="small"
                    value={category.label}
                    onChange={(event) =>
                      setCategories((prev) =>
                        prev.map((c, i) => (i === index ? { ...c, label: event.target.value } : c))
                      )
                    }
                    sx={{ flex: 1 }}
                  />
                  {category.key && <Chip size="small" variant="outlined" label={category.key} />}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={category.is_active}
                        onChange={(event) =>
                          setCategories((prev) =>
                            prev.map((c, i) =>
                              i === index ? { ...c, is_active: event.target.checked } : c
                            )
                          )
                        }
                      />
                    }
                    label="Shown"
                  />
                  <IconButton
                    color="error"
                    aria-label={`Remove ${category.label}`}
                    onClick={() => setCategories((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                size="small"
                label="New category"
                value={newChip}
                onChange={(event) => setNewChip(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addChip();
                  }
                }}
              />
              <Button startIcon={<AddIcon />} onClick={addChip} disabled={!newChip.trim()}>
                Add
              </Button>
            </Stack>

            <Divider />

            <Typography variant="subtitle1" fontWeight={700}>
              The prompt
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                size="small"
                label="Question"
                value={messageLabel}
                onChange={(event) => setMessageLabel(event.target.value)}
                fullWidth
              />
              <TextField
                size="small"
                label="Helper text"
                value={messageHint}
                onChange={(event) => setMessageHint(event.target.value)}
                fullWidth
              />
              <TextField
                size="small"
                type="number"
                label="Minimum characters"
                value={minLength}
                onChange={(event) => setMinLength(Number(event.target.value) || 1)}
                sx={{ minWidth: 180 }}
              />
            </Stack>

            <Divider />

            <Typography variant="subtitle1" fontWeight={700}>
              Screenshots
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={allowMedia}
                    onChange={(event) => setAllowMedia(event.target.checked)}
                  />
                }
                label="Let reporters attach screenshots"
              />
              <TextField
                size="small"
                type="number"
                label="Max screenshots"
                value={maxMedia}
                disabled={!allowMedia}
                onChange={(event) => setMaxMedia(Number(event.target.value) || 1)}
                sx={{ maxWidth: 200 }}
              />
            </Stack>

            {saveState.error && <Alert severity="error">{saveState.error.message}</Alert>}

            <Button
              variant="contained"
              onClick={submit}
              disabled={loading || saveState.loading || categories.length === 0}
              sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
            >
              {saveState.loading ? 'Saving…' : 'Save changes'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSaved(false)}>
          Saved — the app picks this up on its next open.
        </Alert>
      </Snackbar>
    </Stack>
  );
}
