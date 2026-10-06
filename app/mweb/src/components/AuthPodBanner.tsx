import { useEffect } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useSearchParams } from 'react-router';
import { Box, Card, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/EventRounded';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import { logs } from '@duncit/logs';
import { coverImageUrl, podSlugsFromPath } from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';
import { formatDateTime } from '../utils/dateFormat';
import { getSafeRedirectPath } from '../utils/redirect';

const AUTH_POD = gql`
  query AuthPodBanner($clubSlug: String!, $podSlug: String!) {
    podBySlugs(club_slug: $clubSlug, pod_slug: $podSlug) {
      id
      pod_title
      pod_date_time
      place_label
      locality
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;

interface AuthPod {
  id: string;
  pod_title: string;
  pod_date_time: string;
  place_label: string | null;
  locality: string | null;
  pod_images_and_videos: Array<{ url: string; type: string | null }>;
}

const THUMB = 64;

/** The pod a malformed `?redirect` names is no pod — never a crashed sign-in screen. */
function slugsFrom(redirect: string) {
  try {
    return podSlugsFromPath(redirect);
  } catch (error) {
    logs.mWeb.warn('AuthPodBanner', 'podSlugsFromPath', { error });
    return null;
  }
}

/**
 * The pod a signed-out visitor tapped (on a public venue or host page), shown
 * on top of every sign-in screen so they know what they are signing in for.
 * Reads the `?redirect` the auth flow carries; renders nothing when it is not
 * a pod page, while the pod loads, or when it cannot be loaded.
 */
export default function AuthPodBanner() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const slugs = slugsFrom(getSafeRedirectPath(params.get('redirect')));
  const { data, error } = useQuery<{ podBySlugs: AuthPod | null }>(AUTH_POD, {
    variables: { clubSlug: slugs?.clubSlug ?? '', podSlug: slugs?.podSlug ?? '' },
    skip: !slugs,
  });

  useEffect(() => {
    // Secondary to the sign-in itself, so a failure hides the card — logged, not shown.
    if (error) logs.mWeb.warn('AuthPodBanner', 'podBySlugs', { error });
  }, [error]);

  const pod = data?.podBySlugs;
  if (!slugs || !pod) return null;
  const cover = coverImageUrl(pod.pod_images_and_videos);
  const place = pod.place_label || pod.locality;

  return (
    <Card data-testid="auth-pod-banner" variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Typography variant="overline" component="p" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
        {t('publicPage.authPod.eyebrow')}
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 0.5 }}>
        {cover ? (
          <Box
            component="img"
            src={cover}
            alt={t('publicPage.authPod.imageAlt', { vars: { name: pod.pod_title } })}
            data-testid="auth-pod-banner-image"
            sx={{ width: THUMB, height: THUMB, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <Box
            aria-hidden
            sx={{ width: THUMB, height: THUMB, borderRadius: 1, flexShrink: 0, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'secondary.main' }}
          >
            <EventIcon />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography data-testid="auth-pod-banner-title" component="p" variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
            {pod.pod_title}
          </Typography>
          <Typography data-testid="auth-pod-banner-date" variant="body2" sx={{ color: 'text.secondary' }}>
            {formatDateTime(pod.pod_date_time)}
          </Typography>
          {place && (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <PlaceIcon aria-hidden fontSize="inherit" />
              <Typography data-testid="auth-pod-banner-place" variant="body2" noWrap>
                {place}
              </Typography>
            </Stack>
          )}
        </Box>
      </Stack>
      <Typography variant="body2" sx={{ mt: 1 }}>
        {t('publicPage.authPod.hint')}
      </Typography>
    </Card>
  );
}
