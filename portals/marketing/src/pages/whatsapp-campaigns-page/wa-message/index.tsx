import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import TemplateSample from '../wa-aisensy/TemplateSample';
import { templateFor, useAisensyCatalogue } from '../wa-aisensy/useAisensyCatalogue';
import SentVariables from './SentVariables';

interface Props {
  /** The AiSensy campaign this send was addressed to. */
  campaignName: string;
  /** What filled {{1}}, {{2}}… in order, frozen at send time. */
  params: string[];
  /** What each placeholder is for, when the scenario registry names them. */
  labels?: readonly string[];
  /** An extra line for a campaign send, whose per-person tokens are not
   * resolved at this level. */
  note?: string;
}

/**
 * What the recipient actually read, behind a row of the WhatsApp log.
 *
 * Nothing stores the rendered text: a send posts a CAMPAIGN name and a list of
 * values, and AiSensy assembles the words from the template. So the message is
 * put back together the only way it can be — the template AiSensy holds for
 * that campaign now, filled with the values this send froze. That is not a
 * guess: Meta does not allow an approved template to be edited, so the wording
 * is the same one unless somebody deleted the template and resubmitted it.
 *
 * The values are listed under the bubble rather than only drawn into it,
 * because a value that went out BLANK is invisible in the sentence — the
 * preview falls back to the placeholder — and a blank value is exactly the bug
 * somebody opens this row to find.
 *
 * Both halves of the merged log use it: a campaign send and an automatic
 * message differ in where their values came from, never in how the message was
 * assembled from them.
 */
export default function SentMessage({ campaignName, params, labels, note }: Readonly<Props>) {
  const { t } = useTranslation();
  // The Project API is a live round trip; a send with no campaign name on it
  // has nothing to look up, so it never pays for one.
  const { campaigns, templates, loading } = useAisensyCatalogue({ skip: !campaignName });
  const template = templateFor(campaignName, campaigns, templates);

  return (
    <Stack spacing={1}>
      <Typography variant="overline" sx={{
        color: "text.secondary"
      }}>
        {t('marketingWhatsapp.logs.messageTitle')}
      </Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('marketingWhatsapp.logs.messageHint')}
      </Typography>
      {note && (
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {note}
        </Typography>
      )}

      {template && <TemplateSample template={template} params={params} />}
      {!template && loading && <Skeleton variant="rounded" height={180} />}
      {!template && !loading && (
        <Alert severity="info">{t('marketingWhatsapp.logs.messageUnknown')}</Alert>
      )}

      <Typography variant="overline" sx={{
        color: "text.secondary"
      }}>
        {t('marketingWhatsapp.logs.variablesTitle')}
      </Typography>
      <SentVariables params={params} labels={labels} body={template?.body ?? ''} />
    </Stack>
  );
}
