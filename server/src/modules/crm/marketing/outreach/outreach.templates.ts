import { logs } from '@observability/log';
import { isProjectApiConfigured, listCampaigns, listTemplates } from '@modules/platform/aisensy/aisensy.project';
import { WaCampaignNameModel } from '../waCampaignName.model';

/**
 * The WhatsApp campaigns a step may pick: exactly the list the
 * Communications portal keeps (templates are made and approved there, never
 * here), each with whether AiSensy says its template is approved. One read of
 * the Project API for the whole list; when it cannot be read nothing shows as
 * approved, because nothing could be checked.
 */
export async function outreachWaTemplates() {
  const saved = await WaCampaignNameModel.find().sort({ name: 1 }).lean();
  let campaigns: Awaited<ReturnType<typeof listCampaigns>> = [];
  let templates: Awaited<ReturnType<typeof listTemplates>> = [];
  if (await isProjectApiConfigured()) {
    try {
      [campaigns, templates] = await Promise.all([listCampaigns(), listTemplates()]);
    } catch (error) {
      logs.server.warn('outreach', 'waTemplates', { error, msg: 'AiSensy Project API could not be read' });
    }
  }
  const rows = saved.map((row) => {
    const campaign = campaigns.find((c) => c.name === row.name);
    const template = templates.find((t) => t.name === campaign?.template_name);
    const status = template?.status ?? '';
    return {
      key: row.name,
      description: row.description ?? '',
      template_name: template?.name ?? campaign?.template_name ?? '',
      status,
      approved: status.toUpperCase() === 'APPROVED',
      param_count: template?.param_count ?? 0,
      body: template?.body ?? '',
    };
  });
  return rows.sort((a, b) => Number(b.approved) - Number(a.approved));
}
