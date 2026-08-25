import { Box, Card, Chip, Stack, Typography } from '@mui/material';
import HandymanIcon from '@mui/icons-material/Handyman';
import type { CrmServiceOffered } from '../api/crm.types';
import { useTranslation } from '@duncit/shell';

interface Props {
  services: CrmServiceOffered[];
}

const displayName = (s: CrmServiceOffered) =>
  s.service === 'Other' ? (s.custom_name || '').trim() || 'Other' : (s.service || '').trim();

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
              <Typography variant="subtitle2" noWrap sx={{
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
                color: "text.disabled"
              }}>
                No description.
              </Typography>
            )}
          </Card>
        );
      })}
    </Box>
  );
}
