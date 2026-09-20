// Writes WHY a SonarQube quality gate failed into the GitHub job summary.
//
// sonar.yml scans with sonar.qualitygate.wait=true, so a failed gate fails
// "Build and analyze" — the check a PR shows. The scanner itself prints only a
// dashboard link, and the server forces authentication, so without this a red
// PR check explains nothing to anyone without a SonarQube login.
//
// It reads the analysis THIS scan published (through the scanner's
// report-task.txt), never "the project's current status": Community Build keeps
// one analysis per project, and a concurrent staging, main or PR scan can
// replace it before this step runs.
//
// Usage (CI): SONAR_HOST_URL=… SONAR_TOKEN=… node scripts/sonar-gate-report.mjs
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const REPORT_TASK = '.scannerwork/report-task.txt';
const LIST_LIMIT = 100;
const FILE_LIMIT = 25;
// A failed condition -> the per-file measure that says where to look.
const FILE_MEASURE = new Map([
  ['new_coverage', 'new_uncovered_lines'],
  ['new_line_coverage', 'new_uncovered_lines'],
  ['new_branch_coverage', 'new_uncovered_conditions'],
  ['new_duplicated_lines_density', 'new_duplicated_lines'],
  ['new_security_hotspots_reviewed', 'new_security_hotspots'],
]);

const { SONAR_HOST_URL, SONAR_TOKEN, GITHUB_STEP_SUMMARY } = process.env;
const lines = [];

async function api(path) {
  const res = await fetch(new URL(path, SONAR_HOST_URL), {
    headers: { authorization: `Bearer ${SONAR_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`SonarQube ${path} answered HTTP ${res.status}`);
  }
  return res.json();
}

function readReportTask() {
  const entries = readFileSync(REPORT_TASK, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.includes('='))
    .map((line) => {
      const at = line.indexOf('=');
      return [line.slice(0, at), line.slice(at + 1)];
    });
  return Object.fromEntries(entries);
}

function table(header, rows) {
  const divider = header.map(() => '---').join(' | ');
  lines.push(`| ${header.join(' | ')} |`, `| ${divider} |`);
  for (const row of rows) {
    const cells = row.map((cell) => String(cell).replaceAll('|', String.raw`\|`));
    lines.push(`| ${cells.join(' | ')} |`);
  }
  lines.push('');
}

// `projectKey:path/to/file.ts` -> `path/to/file.ts:42`
function location(item) {
  const file = item.component.slice(item.component.indexOf(':') + 1);
  return item.line ? `${file}:${item.line}` : file;
}

async function reportConditions(analysisId) {
  const { projectStatus } = await api(`/api/qualitygates/project_status?analysisId=${analysisId}`);
  const failed = projectStatus.conditions.filter((condition) => condition.status === 'ERROR');
  const rows = failed.map((condition) => {
    const bound = condition.comparator === 'GT' ? '<=' : '>=';
    return [condition.metricKey, condition.actualValue, `${bound} ${condition.errorThreshold}`];
  });
  lines.push(`## :x: SonarQube quality gate: ${projectStatus.status}`, '');
  table(['Condition (new code)', 'Actual', 'Required'], rows);
  return failed.map((condition) => condition.metricKey);
}

async function reportIssues(projectKey) {
  const query = `componentKeys=${projectKey}&inNewCodePeriod=true&issueStatuses=OPEN,CONFIRMED&ps=${LIST_LIMIT}`;
  const { total, issues } = await api(`/api/issues/search?${query}`);
  if (total === 0) return;
  lines.push(`### Open issues on new code (${total})`, '');
  table(
    ['Rule', 'Where', 'Message'],
    issues.map((issue) => [issue.rule, location(issue), issue.message]),
  );
}

async function reportFiles(projectKey, metric) {
  const query = `component=${projectKey}&qualifiers=FIL&metricKeys=${metric}&s=metricPeriod&metricSort=${metric}&metricPeriod=1&asc=false&metricSortFilter=withMeasuresOnly&ps=${FILE_LIMIT}`;
  const { components } = await api(`/api/measures/component_tree?${query}`);
  const rows = components
    .map((component) => [component.path, Number(component.measures[0]?.period?.value ?? 0)])
    .filter(([, value]) => value > 0);
  if (rows.length === 0) return;
  lines.push(`### Files with the most \`${metric}\``, '');
  table(['File', metric], rows);
}

async function reportAnalysis({ projectKey, ceTaskId, dashboardUrl }) {
  const { task } = await api(`/api/ce/task?id=${ceTaskId}`);
  if (!task.analysisId) {
    lines.push(
      '## :x: SonarQube did not finish processing the report',
      '',
      `Background task \`${ceTaskId}\` is \`${task.status}\`. ${task.errorMessage ?? ''}`,
    );
    return;
  }
  const failed = await reportConditions(task.analysisId);
  // No hotspot list: the CI analysis token is refused /api/hotspots/search
  // (HTTP 403). The measures API is not, so a failed
  // new_security_hotspots_reviewed reports the FILES holding the hotspots
  // instead (FILE_MEASURE) — without that the condition names no file at
  // all, and a hotspot has to be reviewed in the SonarQube UI to be found.
  await reportIssues(projectKey);
  const measures = new Set(failed.map((metric) => FILE_MEASURE.get(metric)).filter(Boolean));
  for (const metric of measures) {
    await reportFiles(projectKey, metric);
  }
  lines.push(`[Open the analysis in SonarQube](${dashboardUrl})`);
}

// `finally`: a refused or failed call later in the report must not throw away
// the sections already read — the failed conditions come first for a reason.
try {
  if (existsSync(REPORT_TASK)) {
    await reportAnalysis(readReportTask());
  } else {
    lines.push(
      '## :x: The SonarQube scan failed before publishing',
      '',
      'No report was uploaded, so no quality gate was evaluated — the cause is in the scan step log above.',
    );
  }
} finally {
  const report = lines.join('\n');
  console.log(report);
  appendFileSync(GITHUB_STEP_SUMMARY, `${report}\n`);
}
