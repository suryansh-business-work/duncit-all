import { Link as RouterLink } from 'react-router';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Alert, Card, Link, Stack, Typography } from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { DuncitButton } from '@duncit/buttons';
import type { PodRequestDetail } from '../pod-requests/queries';
import { useTranslation } from '../../i18n/useTranslation';

/** The pod's public address is its club slug + pod slug; the request only carries its id. */
const POD_LINK: TypedDocumentNode<
  { pod: { id: string; pod_id: string; club_slug: string } | null },
  { pod_doc_id: string }
> = gql`
  query PodRequestPodLink($pod_doc_id: ID!) {
    pod(pod_doc_id: $pod_doc_id) {
      id
      pod_id
      club_slug
    }
  }
`;

interface Props {
  request: PodRequestDetail;
}

/**
 * The other side's contact — the API fills it only once the pod exists, so
 * until then the block says when it will be shared. With the pod: View pod.
 */
export default function ContactBlock({ request }: Readonly<Props>) {
  const { t } = useTranslation();
  const podQuery = useQuery(POD_LINK, {
    variables: { pod_doc_id: request.pod_id ?? '' },
    skip: !request.pod_id,
    fetchPolicy: 'cache-first',
  });
  const pod = podQuery.data?.pod;
  const contact = request.contact;
  const rows = contact
    ? [
        { key: 'phone', label: t('podRequests.phone'), value: contact.phone, href: `tel:${contact.phone}` },
        { key: 'email', label: t('podRequests.email'), value: contact.email, href: `mailto:${contact.email}` },
        { key: 'address', label: t('podRequests.address'), value: contact.address ?? '', href: '' },
      ].filter((row) => row.value)
    : [];

  return (
    <Card sx={{ p: 2 }} data-testid="pod-request-contact">
      <Stack spacing={1}>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          {t('podRequests.contactTitle')}
        </Typography>
        {rows.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="pod-request-contact-hidden">
            {t('podRequests.contactHidden')}
          </Typography>
        )}
        {rows.map((row) => (
          <Stack key={row.key} direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 72 }}>
              {row.label}
            </Typography>
            {row.href ? (
              <Link href={row.href} variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                {row.value}
              </Link>
            ) : (
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {row.value}
              </Typography>
            )}
          </Stack>
        ))}
        {podQuery.error && <Alert severity="error">{podQuery.error.message}</Alert>}
        {pod?.club_slug && pod.pod_id && (
          <DuncitButton
            component={RouterLink}
            to={`/club/${pod.club_slug}/pod/${pod.pod_id}`}
            variant="outlined"
            startIcon={<OpenInNewRoundedIcon />}
            sx={{ alignSelf: 'flex-start' }}
            data-testid="pod-request-view-pod"
          >
            {t('podRequests.viewPod')}
          </DuncitButton>
        )}
      </Stack>
    </Card>
  );
}
