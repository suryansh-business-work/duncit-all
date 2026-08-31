import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import LayersIcon from '@mui/icons-material/Layers';
import { useTranslation } from '@duncit/app-settings';
import type { FragmentTemplateRef } from './queries';

/**
 * Templates, narrowed to the ones this header and footer wraps.
 *
 * It carries a slug as well as the filter: the page opens whichever
 * template was selected last otherwise, and landing on a filtered list of
 * three with a fourth one open in the editor beside it reads as a bug.
 */
export function templatesHref(fragmentKey: string, slug?: string): string {
  const params = new URLSearchParams({ fragment: fragmentKey });
  if (slug) params.set('slug', slug);
  return `/emails/templates?${params.toString()}`;
}

/** One named template, opened directly — the log rows link by slug too. */
export function templateHref(slug: string): string {
  return `/emails/templates?${new URLSearchParams({ slug }).toString()}`;
}

/**
 * How many templates this fragment names, above the chips that name them.
 *
 * Editing a header changes every email wrapped in it, and until now nothing on
 * this page said how many that was — so a footer used by one internal template
 * looked exactly like the one under every receipt the platform sends.
 */
const MAX_NAMED = 8;

interface Props {
  fragmentKey: string;
  /** Every template whose fragment_key is this one. */
  templates: FragmentTemplateRef[];
}

export default function FragmentUsageStrip({ fragmentKey, templates }: Readonly<Props>) {
  const { t } = useTranslation();
  const named = templates.slice(0, MAX_NAMED);

  if (templates.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('tech.emailFragments.noTemplateUsesThisYet')}
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Tooltip title={t('tech.emailFragments.showEveryTemplateUsingThis')}>
        <Chip
          size="small"
          clickable
          component={RouterLink}
          to={templatesHref(fragmentKey, named[0]?.slug)}
          icon={<LayersIcon />}
          color="primary"
          label={t('tech.emailFragments.usedByTemplates', {
            vars: { count: templates.length },
          })}
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        />
      </Tooltip>
      {named.map((template) => (
        <Tooltip
          key={template.template_id}
          title={t('tech.emailFragments.openTemplateInEmailTemplates', {
            vars: { name: template.name },
          })}
        >
          <Chip
            size="small"
            clickable
            variant="outlined"
            component={RouterLink}
            to={templateHref(template.slug)}
            label={template.name}
          />
        </Tooltip>
      ))}
    </Stack>
  );
}
