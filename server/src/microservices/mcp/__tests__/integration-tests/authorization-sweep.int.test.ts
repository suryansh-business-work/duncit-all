import type { Request, Response } from 'express';
import { ApolloServer } from '@apollo/server';
import {
  getNullableType,
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
  type GraphQLFormattedError,
  type GraphQLInputType,
} from 'graphql';
import type { AuthUser, GraphQLContext } from '@context';
import { resolvers, typeDefs, typeDefsByModule } from '@modules';
import { NO_CONSENT } from '@utils/consent';
import { enableProducts } from '@test/feature-flags';
import { buildGraphQLTools } from '../../catalog/build';
import { reachableCategories } from '../../catalog/visibility';
import type { GraphQLTool } from '../../tools/tool.types';

/**
 * Every mutation an MCP tool can run, run for real against the assembled
 * schema — once with nobody signed in, once as a plain member — to prove the
 * resolver itself refuses what the caller may not do. The MCP layer hides
 * console tools from people without the console (visibility.ts), but that is
 * a listing rule: the resolver's own check is what holds against a raw
 * GraphQL request, a mis-filed category or a future connector.
 *
 *   • Nobody signed in: every mutation must answer UNAUTHENTICATED or
 *     FORBIDDEN, except the public ones listed below with why.
 *   • A plain member (USER + MCP_USER): every mutation in a category none of
 *     a member's connectors serve must answer FORBIDDEN, except the few listed.
 *
 * Variables are the smallest values the schema accepts, so a resolver that
 * checks permissions first is refused before it ever reads them. A mutation
 * that answers anything else (NOT_FOUND, BAD_USER_INPUT, data…) got past the
 * door; the failure message names each one with what it answered.
 */

jest.setTimeout(15 * 60_000);

const allow = (reason: string, fields: readonly string[]): Record<string, string> =>
  Object.fromEntries(fields.map((field) => [field, reason]));

const PET_STORE_SHOPPER = [
  'storeAddToCart',
  'storeApplyCoupon',
  'storeCancelOrder',
  'storeClearCart',
  'storeCreateSupportTicket',
  'storePlaceOrder',
  'storeRecordView',
  'storeRequestReturn',
  'storeSetCartQty',
  'storeSubscribeStockAlert',
  'storeToggleWishlist',
  'storeVerifyPayment',
];
const CAPTCHA_FORMS = ['submitContactForm', 'submitFaqQuestion', 'submitGrievance', 'submitStatusReport', 'subscribeNewsletter'];
const ANALYTICS_PINGS = ['recordActivePing', 'recordAppEvents', 'recordShortLinkJourney'];
const TABLE_FOOD_ORDERING = ['placeVenueFoodOrder', 'verifyVenueFoodOrderPayment', 'submitVenueFoodFeedback', 'venueFoodFeedbackUploadPass'];

/**
 * Public by design: a person who is not signed in uses these. Each answer in
 * the sweep was read: none acts on anyone's account (guest carts are keyed by
 * their own secret, orders by their access key, forms by a captcha).
 */
const PUBLIC_MUTATIONS: Readonly<Record<string, string>> = {
  ...allow('pet store (ecomm.duncit.com) guest shopping — a cart, order or return is keyed by its own secret', PET_STORE_SHOPPER),
  ...allow('public form behind a captcha', CAPTCHA_FORMS),
  ...allow('anonymous product analytics — writes only its own event', ANALYTICS_PINGS),
  ...allow('ordering food at a venue table from its QR code; rate-limited by the Venue food rules', TABLE_FOOD_ORDERING),
  incrementPodHits: 'a pod page view counter',
  sharePodIdea: 'counts a share of a public pod idea',
  shareLink: 'resolves a public short link',
  submitJobApplication: 'the careers page — applying needs no account',
  unsubscribeNewsletter: 'the unsubscribe link in a newsletter, keyed by its own token',
};

