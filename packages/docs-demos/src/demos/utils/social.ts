import {
  canFollowBack,
  followBackLabelKey,
  followButtonLabelKey,
  followOutcomeLabelKey,
  followRequestRowState,
  formatMoney,
  offersFollowBack,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';
import type { FollowRowsMock, FollowButtonMock } from './mocks';

export const socialDemos: PackageDemo[] = [
  defineDemo<FollowRowsMock>({
    id: 'follow-notification-rows',
    title: 'What each follow row in the inbox offers',
    note:
      "Follow Back only ever rides on the FOLLOW_BACK state. Flip Riya's status from PENDING to ACCEPTED and the button appears; flip it to DENIED and it does not — a viewer answers the ask first, and denying it ends the row. Set followBackStatus to FOLLOWING and the button goes even on an accepted row, since there is nothing left to do. A NEW_FOLLOWER row has no request behind it, so it carries Follow Back alone, and it is the only follow row a public profile ever receives.",
    mock: {
      rows: [
        {
          label: 'Riya asked to follow you',
          actionType: 'FOLLOW_REQUEST',
          requestId: 'fr-4821',
          status: 'PENDING',
          actorId: 'u-riya',
          followBackStatus: 'NONE',
        },
        {
          label: 'Kabir asked to follow you (you already follow him)',
          actionType: 'FOLLOW_REQUEST',
          requestId: 'fr-4822',
          status: 'PENDING',
          actorId: 'u-kabir',
          followBackStatus: 'FOLLOWING',
        },
        {
          label: 'You denied Nikhil',
          actionType: 'FOLLOW_REQUEST',
          requestId: 'fr-4823',
          status: 'DENIED',
          actorId: 'u-nikhil',
          followBackStatus: 'NONE',
        },
        {
          label: 'You accepted Riya',
          actionType: 'FOLLOW_REQUEST',
          requestId: 'fr-4821',
          status: 'ACCEPTED',
          actorId: 'u-riya',
          followBackStatus: 'NONE',
        },
        {
          label: 'Aarav started following you',
          actionType: 'NEW_FOLLOWER',
          requestId: null,
          status: null,
          actorId: 'u-aarav',
          followBackStatus: 'NONE',
        },
        {
          label: 'Meera started following you (you already follow her)',
          actionType: 'NEW_FOLLOWER',
          requestId: null,
          status: null,
          actorId: 'u-meera',
          followBackStatus: 'FOLLOWING',
        },
        {
          label: 'Dev asked, then withdrew the ask',
          actionType: 'FOLLOW_REQUEST',
          requestId: 'fr-4824',
          status: 'CANCELLED',
          actorId: 'u-dev',
          followBackStatus: 'NONE',
        },
      ],
    },
    compute: (mock) =>
      Object.fromEntries(
        mock.rows.map((row) => {
          const state = followRequestRowState(row);
          const button = offersFollowBack(row)
            ? `${followBackLabelKey(row.followBackStatus)} (tappable: ${canFollowBack(row.followBackStatus)})`
            : 'no follow-back button';
          const outcome = followOutcomeLabelKey(row.status) ?? 'no outcome line';
          return [row.label, `${state}   ·   ${outcome}   ·   ${button}`];
        })
      ),
  }),
  defineDemo<FollowButtonMock>({
    id: 'follow-button-label',
    title: 'What the Follow button on a profile reads',
    note:
      'Flip followsViewer on a NONE profile and the button reads Follow Back — the same words the inbox uses for the same tap, so a profile and the notification about that person never disagree. REQUESTED and FOLLOWING ignore it: a pending ask and a mutual follow read as they always have.',
    mock: {
      profiles: [
        { label: 'Riya (follows you, you do not follow her)', status: 'NONE', followsViewer: true },
        { label: 'Aarav (neither of you follows the other)', status: 'NONE', followsViewer: false },
        { label: 'Kabir (you asked, he has not answered)', status: 'REQUESTED', followsViewer: true },
        { label: 'Meera (you follow each other)', status: 'FOLLOWING', followsViewer: true },
      ],
    },
    compute: (mock) =>
      Object.fromEntries(
        mock.profiles.map((p) => [p.label, followButtonLabelKey(p.status, p.followsViewer)])
      ),
  }),
  defineDemo<{ amounts: number[] }>({
    id: 'money',
    title: 'Money, the way every surface prints it',
    note: 'en-IN grouping (1,25,000), and compact notation once a figure passes a lakh.',
    mock: { amounts: [450, 12500, 125000, 4821500] },
    compute: (mock) =>
      Object.fromEntries(
        mock.amounts.map((amount) => [
          String(amount),
          `${formatMoney(amount)}   ·   compact ${formatMoney(amount, { compact: true })}   ·   2dp ${formatMoney(amount, { decimals: 2 })}`,
        ])
      ),
  }),
];
