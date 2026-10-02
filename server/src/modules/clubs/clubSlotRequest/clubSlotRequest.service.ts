import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { CONTACT_FIELDS, contactOf, nameOf, type PodHelpStatus } from '@modules/pods/podHelp/podHelp.service';
import { notifyEach, type NotifyInput } from '@services/notify/notify.service';
import { getUrlConfigs } from '@config/url-configs';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { trimTrailingSlash } from '@utils/url';
import { logs } from '@observability/log';
import { ClubSlotRequestModel, type IClubSlotRequest } from './clubSlotRequest.model';

/** One request per host per club per day — the email leg has no idempotency. */
const REPEAT_WINDOW_MS = 24 * 60 * 60 * 1000;

const fail = (code: string, message: string) =>
  new GraphQLError(message, { extensions: { code } });

const TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['club_name', 'host_name', 'host_contact'],
  sortFields: {
    club_name: 'club_name',
    host_name: 'host_name',
    notified: 'notified',
    status: 'status',
    created_at: 'created_at',
  },
  filterFields: {
    club_name: { type: 'string' },
    host_name: { type: 'string' },
    status: { type: 'enum' },
    created_at: { type: 'date' },
  },
  // Newest first: the open ones are the ones still turning hosts away.
  defaultSort: { created_at: -1 },
};

const toPub = (doc: IClubSlotRequest) => ({
  id: String(doc._id),
  club_id: String(doc.club_id),
  club_name: doc.club_name,
  host_user_id: String(doc.host_user_id),
  host_name: doc.host_name,
  host_contact: doc.host_contact,
  notified: doc.notified,
  status: doc.status,
  resolved_at: doc.resolved_at?.toISOString() ?? null,
  created_at: doc.created_at?.toISOString?.() ?? '',
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

/** The club fields a request reads. */
interface SlotClub {
  _id: Types.ObjectId;
  club_name?: string;
  admin_user_ids?: Types.ObjectId[];
}

interface SlotHost {
  id: string;
  name: string;
  contact: string;
}

/** Messages every admin of the club, both channels, through the one fan-out. */
async function notifyClubAdmins(club: SlotClub, host: SlotHost): Promise<number> {
  const adminIds: string[] = (club.admin_user_ids ?? []).map(String);
  if (adminIds.length === 0) return 0;
  const [admins, urls] = await Promise.all([
    UserModel.find({ _id: { $in: adminIds } }).select(CONTACT_FIELDS).lean(),
    getUrlConfigs(),
  ]);
  const clubUrl = `${trimTrailingSlash(urls.partnersUrl)}/club-admin/clubs/${String(club._id)}`;
  const day = new Date().toISOString().slice(0, 10);
  const inputs: NotifyInput[] = admins.map((admin) => {
    const name = nameOf(admin) || 'there';
    return {
      event: 'CLUB_ADMIN_VENUE_SLOTS_NEEDED',
      entityId: `${String(club._id)}:${host.id}:${day}`,
      user: admin,
      name,
      params: [name, club.club_name ?? '', host.name, host.contact, clubUrl],
    };
  });
  await notifyEach(inputs);
  return inputs.length;
}

export const clubSlotRequestService = {
  /** The host asks the club's admins to get its venues to open slots. */
  async request(clubDocId: string, callerId: string): Promise<{ status: PodHelpStatus; notified: number }> {
    if (!Types.ObjectId.isValid(clubDocId)) throw fail('BAD_USER_INPUT', 'Invalid club id');
    const club = await ClubModel.findById(clubDocId).select('club_name admin_user_ids').lean<SlotClub>();
    if (!club) throw fail('NOT_FOUND', 'Club not found');

    const recent = await ClubSlotRequestModel.exists({
      club_id: club._id,
      host_user_id: new Types.ObjectId(callerId),
      created_at: { $gte: new Date(Date.now() - REPEAT_WINDOW_MS) },
    });
    if (recent) return { status: 'ALREADY_REQUESTED', notified: 0 };

    const caller = await UserModel.findById(callerId).select(CONTACT_FIELDS).lean();
    const hostName = nameOf(caller) || 'A host';
    const hostContact = contactOf(caller);
    const notified = await notifyClubAdmins(club, { id: callerId, name: hostName, contact: hostContact });
    await ClubSlotRequestModel.create({
      club_id: club._id,
      club_name: club.club_name ?? '',
      host_user_id: new Types.ObjectId(callerId),
      host_name: hostName,
      host_contact: hostContact,
      notified,
    });
    logs.server.info('club-slot-request', 'request', {
      club_id: clubDocId,
      recipients: notified,
      msg: 'club admin asked for venue slots',
    });
    return { status: notified > 0 ? 'SENT' : 'NO_CLUB_ADMIN', notified };
  },

  async table(input?: TableQueryInput) {
    const { docs, total, page, page_size } = await runTableQuery<IClubSlotRequest>(
      ClubSlotRequestModel,
      {},
      input,
      TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /** Staff close a request once the club's venues have published slots. */
  async resolve(id: string, actorId: string) {
    if (!Types.ObjectId.isValid(id)) throw fail('BAD_USER_INPUT', 'Invalid request id');
    const doc = await ClubSlotRequestModel.findByIdAndUpdate(
      id,
      { status: 'RESOLVED', resolved_at: new Date(), resolved_by_id: new Types.ObjectId(actorId) },
      { new: true }
    );
    if (!doc) throw fail('NOT_FOUND', 'Request not found');
    return toPub(doc);
  },
};