const CHALLENGE_PLAY = [
  'answerPodChallengeQuiz',
  'buzzPodChallenge',
  'castPodChallengePoll',
  'castPodChallengeVote',
  'controlPodChallengeBuzzer',
  'controlPodChallengeClock',
  'controlPodChallengeQuiz',
  'createPodChallenge',
  'judgePodChallengeCompetitor',
  'pickPodChallengeRandom',
  'publishPodChallengeResult',
  'ratePodChallengeCompetitor',
  'reachPodChallengeCheckpoint',
  'recordPodChallengeScore',
  'removePodChallengeEntry',
  'sendPodChallengeNotice',
  'setPodChallengeItem',
  'setPodChallengeRoster',
  'setPodChallengeRound',
  'setPodChallengeVoting',
  'submitPodChallengeEntry',
  'transitionPodChallenge',
];
const MEMBER_CHECKOUT = [
  'createRazorpayGiftCardOrder',
  'createRazorpayOrder',
  'createRazorpayProductOrder',
  'dummyCheckout',
  'dummyGiftCardCheckout',
  'dummyProductCheckout',
];
const OWN_ACCOUNT = [
  'cancelMyAccountDeletionRequest',
  'submitAccountDeletionRequest',
  'submitAddressVerification',
  'submitVerification',
  'requestPortalAccess',
  'redeemGiftCard',
  'redeemPhysicalGiftCard',
  'requestWithdrawal',
  'setAllMyMailPreferences',
  'setAllMyWhatsappPreferences',
  'setMyMailPreference',
  'setMyWhatsappPreference',
  'subscribeLocationLaunch',
  'dismissAppPopup',
  'submitAppFeedback',
];
const OWN_WORKSPACE = [
  'cancelBackgroundJob',
  'clearFinishedBackgroundJobs',
  'dismissBackgroundJob',
  'resetDashboardLayout',
  'saveDashboardLayout',
  'saveShellWorkspaceState',
  'startBulkDelete',
];
const MEMBER_UPLOADS = ['getImagekitAuth', 'importRemoteImageToImagekit', 'importRemoteMediaToImagekit', 'startVideoCompression'];
const REPORTING = ['reportChatMessage', 'reportPost', 'reportProfile', 'moderatePodContent', 'moderateProductContent'];

/**
 * Member-facing mutations filed under a console category, each read in the
 * sweep: the resolver acts only on the caller's own account, or loads the
 * record and checks the caller belongs to it (a fake id answers NOT_FOUND).
 */
const MEMBER_MUTATIONS: Readonly<Record<string, string>> = {
  ...allow('pet store shopping and Autoship for a signed-in buyer — their own cart, orders and subscriptions', [
    'storeCancelSubscription',
    'storeCreateSubscription',
    'storeMergeGuest',
    'storePauseSubscription',
    'storeSkipSubscription',
    'storeSubmitReview',
    'storeSubscriptionOrderNow',
    'storeUpdateSubscription',
  ]),
  ...allow('pod challenges: players and hosts act on a challenge they belong to (checked after it loads)', CHALLENGE_PLAY),
  ...allow('checking out their own booking, gift card or shop order (dummy mode only when Finance switched it on)', MEMBER_CHECKOUT),
  ...allow('their own account, wallet, verification and preferences', OWN_ACCOUNT),
  ...allow('their own background jobs and console layout; bulk delete checks the table’s roles itself', OWN_WORKSPACE),
  ...allow('uploads by the signed-in person; remote imports only from Pexels, Unsplash and ImageKit', MEMBER_UPLOADS),
  ...allow('reporting content, and the content check run before posting', REPORTING),
  ...allow('booking, moving or cancelling their own onboarding meeting', ['requestMeeting', 'cancelMyMeeting', 'rescheduleMyMeeting']),
  recordAppEvent: 'the signed-in person’s own product analytics event',
  recordOfficialStatusView: 'marks an official status as seen by the caller',
  completePodSettlement: 'the pod’s own host settles their pod (assertPodActor); an admin must administer its city',
  publishPublicPage: 'a venue or host publishes its own public page (resolved through the caller)',
  submitSurveyResponse: 'answering a survey they were sent',
  agentChat: 'the staff Agent answers anyone signed in; it only carries out what the caller’s roles allow',
  askBotChat: 'the in-app help bot',
};

const SAMPLE_ID = '64b7f0c2a1e4c9d3f0a1b2c3';
const CALL_TIMEOUT_MS = 5_000;
const REFUSED = new Set(['UNAUTHENTICATED', 'FORBIDDEN']);
const MEMBER: AuthUser = { id: '64b7f0c2a1e4c9d3f0a1b2c9', email: 'member@duncit.test', roles: ['USER', 'MCP_USER'] };

/** The smallest value GraphQL accepts for a type: required fields only, empty lists. */
function sample(type: GraphQLInputType): unknown {
  const inner = getNullableType(type);
  if (isListType(inner)) return [];
  if (isEnumType(inner)) return inner.getValues()[0]?.value ?? null;
  if (isInputObjectType(inner)) {
    const fields = Object.values(inner.getFields()).filter((field) => isNonNullType(field.type) && field.defaultValue === undefined);
    return Object.fromEntries(fields.map((field) => [field.name, sample(field.type)]));
  }
  switch (inner.name) {
    case 'Int':
    case 'Float':
      return 1;
    case 'Boolean':
      return false;
    default:
      return SAMPLE_ID;
  }
}

interface Outcome {
  tool: GraphQLTool;
  answer: string;
}

