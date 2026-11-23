import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Link,
  List,
  ListItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from '../i18n/useTranslation';
import type { PolicyLink, PolicySection } from './documents';

/**
 * The policies, in the order the server sends them, one section each, in a region
 * that scrolls on its own so the buttons below stay in view while someone reads.
 * Every section is open when the screen loads — nothing is hidden from a person who
 * is about to agree to it — and each header is a button, which is also what lets a
 * keyboard user move through (and so scroll) the region (WCAG 2.1.1).
 */
export function PolicySections({ sections, links }: Readonly<{ sections: PolicySection[]; links: PolicyLink[] }>) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle1" component="h2" id="security-policies-title">
          {t('shell.securityVerification.policies.title')}
        </Typography>
        <Stack
          role="region"
          aria-labelledby="security-policies-title"
          data-testid="security-policies"
          sx={{ maxHeight: { xs: 280, sm: 360 }, overflowY: 'auto' }}
        >
          {sections.map((section) => (
            <Accordion key={section.key} defaultExpanded disableGutters variant="outlined" data-testid={`security-policy-${section.key}`}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                id={`security-policy-${section.key}-header`}
                aria-controls={`security-policy-${section.key}-content`}
              >
                <Typography variant="subtitle2" component="span">
                  {section.title}
                </Typography>
              </AccordionSummary>
              <AccordionDetails id={`security-policy-${section.key}-content`}>
                <Stack spacing={0.5}>
                  {section.paragraphs.map((paragraph) => (
                    <Typography key={paragraph} variant="body2" sx={{ color: 'text.secondary' }}>
                      {paragraph}
                    </Typography>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
        {links.length > 0 && (
          <Stack spacing={0.5} data-testid="security-policy-links">
            <Typography variant="subtitle2" component="h3">
              {t('shell.securityVerification.policies.linksTitle')}
            </Typography>
            <List dense disablePadding>
              {links.map((link) => (
                <ListItem key={link.url} disableGutters sx={{ py: 0 }}>
                  <Link href={link.url} target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    {link.title}
                    <OpenInNewIcon fontSize="inherit" aria-hidden />
                  </Link>
                </ListItem>
              ))}
            </List>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
