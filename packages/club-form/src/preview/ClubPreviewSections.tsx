import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import type { ClubFaqValue } from '../types';

/** A titled block of the club page, hidden entirely when it has nothing to say. */
export function PreviewSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.75 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/** The apps render every club bullet list as a ticked list, not prose. */
export function PreviewBullets({ items }: Readonly<{ items: string[] }>) {
  return (
    <Stack spacing={0.5}>
      {items.map((item) => (
        <Stack key={item} direction="row" spacing={0.75} alignItems="flex-start">
          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', mt: '2px' }} />
          <Typography variant="body2" color="text.secondary">
            {item}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function PreviewFaqs({ faqs }: Readonly<{ faqs: ClubFaqValue[] }>) {
  return (
    <Stack spacing={1}>
      {faqs.map((faq) => (
        <Box key={faq.question}>
          <Typography variant="body2" fontWeight={700}>
            {faq.question}
          </Typography>
          {faq.answer && (
            <Typography variant="body2" color="text.secondary">
              {faq.answer}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

/** Past-event photos, as the club page strips them across. */
export function PreviewMomentsStrip({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
      {children}
    </Stack>
  );
}
