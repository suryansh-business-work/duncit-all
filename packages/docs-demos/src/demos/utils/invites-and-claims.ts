import {
  EMPLOYEE_EXPENSE_CATEGORIES,
  EMPLOYEE_EXPENSE_SELECTION,
  EMPLOYEE_EXPENSE_STATUSES,
  EMPLOYEE_EXPENSE_STATUS_COLORS,
  EMPLOYEE_EXPENSE_STATUS_KEYS,
  invitableName,
  inviteOutcomeKey,
  isInvited,
  markInvited,
  progressPercent,
  toggleInviteKey,
  contactEntriesFromPhoneBook,
  formatMoney,
  claimGoogleSignupHandoff,
  createGoogleSignupClaims,
  openGoogleSignup,
  readGoogleSignupHandoff,
  buildOfficialStatusSlides,
  hasUnseenOfficialStatus,
  isOfficialStatusLive,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';
import type { ContactInviteMock, ClaimMock, GoogleInviteMock, OfficialStatusMock } from './mocks';
import { mwebT } from './translators';

export const invitesAndClaimsDemos: PackageDemo[] = [
  defineDemo<ContactInviteMock>({
    id: 'contact-invite',
    title: 'Your Contacts on Duncit — the invite half',
    note:
      'The phone book is reduced to comparable keys ON THE DEVICE, so the numbers themselves never travel. Move a number into already_invited and its row reads invited — one invite per number, for good; an invite press marks the ticked rows the same way without re-reading the list. Set sent to 0 and the outcome key flips to the failed or held-back sentence, which is why both surfaces read it from here.',
    mock: {
      phone_book: [
        { name: 'Ritu Malhotra', phones: ['+91 98765 43210'] },
        { name: 'Karan Bhatia', phones: ['09876543211', '9876543211'] },
        { name: '', phones: ['98765 43212'] },
      ],
      already_invited: ['9876543211'],
      ticked: ['9876543210'],
      sent: 2,
      failed: 0,
    },
    compute: (mock) => {
      const entries = contactEntriesFromPhoneBook(mock.phone_book);
      const rows = entries.map((entry) => ({
        phone_key: entry.phone_key,
        contact_label: entry.label,
        invited_at: mock.already_invited.includes(entry.phone_key) ? '2026-09-01T10:00:00Z' : null,
      }));
      const [firstKey = ''] = rows.map((row) => row.phone_key);
      return {
        'What leaves the device': entries.map((entry) => `${entry.phone_key} (${entry.label || 'no name'})`),
        'Rows read as': rows.map((row) => `${invitableName(row)} — ${isInvited(row) ? 'invited' : 'waiting'}`),
        'After inviting the ticked rows': markInvited(rows, mock.ticked, '2026-09-11T09:30:00Z')
          .filter(isInvited)
          .map(invitableName),
        'Progress bar once 1 of 3 pages is in': `${progressPercent(1, 3)}%`,
        'Ticking the first row again': toggleInviteKey(mock.ticked, firstKey),
        'Sentence the press earns': inviteOutcomeKey({ sent: mock.sent, failed: mock.failed }),
      };
    },
  }),

  defineDemo<GoogleInviteMock>({
    id: 'google-signup-handoff',
    title: 'One Google credential, however many times it is pressed',
    note:
      'Raise taps: the invite never doubles and the credential is claimed exactly once, whatever the number. Put a different value in secondCredential and it claims freshly — that is somebody else signing in, not a replay. Blank the email and the handoff still reads; blank the credential and it reads as null, which is signup opened normally.',
    mock: {
      idToken: 'ya29.a0AfB_riya-koramangala',
      email: 'riya@duncit.com',
      taps: 3,
      secondCredential: '',
    },
    compute: (mock) => {
      // The login screen, pressed `taps` times with the same credential.
      let invite = openGoogleSignup(null, mock.idToken, mock.email);
      const first = invite;
      for (let press = 1; press < mock.taps; press += 1) {
        invite = openGoogleSignup(invite, mock.idToken, mock.email);
      }
      // The signup screen, re-reading the same carried state `taps` times.
      const claims = createGoogleSignupClaims();
      const carried = readGoogleSignupHandoff(invite);
      const reads = Array.from({ length: mock.taps }, () =>
        claimGoogleSignupHandoff(claims, carried) ? 'spent here' : 'already claimed',
      );
      const other = mock.secondCredential
        ? claimGoogleSignupHandoff(claims, { idToken: mock.secondCredential, email: mock.email })
        : null;
      return {
        [`Invites open after ${mock.taps} taps`]: invite === first ? '1 — the same one' : '2 or more',
        'Account it offers to make': carried?.email || '(no address — the server echoes one)',
        [`Claims across ${mock.taps} reads`]: reads,
        'Accounts this can create': reads.filter((read) => read === 'spent here').length,
        'A different credential after it': other ? 'claims freshly' : '(none supplied)',
        'Malformed carried state': readGoogleSignupHandoff({ idToken: '  ' }) ?? 'null — signup opens normally',
      };
    },
  }),

  defineDemo<ClaimMock>({
    id: 'employee-expense',
    title: 'One expense claim, read by two consoles',
    note:
      'Change status to REJECTED and the chip colour AND the translation key move together — the Employee console and the Finance queue read the same two maps, so neither can call it something the other does not. Set category to something absent from the list and it is a code the server would drop.',
    mock: {
      category: 'TRAVEL',
      status: 'PENDING',
      amount: 1840,
      merchant: 'Uber India',
    },
    compute: (mock) => {
      const status = mock.status as keyof typeof EMPLOYEE_EXPENSE_STATUS_COLORS;
      const known = (EMPLOYEE_EXPENSE_CATEGORIES as readonly string[]).includes(mock.category);
      return {
        'Claim reads': `${mock.merchant} — ${formatMoney(mock.amount)}`,
        'Chip colour': EMPLOYEE_EXPENSE_STATUS_COLORS[status] ?? '(not a claim status)',
        'Copy key both consoles render': EMPLOYEE_EXPENSE_STATUS_KEYS[status] ?? '(not a claim status)',
        'Every state a claim can be in': [...EMPLOYEE_EXPENSE_STATUSES],
        'Category the server would keep': known ? mock.category : 'OTHER — the server drops what it does not know',
        'Categories offered': [...EMPLOYEE_EXPENSE_CATEGORIES],
        'Fields both queries ask for': EMPLOYEE_EXPENSE_SELECTION.trim().split(/\s+/),
      };
    },
  }),

  defineDemo<OfficialStatusMock>({
    id: 'official-status',
    title: 'The pinned Duncit tile in both status rails',
    note:
      'Push now past the second status\'s expires_at and it leaves the group — the third has expires_at null, so it never does. Switch the first link_url to https://duncit.com/blog and linkInternal flips to false: mWeb opens a new tab and the app opens the browser instead of navigating. Mark every seen_by_me true and the Duncit ring greys.',
    mock: {
      now: '2026-09-16T12:00:00.000Z',
      statuses: [
        {
          id: 'official-1',
          media_url: 'https://ik.imagekit.io/duncit/monsoon-run.jpg',
          media_type: 'IMAGE',
          caption: 'Monsoon runs are back in Pune',
          link_url: '/pod-ideas',
          expires_at: '2026-09-17T12:00:00.000Z',
          is_active: true,
          seen_by_me: false,
        },
        {
          id: 'official-2',
          media_url: 'https://ik.imagekit.io/duncit/coin-drop.mp4',
          media_type: 'VIDEO',
          caption: 'Duncit Coins on every pod this week',
          link_url: '',
          expires_at: '2026-09-16T09:00:00.000Z',
          is_active: true,
          seen_by_me: true,
        },
        {
          id: 'official-3',
          media_url: 'https://ik.imagekit.io/duncit/how-duncit-works.jpg',
          media_type: 'IMAGE',
          caption: 'How Duncit works',
          link_url: 'https://duncit.com/about',
          expires_at: null,
          is_active: true,
          seen_by_me: true,
        },
      ],
    },
    compute: (mock) => {
      const now = new Date(mock.now).getTime();
      const slides = buildOfficialStatusSlides(mock.statuses, now);
      return {
        'Tile name': mwebT('mweb.status.officialName'),
        'Tile label': mwebT('mweb.status.officialTile'),
        'Slides in the group': slides.map(
          (slide) => `${slide.id} — ${slide.mediaType} — ${slide.caption || '(no caption)'}`,
        ),
        'Ring is lit': hasUnseenOfficialStatus(slides),
        [`"${mwebT('mweb.status.officialOpenLink')}" opens`]: slides.map((slide) => {
          if (!slide.linkUrl) return `${slide.id} — no action`;
          const how = slide.linkInternal ? 'in-app path' : 'external URL';
          return `${slide.id} — ${slide.linkUrl} (${how})`;
        }),
        'Each status still live': mock.statuses.map(
          (status) => `${status.id}: ${isOfficialStatusLive(status, now)}`,
        ),
      };
    },
  }),
];
