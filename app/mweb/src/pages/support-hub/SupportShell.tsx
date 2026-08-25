import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  gradient?: string;
  backTo?: string;
  action?: ReactNode;
  children: ReactNode;
}

const BRAND_GRADIENT = 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)';

export default function SupportShell({
  title,
  subtitle,
  icon,
  gradient = BRAND_GRADIENT,
  backTo,
  action,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: "center"
      }}>
        <IconButton
          size="small"
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          aria-label={t('mweb.common.back')}
          sx={{ bgcolor: 'action.hover' }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.contrastText',
            background: gradient,
            flex: '0 0 auto',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }} noWrap>
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              noWrap
              sx={{
                color: "text.secondary",
                fontWeight: 600
              }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>

      <Box>{children}</Box>
    </Stack>
  );
}
