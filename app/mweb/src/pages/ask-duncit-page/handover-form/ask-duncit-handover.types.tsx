/**
 * The handover contract lives in @duncit/forms/schemas: mWeb and the native
 * app ask for the same team and summary before a conversation becomes a
 * support ticket. Re-exported so the form folder keeps its shape.
 */
export {
  askDuncitHandoverDefaults,
  makeAskDuncitHandoverSchema,
  type AskDuncitHandoverValues,
} from '@duncit/forms/schemas';
