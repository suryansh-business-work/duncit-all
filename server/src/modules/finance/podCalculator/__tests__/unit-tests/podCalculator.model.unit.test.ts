/**
 * The stored shape, and the defaults that keep a non-null GraphQL type honest.
 *
 * Every pod field is non-null in the schema, so a document written before a
 * field existed must still read as a number rather than null — that is what the
 * per-path defaults are for, and reading them off the compiled schema is the
 * only way to catch one being dropped.
 */
import { PodCalculatorModel, POD_CALCULATOR_KINDS } from '../../podCalculator.model';
import { podCalculatorTypeDefs } from '../../podCalculator.schema';

const podSchema = () => (PodCalculatorModel.schema.path('pods') as any).schema;

describe('PodCalculatorModel', () => {
  it('registers under one collection for both kinds', () => {
    expect(PodCalculatorModel.modelName).toBe('PodCalculator');
    expect(POD_CALCULATOR_KINDS).toEqual(['SINGLE', 'MULTI']);
  });

  it('defaults an unset kind to MULTI and refuses anything else', () => {
    const kind = PodCalculatorModel.schema.path('kind') as any;

    expect(kind.defaultValue).toBe('MULTI');
    expect(kind.enumValues).toEqual(['SINGLE', 'MULTI']);
  });

  it('requires a name and bounds it', () => {
    const name = PodCalculatorModel.schema.path('name') as any;

    expect(name.isRequired).toBe(true);
    expect(name.options.maxlength).toBe(160);
  });

  it('gives every numeric pod field a default, so none can read null', () => {
    const numeric = [
      'pod_amount',
      'no_of_spots',
      'pod_count',
      'gst_percent',
      'platform_fee_percent',
      'venue_amount',
      'host_commission_percent',
      'venue_commission_percent',
      'club_admin_percent',
    ];

    for (const field of numeric) {
      const path = podSchema().path(field);
      expect(path).toBeDefined();
      expect(path.defaultValue).toBeDefined();
      expect(path.options.min).toBe(0);
    }
  });

  it('starts a pod at one, not zero — a zero projection reads as broken', () => {
    expect(podSchema().path('pod_count').defaultValue).toBe(1);
  });

  it('caps every percentage at 100 in the store as well as the service', () => {
    for (const field of [
      'gst_percent',
      'platform_fee_percent',
      'host_commission_percent',
      'venue_commission_percent',
      'club_admin_percent',
    ]) {
      expect(podSchema().path(field).options.max).toBe(100);
    }
  });

  it('indexes the pair the list query actually sorts on', () => {
    const indexes = PodCalculatorModel.schema.indexes().map(([spec]) => spec);

    expect(indexes).toContainEqual({ kind: 1, updated_at: -1 });
  });
});

describe('podCalculatorTypeDefs', () => {
  it('declares the type, the input and every operation the client calls', () => {
    for (const decl of [
      'type PodCalculator ',
      'type PodCalculatorPod ',
      'input PodCalculatorPodInput ',
      'input SavePodCalculatorInput ',
      'podCalculators(kind: String!)',
      'podCalculatorPdfBase64(calculator_doc_id: ID!)',
      'createPodCalculator(',
      'updatePodCalculator(',
      'deletePodCalculator(',
      'emailPodCalculator(',
    ]) {
      expect(podCalculatorTypeDefs).toContain(decl);
    }
  });

  it('gives the type and the input the SAME field list', () => {
    // They interpolate one constant; this is what proves the two never drift.
    const fields = [
      'pod_key: String!',
      'pod_amount: Float!',
      'no_of_spots: Int!',
      'pod_count: Int!',
      'club_admin_percent: Float!',
    ];
    for (const field of fields) {
      expect(podCalculatorTypeDefs.split(field).length - 1).toBe(2);
    }
  });
});
