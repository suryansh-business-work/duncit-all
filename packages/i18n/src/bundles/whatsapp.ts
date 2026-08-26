import type { NestedCatalogue } from '../catalogue';

/**
 * WhatsApp in three voices: the switches a person owns, the console that
 * decides what may send at all, and the workshop templates are built in.
 *
 * One namespace file rather than three because the CATEGORIES are shared — the
 * `reminder` somebody switches off on their phone is the `reminder` the admin
 * console shows on a scenario row — and two copies of "Reminders" is exactly
 * the drift rules 27 and 40 exist to stop.
 *
 * `whatsappPreference.categories.*` is looked up BY the category string the
 * server sends (`whatsappPreference.categories.reminder.label`), so the server
 * ships keys and never English, and a ninth category is a bundle edit rather
 * than a client release.
 *
 * What is deliberately NOT keyed here: everything on a scenario row that the
 * server composes — `event_key`, `campaign`, `fires`, `params` and above all
 * `blocker` ("Template takes 8 value(s), the code sends 6"). Those are data
 * read out of AiSensy at request time, not sentences a translator could own.
 */
export const WHATSAPP_BUNDLE: NestedCatalogue = {
  // The person's own screen — mWeb AND native, which must be identical
  // (rule 27). It is Mail Preference's twin plus the two states mail has no
  // equivalent of: there may be no number to message at all.
  whatsappPreference: {
    title: 'WhatsApp Preference',
    entryHint: 'Choose which WhatsApp messages we send you',
    subtitle: 'These are the messages we send to {destination}.',
    optionalHeading: 'You can switch these off',
    requiredHeading: 'Always sent',
    requiredHint:
      'Your ticket, your money and changes to your account. These cannot be switched off — a cancelled pod or a refund on its way is something you have to be told about.',
    alwaysOn: 'Always on',
    turnAllOff: 'Turn off everything optional',
    turnAllOn: 'Turn everything back on',
    turnAllOffTitle: 'Stop all optional WhatsApp?',
    turnAllOffMessage:
      'You will stop getting reminders, activity updates, offers and support replies on WhatsApp. Booking confirmations, refunds and account notices keep coming.',
    saved: 'Preferences updated',
    saveFailed: 'Could not save that. Please try again.',
    loadFailed: 'Could not load your WhatsApp preferences.',
    // No sendable number on the account. The switches still render, so a
    // preference can be set before a number exists rather than after the first
    // message arrives.
    noNumberTitle: 'No WhatsApp number yet',
    noNumberBody:
      'We have no number to reach you on, so nothing is being sent. Add a WhatsApp number and these switches start working.',
    addNumber: 'Add a WhatsApp number',
    // The eight categories, keyed by what the server sends. The first three are
    // required, so their description says WHY rather than what.
    categories: {
      transactional: {
        label: 'Confirmations',
        description:
          'Your ticket and booking confirmations — the record of something you just did. Always sent, because it is your proof of what you paid for.',
      },
      billing: {
        label: 'Payments and refunds',
        description:
          'Refunds and payouts, and a payment that did not go through. Always sent, because money moving without a word is how people lose track of it.',
      },
      account: {
        label: 'Your account',
        description:
          'Your welcome message, approvals and anything that changes your account. Always sent, because you have to know when your access changes.',
      },
      notification: {
        label: 'Activity',
        description: 'Changes to pods you joined, slot requests and other account activity.',
      },
      reminder: {
        label: 'Reminders',
        description: 'A nudge before a pod you joined or are hosting begins.',
      },
      feedback: {
        label: 'Feedback',
        description: 'A short ask for your rating once a pod is over.',
      },
      marketing: {
        label: 'Offers',
        description: 'Campaigns, offers and new things worth knowing about.',
      },
      support: {
        label: 'Support',
        description: 'Replies about tickets and chats you started.',
      },
    },
  },

  // The Admin console: every scenario Duncit can send, joined against what
  // AiSensy actually holds. Layered over the shell's namespace by mountPortal.
  adminWhatsapp: {
    title: 'WhatsApp Automation',
    subtitle:
      'Every message Duncit sends on WhatsApp, checked against what AiSensy holds right now. A row with a blocker cannot send, however its switch is set.',
    globalLabel: 'WhatsApp sending',
    globalHelp:
      'The kill switch above every row below. It starts off — nothing goes out on WhatsApp until somebody turns it on.',
    globalOffWarning: 'WhatsApp sending is off. Nothing below is going out.',
    reconcile: 'Reconcile with AiSensy',
    reconcileHint:
      'Re-reads AiSensy and stores each template Meta category, which is what sets the per-message rate. Run it after a template is approved or replaced.',
    reconciled: 'Reconciled with AiSensy.',
    reconcileFailed: 'Could not reach AiSensy.',
    toggleFailed: 'Could not change that switch.',
    loadFailed: 'Could not load the scenario board.',
    tabScenarios: 'Scenarios',
    tabLogs: 'Message Logs',
    // The scenario table.
    scenariosSearch: 'Search scenario, campaign or template',
    colScenario: 'Scenario',
    colAudience: 'Audience',
    colCategory: 'Category',
    colCampaign: 'Campaign',
    colTemplate: 'Template',
    colValues: 'Values',
    colStatus: 'Status',
    colEnabled: 'Enabled',
    colBlocker: 'Blocker',
    firesLabel: 'Fires when',
    paramsLabel: 'Values sent, in order',
    blockerNone: 'Ready to send',
    cannotDisable: 'Cannot be switched off',
    cannotDisableHint: 'A ticket, a refund and an account change always send.',
    healthy: 'Every scenario is wired and ready to send.',
    scenariosEmpty: 'No scenarios are registered yet.',
    catalogueUnreachable:
      'AiSensy could not be read, so campaign and template state is missing from the rows below. The switches still work.',
    // The media column and its editor. A media-header template sends the
    // admin's override when one is set, else the asset cached off the campaign
    // at reconcile — the column names which of the two is in play, and the
    // dialog writes only the override so a reconcile can never wipe it.
    colMedia: 'Media',
    mediaNotNeeded: 'Not needed',
    mediaNone: 'No asset',
    mediaFromCampaign: 'Campaign asset',
    mediaDefault: 'Default asset',
    mediaCustom: 'Custom asset',
    defaultMediaMissing:
      'Some scenarios send a header image and no default is set — every one of them fails with "Media URL Missing" until you set one under Settings.',
    setMedia: 'Set media…',
    clearMedia: 'Clear custom asset',
    mediaDialogTitle: 'Set the header asset',
    mediaDialogIntro:
      'This asset is sent as the header of the message — the image, video or document above the text. AiSensy fetches the link itself when it sends, so it must be reachable from the public internet, not a link only you can open.',
    mediaUrlLabel: 'Header media URL',
    mediaUrlHelp: 'A full public link that starts with http:// or https://.',
    mediaFilenameLabel: 'File name',
    mediaFilenameHelp:
      'Only a document shows its file name to the recipient. Leave it blank for an image or video.',
    mediaSaved: 'Header asset saved.',
    mediaSaveFailed: 'Could not save the header asset.',
    // The message log tab.
    logsSearch: 'Search scenario, campaign, number or reason',
    logsEmpty: 'No WhatsApp message has been attempted yet.',
    logColWhen: 'When',
    logColScenario: 'Scenario',
    logColCampaign: 'Campaign',
    logColAudience: 'Audience',
    logColCategory: 'Category',
    logColDestination: 'Sent to',
    logColStatus: 'Status',
    logColReason: 'Reason',
    logColRate: 'Rate',
    logColDuration: 'Took',
    statusSending: 'Sending',
    statusSent: 'Sent',
    statusSkipped: 'Skipped',
    statusFailed: 'Failed',
  },

  // The Marketing portal's create flows. AiSensy has no update endpoint for
  // either a template or a campaign, so every screen here creates — and
  // replacing something means deleting it and submitting a new name.
  marketingWhatsapp: {
    title: 'WhatsApp Templates',
    subtitle: 'Submit a template to Meta, then bind an approved one to a campaign name.',
    createTemplate: 'New template',
    createCampaign: 'New campaign',
    templateDialogTitle: 'Submit a WhatsApp template',
    campaignDialogTitle: 'Create a campaign',
    pendingNote:
      'Meta reviews every template. This comes back PENDING and cannot be used until Meta approves it — usually minutes, sometimes a day.',
    noEditWarning:
      'There is no edit. Changing a template means deleting it and submitting a new one under a different name, then pointing a campaign at that name.',
    nameLabel: 'Template name',
    nameHelp:
      'Lowercase letters, numbers and underscores. A campaign binds to this name, so it cannot be changed afterwards.',
    categoryLabel: 'Meta category',
    categoryHelp: 'UTILITY, MARKETING or AUTHENTICATION. This is what sets the per-message rate.',
    languageLabel: 'Language',
    languageHelp: 'The full language name AiSensy expects — English, Hindi — never a code.',
    typeLabel: 'Header type',
    typeHelp: 'TEXT, or IMAGE, VIDEO or FILE for a media header.',
    bodyLabel: 'Message body',
    bodyHelp:
      'Write the message with {{1}}, {{2}} and so on where a value goes. That order is the order the code sends them in.',
    sampleLabel: 'Sample message',
    sampleHelp: 'The same body with real example values filled in. Meta reviews against this.',
    headerTextLabel: 'Header text',
    headerTextHelp: 'Optional. One short line above the message.',
    footerTextLabel: 'Footer text',
    footerTextHelp: 'Optional. One short line below the message.',
    // An approved template with no campaign is invisible in AiSensy's own
    // console and unsendable here, so the Campaigns tab says so out loud.
    needsCampaignTitle: 'Approved templates with no campaign',
    needsCampaignBody:
      'A send addresses a campaign, never a template, so none of these can go out yet. Create a campaign for each one.',
    templateNameLabel: 'Approved template',
    templateNameHelp: 'The template this campaign sends. It must already be approved by Meta.',
    campaignNameLabel: 'Campaign name',
    campaignNameHelp:
      'What the code addresses when it sends. Registered scenarios name it exactly.',
    submitTemplate: 'Submit for review',
    submitCampaign: 'Create campaign',
    submitting: 'Submitting…',
    cancel: 'Cancel',
    templateSubmitted: 'Template submitted. Meta is reviewing it — it is not usable yet.',
    templateFailed: 'AiSensy would not accept the template.',
    campaignCreated: 'Campaign created.',
    campaignFailed: 'Could not create the campaign.',
    deleteTemplate: 'Delete template',
    deleteTemplateTitle: 'Delete this template?',
    deleteTemplateMessage:
      'Any campaign pointing at it stops sending immediately. Submitting a replacement means a new name and a fresh Meta review.',
    templateDeleted: 'Template deleted.',
    deleteFailed: 'Could not delete the template.',
    errorRequired: '{field} is required',
    errorNameFormat: 'Use lowercase letters, numbers and underscores only',
    errorTooLong: '{field} is too long',
    errorSamplePlaceholders: 'Replace every placeholder in the sample with a real example value',
    // The send forms. Every field below is built from the template the chosen
    // campaign points at, so the copy explains the RULE rather than the field —
    // a template's own body text, button labels and values are AiSensy data and
    // are correctly not keys.
    paramsTitle: 'Template values',
    paramLabel: 'Value {n}',
    errorParamRequired: 'Fill this in — WhatsApp renders a blank where it goes',
    mediaTitle: 'Header asset',
    mediaUrlLabel: 'Header media URL',
    mediaUrlHelp:
      'AiSensy fetches this link itself when it sends, so it has to be reachable from the public internet. A link only you can open fails once per recipient.',
    mediaFilenameLabel: 'File name',
    mediaFilenameHelp: 'What WhatsApp shows on the document.',
    mediaFromCampaign:
      'Prefilled from the asset this campaign was built with in AiSensy. Replace it to send a different one.',
    errorMediaRequired: 'This template sends a header image, video or document — add its public link',
    errorMediaUrl: 'Use a full public link that starts with http:// or https://',
    buttonsTitle: 'Button links',
    buttonsHint:
      'This template has a button whose link carries a {{n}}. What you type here replaces it.',
    buttonLabel: 'Link value for “{text}”',
    errorButtonValue: 'Fill this in, or the button opens a link with {{n}} still in it',
    templateUnknown:
      'AiSensy could not be read, so this send could not be built from its template. Add the Project API credentials in the Tech portal to see the values, header asset and links it needs.',
    // The platform default header asset, on the Settings tab. Most templates
    // carry an image header and no campaign at AiSensy has an asset attached,
    // so this one image is what makes fifty-odd scenarios sendable at all.
    defaultMedia: {
      title: 'Default header image',
      body: 'Most templates carry an image above the message, and AiSensy has no asset attached to any campaign. This image is what every one of them sends unless a scenario on the Automation tab has its own. Upload one, or paste a public link.',
      label: 'Header image',
      hint: 'A full public link — AiSensy fetches it itself when it sends.',
      save: 'Save default',
      clear: 'Clear default',
      saved: 'Default header image saved.',
      saveFailed: 'Could not save the default header image.',
      loadFailed: 'Could not read the default header image.',
      errorUrl: 'Use a full public link that starts with http:// or https://',
      none: 'No default set — every scenario with an image header fails until one is.',
    },
    // The ONE logs view. Campaign sends and the messages the platform sends by
    // itself are the same record asked for in the same breath — "did this go
    // out, and if not why" — so they are one table, and the columns that differ
    // per kind live behind the row rather than as half-empty columns beside it.
    // Column headers and the four status labels reuse adminWhatsapp.logCol* /
    // status*: this bundle serves the automation board on the next tab too, and
    // two copies of "Sent to" is the drift rule 40 stops.
    logs: {
      title: 'Everything that went out',
      hint: 'Every WhatsApp send, whichever way it started — a campaign somebody sent, or a message the platform sent by itself. Open a row for who it reached and why anyone was missed.',
      empty: 'Nothing has been sent on WhatsApp yet.',
      search: 'Search a send, scenario, number or reason',
      colKind: 'Kind',
      colSend: 'Send',
      colTo: 'Sent to',
      colReach: 'Reached',
      colCost: 'Cost',
      kindCampaign: 'Campaign',
      kindAutomatic: 'Automatic',
      statusScheduled: 'Scheduled',
      statusCancelled: 'Cancelled',
      // Only ever shown when at least one of the two is non-zero.
      reachHint: '{failed} failed · {skipped} skipped',
      perMessage: '{rate}/msg',
      noRate: 'No rate',
      // The automatic half's detail. A campaign row opens the campaign detail
      // it already had, so only this one is new.
      detailTitle: 'Automatic message',
      detailHint:
        'One message the platform sent on its own. There is no campaign above it to retry — the scenario that fired it is on the Automation tab.',
      detailGone: 'That message is no longer on record.',
      // Delete lives in the campaign's own detail now — the table is a record
      // to read, not a row of buttons to press by accident.
      deleteMessage:
        '“{name}” and its results will be removed. Messages already delivered are not recalled.',
      deleting: 'Deleting…',
      cancelSend: 'Cancel this send',
      cancelOnlyScheduled: 'Only a scheduled send can be cancelled',
      cancelling: 'Cancelling…',
      deleteWhileSending: 'Sending right now — wait for it to finish',
      // A retry never re-resolves the audience, so it can only ever mean the
      // people this send already walked over and missed.
      retryNone: 'Everyone was reached',
      retryUnreached: 'Retry {count} not reached',
      retrying: 'Retrying…',
      downloadCsv: 'Download CSV',
      building: 'Building…',
      duplicate: 'Duplicate',
      messageId: 'AiSensy message id',
      // What a row is opened FOR: the message itself. It is drawn from the
      // template AiSensy holds now plus the values the send froze, because
      // nothing stores the rendered text — and Meta does not allow an approved
      // template to be edited, so the two agree unless it was resubmitted.
      messageTitle: 'The message that went out',
      messageHint:
        'The template this campaign sends, filled with the values this send froze. Meta does not allow an approved template to be edited, so this is the wording that arrived — unless the template was deleted and resubmitted since.',
      messageUnknown:
        'AiSensy could not say which template this campaign sends, so the wording cannot be drawn. The values it went out with are below.',
      messagePerRecipient:
        'A value written as {{first_name}} is filled per person while the send runs. Open a row in the Recipients table below for the message one person actually got.',
      messageNotDelivered:
        'Nothing arrived for this person, so there is no message to draw. These are the values the send was carrying for them.',
      variablesTitle: 'Values it was sent with',
      variablesNone: 'This message carries no values.',
      variableBlank: 'Empty',
    },
  },
};
