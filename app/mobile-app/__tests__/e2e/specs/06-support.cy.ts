import { FEEDBACK_CATEGORIES } from '@duncit/slack';
import { runMarker } from '@duncit/utils';
import type { VisitAppOptions } from '../support/commands';
import { expectDisabled, fill, openMenu, prerequisite, tap } from '../support/flows';
import { geolocationStandIn, STAND_IN_LOCATION } from '../support/geolocation-stand-in';
import { runAccount } from '../support/run-account';

/**
 * 06 · Help & Support (SP), signed in with the CHANGED password: the FAQs and
 * their topics, a problem report with a screenshot, a support ticket and the
 * unified ticket list, a grievance escalating that ticket, a callback, an SOS
 * at a joined pod and a live chat message. Everything filed carries the run
 * marker (`[E2E <stamp> native]`) so a person can find it — native records are
 * not followed into the staff portals.
 *
 * Native web: src/screens/FaqsScreen, SupportScreen (src/components/support/
 * SupportHelpCenter), FeedbackScreen, SupportTicketsScreen, TicketDetailsScreen,
 * AllSupportTicketsScreen, GrievanceScreen, CallbackScreen, SosScreen,
 * ChatWithUsScreen and LiveChatScreen.
 */

const FAQ_GROUPS = `query E2eFaqGroups {
  publicFaqGroups { super_category { id name } faqs { id question } }
}`;
type FaqGroup = {
  super_category: { id: string; name: string } | null;
  faqs: { id: string; question: string }[];
};
type FaqGroups = { publicFaqGroups: FaqGroup[] };

/** The "For You" super category, which the Topics scenario opens. */
const forYouTopic = (data: FaqGroups) =>
  data.publicFaqGroups.find((group) => group.super_category?.name === 'For You')?.super_category;

interface ReportForm {
  /** The chips, in the order the form draws them. */
  categories: string[];
  minLength: number;
  allowMedia: boolean;
}
/** What `useReportProblemConfig` renders when the server offers no active category. */
const BUILT_IN_REPORT_FORM: ReportForm = {
  categories: [...FEEDBACK_CATEGORIES],
  minLength: 10,
  allowMedia: true,
};
type ReportProblemConfig = {
  reportProblemConfig: {
    categories: { label: string; is_active: boolean }[];
    message_min_length: number;
    allow_media: boolean;
  } | null;
};

/** The form the page drew from its own `ReportProblemConfig` answer. */
function reportForm(data: ReportProblemConfig | undefined): ReportForm {
  const remote = data?.reportProblemConfig;
  const active = (remote?.categories ?? []).filter((category) => category.is_active);
  if (!remote || active.length === 0) return BUILT_IN_REPORT_FORM;
  return {
    categories: active.map((category) => category.label),
    minLength: remote.message_min_length || BUILT_IN_REPORT_FORM.minLength,
    allowMedia: remote.allow_media !== false,
  };
}

const OPEN_PODS = `query E2eOpenPods {
  pods(filter: { is_active: true }) { id pod_type pod_date_time no_of_spots seats_taken }
}`;
type OpenPod = {
  id: string;
  pod_type: string;
  pod_date_time: string;
  no_of_spots: number | null;
  seats_taken: number | null;
};
const JOIN_FREE_POD = `mutation E2eJoinFreePod($id: ID!) {
  joinFreePod(pod_doc_id: $id) { id status }
}`;

/** A free pod still ahead with a seat left — SOS is scoped to a pod the member joined. */
const bookableFreePod = (pods: OpenPod[]) =>
  pods.find((pod) => {
    const seatLeft = pod.no_of_spots === null || (pod.seats_taken ?? 0) < pod.no_of_spots;
    return pod.pod_type === 'FREE' && Date.parse(pod.pod_date_time) > Date.now() && seatLeft;
  });

