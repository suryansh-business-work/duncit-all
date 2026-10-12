jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));
jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({ whatsappService: { send: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn().mockResolvedValue({ partnersUrl: 'https://partners.duncit.test/' }) }));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { sendEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { getUrlConfigs } from '@config/url-configs';
import { UserModel } from '@modules/access/user/user.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { CatalogDeletionRequestModel } from '../../catalogDeletion.model';
import { notifyDeletionUpdate } from '../../catalogDeletion.notify';

/**
 * The brand owner is told each time a deletion request moves — and a failure
 * to tell them is logged, never allowed to undo the decision.
 */

const mockEmail = sendEmail as jest.Mock;
const mockWhatsapp = whatsappService.send as jest.Mock;
let seq = 0;

async function seedOwner() {
  seq += 1;
  return UserModel.create({ auth: { email: `owner${seq}@x.com` }, profile: { first_name: 'Ravi', last_name: 'K' } });
}

async function seedRequest(brand: { _id: unknown }, over: Record<string, unknown> = {}) {
  seq += 1;
  return CatalogDeletionRequestModel.create({
    request_no: `DEL-N${seq}`,
    kind: 'PRODUCT',
    brand_id: brand._id,
    brand_name: 'Brandy',
    product_name: 'Collar',
    mode: 'WAIT_FOR_ORDERS',
    scheduled_for: new Date(),
    status: 'APPROVED',
    ...over,
  });
}

describe('notifyDeletionUpdate', () => {
  it('emails the brand’s contact and messages the owner on WhatsApp, naming the product', async () => {
    const owner = await seedOwner();
    const brand = await EcommBrandModel.create({
      owner_user_id: owner._id,
      brand_name: 'Brandy',
      contact_email: 'contact@brandy.test',
      contact_person: 'Meera',
    });
    const req = await seedRequest(brand);

    await notifyDeletionUpdate(req, 'approved', 'See you soon');

    expect(mockEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'contact@brandy.test',
        subject: 'Deletion request for Collar: approved',
        template: 'catalog-deletion-update',
        vars: expect.objectContaining({
          name: 'Meera',
          item_name: 'Collar',
          note: 'See you soon',
          partners_url: 'https://partners.duncit.test/ecomm-brand',
        }),
      })
    );
    expect(mockWhatsapp).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ECOMM_DELETION_UPDATE', entityId: `${req._id}:APPROVED`, name: 'Meera', params: ['Meera', 'Collar', 'approved'] })
    );
  });

  it('falls back to the owner’s email and first name, names a brand request by the brand, and shows a dash for no note', async () => {
    const owner = await seedOwner();
    const brand = await EcommBrandModel.create({ owner_user_id: owner._id, brand_name: 'Brandy' });
    const req = await seedRequest(brand, { kind: 'BRAND' });
    (getUrlConfigs as jest.Mock).mockResolvedValueOnce({});

    await notifyDeletionUpdate(req, 'completed');

    const sent = mockEmail.mock.calls[0][0];
    expect(sent.to).toBe(owner.auth.email);
    expect(sent.subject).toBe('Deletion request for Brandy: completed');
    expect(sent.vars).toMatchObject({ name: 'Ravi', note: '—', partners_url: '/ecomm-brand' });
  });

  it('still sends to nobody in particular when the brand is gone, and does not throw', async () => {
    const req = await seedRequest({ _id: new Types.ObjectId() });
    await expect(notifyDeletionUpdate(req, 'rejected')).resolves.toBeUndefined();
    expect(mockEmail.mock.calls[0][0]).toMatchObject({ to: '', vars: expect.objectContaining({ name: '' }) });
    expect(mockWhatsapp.mock.calls[0][0].user).toBeNull();
  });

  it('logs a delivery failure instead of throwing', async () => {
    const owner = await seedOwner();
    const brand = await EcommBrandModel.create({ owner_user_id: owner._id, brand_name: 'Brandy' });
    const req = await seedRequest(brand);
    mockEmail.mockRejectedValueOnce(new Error('smtp down'));

    await expect(notifyDeletionUpdate(req, 'approved')).resolves.toBeUndefined();

    expect(logs.server.error).toHaveBeenCalledWith(
      'catalogDeletion',
      'notifyDeletionUpdate',
      expect.objectContaining({ request_no: req.request_no })
    );
    expect(mockWhatsapp).not.toHaveBeenCalled();
  });
});
