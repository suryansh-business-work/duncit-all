/* eslint-disable no-console */
/**
 * Every automatic WhatsApp scenario, checked against the code around it.
 *
 * Three things have to line up, and none of them is visible to `tsc`:
 *
 *  1. THE MIRROR. `whatsapp.events.ts` is a hand-kept copy of
 *     `@duncit/communication`'s `wa-events.ts` — the server imports no
 *     `@duncit/*` package (rule 40), so the registry exists twice. A campaign
 *     renamed on one side and not the other sends to a campaign AiSensy does
 *     not have, and the console labels it from the other copy.
 *
 *  2. THE ARITY. A send fills `params` positionally. Too few and AiSensy
 *     refuses the message outright ("Template param count mismatch!"); where it
 *     does not, the recipient reads a literal `{{7}}` in a message that was
 *     still billed. `paramError` catches it at RUN time, one message at a time.
 *
 *  3. THE EMAIL LEG. `notifyEvent` names a WhatsApp event's positional values
 *     from its catalogue row's `vars`, in order. A row with fewer vars than the
 *     event has params silently drops the tail.
 *
 * The template BODY is deliberately not checked here: bodies, approval state
 * and header format live at AiSensy, and the Automation tab reads them live per
 * row. This is the half that can be known from the repo alone.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { WA_EVENTS, type WaEvent } from '@modules/platform/whatsapp/whatsapp.events';
import { EMAIL_BY_WA_EVENT } from '@services/email/catalogue';

const REPO = path.resolve(__dirname, '..', '..');
const SERVER_SRC = path.join(REPO, 'server', 'src');
const MIRROR = path.join(REPO, 'packages', 'communication', 'src', 'wa-events.ts');
const REGISTRY_FILE = path.join(SERVER_SRC, 'modules', 'platform', 'whatsapp', 'whatsapp.events.ts');
const CATALOGUE_DIR = path.join(SERVER_SRC, 'services', 'email', 'catalogue');

/**
 * Scenarios that deliberately have no send site.
 *
 * Both are the "ask my club admin for help" action, which does not reach the
 * server at all — the template and the catalogue row exist ahead of the
 * feature. `generate-email-doc.ts` says the same thing in the docs table; this
 * is the machine-readable half, so the gate does not fail on a known gap.
 */
const UNWIRED = new Set(['CLUB_ADMIN_HOST_HELP', 'CLUB_ADMIN_VENUE_HELP']);

const problems: string[] = [];
const notes: string[] = [];
const fail = (message: string) => problems.push(message);

const serverByKey = new Map(WA_EVENTS.map((event) => [event.key, event]));
const rel = (file: string) => path.relative(REPO, file).split(path.sep).join('/');

// --- 1. the package mirror --------------------------------------------------

/** The package's registry, compiled in memory — it is plain TS with no imports
 * of its own, which is exactly why it can be read this way. */
function loadMirror(): WaEvent[] {
  const js = ts.transpileModule(fs.readFileSync(MIRROR, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const shell: { exports: Record<string, unknown> } = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('exports', 'module', 'require', js)(shell.exports, shell, require);
  return (shell.exports.WA_EVENTS as WaEvent[]) ?? [];
}

function compareScenario(key: string, ours: WaEvent, theirs: WaEvent): void {
  for (const field of ['campaign', 'audience', 'category', 'fires'] as const) {
    if (ours[field] !== theirs[field]) {
      fail(`mirror ${key}: ${field} is "${ours[field]}" on the server, "${theirs[field]}" in the package`);
    }
  }
  if (ours.params.length !== theirs.params.length) {
    fail(
      `mirror ${key}: ${ours.params.length} param(s) on the server, ${theirs.params.length} in the package`
    );
    return;
  }
  ours.params.forEach((param, index) => {
    if (param !== theirs.params[index]) {
      fail(`mirror ${key}: param ${index + 1} is "${param}" here and "${theirs.params[index]}" there`);
    }
  });
}

function checkMirror(): void {
  const mirrorByKey = new Map(loadMirror().map((event) => [event.key, event]));
  for (const key of serverByKey.keys()) {
    if (!mirrorByKey.has(key)) fail(`mirror: @duncit/communication has no scenario ${key}`);
  }
  for (const key of mirrorByKey.keys()) {
    if (!serverByKey.has(key)) fail(`mirror: the server registry has no scenario ${key}`);
  }
  for (const [key, ours] of serverByKey) {
    const theirs = mirrorByKey.get(key);
    if (!theirs) continue;
    compareScenario(key, ours, theirs);
  }
}

// --- 2. send sites ----------------------------------------------------------

function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== 'generated') walk(full);
      } else if (entry.name.endsWith('.ts')) {
        found.push(full);
      }
    }
  };
  walk(SERVER_SRC);
  return found;
}

