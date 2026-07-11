import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { FaqItem } from './faqQueries';

/** Rotating multi-hue gradients for the cards (matches the app's support palette). */
const GRADIENTS = [
  'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)',
  'linear-gradient(135deg, #7c5cff 0%, #b388ff 100%)',
  'linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)',
  'linear-gradient(135deg, #22c55e 0%, #2196f3 100%)',
  'linear-gradient(135deg, #f5337a 0%, #ff7a59 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #7c5cff 100%)',
];

interface FrequentlyAskedProps {
  faqs: FaqItem[];
  onOpen: (faq: FaqItem) => void;
}

/** Horizontal row of colourful "Frequently Asked" cards (top FAQs). */
export default function FrequentlyAsked({ faqs, onOpen }: Readonly<FrequentlyAskedProps>) {
  if (faqs.length === 0) return null;
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 950 }}>
        Frequently Asked
      </Typography>
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
        <Stack direction="row" spacing={1.25} sx={{ width: 'max-content', py: 0.5 }}>
          {faqs.map((faq, index) => (
            <ButtonBase
              key={faq.id}
              onClick={() => onOpen(faq)}
              sx={{
                flex: '0 0 auto',
                width: 190,
                minHeight: 130,
                p: 1.75,
                borderRadius: 4,
                textAlign: 'left',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexDirection: 'column',
                color: '#fff',
                background: GRADIENTS[index % GRADIENTS.length],
                boxShadow: '0 12px 24px -14px rgba(0,0,0,0.5)',
              }}
              aria-label={faq.question}
            >
              <HelpOutlineIcon sx={{ opacity: 0.9 }} />
              <Typography sx={{ fontWeight: 900, lineHeight: 1.25, mt: 1 }}>
                {faq.question}
              </Typography>
            </ButtonBase>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
