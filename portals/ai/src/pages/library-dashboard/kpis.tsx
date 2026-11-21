import { StatCard } from '@duncit/ui';
import type { DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/shell';
import CodeIcon from '@mui/icons-material/Code';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditNoteIcon from '@mui/icons-material/EditNote';
import LinkIcon from '@mui/icons-material/Link';
import type { LibraryDashboard } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

const kpi = (id: string, x: number, content: DashboardWidget['content']): DashboardWidget => ({
  id,
  bare: true,
  defaultLayout: { x, y: 0, w: 3, h: 2 },
  minW: 2,
  minH: 2,
  content,
});

/** The headline tiles: what the library holds, how much drifted, and how much of the product it covers. */
export function libraryKpis(d: LibraryDashboard, t: Translate): DashboardWidget[] {
  return [
    kpi(
      'code',
      0,
      <StatCard
        sx={{ height: '100%' }}
        icon={<CodeIcon fontSize="small" />}
        label={t('ai.libraryDashboard.kpiCode')}
        value={String(d.code_prompts)}
        hint={t('ai.libraryDashboard.kpiCodeHint', { vars: { system: d.system_prompts, user: d.user_prompts } })}
      />
    ),
    kpi(
      'ai',
      3,
      <StatCard
        sx={{ height: '100%' }}
        icon={<AutoAwesomeIcon fontSize="small" />}
        label={t('ai.libraryDashboard.kpiAi')}
        value={String(d.ai_prompts)}
        hint={t('ai.libraryDashboard.kpiAiHint', { vars: { active: d.active_ai_prompts } })}
      />
    ),
    kpi(
      'edited',
      6,
      <StatCard
        sx={{ height: '100%' }}
        icon={<EditNoteIcon fontSize="small" />}
        label={t('ai.libraryDashboard.kpiEdited')}
        value={String(d.edited_code_prompts)}
        hint={t('ai.libraryDashboard.kpiEditedHint')}
      />
    ),
    kpi(
      'coverage',
      9,
      <StatCard
        sx={{ height: '100%' }}
        icon={<LinkIcon fontSize="small" />}
        label={t('ai.libraryDashboard.kpiCoverage')}
        value={t('ai.libraryDashboard.kpiCoverageValue', {
          vars: { covered: d.features_with_prompt, total: d.features_total },
        })}
        hint={t('ai.libraryDashboard.kpiCoverageHint')}
      />
    ),
  ];
}
