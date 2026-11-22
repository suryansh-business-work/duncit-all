import { AppPopupModel } from '../../appPopup.model';
import { appPopupService } from '../../appPopup.service';

/**
 * A popup's button link reaches every phone and browser in the audience.
 * Both apps open http(s) outside and route paths inside, so those are what the
 * server stores — a `javascript:` or `intent:` value is refused, whoever sent
 * it (the Marketing console, the API or an AI tool).
 */

const base = {
  name: 'Diwali offer',
  image_url: 'https://ik.imagekit.io/duncit/diwali.jpg',
  start_at: '2026-11-01T00:00:00.000Z',
  end_at: '2026-11-30T00:00:00.000Z',
  cta_label: 'See pods',
};

describe('appPopupService — the CTA link', () => {
  it.each([['/earn'], ['/club/runners/pod/sunday-5k'], ['https://duncit.com/diwali'], ['http://duncit.com']])('stores %s', async (cta_url) => {
    expect((await appPopupService.create({ ...base, cta_url })).cta_url).toBe(cta_url);
  });

  it.each([['javascript:alert(document.cookie)'], ['intent://scan/#Intent;scheme=zxing;end'], ['data:text/html,hi'], ['earn']])(
    'refuses %s and stores nothing',
    async (cta_url) => {
      await expect(appPopupService.create({ ...base, cta_url })).rejects.toMatchObject({
        message: 'A CTA link must be an app path such as /earn or a web address (https://…)',
        extensions: { code: 'BAD_USER_INPUT' },
      });
      expect(await AppPopupModel.countDocuments()).toBe(0);
    }
  );

  it('still allows a popup with no button at all', async () => {
    expect((await appPopupService.create({ ...base, cta_label: '', cta_url: '' })).cta_url).toBe('');
  });
});
