#!/usr/bin/env bash
# Runs `test:coverage` for every pnpm workspace matched by the given filters.
#
#   scripts/ci-coverage-run.sh <label> <pnpm-filter> [pnpm-filter...]
#
# WHY THIS EXISTS
# ---------------
# Two workflows need the exact same thing — sonar.yml (which feeds the scanner)
# and coverage.yml (which feeds Codecov and the PR comment). This was inlined in
# sonar.yml, and a second copy in coverage.yml would be two places for "how a
# workspace's coverage is produced" to drift (rule 34).
#
# CONTRACT: this script NEVER fails the step. Coverage is evidence, not a gate —
# a workspace whose own threshold is unmet, or whose suites are red, must still
# hand up the lcov it did write (every vitest config here sets
# `reportOnFailure: true` for precisely that reason). A non-zero exit would throw
# the other workspaces' reports away with it.
#
# MACHINE-READABLE RESULTS. Beside each log, the run also leaves
# `<results>/<workspace>.unit.json` for the Tests console (tests.duncit.com):
# the runner's own JSON report, test by test, compacted with the coverage the
# workspace wrote (scripts/report-unit-run.mjs meta). The flags that ask for it
# are APPENDED to the workspace's own `test:coverage` — no `--` separator,
# because pnpm forwards whatever follows the script name and a literal `--`
# would turn vitest's flags into file filters. The default reporter (and, on
# Actions, the github-actions one vitest adds by itself when no reporter is
# named) stays, so the log and the ratchet that reads it are unchanged.
#
# Env:
#   COVERAGE_TIMEOUT      per-workspace time box (default 60m)
#   COVERAGE_LOG_DIR      where the full per-workspace logs are written (default test-logs)
#   COVERAGE_RESULTS_DIR  where the per-workspace results go (default <log dir>/results)
set +e

LABEL="$1"
shift

TIMEOUT="${COVERAGE_TIMEOUT:-60m}"
LOG_DIR="${COVERAGE_LOG_DIR:-test-logs}"
mkdir -p "$LOG_DIR"
RESULTS_DIR="${COVERAGE_RESULTS_DIR:-$LOG_DIR/results}"
mkdir -p "$RESULTS_DIR"
# Absolute, because each runner writes its report from its own workspace dir.
RESULTS_ABS=$(cd "$RESULTS_DIR" && pwd)
REPORTER="$(cd "$(dirname "$0")" && pwd)/report-unit-run.mjs"

# Resolve the filters to workspace names (and their directories) through pnpm
# itself, so a new package under ./packages is picked up with no edit here.
args=()
for f in "$@"; do args+=(--filter "$f"); done
mapfile -t WORKSPACES < <(pnpm list -r --depth -1 --json "${args[@]}" |
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
    for (const w of JSON.parse(s)) if (w.path && w.name) console.log(w.name + "\t" + w.path);
  })')

echo "group $LABEL: ${#WORKSPACES[@]} workspace(s): ${WORKSPACES[*]%%$'\t'*}"

failed=()
for entry in "${WORKSPACES[@]}"; do
  ws="${entry%%$'\t'*}"
  wsdir="${entry#*$'\t'}"
  # Each workspace is time-boxed so one hang cannot eat the group.
  slug=$(printf '%s' "$ws" | tr -c 'A-Za-z0-9._-' '_')
  raw="$RESULTS_ABS/$slug.raw.json"
  rm -f "$raw"
  runner=$(node "$REPORTER" runner "$wsdir" 2>/dev/null)
  extra=()
  case "$runner" in
    vitest)
      extra=(--reporter=default --reporter=json "--outputFile.json=$raw")
      if [ "$GITHUB_ACTIONS" = "true" ]; then extra+=(--reporter=github-actions); fi
      ;;
    jest) extra=(--json "--outputFile=$raw") ;;
    *) runner=none ;;
  esac
  started=$(date +%s%3N)
  timeout "$TIMEOUT" pnpm --filter "$ws" --if-present test:coverage "${extra[@]}" > "/tmp/cov-$$.log" 2>&1
  code=$?
  elapsed=$(( $(date +%s%3N) - started ))
  # Best-effort: the reporter never fails, and a missing results file only
  # means the console shows this workspace as unreported.
  node "$REPORTER" meta --dir "$wsdir" --workspace "$ws" --group "$LABEL" --runner "$runner" \
    --exit "$code" --duration-ms "$elapsed" --raw "$raw" --out "$RESULTS_ABS/$slug.unit.json"
  # Keep the FULL output for EVERY workspace, colour codes stripped. The
  # summaries below are cut to 160 chars and de-duplicated, which shows THAT a
  # suite died but never why — the stack frame naming the missing provider is
  # exactly the part that gets cut off.
  plain="$LOG_DIR/$slug.log"
  sed 's/\x1b\[[0-9;]*m//g' "/tmp/cov-$$.log" > "$plain"
  if [ $code -ne 0 ]; then
    failed+=("$ws($code)")
    echo "::group::coverage FAILED $ws (exit $code)"
    # A suite that DIES contributes no coverage for everything it would have
    # exercised, so the list of failing suites IS the coverage gap. jest and
    # vitest both print "FAIL <path>", so one grep serves every workspace.
    echo "--- failing suites ---"
    grep -a 'FAIL' "$plain" | sed 's/^[[:space:]]*//' | cut -c1-160 | sort -u | head -200
    echo "--- error headlines ---"
    grep -aE 'Error:|Error :|Invariant|Unable to find|Cannot find|not a function|No QueryClient|not wrapped' "$plain" |
      sed 's/^[[:space:]]*//' | cut -c1-160 | sort | uniq -c | sort -rn | head -40
    echo "--- totals / thresholds ---"
    grep -aE 'Test Suites:|Tests:|Test Files|does not meet|ERROR: Coverage' "$plain" | tail -20
    echo "::endgroup::"
  else
    echo "ok   $ws"
  fi
done

if [ ${#failed[@]} -gt 0 ]; then
  echo "::warning::coverage run did not succeed for: ${failed[*]}"
fi
exit 0
