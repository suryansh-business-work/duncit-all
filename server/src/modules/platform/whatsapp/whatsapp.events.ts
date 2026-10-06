/**
 * The catalogue of every WhatsApp message Duncit sends on its own: the
 * scenario, the AiSensy campaign behind it, and one label per placeholder, in
 * order. The template BODY is never here — bodies, arity and approval state
 * come live from AiSensy's Project API (`aisensy.project.ts`).
 *
 * The data is GENERATED from `@duncit/communication`'s `src/wa-events.ts` into
 * `whatsapp.events.generated.ts` (`node scripts/generate-wa-events.mjs`):
 * `server/src` imports zero `@duncit/*` packages by design (project rule 40),
 * so the registry travels as a generated copy instead of a hand-kept mirror.
 * Edit the package, regenerate, never this module.
 */
export * from './whatsapp.events.generated';
