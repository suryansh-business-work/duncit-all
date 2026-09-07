import { GraphQLError } from "graphql";
import { FeatureFlagModel } from "./settings.model";

/**
 * The one system flag that owns every product surface — the Pod Shop, the cart,
 * the catalogue, brand/warehouse (ShipRocket) registration and product orders.
 * Seeded OFF, so a fresh install ships without e-commerce until an admin turns
 * it on.
 */
export const PRODUCT_VISIBILITY_FLAG = "is_product_visible";

/**
 * Flag reads are cached for a beat: the gate runs on every product operation,
 * and a flag row changes only when an admin flips it — which busts the cache
 * outright, so the window never costs an operator their toggle.
 */
const CACHE_TTL_MS = 30_000;

const cache = new Map<string, { enabled: boolean; expires_at: number }>();

/** Drop every cached flag read — called from each write in `settingsService`. */
export function invalidateFeatureFlagCache(): void {
  cache.clear();
}

/** Whether a flag is on right now. A key with no row is off. */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const hit = cache.get(key);
  if (hit && hit.expires_at > Date.now()) return hit.enabled;
  const doc = await FeatureFlagModel.findOne({ key }, { enabled: 1 }).lean();
  const enabled = doc?.enabled === true;
  cache.set(key, { enabled, expires_at: Date.now() + CACHE_TTL_MS });
  return enabled;
}

type ResolverFn = (...args: unknown[]) => unknown;
type ResolverMap = Record<string, unknown>;

/** The refusal a gated operation answers with while its feature is off. */
const refuse = (key: string) =>
  new GraphQLError("This feature is currently unavailable.", {
    extensions: { code: "FEATURE_DISABLED", flag: key },
  });

/** How a gated map is narrowed. */
export type GateOptions = {
  /**
   * Gate only these root fields; omit to gate every field in the map. The
   * payment module owns three product-only operations beside the pod-ticket
   * ones, which must keep working with the shop off.
   */
  readonly fields?: readonly string[];
  /**
   * Root LIST reads that answer `[]` while the flag is off instead of refusing.
   *
   * A refusal is the right answer for anything the switched-off feature owns
   * outright. It is the WRONG answer for a lookup a surface OUTSIDE the feature
   * asks for: a non-null field (`[T!]!`) that throws does not fail one field —
   * GraphQL propagates the null to the query root and takes every sibling field
   * in the document down with it. `availablePodProducts` is exactly that case,
   * and "which products may I attach?" with the shop off is honestly "none".
   */
  readonly emptyList?: readonly string[];
};

/**
 * Wraps a resolver map's `Query`/`Mutation` fields behind a feature flag, so a
 * whole module goes dark from one place rather than from a guard repeated in a
 * hundred resolvers.
 *
 * Only the entry points are gated. Field resolvers on the module's own types
 * stay untouched (they can only be reached through a gated entry point), and
 * nothing internal is affected — a payment that settles or a courier webhook
 * that lands after the switch is thrown still completes.
 */
export function gateResolvers<T extends object>(
  map: T,
  key: string,
  options: GateOptions = {},
): T {
  const wanted = options.fields ? new Set(options.fields) : null;
  const answersEmpty = new Set(options.emptyList ?? []);

  const gateField = (fn: ResolverFn, empty: boolean): ResolverFn =>
    async (...args: unknown[]) => {
      if (await isFeatureEnabled(key)) return fn(...args);
      if (empty) return [];
      throw refuse(key);
    };

  const gateRoot = (root: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(root).map(([field, fn]) => {
        const gate = typeof fn === "function" && (!wanted || wanted.has(field));
        if (!gate) return [field, fn];
        return [field, gateField(fn as ResolverFn, answersEmpty.has(field))];
      }),
    );

  const source = map as ResolverMap;
  const gated: ResolverMap = { ...source };
  for (const root of ["Query", "Mutation"] as const) {
    const section = source[root] as Record<string, unknown> | undefined;
    if (section) gated[root] = gateRoot(section);
  }
  return gated as T;
}
