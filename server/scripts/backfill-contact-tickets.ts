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

async function main(): Promise<void> {
  const connection = await connectForMigration({ dry: DRY });
  const db = connection.db;
  if (!db) throw new Error('No database handle after connect');

  const submissions = await db
    .collection('contactsubmissions')
    .find({})
    .sort({ created_at: 1 })
    .toArray();

  if (submissions.length === 0) {
    console.log('No contact submissions on record.');
    await mongoose.disconnect();
    return;
  }

  // One read of every website ticket, keyed the way a submission maps onto one.
  const tickets = await db
    .collection('tickets')
    .find({ source: 'WEBSITE' })
    .project({ guest_email: 1, subject: 1 })
    .toArray();
  const seen = new Set(
    tickets.map((t: any) => `${String(t.guest_email ?? '').toLowerCase()}|${t.subject ?? ''}`)
  );

  const missing = submissions.filter((s: any) => {
    const subject = String(s.subject ?? '').trim() || DEFAULT_SUBJECT;
    return !seen.has(`${String(s.email ?? '').toLowerCase()}|${subject}`);
  });

  console.log(`contact submissions : ${submissions.length}`);
  console.log(`website tickets     : ${tickets.length}`);
  console.log(`missing a ticket    : ${missing.length}\n`);

  for (const s of missing as any[]) {
    const when = s.created_at instanceof Date ? s.created_at.toISOString().slice(0, 10) : '—';
    console.log(`  ${when}  ${s.email}  "${String(s.subject ?? '').trim() || DEFAULT_SUBJECT}"`);
  }

  if (!DRY && missing.length > 0) {
    let raised = 0;
    for (const s of missing as any[]) {
      try {
        await ticketFromContact({
          name: String(s.name ?? ''),
          email: String(s.email ?? ''),
          subject: String(s.subject ?? ''),
          message: String(s.message ?? ''),
          attachments: Array.isArray(s.attachments) ? s.attachments : [],
        });
        raised += 1;
      } catch (error) {
        // Report and continue: one unrecoverable row must not strand the rest.
        console.error(`  FAILED for ${s.email}:`, error instanceof Error ? error.message : error);
      }
    }
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
