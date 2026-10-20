import { Chip, Link, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from '@duncit/app-settings';
import type { EnvCategoryCounts } from '@duncit/gql-types';
import type { EnvCategoryDef } from '../queries';

interface Props {
  title: string;
  subtitle: string | null | undefined;
  /** The category on show, for its group chip, counts and provider links. */
  def?: EnvCategoryDef | null;
  counts?: EnvCategoryCounts | null;
}

const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** Title + subtitle of the section in view, with where its keys come from. */
export default function EnvSectionHeader({ title, subtitle, def, counts }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        {def ? <Chip size="small" variant="outlined" label={def.groupLabel} /> : null}
        {counts ? (
          <Chip
            size="small"
            color={counts.failing > 0 ? 'error' : 'default'}
            label={t('tech.environment.categoryCounts', { vars: { total: counts.total, tested: counts.tested } })}
          />
        ) : null}
      </Stack>
      {subtitle ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      ) : null}
      {def?.docUrl || def?.apiDocsUrl ? (
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {def.docUrl ? (
            <Link href={def.docUrl} {...external} variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
              {t('tech.environment.openDashboard', { vars: { name: def.label } })}
              <OpenInNewIcon fontSize="inherit" />
            </Link>
          ) : null}
          {def.apiDocsUrl ? (
            <Link href={def.apiDocsUrl} {...external} variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
              {t('tech.environment.apiDocs')}
              <OpenInNewIcon fontSize="inherit" />
            </Link>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
