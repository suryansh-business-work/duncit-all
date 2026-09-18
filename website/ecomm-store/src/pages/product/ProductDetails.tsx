import type { ReactNode } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Stack, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

import { RichHtml } from '../../components/RichHtml';
import type { StoreProduct } from '../../graphql/product';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

function Section({ title, children, open = false }: Readonly<{ title: string; children: ReactNode; open?: boolean }>) {
  return (
    <Accordion defaultExpanded={open} disableGutters sx={{ bgcolor: T.surface, borderRadius: `${T.radius.panel}px !important`, '&::before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
        <Typography variant="h4" component="h3">
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

const plainText = (text: string) => <Typography sx={{ whiteSpace: 'pre-line' }}>{text}</Typography>;

/** Highlights, description, ingredients, feeding guide, care, specifications and facets. */
export function ProductDetails({ product }: Readonly<{ product: StoreProduct }>) {
  const { t } = useStoreT();
  const specs = [...product.specifications, ...product.facets.map((f) => ({ label: f.name, value: f.values.join(', ') }))];
  return (
    <Stack spacing={1.5} component="section" aria-label={t('ecommStore.product.details')}>
      {product.highlights.length > 0 ? (
        <Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {product.highlights.map((line) => (
            <Stack component="li" key={line} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
              <CheckCircleRoundedIcon sx={{ color: T.brand, fontSize: 20, mt: 0.25 }} aria-hidden />
              <Typography>{line}</Typography>
            </Stack>
          ))}
        </Stack>
      ) : null}
      {product.description ? <Section title={t('ecommStore.product.description')} open>{plainText(product.description)}</Section> : null}
      {product.ingredients ? <Section title={t('ecommStore.product.ingredients')}>{plainText(product.ingredients)}</Section> : null}
      {product.feeding_guide ? (
        <Section title={t('ecommStore.product.feedingGuide')}>
          <RichHtml html={product.feeding_guide} />
        </Section>
      ) : null}
      {product.care_instructions ? (
        <Section title={t('ecommStore.product.care')}>
          <RichHtml html={product.care_instructions} />
        </Section>
      ) : null}
      {specs.length > 0 ? (
        <Section title={t('ecommStore.product.specifications')}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label={t('ecommStore.product.specifications')}>
              <TableBody>
                {specs.map((spec) => (
                  <TableRow key={`${spec.label}:${spec.value}`}>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 700, width: '40%' }}>
                      {spec.label}
                    </TableCell>
                    <TableCell>{spec.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Section>
      ) : null}
    </Stack>
  );
}