const fakeRequest = { headers: {}, ip: '203.0.113.9', path: '/graphql', method: 'POST', get: () => undefined } as unknown as Request;
const fakeResponse = { setHeader: () => undefined, cookie: () => undefined, clearCookie: () => undefined } as unknown as Response;

function contextFor(user: AuthUser | null): GraphQLContext {
  return { req: fakeRequest, res: fakeResponse, user, device_id: null, consent: NO_CONSENT, noRedis: true, isClientGone: () => false };
}

const describeErrors = (errors: ReadonlyArray<GraphQLFormattedError>) =>
  `${String(errors[0].extensions?.code ?? 'ERROR')}: ${errors[0].message.slice(0, 120)}`;

async function attempt(apollo: ApolloServer<GraphQLContext>, tool: GraphQLTool, user: AuthUser | null): Promise<string> {
  const field = builtSchema.getMutationType()?.getFields()[tool.field];
  const variables = Object.fromEntries(
    (field?.args ?? []).filter((arg) => isNonNullType(arg.type) && arg.defaultValue === undefined).map((arg) => [arg.name, sample(arg.type)])
  );
  const run = apollo.executeOperation({ query: tool.document, operationName: tool.operationName, variables }, { contextValue: contextFor(user) });
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<'TIMEOUT'>((resolve) => {
    timer = setTimeout(() => resolve('TIMEOUT'), CALL_TIMEOUT_MS);
  });
  try {
    const response = await Promise.race([run, timeout]);
    if (response === 'TIMEOUT') return 'TIMEOUT';
    if (response.body.kind !== 'single') return 'INCREMENTAL';
    const { errors } = response.body.singleResult;
    if (!errors?.length) return 'OK';
    return errors.some((error) => REFUSED.has(String(error.extensions?.code))) ? 'REFUSED' : describeErrors(errors);
  } catch (error) {
    return `THREW: ${String(error).slice(0, 120)}`;
  } finally {
    clearTimeout(timer);
  }
}

const report = (outcomes: Outcome[]) => outcomes.map(({ tool, answer }) => `${tool.field} (${tool.category}) → ${answer}`).sort();

const { schema: builtSchema, tools } = buildGraphQLTools({ typeDefsByModule, resolvers });
const mutations = tools.filter((tool) => tool.kind === 'MUTATION');
const memberCategories = reachableCategories(MEMBER);
const consoleMutations = mutations.filter((tool) => !memberCategories.has(tool.category));

let apollo: ApolloServer<GraphQLContext>;
let anonymous: Outcome[];
let member: Outcome[];

beforeAll(async () => {
  // Partner-brand and shop mutations are refused wholesale while the product
  // flag is off — switched on, so their own permission checks are what answer.
  await enableProducts();
  apollo = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });
  await apollo.start();
  anonymous = [];
  for (const tool of mutations) anonymous.push({ tool, answer: await attempt(apollo, tool, null) });
  member = [];
  for (const tool of consoleMutations) member.push({ tool, answer: await attempt(apollo, tool, MEMBER) });
});

afterAll(async () => {
  await apollo.stop();
});

describe('authorization sweep — every MCP mutation, run for real', () => {
  it('covers the whole catalogue', () => {
    expect(mutations.length).toBeGreaterThan(300);
    expect(consoleMutations.length).toBeGreaterThan(100);
    expect(memberCategories.has('pods')).toBe(true);
    expect(memberCategories.has('finance')).toBe(false);
  });

  it('refuses every mutation to a caller who is not signed in, except the public ones', () => {
    const open = anonymous.filter(({ tool, answer }) => answer !== 'REFUSED' && !(tool.field in PUBLIC_MUTATIONS));
    expect(report(open)).toEqual([]);
  });

  it('refuses every console mutation to a plain member, except the member-facing ones', () => {
    // What anyone may do, a member may do too.
    const open = member.filter(
      ({ tool, answer }) => answer !== 'REFUSED' && !(tool.field in MEMBER_MUTATIONS) && !(tool.field in PUBLIC_MUTATIONS)
    );
    expect(report(open)).toEqual([]);
  });

  it('keeps both exception lists honest — every entry is a real mutation that really is open', () => {
    const answered = (outcomes: Outcome[]) => new Map(outcomes.map(({ tool, answer }) => [tool.field, answer]));
    const anon = answered(anonymous);
    const asMember = answered(member);
    expect(Object.keys(PUBLIC_MUTATIONS).filter((field) => anon.get(field) === undefined || anon.get(field) === 'REFUSED')).toEqual([]);
    expect(Object.keys(MEMBER_MUTATIONS).filter((field) => asMember.get(field) === undefined || asMember.get(field) === 'REFUSED')).toEqual([]);
  });
});
