import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SectionHeader from '../../components/SectionHeader';

interface Faq {
  question: string;
  answer: string;
}

interface Props {
  faqs: Faq[];
}

/** Admin-authored FAQs rendered as expandable question/answer pairs — each
 * its own themed surface (24px, borderless on the light ground). */
export default function ClubFaqsSection({ faqs }: Readonly<Props>) {
  if (faqs.length === 0) return null;

  return (
    <Stack spacing={1}>
      <SectionHeader title="FAQs" />
      {faqs.map((faq) => (
        <Accordion key={faq.question} disableGutters sx={{ overflow: 'hidden' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
            <Typography variant="subtitle2" sx={{
              fontWeight: 600
            }}>
              {faq.question}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0 }}>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                whiteSpace: 'pre-wrap'
              }}>
              {faq.answer}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}
