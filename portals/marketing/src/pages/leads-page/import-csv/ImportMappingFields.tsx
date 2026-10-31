import { Grid, MenuItem, TextField, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { PIPELINES, PIPELINE_LABEL } from '../copy';
import type { MarketingLeadPipeline } from '../queries';
import { FIELD_LABEL, IMPORT_FIELDS, type ImportField, type MappingState } from './importMapping';

const NONE = '';

interface Props {
  header: readonly string[];
  mapping: MappingState;
  onChange: (mapping: MappingState) => void;
  pipeline: MarketingLeadPipeline;
  onPipeline: (pipeline: MarketingLeadPipeline) => void;
}

/** One select per field, each listing the file's columns by their header; and the pipeline every row joins. */
export default function ImportMappingFields({ header, mapping, onChange, pipeline, onPipeline }: Readonly<Props>) {
  const { t } = useTranslation();
  const columnLabel = (index: number) => header[index] || `#${index + 1}`;
  const set = (field: ImportField, value: string) => onChange({ ...mapping, [field]: value === NONE ? null : Number(value) });

  return (
    <div data-testid="import-mapping">
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t('marketing.leads.mappingTitle')}
      </Typography>
      <Grid container spacing={2}>
        {IMPORT_FIELDS.map((field) => (
          <Grid key={field} size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              required={field === 'name'}
              label={t(FIELD_LABEL[field])}
              value={mapping[field] === null ? NONE : String(mapping[field])}
              onChange={(event) => set(field, event.target.value)}
              slotProps={{ htmlInput: { 'data-testid': `import-map-${field}` } }}
            >
              <MenuItem value={NONE}>
                <em>{t('marketing.leads.notMapped')}</em>
              </MenuItem>
              {header.map((_label, index) => (
                <MenuItem key={`${field}-${index}`} value={String(index)}>
                  {columnLabel(index)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        ))}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            select
            fullWidth
            size="small"
            label={t('marketing.leads.importPipeline')}
            value={pipeline}
            onChange={(event) => onPipeline(event.target.value as MarketingLeadPipeline)}
            slotProps={{ htmlInput: { 'data-testid': 'import-pipeline' } }}
          >
            {PIPELINES.map((option) => (
              <MenuItem key={option} value={option}>
                {t(PIPELINE_LABEL[option])}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
    </div>
  );
}
