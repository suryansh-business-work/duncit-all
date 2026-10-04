import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { sendEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { UserModel } from '@modules/access/user/user.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import type { ICatalogDeletionRequest } from './catalogDeletion.model';

/**
 * The brand owner, told each time their deletion request moves: approved,
 * rejected, or carried out. Never throws — the request has already moved, and
 * the email/WhatsApp consoles keep a FAILED row for anything that did not go.
 */
export async function notifyDeletionUpdate(req: ICatalogDeletionRequest, statusWords: string, note = '') {
  try {
    const brand = await EcommBrandModel.findById(req.brand_id).select('owner_user_id contact_email contact_person').lean();
    const owner = brand?.owner_user_id
      ? await UserModel.findById(brand.owner_user_id)
          .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
          .lean()
      : null;
    const name = brand?.contact_person || owner?.profile?.first_name || '';
    const item = req.kind === 'BRAND' ? req.brand_name : req.product_name;
    const { partnersUrl } = await getUrlConfigs();
    await sendEmail({
      to: brand?.contact_email || owner?.auth?.email || '',
      subject: `Deletion request for ${item}: ${statusWords}`,
      template: 'catalog-deletion-update',
      category: 'notification',
      vars: {
        name,
        item_name: item,
        status: statusWords,
        note: note || '—',
        partners_url: `${String(partnersUrl ?? '').replace(/\/+$/, '')}/ecomm-brand`,
      },
    });
    await whatsappService.send({
      event: 'ECOMM_DELETION_UPDATE',
      entityId: `${String(req._id)}:${req.status}`,
      user: owner,
      name,
      params: [name, item, statusWords],
    });
  } catch (error) {
    logs.server.error('catalogDeletion', 'notifyDeletionUpdate', { error, request_no: req.request_no });
  }
}
