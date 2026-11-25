import type { WaGatewayFormValues } from './wa-gateway.schema';

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
  onSubmit: (values: WaGatewayFormValues) => void | Promise<void>;
  /** Mint a key on the gateway at this (already validated) URL. */
  onGenerate: (baseUrl: string) => void | Promise<void>;
}

export type { WaGatewayFormValues };
