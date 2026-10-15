import {
  CALM,
  LIVE,
  STOPPED,
  callout,
  cta,
  detailRows,
  intro,
  introBlock,
  paragraph,
  quote,
  shell,
  text,
  type Tone,
} from './mjml';
import { CTA, LABEL } from './catalogue.copy';
import { EMAIL_COLOR as C } from './tokens';

/**
 * The bodies of the older onboarding-meeting, interview and host-request
 * emails, moved out of their `.mjml` files (rule 28) with every variable they
 * referenced still in place.
 */

/** Staff's note to the applicant — blank more often than not, so kept quiet. */
const NOTES = paragraph(`<span style="color:${C.muted}">{{notes}}</span>`);
const REFERENCE = detailRows([{ labelKey: 'email.common.referenceLabel', valueVar: 'ref' }]);

/** The four host-request emails: one shape, a different heading and tone. */
function hostRequestBody(ns: string, tone: Tone, withNotes: boolean): string {
  const parts = [
    intro(`${ns}.title`, `${ns}.body`, 'host_name'),
    callout(tone, LABEL.category, 'category_path'),
    detailRows([{ labelKey: 'email.hostRequest.requestIdLabel', valueVar: 'request_no' }]),
  ];
  if (withNotes) parts.push(paragraph(`<span style="color:${C.muted}">{{reviewer_notes}}</span>`));
  return shell(`${ns}.title`, parts.join('\n'), `${ns}.body`);
}

export const ONBOARDING_BODIES: Record<string, string> = {
  'meeting-booked': shell(
    'email.meetingBooked.title',
    [
      intro('email.meetingBooked.title', 'email.meetingBooked.body', 'name'),
      callout(LIVE, LABEL.meeting, 'slot'),
      text('email.meetingBooked.joinEarly'),
      NOTES,
    ].join('\n'),
    'email.meetingBooked.body'
  ),

  'meeting-scheduled': shell(
    'email.meetingScheduled.title',
    [
      intro('email.meetingScheduled.title', 'email.meetingScheduled.body', 'name'),
      callout(LIVE, LABEL.meeting, 'slot'),
      cta(CTA.joinMeeting, 'link'),
      NOTES,
    ].join('\n'),
    'email.meetingScheduled.body'
  ),

  'meeting-scheduled-admin': shell(
    'email.meetingScheduledAdmin.title',
    [
      intro('email.meetingScheduledAdmin.title', 'email.meetingScheduledAdmin.body'),
      callout(CALM, LABEL.meeting, 'slot'),
      cta('email.meetingScheduledAdmin.openLink', 'link'),
      NOTES,
    ].join('\n'),
    'email.meetingScheduledAdmin.body'
  ),

  'meeting-rescheduled': shell(
    'email.meetingUpdated.title',
    [
      introBlock({ title: '{{heading}}', nameVar: 'name', body: '{{intro}}' }),
      callout(CALM, LABEL.meeting, 'slot'),
      cta(CTA.joinMeeting, 'link'),
      NOTES,
    ].join('\n')
  ),

  'meeting-cancelled': shell(
    'email.meetingCancelled.title',
    [
      intro('email.meetingCancelled.title', 'email.meetingCancelled.body', 'name'),
      callout(STOPPED, LABEL.meeting, 'slot'),
      paragraph(`<strong style="color:${C.error}">{{reason}}</strong>`),
      text('email.meetingCancelled.rebook'),
      NOTES,
    ].join('\n'),
    'email.meetingCancelled.body'
  ),

  'meeting-approved': shell(
    'email.meetingApproved.title',
    [
      intro('email.meetingApproved.title', 'email.meetingApproved.body', 'name'),
      cta(CTA.openApp, 'app_url'),
    ].join('\n'),
    'email.meetingApproved.body'
  ),

  'meeting-rejected': shell(
    'email.meetingRejected.title',
    intro('email.meetingRejected.title', 'email.meetingRejected.body', 'name'),
    'email.meetingRejected.body'
  ),

  'interview-applicant': shell(
    'email.interviewApplicant.title',
    [
      intro('email.interviewApplicant.title', 'email.interviewApplicant.body', 'name'),
      callout(CALM, 'email.interviewApplicant.slotsLabel', 'slots'),
      quote('email.interviewApplicant.aboutLabel', 'about'),
      REFERENCE,
    ].join('\n'),
    'email.interviewApplicant.body'
  ),

  'interview-admin': shell(
    'email.interviewAdmin.title',
    [
      intro('email.interviewAdmin.title', 'email.interviewAdmin.body'),
      detailRows([
        { labelKey: 'email.interviewAdmin.applicantLabel', valueVar: 'name' },
        { labelKey: 'email.interviewAdmin.emailLabel', valueVar: 'email' },
        { labelKey: 'email.interviewAdmin.phoneLabel', valueVar: 'phone' },
        { labelKey: 'email.interviewAdmin.businessLabel', valueVar: 'business' },
        { labelKey: 'email.interviewAdmin.slotsLabel', valueVar: 'slots' },
      ]),
      quote('email.interviewAdmin.aboutLabel', 'about'),
      cta('email.interviewAdmin.openAdmin', 'adminLink'),
    ].join('\n'),
    'email.interviewAdmin.body'
  ),

  'interview-scheduled': shell(
    'email.interviewScheduled.title',
    [
      intro('email.interviewScheduled.title', 'email.interviewScheduled.body', 'name'),
      callout(LIVE, LABEL.meeting, 'slot'),
      cta(CTA.joinMeeting, 'link'),
      REFERENCE,
    ].join('\n'),
    'email.interviewScheduled.body'
  ),

  'host-request-submitted': hostRequestBody('email.hostRequestSubmitted', CALM, false),
  'host-request-acknowledged': hostRequestBody('email.hostRequestAcknowledged', CALM, false),
  'host-request-approved': hostRequestBody('email.hostRequestApproved', LIVE, true),
  'host-request-rejected': hostRequestBody('email.hostRequestRejected', STOPPED, true),
};
