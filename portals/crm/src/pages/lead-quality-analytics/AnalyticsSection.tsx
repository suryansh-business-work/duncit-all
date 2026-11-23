import { useId, useState, type ReactNode } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface SectionProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  testId?: string;
}

/** A titled analytics panel; its heading names the region for screen-reader navigation. */
export function AnalyticsSection({ title, subtitle, action, children, testId }: Readonly<SectionProps>) {
  const headingId = useId();
  return (
    <Card variant="outlined" component="section" aria-labelledby={headingId} data-testid={testId} sx={{ minWidth: 0 }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography id={headingId} component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

interface ChartSectionProps extends Omit<SectionProps, 'action' | 'children'> {
  /** The chart; it carries its own text alternative. */
  chart: ReactNode;
  /** The same numbers as a table, for anyone who would rather read them. */
  table: ReactNode;
}

/** A chart with a switch to the table of the numbers behind it. */
export function ChartSection({ chart, table, ...section }: Readonly<ChartSectionProps>) {
  const { t } = useTranslation();
  const [asTable, setAsTable] = useState(false);
  const regionId = useId();
  return (
    <AnalyticsSection
      {...section}
      action={
        <DuncitButton
          size="small"
          startIcon={asTable ? <BarChartIcon /> : <TableChartIcon />}
          onClick={() => setAsTable((value) => !value)}
          aria-controls={regionId}
        >
          {asTable ? t('crm.leadQualityAnalytics.showChart') : t('crm.leadQualityAnalytics.showTable')}
        </DuncitButton>
      }
    >
      <Box id={regionId}>{asTable ? table : chart}</Box>
    </AnalyticsSection>
  );
}
