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

  it('updates and removes a slider', async () => {
    const s = await sliderService.create(base);
    const updated = await sliderService.update(s.id, { title: 'Winter Promo', is_active: false });
    expect(updated.title).toBe('Winter Promo');
    expect(updated.is_active).toBe(false);

    expect(await sliderService.remove(s.id)).toBe(true);
    expect(await SliderModel.countDocuments()).toBe(0);
  });
});
