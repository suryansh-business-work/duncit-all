import { clubService } from '../../club.service';
import { ClubModel } from '../../club.model';

describe('clubService integration', () => {
  it('creates a club, deriving a slug, and reads it back by id and slug', async () => {
    const created = await clubService.create({ club_name: 'Sunset Runners' });
    expect(created!.club_id).toBe('sunset-runners');

    expect((await clubService.getById(created!.id))?.club_name).toBe('Sunset Runners');
    expect((await clubService.getBySlug('sunset-runners'))?.id).toBe(created!.id);
  });

  it('prevents duplicate clubs by name/slug', async () => {
    await clubService.create({ club_name: 'Book Club' });
    await expect(clubService.create({ club_name: 'Book Club' })).rejects.toThrow(/already exists/i);
  });

  it('lists with filters, updates and removes', async () => {
    const c = await clubService.create({ club_name: 'Chess Circle' });
    expect(await clubService.list({ search: 'chess' })).toHaveLength(1);

    const updated = await clubService.update(c!.id, { club_description: 'Weekly chess', is_active: false });
    expect(updated!.club_description).toBe('Weekly chess');
    expect(updated!.is_active).toBe(false);

    expect(await clubService.remove(c!.id)).toBe(true);
    expect(await ClubModel.countDocuments()).toBe(0);
  });
});
