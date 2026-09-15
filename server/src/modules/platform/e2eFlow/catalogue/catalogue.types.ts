/**
 * The shape of the flow catalogue the server seeds into Tech > E2E Tests > Flows.
 *
 * A step is a pair — what the person does, then what should happen — so each
 * catalogue file reads like the test script it documents.
 */
export type CatalogueStep = readonly [action: string, expected: string];

export interface CatalogueSubFlow {
  name: string;
  description: string;
  steps: readonly CatalogueStep[];
}

export interface CatalogueFlow {
  name: string;
  description: string;
  sub_flows: readonly CatalogueSubFlow[];
}
