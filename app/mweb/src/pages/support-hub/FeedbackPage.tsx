import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { Alert } from '@mui/material';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import { SUBMIT_APP_FEEDBACK_SDL, buildAppFeedbackInput } from '@duncit/slack';
import SupportShell from './SupportShell';
import FeedbackForm, { type FeedbackValues } from '../../forms/feedback';

const SUBMIT_APP_FEEDBACK = gql(SUBMIT_APP_FEEDBACK_SDL);

/** "Report a problem" — a quick feedback note that reaches the team on Slack.
 * The server stamps the signed-in identity; the client only sends content. */
export default function FeedbackPage() {
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
        }),
      },
    });
    setSent(true);
  };

  return (
    <SupportShell
      title="Report a Problem"
      subtitle="Send feedback or report an issue — it reaches our team instantly"
      icon={<FeedbackOutlinedIcon />}
      backTo="/support"
    >
      {sent ? (
        <Alert severity="success">Thanks! Your feedback has been sent to our team.</Alert>
      ) : (
        <FeedbackForm loading={loading} onSubmit={onSubmit} />
      )}
    </SupportShell>
  );
}
