import { categoryService } from '../../category.service';
import { categoryResolvers } from '../../category.resolver';
import { makeContext } from '@test/harness';

describe('category unit', () => {
  it('rejects a CATEGORY without a parent', async () => {
    await expect(
      categoryService.create({ name: 'Dining', level: 'CATEGORY' })
    ).rejects.toThrow(/requires a parent_id/i);
  });

  it('rejects a SUB without a parent', async () => {
    await expect(
      categoryService.create({ name: 'Cafe', level: 'SUB' })
    ).rejects.toThrow(/requires a parent_id/i);
  });

  it('createCategory is gated to admin write roles', async () => {
    await expect(
      (categoryResolvers.Mutation as any).createCategory({}, { input: {} }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });
});
