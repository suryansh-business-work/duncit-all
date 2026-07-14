import { sliderService } from '../../slider.service';
import { SliderModel } from '../../slider.model';

const base = {
  title: 'Summer Promo',
  media_url: 'https://img/promo.jpg',
  scope: 'GLOBAL',
  link_type: 'EXTERNAL',
  link_url: 'https://duncit.com/promo',
  slider_id: 'summer-promo',
};

describe('sliderService integration', () => {
  it('creates a global external slider and reads it back', async () => {
    const created = await sliderService.create(base);
    expect(created.slider_id).toBe('summer-promo');
    expect(created.effective_link_url).toBe('https://duncit.com/promo');

    expect((await sliderService.getById(created.id))?.title).toBe('Summer Promo');
    expect(await sliderService.list({ scope: 'GLOBAL' })).toHaveLength(1);
  });

  it('prevents duplicate slider ids', async () => {
    await sliderService.create(base);
    await expect(sliderService.create(base)).rejects.toThrow(/already exists/i);
  });

  it('serves the slidersTable page with search, filter, sort and paging', async () => {
    await sliderService.create({ ...base, title: 'Alpha Promo', slider_id: 'alpha-promo', sort_order: 2 });
    await sliderService.create({ ...base, title: 'Beta Promo', slider_id: 'beta-promo', sort_order: 1 });
    await sliderService.create({ ...base, title: 'Gamma Promo', slider_id: 'gamma-promo', sort_order: 3, is_active: false });

    // Plain envelope with the old UI's default order (sort_order asc) and clamp defaults.
    const all = await sliderService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((s) => s.title)).toEqual(['Beta Promo', 'Alpha Promo', 'Gamma Promo']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans title and slider_id.
    const byTitle = await sliderService.table({ search: 'gamma' });
    expect(byTitle.rows.map((s) => s.title)).toEqual(['Gamma Promo']);
    const bySliderId = await sliderService.table({ search: 'beta-promo' });
    expect(bySliderId.rows.map((s) => s.slider_id)).toEqual(['beta-promo']);

    // Boolean filter narrows.
    const active = await sliderService.table({ filters: [{ field: 'is_active', op: 'is_true' }] });
    expect(active.rows.map((s) => s.title)).toEqual(['Beta Promo', 'Alpha Promo']);
    expect(active.total).toBe(2);

    // Allowlisted sort, both directions.
    const desc = await sliderService.table({ sort_by: 'title', sort_dir: 'desc' });
    expect(desc.rows.map((s) => s.title)).toEqual(['Gamma Promo', 'Beta Promo', 'Alpha Promo']);

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await sliderService.table({ page: 2, page_size: 1, sort_by: 'title', sort_dir: 'asc' });
    expect(page2.rows.map((s) => s.title)).toEqual(['Beta Promo']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('updates and removes a slider', async () => {
    const s = await sliderService.create(base);
    const updated = await sliderService.update(s.id, { title: 'Winter Promo', is_active: false });
    expect(updated.title).toBe('Winter Promo');
    expect(updated.is_active).toBe(false);

    expect(await sliderService.remove(s.id)).toBe(true);
    expect(await SliderModel.countDocuments()).toBe(0);
  });
});
