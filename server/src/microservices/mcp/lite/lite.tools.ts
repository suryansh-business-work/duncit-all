import { buildSchema, getNamedType, isLeafType, isObjectType, parse, type GraphQLField } from 'graphql';
import { fieldInvocation, selectionOf } from '@modules/platform/tableApi/tableApi.operation';
import { isSelectableLeaf } from '../catalog/build';
import { deniedReason } from '../catalog/denylist';
import { clip, objectSchema } from '../catalog/json-schema';
import { withMetaParams } from '../catalog/meta-params';
import { titleOf, toolNameFor } from '../catalog/naming';
import { needsConfirmation, reachesOutside, riskOf, type OperationKind, type ToolRisk } from '../catalog/risk';
import { SCOPE_WRITE } from '../mcp.constants';
import type { CuratedTool, SkippedField } from '../tools/tool.types';
import { runLiteOperation } from './lite.client';

export const LITE_CATEGORY = 'lite';
export const LITE_ENDPOINT = 'lite';
/** Where Lite's fields are filed in mcp_audit_tools. */
const LITE_MODULE = 'duncit-lite';
const SELECTION_DEPTH = 3;

/**
 * Lite fields never exposed as tools: signing in and proving contacts belong
 * to a person at a screen, credentials stay in the Lite console, an upload
 * needs a browser, and a page view is the browser's to count.
 */
const LITE_DENIED: ReadonlyMap<string, string> = new Map([
  ...['liteRequestSignInCode', 'liteVerifySignInCode', 'liteSignInWithGoogle', 'liteRequestPhoneSignInCode', 'liteVerifyPhoneSignInCode', 'liteRequestContactCode', 'liteVerifyContact'].map(
    (field) => [field, 'signing in and proving a contact happen in the Lite app, by the person'] as const
  ),
  ...['liteEnvEntries', 'liteEnvCategories', 'liteCreateEnvEntry', 'liteUpdateEnvEntry', 'liteDeleteEnvEntry', 'liteSetDefaultEnvEntry', 'liteTestEnvEntry'].map(
    (field) => [field, 'service credentials stay in the Lite console'] as const
  ),
  ['liteUploadTicket', 'an upload needs the browser'],
  ['liteTrackEventView', 'page views are counted by the event page itself'],
  ['_lite', 'a schema placeholder'],
  ...['publicLocales', 'publicTranslations', 'publicAppSettings'].map((field) => [field, 'app plumbing for the Lite pages, not an action'] as const),
]);

/** A drawn QR is for a screen, not for an AI client. */
const includeLeaf = (field: GraphQLField<unknown, unknown>) => isSelectableLeaf(field) && field.name !== 'qr_data_url';
const noResolvers = () => false;

/** "liteCreateEvent" → "lite_create_event" (the field's own lite prefix is not repeated). */
export const liteToolName = (field: string): string => toolNameFor(LITE_CATEGORY, field.replace(/^lite(?=[A-Z])/, ''));

function selectionFor(field: GraphQLField<unknown, unknown>): string {
  const named = getNamedType(field.type);
  if (isLeafType(named)) return '';
  if (!isObjectType(named)) return ' { __typename }';
  return ` { ${selectionOf(named, 1, noResolvers, { maxDepth: SELECTION_DEPTH, includeLeaf }) || '__typename'} }`;
}

const RISK_LABEL: Record<ToolRisk, string> = { READ: 'Read-only', WRITE: 'Writes data', DESTRUCTIVE: 'Destructive' };

function describe(field: GraphQLField<unknown, unknown>, kind: OperationKind, risk: ToolRisk, confirm: boolean): string {
  const parts = [`[Duncit Lite · ${RISK_LABEL[risk]}] ${clip(field.description, 700) ?? `${titleOf(field.name.replace(/^lite/, ''))}.`}`];
  parts.push(`Runs Duncit Lite's ${kind === 'QUERY' ? 'query' : 'mutation'} \`${field.name}\` as the Lite account with the signed-in person's email, exactly as the Lite app or console would.`);
  if (risk !== 'READ') parts.push('Guests and hosts are emailed just as when it is done in Lite.');
  if (confirm) parts.push('Tell the user exactly what will happen and only call it with mcp_confirm: true after they say yes.');
  return parts.join(' ');
}

function toolFor(field: GraphQLField<unknown, unknown>, kind: OperationKind, operation: 'query' | 'mutation'): CuratedTool {
  const risk = riskOf(kind, field.name);
  const confirm = needsConfirmation(kind, field.name);
  const operationName = `McpLite_${field.name}`;
  const { signature, call } = fieldInvocation(field);
  const document = parse(`${operation} ${operationName}${signature} { ${call}${selectionFor(field)} }`);
  const argNames = field.args.map((arg) => arg.name);
  return {
    source: 'curated',
    kind: 'CURATED',
    name: liteToolName(field.name),
    title: `Lite: ${titleOf(field.name.replace(/^lite/, ''))}`,
    description: describe(field, kind, risk, confirm),
    category: LITE_CATEGORY,
    risk,
    confirm,
    outward: reachesOutside(kind, field.name),
    inputSchema: withMetaParams(objectSchema(field.args, 0), risk, confirm),
    listedOn: [LITE_ENDPOINT],
    async run(context, args) {
      const email = context.user.email?.trim();
      if (!email) throw new Error('Duncit Lite links accounts by email, and this Duncit account has none. Add an email to your Duncit account first.');
      const variables = Object.fromEntries(argNames.filter((name) => args[name] !== undefined).map((name) => [name, args[name]]));
      const data = (await runLiteOperation(document, operationName, variables, {
        email,
        duncitUserId: context.user.id,
        scope: context.scopes.includes(SCOPE_WRITE) ? 'write' : 'read',
      })) as Record<string, unknown>;
      return data[field.name];
    },
  };
}

export interface BuiltLiteTools {
  tools: CuratedTool[];
  skipped: SkippedField[];
}

/** One tool per Lite Query/Mutation field that is safe to hand an AI client, from Lite's live SDL. */
export function buildLiteTools(sdl: string): BuiltLiteTools {
  const schema = buildSchema(sdl, { assumeValidSDL: true });
  const tools: CuratedTool[] = [];
  const skipped: SkippedField[] = [];
  const roots = [
    ['QUERY', schema.getQueryType(), 'query'],
    ['MUTATION', schema.getMutationType(), 'mutation'],
  ] as const;
  for (const [kind, root, operation] of roots) {
    for (const field of Object.values(root?.getFields() ?? {})) {
      const denied = LITE_DENIED.get(field.name) ?? deniedReason(field.name);
      if (denied) {
        skipped.push({ field: field.name, kind, module: LITE_MODULE, reason: denied });
        continue;
      }
      tools.push(toolFor(field, kind, operation));
    }
  }
  return { tools, skipped };
}
