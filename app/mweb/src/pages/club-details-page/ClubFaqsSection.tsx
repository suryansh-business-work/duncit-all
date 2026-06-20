import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface Faq {
  question: string;
  answer: string;
}

interface Props {
  faqs: Faq[];
}

/** Admin-authored FAQs rendered as expandable question/answer pairs. */
export default function ClubFaqsSection({ faqs }: Readonly<Props>) {
  if (faqs.length === 0) return null;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        FAQs
      </Typography>
      {faqs.map((faq) => (
        <Accordion
          key={faq.question}
          disableGutters
          square
          sx={{
            '&:before': { display: 'none' },
            mb: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            overflow: 'hidden',
            boxShadow: 'none',
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" fontWeight={700}>
              {faq.question}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {faq.answer}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
