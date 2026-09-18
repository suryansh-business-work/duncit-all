import { sonarPageUrl, type SonarConfig, type SonarParams } from '@utils/sonarqube';
import { externalLink } from './links';
import { linkEverything, linkWidgets, type EntityAnalyticsSections } from './shapes';

/**
 * Where in SonarQube's own UI each Security and Coverage widget's detail lives
 * — the issues list filtered to that quality, the hotspot review, a measure
 * drilled down by folder. Keyed by widget key; anything unlisted opens the
 * project dashboard.
 */

interface SonarPage {
  path: string;
  params?: SonarParams;
}

const OPEN = 'OPEN,CONFIRMED';
const issues = (quality?: string): SonarPage => ({
  path: '/project/issues',
  params: quality ? { issueStatuses: OPEN, impactSoftwareQualities: quality } : { issueStatuses: OPEN },
});
const measure = (metric: string): SonarPage => ({ path: '/component_measures', params: { metric } });

const SONAR_PAGES: Readonly<Record<string, SonarPage>> = {
  sonar_security_issues: issues('SECURITY'),
  sonar_security_rating: issues('SECURITY'),
  sonar_security: issues('SECURITY'),
  sonar_hotspots: { path: '/security_hotspots' },
  sonar_hotspots_reviewed: { path: '/security_hotspots' },
  sonar_reliability_issues: issues('RELIABILITY'),
  sonar_maintainability_issues: issues('MAINTAINABILITY'),
  sonar_quality: issues(),
  sonar_issues_by_quality: issues(),
  sonar_issues_by_severity: issues(),
  sonar_top_rules: issues(),
  sonar_duplication: measure('duplicated_lines_density'),
  sonar_issues_by_area: measure('violations'),
  sonar_workspaces: measure('violations'),
  cov_overall: measure('coverage'),
  cov_trend: measure('coverage'),
  cov_by_area: measure('coverage'),
  cov_bands: measure('coverage'),
  cov_lines: measure('line_coverage'),
  cov_branches: measure('branch_coverage'),
  cov_new_code: measure('new_coverage'),
  cov_lines_to_cover: measure('lines_to_cover'),
  cov_uncovered_lines: measure('uncovered_lines'),
  cov_uncovered: measure('uncovered_lines'),
  cov_uncovered_by_area: measure('uncovered_lines'),
  cov_workspaces: measure('uncovered_lines'),
  cov_uncovered_conditions: measure('uncovered_conditions'),
};

/** Every widget linked to its SonarQube page, the rest to the project dashboard. */
export function linkToSonar(sections: EntityAnalyticsSections, cfg: SonarConfig): EntityAnalyticsSections {
  const at = (page: SonarPage) => externalLink(sonarPageUrl(cfg, page.path, page.params));
  const linked = linkWidgets(sections, (key) => {
    const page = SONAR_PAGES[key];
    return page ? at(page) : null;
  });
  return linkEverything(linked, at({ path: '/dashboard' }));
}
