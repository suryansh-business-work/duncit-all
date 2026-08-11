import {
  Alert,
  Button,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import {
  TEMPLATE_TOKENS,
  TICKET_TOKEN,
  type MailAutomationRuleValues,
} from './mail-automation-rule/mail-automation-rule.types';

import type { ReplyPreview } from './mail-automation-rule/useMailAutomationRule';

interface Props {
  control: Control<MailAutomationRuleValues>;
  errors: FieldErrors<MailAutomationRuleValues>;
  preview: ReplyPreview | null;
  previewing: boolean;
  onPreview: () => void;
}

/**
 * Step 2: the message every first email gets back.
 *
 * The placeholders are shown as chips rather than described in prose, because
 * the one that matters is required and an operator who cannot see its exact
 * spelling will type it wrong.
 */
export default function ReplyMessageStep({
  control,
  errors,
  preview,
  previewing,
  onPreview,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const tokenList = TEMPLATE_TOKENS.join(', ');

  return (
    <Stack spacing={2}>
      <Controller
        name="reply_template"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            multiline
            minRows={7}
            label={t('support.mailAutomation.messageLabel')}
            error={Boolean(errors.reply_template)}
            helperText={
              errors.reply_template?.message ??
              t('support.mailAutomation.messageHint', {
                vars: { tokens: tokenList, ticketToken: TICKET_TOKEN },
              })
            }
          />
        )}
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {TEMPLATE_TOKENS.map((token) => (
          <Chip key={token} size="small" variant="outlined" label={token} />
        ))}
      </Stack>

      <Controller
        name="ai_enabled"
        control={control}
        render={({ field }) => (
          <Stack>
            <FormControlLabel
              control={
                <Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
              }
              label={t('support.mailAutomation.aiLabel')}
            />
            <Typography variant="body2" color="text.secondary">
              {t('support.mailAutomation.aiHint')}
            </Typography>
          </Stack>
        )}
      />

      <Stack direction="row">
        <Button
          type="button"
          variant="outlined"
          startIcon={<VisibilityIcon />}
          disabled={previewing}
          onClick={onPreview}
        >
          {t('support.mailAutomation.preview')}
        </Button>
      </Stack>

      {preview && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={800}>
            {t('support.mailAutomation.previewTitle')}
          </Typography>
          <Alert severity="info" sx={{ my: 1 }}>
            {t(
              preview.by_ai
                ? 'support.mailAutomation.previewByAi'
                : 'support.mailAutomation.previewByTemplate'
            )}
          </Alert>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {preview.text}
          </Typography>
        </Paper>
      )}
    </Stack>
  );
}
