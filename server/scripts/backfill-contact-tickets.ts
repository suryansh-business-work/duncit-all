/**
 * Find — and optionally raise — Support tickets for website contact messages
 * that never got one.
 *
 *   npm run backfill:contact-tickets:dry     # report only
 *   npm run backfill:contact-tickets         # raise the missing tickets
 *   npm run backfill:contact-tickets:local   # against a local restore
 *
 * Why this exists. Raising the ticket is best-effort inside
 * `contactService.submit`: the visitor's submission is saved and their
 * acknowledgement email is sent whatever happens, so a failure there is
 * swallowed. That is right for the visitor and wrong for us — the message
 * simply never reaches the queue, and nothing on either side shows it.
 *
 * Every submission is kept in `contactsubmissions`, so the gap is recoverable:
 * a submission with no WEBSITE ticket carrying the same email and subject is
 * one that was lost. This reports them, and writes the missing tickets when
 * asked.
 *
 * Idempotent — a submission that already has its ticket matches nothing on a
 * re-run.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectForMigration } from './lib/migration-db';
import { ticketFromContact } from '@modules/support/ticket/ticket.fromContact';

const DRY = process.argv.includes('--dry-run');

/** The subject `ticketFromContact` writes when the visitor left it blank. */
const DEFAULT_SUBJECT = 'Message from the website';

/**
 * Raise the missing tickets, recording each on its submission.
 *
 * One failure is reported and skipped rather than thrown: a single
 * unrecoverable row (a malformed legacy submission, say) must not strand every
 * message behind it.
 */
async function raiseAll(db: any, missing: any[]): Promise<number> {
  let raised = 0;
  for (const s of missing) {
    try {
      const ticketId = await ticketFromContact({
        name: String(s.name ?? ''),
        email: String(s.email ?? ''),
        subject: String(s.subject ?? ''),
        message: String(s.message ?? ''),
        attachments: Array.isArray(s.attachments) ? s.attachments : [],
      });
      await db
        .collection('contactsubmissions')
        .updateOne({ _id: s._id }, { $set: { ticket_id: ticketId } });
      raised += 1;
    } catch (error) {
      console.error(`  FAILED for ${s.email}:`, error instanceof Error ? error.message : error);
    }
  }
  return raised;
}

async function main(): Promise<void> {
  const connection = await connectForMigration({ dry: DRY });
  const db = connection.db;
  if (!db) throw new Error('No database handle after connect');

  // Only rows with no ticket recorded. `ticket_id` is written the moment the
  // ticket is raised, so this is exact for anything submitted since — the
  // email+subject match below is the fallback for rows that predate the field.
  const submissions = await db
    .collection('contactsubmissions')
    .find({ $or: [{ ticket_id: null }, { ticket_id: { $exists: false } }] })
    .sort({ created_at: 1 })
    .toArray();

  if (submissions.length === 0) {
    // Not "no submissions" — the query above already excluded every one that
    // records its ticket. This is the good outcome.
    console.log('Every contact submission already has its Support ticket.');
    await mongoose.disconnect();
    return;
  }

  // One read of every website ticket, keyed the way a submission maps onto one.
  const tickets = await db
    .collection('tickets')
    .find({ source: 'WEBSITE' })
    .project({ guest_email: 1, subject: 1 })
    .toArray();

  /*
    COUNTED, not a Set.

    Membership cannot tell one ticket from three. The same person writing in
    twice about the same thing — which is exactly what someone does when the
    first message got no reply — produced two submissions and one ticket, and a
    Set called both of them covered. That is the one case this script exists to
    catch, and it was the case it silently passed. Each ticket now accounts for
    exactly one submission.
  */
  const available = new Map<string, number>();
  for (const t of tickets as any[]) {
    const key = `${String(t.guest_email ?? '').toLowerCase()}|${t.subject ?? ''}`;
    available.set(key, (available.get(key) ?? 0) + 1);
  }

  const missing = submissions.filter((s: any) => {
    const subject = String(s.subject ?? '').trim() || DEFAULT_SUBJECT;
    const key = `${String(s.email ?? '').toLowerCase()}|${subject}`;
    const left = available.get(key) ?? 0;
    if (left === 0) return true;
    available.set(key, left - 1);
    return false;
  });

  console.log(`contact submissions : ${submissions.length}`);
  console.log(`website tickets     : ${tickets.length}`);
  console.log(`missing a ticket    : ${missing.length}\n`);

  for (const s of missing as any[]) {
    const when = s.created_at instanceof Date ? s.created_at.toISOString().slice(0, 10) : '—';
    console.log(`  ${when}  ${s.email}  "${String(s.subject ?? '').trim() || DEFAULT_SUBJECT}"`);
  }

  if (!DRY && missing.length > 0) {
    const raised = await raiseAll(db, missing as any[]);
    console.log(`\nRaised ${raised} of ${missing.length}.`);
  }

  console.log(
    `\n${DRY ? 'DRY RUN — nothing written.' : 'Done.'} No acknowledgement emails are sent by this script; the visitors already had theirs.`
  );
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
