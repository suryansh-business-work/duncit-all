import { useId } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

import type { StoreFaq } from '../../graphql/product';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

/** The product's questions and answers, one disclosure each. */
export function ProductFaqs({ faqs }: Readonly<{ faqs: StoreFaq[] }>) {
  const { t } = useStoreT();
  const headingId = useId();
  return (
    <Stack component="section" spacing={1.5} aria-labelledby={headingId} data-testid="product-faqs">
      <Typography id={headingId} variant="h3" component="h2">
        {t('ecommStore.product.faqs')}
      </Typography>
      {faqs.map((faq) => (
        <Accordion
          key={faq.question}
          disableGutters
          sx={{ bgcolor: T.surface, borderRadius: `${T.radius.panel}px !important`, '&::before': { display: 'none' } }}
          data-testid="product-faq"
        >
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
            <Typography variant="h4" component="h3">
              {faq.question}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography sx={{ whiteSpace: 'pre-line' }}>{faq.answer}</Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}
