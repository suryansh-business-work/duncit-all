import { sliderService } from '../../slider.service';
import { sliderResolvers } from '../../slider.resolver';
import { makeContext } from '@test/harness';

describe('slider unit', () => {
  it('requires location_id for LOCATION scope', async () => {
    await expect(
      sliderService.create({ title: 'A', media_url: 'x', scope: 'LOCATION', link_type: 'EXTERNAL' })
    ).rejects.toThrow(/location_id is required/i);
  });

  it('requires zone_name for ZONE scope', async () => {
    await expect(
      sliderService.create({ title: 'A', media_url: 'x', scope: 'ZONE', location_id: 'loc1', link_type: 'EXTERNAL' })
    ).rejects.toThrow(/zone_name is required/i);
  });

  it('requires a target for an INTERNAL link', async () => {
    await expect(
      sliderService.create({ title: 'A', media_url: 'x', scope: 'GLOBAL', link_type: 'INTERNAL' })
    ).rejects.toThrow(/internal link needs/i);
  });

  it('rejects a non-http external link', async () => {
    await expect(
      sliderService.create({ title: 'A', media_url: 'x', scope: 'GLOBAL', link_type: 'EXTERNAL', link_url: 'ftp://nope' })
    ).rejects.toThrow(/valid http/i);
  });

  it('createSlider is gated to admin write roles', async () => {
    await expect(
      (sliderResolvers.Mutation as any).createSlider({}, { input: {} }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });
});
