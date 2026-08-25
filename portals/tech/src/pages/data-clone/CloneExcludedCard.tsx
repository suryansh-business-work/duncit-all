import { Accordion, AccordionDetails, AccordionSummary, Chip, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from '@duncit/shell';

/**
 * The collections the clone never copies. Shown because the exclusion list IS
 * the safety story: an operator has to be able to see that credentials, live
 * OTPs and device tokens stay behind without reading the server source.
 */
export default function CloneExcludedCard({ excluded }: Readonly<{ excluded: string[] }>) {
  const { t } = useTranslation();
  return (
    <Accordion variant="outlined" disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" sx={{
          fontWeight: 700
        }}>
          {t('tech.dataClone.excludedTitle', { vars: { total: excluded.length } })}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('tech.dataClone.excludedHint')}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{
            flexWrap: "wrap"
          }}>
            {excluded.map((name) => (
              <Chip key={name} size="small" variant="outlined" label={name} />
            ))}
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