describe('Native · 06 support', () => {
  const account = runAccount();
  const marker = runMarker(account.stamp, 'native');
  /** The ticket SP-06 files — listed by SP-07 and escalated by SP-09. */
  let ticketNo = '';

  beforeEach(() => {
    cy.apiLogin(account.email, account.password('CHANGED'));
  });

  /** Help & Support from the account menu. */
  const openSupport = (options?: VisitAppOptions): void => {
    openMenu(options);
    tap('sidebar-grid-support');
    cy.byTestId('support-screen').should('exist');
  };

  /** Report a Problem, yielding the form its config answer drew. */
  const openReportAProblem = (): Cypress.Chainable<ReportForm> => {
    openSupport();
    cy.interceptOperation('ReportProblemConfig');
    tap('support-more-feedback');
    cy.byTestId('feedback-screen').should('exist');
    return cy
      .wait('@ReportProblemConfig')
      .then((interception) => reportForm(interception.response?.body?.data));
  };

  /** Add one photo through the picker: Add media › Choose from phone › crop › Use this image. */
  const attachScreenshot = (): void => {
    cy.fixture('avatar.jpg', null).as('screenshot');
    tap('media-upload-add');
    cy.byTestId('cover-picker').should('be.visible');
    tap('cover-device-add');
    // expo-image-picker's web picker is a hidden file input it appends to the
    // page; its programmatic click opens no dialog under automation, so the
    // file is handed to the input directly.
    cy.byTestId('file-input').selectFile(
      { contents: '@screenshot', fileName: `e2e-${account.stamp}-screenshot.jpg` },
      { force: true },
    );
    cy.byTestId('media-crop-dialog').should('be.visible');
    cy.interceptOperation('MobileUploadImage');
    tap('crop-confirm');
    cy.wait('@MobileUploadImage');
    cy.byTestId('media-crop-dialog').should('not.exist');
    tap('cover-picker-done');
    cy.byTestId('cover-picker').should('not.exist');
    cy.byTestIdPrefix('media-thumb-').should('have.length', 1);
  };

  /** Raise a Grievance, once the tickets it can escalate have loaded. */
  const openGrievance = (): void => {
    openSupport();
    cy.interceptOperation('MobileUnifiedSupportTickets');
    tap('support-more-grievance');
    cy.wait('@MobileUnifiedSupportTickets');
    cy.byTestId('grievance-form').should('exist');
  };

  /** Join a free upcoming pod through the API and yield its id. */
  const joinFreePod = (): Cypress.Chainable<string> =>
    cy.gql<{ pods: OpenPod[] }>(OPEN_PODS).then((data) => {
      const pod = prerequisite(bookableFreePod(data.pods), 'an upcoming FREE pod with a seat left');
      return cy.gql(JOIN_FREE_POD, { id: pod.id }).then(() => pod.id);
    });

  it('SP-01 FAQs from the menu groups the questions by topic; one opens, and search narrows them', () => {
    cy.gql<FaqGroups>(FAQ_GROUPS).then((data) => {
      const group = prerequisite(
        data.publicFaqGroups.find((item) => item.faqs.length > 0),
        'at least one active FAQ',
      );
      const faq = group.faqs[0];
      openMenu();
      cy.interceptOperation('MobileFaqs');
      tap('sidebar-item-FAQs');
      cy.wait('@MobileFaqs');
      cy.byTestId('faqs-screen').should('exist');
      cy.byTestId(`faqs-group-${group.super_category?.id ?? 'GENERIC'}-header-title`).should(
        'have.text',
        group.super_category?.name ?? 'General',
      );
      cy.byTestId(`faq-${faq.id}-header`)
        .should('contain', faq.question)
        .and('have.attr', 'aria-expanded', 'false')
        .click();
      cy.byTestId(`faq-${faq.id}-header`).should('have.attr', 'aria-expanded', 'true');

      fill('faqs-search', faq.question);
      cy.byTestId(`faq-${faq.id}`).should('exist');
      fill('faqs-search', `no-such-question-${account.stamp}`);
      cy.byTestId('faqs-no-match').should('have.text', 'No FAQs match your search.');
    });
  });

  it('SP-02 Help & Support › Topics › For You opens the FAQs on the For You questions', () => {
    cy.gql<FaqGroups>(FAQ_GROUPS).then((data) => {
      const forYou = prerequisite(forYouTopic(data), 'FAQs under the "For You" super category');
      openMenu();
      cy.interceptOperation('MobileFaqs');
      tap('sidebar-grid-support');
      cy.wait('@MobileFaqs');
      cy.byTestId('support-screen').should('exist');
      cy.byTestId('support-topics-header-title').should('have.text', 'Topics');
      cy.byTestId(`support-topic-${forYou.id}`).should('contain', 'For You');

      tap(`support-topic-${forYou.id}`);
      // The FAQs screen reads the groups again when it opens.
      cy.wait('@MobileFaqs');
      cy.byTestId('faqs-screen').should('exist');
      cy.location('pathname').should('eq', '/faqs');
      cy.byTestId(`faqs-group-${forYou.id}-header-title`).should('have.text', 'For You');
    });
  });

  it('SP-03 Report a Problem refuses a description under the minimum length', () => {
    openReportAProblem().then((form) => {
      const short = 'x'.repeat(form.minLength - 1);
      cy.byTestId('feedback-message').clear();
      if (short) cy.byTestId('feedback-message').type(short, { delay: 0 });
      tap('feedback-submit');
      cy.byTestId('feedback-error').should(
        'have.text',
        `Please describe it in at least ${form.minLength} characters.`,
      );
      cy.byTestId('feedback-sent').should('not.exist');
    });
  });

  it('SP-04 a category, a marked description and a screenshot send the report', () => {
    openReportAProblem().then((form) => {
      // The first chip starts chosen, so the last one is picked.
      const category = form.categories[form.categories.length - 1];
      cy.byTestId('feedback-cats-loading').should('not.exist');
      tap(`feedback-cat-${category}`);
      cy.byTestId(`feedback-cat-${category}`).should('have.attr', 'aria-pressed', 'true');
      fill(
        'feedback-message',
        `${marker} The Pod Shop cart total did not refresh after removing an item.`,
      );
      if (form.allowMedia) {
        attachScreenshot();
      } else {
        cy.byTestId('media-upload-add').should('not.exist');
        cy.log('Support has screenshots switched off for Report a Problem, so none is attached.');
      }
      cy.interceptOperation('SubmitAppFeedback');
      tap('feedback-submit');
      cy.wait('@SubmitAppFeedback');
      cy.byTestId('feedback-sent').should('contain', 'Your feedback has been sent to our team.');
    });
  });

  it('SP-05 Create Support Tickets takes name and email from the account, and needs a subject and message', () => {
    openSupport();
    tap('support-more-tickets');
    cy.byTestId('support-tickets-screen').should('exist');
    cy.byTestId('ticket-email').should('have.value', account.email);
    cy.byTestId('ticket-name').invoke('val').should('not.be.empty');
    expectDisabled('ticket-name');
    expectDisabled('ticket-email');
    tap('ticket-submit');
    cy.byTestId('ticket-error').should('have.text', 'Subject and message are required.');
  });

  it('SP-06 a Question with a marked subject and message opens the new ticket', () => {
    openSupport();
    tap('support-more-tickets');
    tap('ticket-category');
    cy.byTestId('ticket-category-options').should('be.visible');
    tap('ticket-category-option-QUESTION');
    cy.byTestId('ticket-category-options').should('not.exist');
    cy.byTestId('ticket-category').should('contain', 'Question / How do I…');
    fill('ticket-subject', `${marker} How do I move my booking to another pod?`);
    fill('ticket-message', `${marker} I booked the wrong pod and want to switch before it starts.`);
    // No attachment on this surface: expo-document-picker's web file input
    // carries no test id, and the suite selects nothing else.
    cy.interceptOperation('MobileCreateTicket');
    tap('ticket-submit');
    cy.wait('@MobileCreateTicket')
      .its('response.body.data.createTicket.ticket_no')
      .then((number) => {
        ticketNo = String(number);
      });
    cy.byTestId('ticket-details-screen').should('exist');
    cy.byTestId('ticket-summary-card-subject').should('contain', marker);
  });

  it('SP-07 All Support Tickets lists the new ticket, and it opens', () => {
    openSupport();
    cy.interceptOperation('MobileUnifiedSupportTickets');
    tap('support-more-all');
    cy.wait('@MobileUnifiedSupportTickets');
    cy.byTestId('all-support-tickets-screen').should('exist');
    cy.byTestId(`all-ticket-${ticketNo}`).should('contain', ticketNo).and('contain', marker);
    tap(`all-ticket-${ticketNo}`);
    cy.byTestId('ticket-details-screen').should('exist');
    cy.byTestId('ticket-summary-card-subject').should('contain', marker);
  });

  it('SP-08 Raise a Grievance refuses empty required fields, a bad email and a bad phone', () => {
    openGrievance();
    tap('grievance-submit');
    cy.byTestId('grievance-support_ticket_ref-caption').should(
      'have.text',
      'Support ticket is required',
    );
    cy.byTestId('grievance-name-error').should('have.text', 'Full name is required');
    cy.byTestId('grievance-email-error').should('have.text', 'Email is required');
    cy.byTestId('grievance-phone-error').should('have.text', 'Phone is required');
    cy.byTestId('grievance-subject-error').should('have.text', 'Subject is required');
    cy.byTestId('grievance-description-error').should('have.text', 'What happened? is required');

    fill('grievance-email', 'riya@');
    cy.byTestId('grievance-email-error').should('have.text', 'Enter a valid email address');
    fill('grievance-phone', '12ab');
    cy.byTestId('grievance-phone-error').should('have.text', 'Enter a valid phone number');
    cy.byTestId('grievance-sent').should('not.exist');
  });

  it('SP-09 a grievance escalating the ticket is filed with a reference; Raise another opens a new form', () => {
    openGrievance();
    tap('grievance-support_ticket_ref');
    cy.byTestId('grievance-support_ticket_ref-options').should('be.visible');
    tap(`grievance-ticket-option-${ticketNo}`);
    cy.byTestId('grievance-support_ticket_ref-options').should('not.exist');
    cy.byTestId('grievance-support_ticket_ref').should('contain', ticketNo);
    fill('grievance-name', 'Riya Duncit');
    fill('grievance-email', account.email);
    fill('grievance-phone', account.phone);
    fill('grievance-address', '12 MG Road, Bengaluru');
    fill('grievance-subject', `${marker} My booking move was not resolved`);
    fill(
      'grievance-description',
      `${marker} Support ticket ${ticketNo} did not move my booking before the pod started.`,
    );
    cy.interceptOperation('SubmitGrievance');
    tap('grievance-submit');
    cy.wait('@SubmitGrievance')
      .its('response.body.data.submitGrievance.grievance_no')
      .then((reference) => {
        cy.byTestId('grievance-reference').should('have.text', String(reference));
      });
    cy.byTestId('grievance-sent').should('contain', 'Grievance received');

    tap('grievance-raise-another');
    cy.byTestId('grievance-sent').should('not.exist');
    cy.byTestId('grievance-form').should('exist');
  });

  it('SP-10 Request callback with a marked reason is accepted', () => {
    openSupport();
    tap('support-more-callback');
    cy.byTestId('callback-screen').should('exist');
    fill('callback-reason', `${marker} Please call me about moving my booking.`);
    cy.interceptOperation('MobileRequestBouncerCallback');
    tap('callback-request');
    cy.wait('@MobileRequestBouncerCallback');
    cy.byTestId('callback-success').should(
      'contain',
      'Callback requested. We will reach you shortly.',
    );
    cy.byTestId('callback-reason').should('have.value', '');
  });

  it('SP-11 SOS at a joined pod sends the message with the location, and says help is on the way', () => {
    joinFreePod().then((podId) => {
      openSupport({ onBeforeLoad: geolocationStandIn });
      cy.interceptOperation('MobileActiveSupportPods');
      tap('support-more-sos');
      // The picker shows its empty state while this is still loading.
      cy.wait('@MobileActiveSupportPods');
      cy.byTestId('sos-screen').should('exist');
      cy.byTestId('pod-picker-empty').should('not.exist');
      tap('pod-picker');
      cy.byTestId('pod-picker-options').should('be.visible');
      tap(`pod-option-${podId}`);
      cy.byTestId('pod-picker-options').should('not.exist');
      fill('sos-message', `${marker} Testing the SOS flow, not an emergency.`);
      cy.interceptOperation('MobileRaiseBouncerSos');
      tap('sos-send');
      cy.wait('@MobileRaiseBouncerSos')
        .its('request.body.variables.input')
        .should('deep.include', { pod_id: podId })
        .its('location')
        .should('deep.include', STAND_IN_LOCATION);
      cy.byTestId('sos-active').should('contain', 'SOS sent. Help is on the way.');
    });
  });

  it('SP-12 Start a conversation opens the live chat, and a marked message lands as your own bubble', () => {
    const text = `${marker} Hello, checking the live chat.`;
    openSupport();
    tap('support-start-chat');
    cy.byTestId('chat-with-us-screen').should('exist');
    cy.interceptOperation('MobileStartSupportChat');
    tap('chat-live-card');
    cy.wait('@MobileStartSupportChat');
    cy.byTestId('live-chat-screen').should('exist');
    fill('support-chat-input', text);
    cy.interceptOperation('MobileSendSupportChatMessage');
    tap('support-chat-send');
    cy.wait('@MobileSendSupportChatMessage')
      .its('response.body.data.sendSupportChatMessage.id')
      .then((id) => {
        cy.byTestId(`support-msg-${String(id)}`).should('contain', text);
      });
  });
});
