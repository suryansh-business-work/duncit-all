import { ecommBrandResolvers } from '../../ecommBrand.resolver';
import { makeContext } from '@test/harness';

describe('ecommBrand resolver auth', () => {
  it('partner mutations require authentication', () => {
    const anon = makeContext(null);
    expect(() =>
      (ecommBrandResolvers.Query as any).myEcommBrands({}, {}, anon)
    ).toThrow(/auth/i);
    expect(() =>
      (ecommBrandResolvers.Mutation as any).saveEcommBrand({}, { input: {} }, anon)
    ).toThrow(/auth/i);
    expect(() =>
      (ecommBrandResolvers.Mutation as any).submitEcommBrand({}, {}, anon)
    ).toThrow(/auth/i);
  });

  it('review queries + mutations are role-gated', () => {
    const anon = makeContext(null);
    expect(() =>
      (ecommBrandResolvers.Query as any).ecommBrands({}, {}, anon)
    ).toThrow();
    expect(() =>
      (ecommBrandResolvers.Query as any).ecommBrand({}, { brand_doc_id: 'x' }, anon)
    ).toThrow();
    expect(() =>
      (ecommBrandResolvers.Mutation as any).approveEcommBrand({}, { brand_doc_id: 'x' }, anon)
    ).toThrow();
    expect(() =>
      (ecommBrandResolvers.Mutation as any).rejectEcommBrand({}, { brand_doc_id: 'x', notes: 'no' }, anon)
    ).toThrow();
  });
});
