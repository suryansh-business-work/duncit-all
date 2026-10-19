import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import ContactPhoneOutlinedIcon from '@mui/icons-material/ContactPhoneOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { fireAndForget } from '@duncit/logs';
import { parseApiError, type GigContact } from '@duncit/utils';
import { GIG_JOB_CONTACT } from '../documents';
import { useGigSurface } from '../GigSurfaceProvider';
import GigContactCard from './GigContactCard';

/**
 * "View contact": any signed-in member may see a poster's contact. It is read
 * on the tap — never shipped with the gig — and the server logs each reveal,
 * so it always goes to the network. Native twin: GigContactReveal.
 */
export default function GigContactReveal({ jobId }: Readonly<{ jobId: string }>) {
  const { t } = useTranslation();
  const { logger } = useGigSurface();
  const client = useApolloClient();
  const [contact, setContact] = useState<GigContact | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const reveal = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const { data } = await client.query({
        query: GIG_JOB_CONTACT,
        variables: { job_id: jobId },
        fetchPolicy: 'network-only',
      });
      if (!data) throw new Error('gigJobContact returned no data');
      setContact(data.gigJobContact);
    } catch (error) {
      // The parsed cause (a closed gig, a validation failure) is for the log;
      // the member reads one localized line.
      logger.error('gig-detail', 'revealContact', { error, jobId, reason: parseApiError(error) });
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (contact) return <GigContactCard contact={contact} />;

  return (
    <Card variant="outlined" data-testid="gig-contact-reveal">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" component="h2">
            {t('gigJobs.contact.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('gigJobs.contact.hidden')}
          </Typography>
          {failed && (
            <Alert severity="error" role="alert">
              {t('gigJobs.contact.viewFailed')}
            </Alert>
          )}
          <DuncitButton
            variant="contained"
            startIcon={<ContactPhoneOutlinedIcon />}
            loading={busy}
            disabled={busy}
            onClick={() => fireAndForget(reveal(), logger, 'gig-detail', 'revealContact')}
            data-testid="gig-contact-view"
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('gigJobs.contact.view')}
          </DuncitButton>
        </Stack>
      </CardContent>
    </Card>
  );
}
