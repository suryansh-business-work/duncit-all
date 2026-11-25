import { Box, Card, Chip, Stack, Typography } from '@mui/material';
import HandymanIcon from '@mui/icons-material/Handyman';
import type { CrmServiceOffered } from '../api/crm.types';
import { useTranslation } from '@duncit/shell';
import { crmServiceLabel } from '@duncit/utils';

interface Props {
  services: CrmServiceOffered[];
}

/** A service's name, a custom one by its own name (shared with the Duncit CRM app). */
const displayName = (s: CrmServiceOffered) => crmServiceLabel(s);

/**
 * Read-only grid of services as small cards. Cards collapse to a single
 * column on narrow screens. An empty state mirrors the rest of the detail
 * page's visual language so the section never feels broken.
 */
export default function ServicesGrid({ services }: Readonly<Props>) {
  const { t } = useTranslation();
  if (services.length === 0) {
    return (
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          color: 'text.secondary',
          py: 1
        }}>
        <HandymanIcon fontSize="small" />
        <Typography variant="body2">{t('crm.components.noServicesTaggedYet')}</Typography>
      </Stack>
    );
  }
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
        gap: 1,
      }}
    >
      {services.map((s, idx) => {
        const name = displayName(s);
        return (
          <Card key={`${name}-${idx}`} variant="outlined" sx={{ p: 1.25 }}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                alignItems: "center",
                flexWrap: "wrap",
                mb: 0.5
              }}>
              <Typography component="p" variant="subtitle2" noWrap sx={{
                fontWeight: 700
              }}>
                {name}
              </Typography>
              {s.service === 'Other' && <Chip label={t('crm.common.custom')} size="small" variant="outlined" />}
            </Stack>
            {s.description ? (
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {s.description}
              </Typography>
            ) : (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {t('crm.components.noServiceDescription')}
              </Typography>
            )}
          </Card>
        );
      })}
    </Box>
  );
}
