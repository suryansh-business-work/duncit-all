import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import SectionHeader from '../../components/SectionHeader';
import { SURFACE_SX } from '../../theme';
import type { FaqItem } from './faqQueries';
import { useTranslation } from '../../i18n/useTranslation';

interface FrequentlyAskedProps {
  faqs: FaqItem[];
  onOpen: (faq: FaqItem) => void;
}

/** Horizontal row of "Frequently Asked" cards (top FAQs). */
export default function FrequentlyAsked({ faqs, onOpen }: Readonly<FrequentlyAskedProps>) {
  const { t } = useTranslation();
  if (faqs.length === 0) return null;
  return (
    <Stack spacing={1.5}>
      <SectionHeader title={t('mweb.supportHub.frequentlyAsked')} />
      <Box
        sx={{
          mx: { xs: -1.25, sm: -2 },
          px: { xs: 1.25, sm: 2 },
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ width: 'max-content', py: 0.5 }}>
          {faqs.map((faq) => (
            <ButtonBase
              key={faq.id}
              onClick={() => onOpen(faq)}
              sx={{
                ...SURFACE_SX,
                flex: '0 0 auto',
                width: 190,
                minHeight: 130,
                p: 2,
                gap: 1.5,
                textAlign: 'left',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexDirection: 'column',
              }}
              aria-label={faq.question}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'secondary.main',
                  bgcolor: 'action.hover',
                }}
              >
                <HelpOutlineIcon fontSize="small" />
              </Box>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.3 }}>
                {faq.question}
              </Typography>
            </ButtonBase>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
