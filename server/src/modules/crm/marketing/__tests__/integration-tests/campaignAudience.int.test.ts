import { recipientsFor, marketingService } from '../../marketing.service';
import { audienceListService } from '../../audienceList.service';
import { UserModel } from '@modules/access/user/user.model';
import { NewsletterSubscriberModel } from '@modules/crm/newsletter/newsletter.model';

let seq = 0;

const seedUser = (city: string, over: Record<string, any> = {}) => {
  seq += 1;
  return UserModel.create({
    auth: { email: `camp${seq}@x.com`, ...over.auth },
    profile: { first_name: 'Ana', last_name: `C${seq}`, city },
    metadata: { status: 'ACTIVE', role_keys: ['USER'], ...over.metadata },
  });
};

/**
 * A campaign can target a saved audience list. The addresses are resolved from
 * the list's criteria at send time, so a campaign built last month reaches
 * this month's matches.
 */
describe('campaign audience resolution', () => {
  const puneList = () =>
    audienceListService.create({
      name: 'Pune',
      owner: 'Asha',
      filters: [{ field: 'city', op: 'eq', value: 'Pune' }],
    });

  it('sends to just the people in the list', async () => {
    const a = await seedUser('Pune');
    await seedUser('Delhi');
    const list = await puneList();

    expect(await recipientsFor('AUDIENCE_LIST', list.id)).toEqual([a.auth.email]);
  });

  it('still reaches everybody for ALL_USERS, and only subscribers for the newsletter', async () => {
    await seedUser('Pune');
    await seedUser('Delhi');
    await NewsletterSubscriberModel.create({ email: 'sub@x.com', unsubscribed_at: null });

    expect(await recipientsFor('ALL_USERS')).toHaveLength(2);
    expect(await recipientsFor('NEWSLETTER_SUBSCRIBERS')).toEqual(['sub@x.com']);
  });

  // Somebody in the segment with no email cannot be emailed.
  it('skips list members who have no email address', async () => {
    seq += 1;
    await UserModel.create({
      auth: { phone: { number: '90000' + seq, extension: '+91' } },
      profile: { first_name: 'Phoney', city: 'Pune' },
      metadata: { status: 'ACTIVE', role_keys: ['USER'] },
    });
    const list = await puneList();
    expect(await recipientsFor('AUDIENCE_LIST', list.id)).toEqual([]);
  });

  it('refuses to create a list-targeted campaign without the list', async () => {
    await expect(
      marketingService.create({
        name: 'No list',
        channel: 'EMAIL',
        audience: 'AUDIENCE_LIST',
        subject: 'Hello there',
        mjml: '<mjml><mj-body><mj-text>Hi</mj-text></mj-body></mjml>',
      }),
    ).rejects.toThrow(/audience list/i);
  });
});
