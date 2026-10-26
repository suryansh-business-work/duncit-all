import { Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatCount } from '../../lib/format';
import type { McpConnectorRow } from '../../lib/queries';
import type { CategoryCount } from './queries';

interface ToolsFiltersProps {
  connectors: readonly McpConnectorRow[];
  connector: string;
  onConnector: (key: string) => void;
  total: number;
  categories: readonly CategoryCount[];
  /** The category the table is narrowed to; '' for all of them. */
  category: string;
  onCategory: (category: string) => void;
}

/**
 * Which tools the table lists: one connector's (the gateway reaches all of
 * them), then optionally one category — each chip says how many tools it holds.
 */
export default function ToolsFilters(props: Readonly<ToolsFiltersProps>) {
  const { connectors, connector, onConnector, total, categories, category, onCategory } = props;
  const { t, locale } = useTranslation();
  const toggle = (next: string) => onCategory(next === category ? '' : next);
  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <TextField
          select
          size="small"
          label={t('mcp.tools.connector')}
          value={connectors.some((entry) => entry.key === connector) ? connector : ''}
          onChange={(event) => onConnector(event.target.value)}
          sx={{ minWidth: 280 }}
        >
          {connectors.map((entry) => (
            <MenuItem key={entry.key} value={entry.key} disabled={!entry.accessible}>
              {entry.label}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" role="status" data-testid="mcp-tools-total">
          {t('mcp.tools.total', { count: total, vars: { number: formatCount(total, locale) } })}
        </Typography>
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: 'wrap' }}
        role="group"
        aria-label={t('mcp.tools.categoriesLabel')}
      >
        <Chip
          label={t('mcp.tools.allCategories')}
          onClick={() => onCategory('')}
          color={category ? 'default' : 'primary'}
          aria-pressed={!category}
          size="small"
        />
        {categories.map((entry) => (
          <Chip
            key={entry.category}
            label={t('mcp.tools.categoryCount', { vars: { label: entry.label, count: formatCount(entry.tools, locale) } })}
            onClick={() => toggle(entry.category)}
            color={entry.category === category ? 'primary' : 'default'}
            aria-pressed={entry.category === category}
            size="small"
          />
        ))}
      </Stack>
    </Stack>
  );
}