/** Every string-literal value of a same-file `const NAME = { … }`. */
function mapValues(source: ts.SourceFile, name: string): string[] {
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const prop of node.initializer.properties) {
        if (ts.isPropertyAssignment(prop) && ts.isStringLiteralLike(prop.initializer)) {
          out.push(prop.initializer.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

/** Every same-file object-literal property of that name whose value is a
 * string — how a factory like `waEventsFor(kind).booked` is resolved. */
function propertyValues(source: ts.SourceFile, name: string): string[] {
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText() === name &&
      ts.isStringLiteralLike(node.initializer)
    ) {
      out.push(node.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

/**
 * Which scenarios a send site can actually address.
 *
 * Half the call sites reach their key indirectly — a ternary, a lookup map, a
 * factory — and an arity check that gave up on those would cover a third of the
 * catalogue. Each shape resolves to the SET of keys that can arrive, and every
 * one of them has to match the values the site fills.
 */
function keysAddressed(expr: ts.Expression, source: ts.SourceFile): string[] | null {
  if (ts.isStringLiteralLike(expr)) return [expr.text];
  if (ts.isConditionalExpression(expr)) {
    const whenTrue = keysAddressed(expr.whenTrue, source);
    const whenFalse = keysAddressed(expr.whenFalse, source);
    return whenTrue && whenFalse ? [...whenTrue, ...whenFalse] : null;
  }
  if (ts.isElementAccessExpression(expr) && ts.isIdentifier(expr.expression)) {
    const values = mapValues(source, expr.expression.text);
    return values.length > 0 ? values : null;
  }
  if (ts.isPropertyAccessExpression(expr)) {
    const values = propertyValues(source, expr.name.text);
    return values.length > 0 ? values : null;
  }
  return null;
}

function checkArity(
  keys: readonly string[],
  paramsProp: ts.PropertyAssignment,
  where: string,
  line: number,
  reached: Set<string>
): void {
  const known: WaEvent[] = [];
  for (const key of keys) {
    const event = serverByKey.get(key);
    if (!event) {
      fail(`${where}:${line} sends unknown scenario "${key}"`);
      continue;
    }
    known.push(event);
    reached.add(key);
  }
  if (known.length === 0) return;

  const init = paramsProp.initializer;
  if (!ts.isArrayLiteralExpression(init)) {
    notes.push(`${where}:${line} builds its params dynamically — arity not checkable`);
    return;
  }
  if (init.elements.some((element) => ts.isSpreadElement(element))) {
    notes.push(`${where}:${line} spreads into its params — arity not checkable`);
    return;
  }
  const filled = init.elements.length;
  const wrong = known.filter((event) => event.params.length !== filled);
  if (wrong.length > 0) {
    const detail = wrong.map((event) => `${event.key} declares ${event.params.length}`).join('; ');
    fail(`${where}:${line} fills ${filled} value(s), but ${detail}`);
  }
}

function checkSendSites(): Set<string> {
  const reached = new Set<string>();
  let sites = 0;
  let unresolved = 0;

  for (const file of sourceFiles()) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    const where = rel(file);

    const applyObjectSite = (node: ts.ObjectLiteralExpression): void => {
      // Shorthand counts: `params,` is a ShorthandPropertyAssignment, and
      // matching only PropertyAssignment skipped those sites in silence.
      const named = (key: string) =>
        node.properties.find(
          (p) =>
            (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
            p.name.getText() === key
        );
      const eventProp = named('event');
      const paramsProp = named('params');
      if (!eventProp || !paramsProp) return;
      sites += 1;
      const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const keys = ts.isPropertyAssignment(eventProp)
        ? keysAddressed(eventProp.initializer, source)
        : null;
      if (keys && ts.isPropertyAssignment(paramsProp)) {
        checkArity(keys, paramsProp, where, line, reached);
        return;
      }
      unresolved += 1;
      notes.push(`${where}:${line} addresses its scenario indirectly — arity not checkable`);
    };

    const visit = (node: ts.Node): void => {
      // ANY object literal carrying both `event` and `params` is a send: the
      // scheduler builds its NotifyInputs inside a .map() and hands the array
      // to notifyEach, so keying off the call expression finds a fraction.
      if (ts.isObjectLiteralExpression(node)) applyObjectSite(node);
      if (ts.isCallExpression(node) && node.arguments.length >= 2) {
        const keys = keysAddressed(node.arguments[0] as ts.Expression, source);
        const values = node.arguments.find((arg) => ts.isArrayLiteralExpression(arg));
        // arg0 has to resolve to real scenarios, which is what keeps this from
        // matching every two-argument call in the server.
        if (keys && values && keys.some((key) => serverByKey.has(key))) {
          sites += 1;
          const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          const shim = ts.factory.createPropertyAssignment('params', values);
          checkArity(keys, shim, where, line, reached);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  notes.push(`${sites} send site(s); ${unresolved} could not be resolved to a scenario`);
  return reached;
}

// --- 3. every scenario is reachable ----------------------------------------

/**
 * A scenario nothing names is a template nobody can send.
 *
 * Textual on purpose for the ones no send site resolved to: a key handed to a
 * helper as an argument is wired, and an AST walk cannot see that without real
 * dataflow. "Is this key written down anywhere outside the two catalogues" is
 * the honest question, and it is the one that catches a deleted call site.
 */
function checkReachable(reached: Set<string>): void {
  const bodies = sourceFiles()
    .filter((file) => file !== REGISTRY_FILE && !file.startsWith(CATALOGUE_DIR))
    .map((file) => fs.readFileSync(file, 'utf8'));

  for (const event of WA_EVENTS) {
    if (reached.has(event.key) || UNWIRED.has(event.key)) continue;
    const named = bodies.some(
      (body) => body.includes(`'${event.key}'`) || body.includes(`"${event.key}"`)
    );
    if (!named) {
      fail(`scenario ${event.key} ("${event.campaign}") is named nowhere in server/src — nothing can fire it`);
    }
  }
  for (const key of UNWIRED) {
    if (!serverByKey.has(key)) {
      fail(`UNWIRED names ${key}, which is not a scenario — drop it from this script`);
    }
  }
}

// --- 4. the email leg -------------------------------------------------------

function checkEmailLeg(): void {
  for (const [key, row] of EMAIL_BY_WA_EVENT) {
    const event = serverByKey.get(key);
    if (!event) {
      fail(`email "${row.slug}" links waEvent ${key}, which is not a scenario`);
      continue;
    }
    if (row.vars.length < event.params.length) {
      fail(
        `email "${row.slug}" declares ${row.vars.length} var(s); ${key} fills ${event.params.length} positionally, so the tail is dropped`
      );
    }
  }
}

// --- report -----------------------------------------------------------------

checkMirror();
checkReachable(checkSendSites());
checkEmailLeg();

const campaigns = new Set(WA_EVENTS.map((event) => event.campaign));
console.log(
  `check-whatsapp: ${WA_EVENTS.length} scenario(s), ${campaigns.size} campaign(s), ${EMAIL_BY_WA_EVENT.size} with an email leg`
);
for (const note of notes) console.log(`  · ${note}`);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}
console.log('\nno drift: mirror, send sites and email legs all agree with the registry');
