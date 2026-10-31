import { Box, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { EM_DASH } from '@duncit/table';
import { InfoRow } from '@duncit/ui';
import DetailDrawer from '../DetailDrawer';
import { asDuration, platformLabel } from '../labels';
import type { ProductEvent } from '../queries';

/** Pretty-printed properties; the raw text when it is not JSON (it always is, from the server). */
function pretty(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

/** Everything one event carried — already redacted on the device and again on the server. */
export default function EventDetail({ event, onClose }: Readonly<{ event: ProductEvent | null; onClose: () => void }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const rows: Array<[string, string]> = event
    ? [
        ['analytics.product.col.time', formatDateTime(event.occurred_at)],
        ['analytics.product.col.screen', event.screen_name],
        ['analytics.product.col.previousScreen', event.previous_screen],
        ['analytics.product.col.element', event.element_name],
        ['analytics.product.col.elementId', event.element_id],
        ['analytics.product.col.elementType', event.element_type],
        ['analytics.product.col.elementText', event.element_text],
        ['analytics.product.col.duration', event.duration_ms === null || event.duration_ms === undefined ? '' : asDuration(event.duration_ms)],
        ['analytics.product.col.platform', platformLabel(event.platform, t)],
        ['analytics.product.col.appVersion', event.app_version],
        ['analytics.product.col.person', event.user_id ?? t('analytics.product.visitor')],
        ['analytics.product.col.device', event.device_id],
        ['analytics.product.col.session', event.session_id],
        ['analytics.product.col.path', event.path],
      ]
    : [];
  return (
    <DetailDrawer
      open={Boolean(event)}
      title={event?.event_name ?? ''}
      loading={false}
      onClose={onClose}
      testId="product-event-detail"
    >
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          {rows.map(([label, value]) => (
            <InfoRow key={label} label={t(label)} value={value || EM_DASH} />
          ))}
        </Stack>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('analytics.product.events.properties')}
          </Typography>
          <Typography
            component="pre"
            variant="caption"
            sx={{ display: 'block', m: 0, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, overflowX: 'auto' }}
          >
            {pretty(event?.properties_json ?? '{}')}
          </Typography>
        </Box>
      </Stack>
    </DetailDrawer>
  );
}
