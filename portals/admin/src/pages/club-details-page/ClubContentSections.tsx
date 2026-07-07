import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArticleIcon from '@mui/icons-material/Article';
import type { ClubDetail } from './types';

interface BulletBlock {
  title: string;
  items: string[];
}

function BulletList({ items }: Readonly<{ items: string[] }>) {
  return (
    <List dense disablePadding>
      {items.map((item) => (
        <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start' }}>
          <ListItemIcon sx={{ minWidth: 30, mt: 0.5 }}>
            <CheckCircleIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
        </ListItem>
      ))}
    </List>
  );
}

/** Admin-authored Club Detail content: the four bullet blocks + FAQs. Renders
 * nothing when the club has no such content, so simple clubs stay uncluttered. */
export default function ClubContentSections({ club }: Readonly<{ club: ClubDetail }>) {
  const blocks: BulletBlock[] = [
    { title: 'Who we are', items: club.who_we_are ?? [] },
    { title: 'What we do', items: club.what_we_do ?? [] },
    { title: 'Perks', items: club.perks ?? [] },
    { title: 'Values', items: club.values ?? [] },
  ].filter((block) => block.items.length > 0);

  const faqs = club.faqs ?? [];
  if (blocks.length === 0 && faqs.length === 0) return null;

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <ArticleIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={900}>
            Club Detail content
          </Typography>
        </Stack>
        <Divider sx={{ mb: 1.5 }} />

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {blocks.map((block) => (
            <Box key={block.title}>
              <Typography variant="caption" color="text.secondary" fontWeight={800}>
                {block.title.toUpperCase()}
              </Typography>
              <BulletList items={block.items} />
            </Box>
          ))}
        </Box>

        {faqs.length > 0 && (
          <Box sx={{ mt: blocks.length > 0 ? 2 : 0 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>
              FAQS
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {faqs.map((faq) => (
                <Accordion key={faq.question} disableGutters variant="outlined">
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" fontWeight={700}>
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
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
