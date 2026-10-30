import { matchPath, useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Card, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import { getSafeRedirectPath } from '../../utils/redirect';
import { RADIUS } from '../../theme';
import { LOGIN_POD_PREVIEW } from './queries';

/** mWeb's pod page — the path a website's pod rail and every pod link open. */
const POD_PAGE = '/club/:clubSlug/pod/:podSlug';

/**
 * The pod a signed-out visitor picked (a website's upcoming-pods rail, a
 * shared link) on top of the login screen, so they see what they are logging
 * in for. Read from `?redirect`, which the pod page's auth guard set; anything
 * that is not a pod page, an unknown pod or a failed lookup shows nothing —
 * the login itself never waits on it.
 */
export default function LoginPodPreview() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const target = getSafeRedirectPath(params.get('redirect')).split('?')[0];
  const match = target ? matchPath(POD_PAGE, target) : null;
  const clubSlug = match?.params.clubSlug ?? '';
  const podSlug = match?.params.podSlug ?? '';
  const { data } = useQuery(LOGIN_POD_PREVIEW, {
    variables: { kind: 'POD', id: clubSlug, secondary_id: podSlug },
    skip: !clubSlug || !podSlug,
  });
  const pod = data?.linkPreview;
  if (!pod) return null;

  return (
    <Card data-testid="login-pod-preview" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25 }}>
      {pod.image_url && (
        <Box
          component="img"
          src={pod.image_url}
          alt=""
          sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: `${RADIUS.base}px`, flex: '0 0 auto' }}
        />
      )}
      <Stack sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
          {pod.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('mweb.meta.pod.description')}
        </Typography>
      </Stack>
    </Card>
  );
}
