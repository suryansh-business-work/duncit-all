import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import {
  REPORT_PROBLEM_CONFIG,
  UPDATE_REPORT_PROBLEM_CONFIG,
  type ReportProblemConfig,
} from '../../../graphql/reported-problems';
import CategoryList from './CategoryList';
import { draftCategory, toEditable, type EditableCategory } from './categories';

/**
 * What the app renders on Report a Problem.
 *
 * The chips and the prompt were hardcoded in the app, so adding a category
 * meant a release. Editing them here changes what every reporter sees on their
 * next open — the app reads this config rather than its own constants.
 */
export default function FormFieldsCard() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ reportProblemConfig: ReportProblemConfig }>(
    REPORT_PROBLEM_CONFIG,
    { fetchPolicy: 'cache-and-network' }
  );
  const [save, saveState] = useMutation<any>(UPDATE_REPORT_PROBLEM_CONFIG, {
    refetchQueries: [REPORT_PROBLEM_CONFIG],
  });

  const [categories, setCategories] = useState<EditableCategory[]>([]);
  const [messageLabel, setMessageLabel] = useState('');
  const [messageHint, setMessageHint] = useState('');
  const [minLength, setMinLength] = useState(10);
  const [allowMedia, setAllowMedia] = useState(true);
  const [maxMedia, setMaxMedia] = useState(5);
  const [saved, setSaved] = useState(false);

  const config = data?.reportProblemConfig;
  useEffect(() => {
    if (!config) return;
    setCategories(toEditable(config.categories));
    setMessageLabel(config.message_label);
    setMessageHint(config.message_hint);
    setMinLength(config.message_min_length);
    setAllowMedia(config.allow_media);
    setMaxMedia(config.max_media);
  }, [config]);

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
    <>
      {error && <Alert severity="error">{error.message}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <CategoryList
              rows={categories}
              onChange={setCategories}
              onAdd={(label) =>
                setCategories((prev) => [...prev, draftCategory(label, prev.length)])
              }
            />

            <Divider />

            <Typography variant="subtitle1" sx={{
              fontWeight: 700
            }}>
              {t('support.problemSettings.prompt')}
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                size="small"
                label={t('support.problemSettings.question')}
                value={messageLabel}
                onChange={(event) => setMessageLabel(event.target.value)}
                fullWidth
              />
              <TextField
                size="small"
                label={t('support.problemSettings.helperText')}
                value={messageHint}
                onChange={(event) => setMessageHint(event.target.value)}
                fullWidth
              />
              <TextField
                size="small"
                type="number"
                label={t('support.problemSettings.minCharacters')}
                value={minLength}
                onChange={(event) => setMinLength(Number(event.target.value) || 1)}
                sx={{ minWidth: 180 }}
              />
            </Stack>

            <Divider />

            <Typography variant="subtitle1" sx={{
              fontWeight: 700
            }}>
              {t('support.problemSettings.screenshots')}
            </Typography>
            <Stack direction="row" spacing={2} sx={{
              alignItems: "center"
            }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={allowMedia}
                    onChange={(event) => setAllowMedia(event.target.checked)}
                  />
                }
                label={t('support.problemSettings.allowScreenshots')}
              />
              <TextField
                size="small"
                type="number"
                label={t('support.problemSettings.maxScreenshots')}
                value={maxMedia}
                disabled={!allowMedia}
                onChange={(event) => setMaxMedia(Number(event.target.value) || 1)}
                sx={{ maxWidth: 200 }}
              />
            </Stack>

            {saveState.error && <Alert severity="error">{saveState.error.message}</Alert>}

            <DuncitButton
              variant="contained"
              onClick={submit}
              disabled={loading || saveState.loading || categories.length === 0}
              sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
            >
              {saveState.loading ? t('shell.common.saving') : t('shell.common.save')}
            </DuncitButton>
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
          {t('support.problemSettings.savedHint')}
        </Alert>
      </Snackbar>
    </>
  );
}
