/**
 * The WhatsApp Lead Generator's gateway step — the shared rule from
 * @duncit/forms/schemas, so the app refuses what the CRM portal refuses.
 */
export { makeWaGatewaySchema, type WaGatewayValues } from '@duncit/forms/schemas';

export interface WaGatewayFormProps {
  /** The saved gateway URL, prefilled. */
  initialBaseUrl: string;
  /** A key is already saved: the field may stay blank to keep it. */
  hasKey: boolean;
  submitting?: boolean;
  generating?: boolean;
  /** A save or generate error from the server, shown above the fields. */
  error?: string | null;
  /** Shown after a key was generated. */
  notice?: string | null;
  onSubmit: (values: { base_url: string; api_key: string }) => Promise<void>;
  /** Mint a key on the gateway at this (already checked) URL. */
  onGenerate: (baseUrl: string) => Promise<void>;
}
