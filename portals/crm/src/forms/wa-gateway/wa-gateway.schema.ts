/**
 * Step 1 of the WhatsApp Lead Generator: the OpenWA gateway URL and its API key —
 * the shared rule (@duncit/forms/schemas), which the Duncit CRM app checks with too.
 * The key is required until one is saved; after that a blank field keeps it.
 */
export {
  WA_API_KEY_MAX,
  makeWaGatewaySchema as waGatewaySchema,
  type WaGatewayValues as WaGatewayFormValues,
} from '@duncit/forms/schemas';
