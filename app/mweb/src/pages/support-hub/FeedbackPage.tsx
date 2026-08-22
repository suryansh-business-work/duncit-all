import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { Alert } from '@mui/material';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import { SUBMIT_APP_FEEDBACK_SDL, buildAppFeedbackInput } from '@duncit/slack';
import SupportShell from './SupportShell';
import FeedbackForm, { type FeedbackValues } from '../../forms/feedback';
import { useTranslation } from '../../i18n/useTranslation';

const SUBMIT_APP_FEEDBACK = gql(SUBMIT_APP_FEEDBACK_SDL);

/** "Report a problem" — a quick feedback note that reaches the team on Slack.
 * The server stamps the signed-in identity; the client only sends content. */
export default function FeedbackPage() {
  const { t } = useTranslation();
  const [submit, { loading }] = useMutation(SUBMIT_APP_FEEDBACK);
  const [sent, setSent] = useState(false);

  const onSubmit = async (values: FeedbackValues) => {
    // `media_text` is the field's newline-joined form — the mutation takes a
    // list, same as native sends.
    const media_urls = values.media_text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    await submit({
      variables: {
        input: buildAppFeedbackInput({
          category: values.category,
          message: values.message,
          platform: 'web',
          media_urls,
          // The browser is the device here. Support needs it for the same
          // reason native sends the handset: a report you cannot reproduce on
          // is a report you cannot act on.
          device_os: globalThis.navigator?.userAgent ?? '',
          device_model: `${globalThis.screen?.width ?? 0}x${globalThis.screen?.height ?? 0}`,
          source_screen: globalThis.location?.pathname ?? '',
        }),
      },
    });
    setSent(true);
  };

  return (
    <SupportShell
      title={t('mweb.common.reportAProblem')}
      subtitle={t('mweb.supportHub.sendFeedbackOrReportAnIssue')}
      icon={<FeedbackOutlinedIcon />}
      backTo="/support"
    >
      {sent ? (
        <Alert severity="success">{t('mweb.supportHub.thanksYourFeedbackHasBeenSent')}</Alert>
      ) : (
        <FeedbackForm loading={loading} onSubmit={onSubmit} />
      )}
    </SupportShell>
  );
}
