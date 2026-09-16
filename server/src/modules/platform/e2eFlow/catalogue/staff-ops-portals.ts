import type { CatalogueFlow } from './catalogue.types';

/** Journeys through the staff operations portals: Tech, Support, CRM, Finance, Marketing and Legal. */
export const STAFF_OPS_PORTAL_FLOWS: readonly CatalogueFlow[] = [
  // ---------------------------------------------------------------- LEGAL
  {
    name: 'Legal: Access and dashboard',
    description:
      'legal.duncit.com is gated to LEGAL_MANAGER (SUPER_ADMIN also passes every legal resolver). The dashboard counts documents and policies by type.',
    sub_flows: [
      {
        name: 'Role gate for the Legal portal',
        description: 'Only a Legal Manager (or Super Admin) can use the console and its GraphQL operations.',
        steps: [
          ['Sign in to legal.duncit.com with an account that has no LEGAL_MANAGER role', 'Access is refused by the shell and no legal page renders'],
          ['Call a legal query such as legalDocumentsTable with that account token', 'The server answers FORBIDDEN; legal resolvers allow only SUPER_ADMIN and LEGAL_MANAGER'],
          ['Sign in with a LEGAL_MANAGER account', 'The Legal Dashboard opens at / with the nav: Dashboard, Documents, Policies, Policy Acceptance Logs, Contracts, Report By User, Grievance'],
        ],
      },
      {
        name: 'Read the Legal Dashboard',
        description: 'Two way-in tiles and two by-type tables.',
        steps: [
          ['Open /', 'Header "Legal Dashboard" with subtitle "An overview of your legal documents and policies by type."'],
          ['Look at the documents tile', 'It shows the total number of documents with caption "Total documents"'],
          ['Click the documents tile', 'Navigates to /documents'],
          ['Go back and click the Policies tile ("View, manage, and publish platform policies.")', 'Navigates to /policies'],
          ['Look at the "Documents by type" table', 'Columns Document type and Count, sorted by Count descending; empty text "No documents yet. Create one from the Documents section."'],
          ['Search "Privacy" in the "Policies by type" table', 'Rows filter to matching policy types with a Total policies count'],
          ['Create a policy of a new type, then reload the dashboard', 'The Policies by type table shows the new type with count 1'],
        ],
      },
    ],
  },
  {
    name: 'Legal: Documents',
    description: 'Create, edit, version, activate, clone, print, download, delete and sign legal documents at /documents and /documents/:id.',
    sub_flows: [
      {
        name: 'Create a document',
        description: 'New Document dialog; name and type are required.',
        steps: [
          ['Open /documents', 'Header "Documents" / "Create, version and manage legal documents." and a table with Document ID, Name, Type, Active, Status, Updated by, Versions, Last updated, Actions'],
          ['Click "New Document"', 'Dialog "New Document" opens with Document name, Document Type (searchable grouped select), Description and a rich text Content editor'],
          ['Leave Document name empty and pick a type', 'The Create button stays disabled'],
          ['Enter a name, leave Document Type empty', 'Create stays disabled'],
          ['Fill name "Vendor NDA", pick a type, add content, click Create', 'The document is created with a Document ID and the app navigates to /documents/:id showing the name, type chip and content'],
          ['Call createLegalDocument with an empty name directly', 'Server returns "Document name is required" (BAD_USER_INPUT)'],
        ],
      },
      {
        name: 'Quick-edit title and active switch from the table',
        description: 'Edit Document dialog changes the title; the Active switch hides a document from the app without deleting it.',
        steps: [
          ['Click the Edit icon on an unsigned row', 'Dialog "Edit Document" opens with the Document ID under the title and the Title field pre-filled'],
          ['Clear the Title', 'Apply is disabled and the helper reads "The name this document is listed and searched by."'],
          ['Enter a new title and click Apply', 'The dialog closes and the row shows the new name'],
          ['Toggle the Active switch off in a row', 'Toast "Document is now inactive"; the cell label reads Inactive'],
          ['Toggle it back on', 'Toast "Document is now active"'],
          ['Open Edit on a signed document', 'Info alert "This document is signed, so its details are locked..." shows; Title and Apply are disabled but the Active switch still works'],
        ],
      },
      {
        name: 'Edit a document and keep version history',
        description: 'Full edit on the detail page writes a version entry.',
        steps: [
          ['Open /documents/:id', 'Header actions Edit, Print, Download, Copy, Clone, Delete; "Update history" reads "No edits yet — this is the original version." for a new document'],
          ['Click Edit, change the description and content, click Save', 'Toast "Saved"; the view returns to read mode showing the new content'],
          ['Look at "Update history"', 'A row with the editor name and timestamp appears and the header shows the bumped version count (v2)'],
          ['Open /documents/unknown-id', 'Text "This document could not be found." renders'],
        ],
      },
      {
        name: 'Print, download, copy and clone',
        description: 'Utility actions on the document detail page.',
        steps: [
          ['On /documents/:id click Print', 'The browser print dialog opens with the printable HTML of the document'],
          ['Click Download', 'An HTML file named after the document is saved'],
          ['Click Copy', 'Snackbar "Copied to clipboard" (or "Could not copy" when clipboard is blocked)'],
          ['Click Clone', 'A new document is created from this one and the app navigates to the clone at /documents/:newId'],
        ],
      },
      {
        name: 'Delete a document',
        description: 'Destructive delete with a confirm dialog.',
        steps: [
          ['On /documents/:id click Delete', 'Dialog "Delete document?" with "This permanently deletes “<name>” and its history."'],
          ['Click Cancel', 'The dialog closes and the document remains'],
          ['Click Delete again and confirm', 'The document is removed and the app navigates back to /documents where the row is gone'],
        ],
      },
      {
        name: 'Sign a document and share the signed copy',
        description: 'Three-step signing workflow (Preview, Signature, Done) shared by documents and contracts.',
        steps: [
          ['Click the Sign icon on an unsigned document row', 'Dialog titled with the document name, chip "Unsigned", stepper Preview > Signature > Done and an inline PDF preview'],
          ['Click "Download the draft"', 'The unsigned PDF downloads'],
          ['Click Signature', 'Step 2 shows "Every field is required — a signature without a name, a role and a date is not evidence of anything." with Full name, Designation, Initials, a disabled Signing date ("Set by the server when you sign") and Draw/Type/Upload tabs'],
          ['Fill name and designation but leave Initials empty', '"Sign it" stays disabled'],
          ['Upload a signature image larger than 5 MB', 'Error "That image is over 5 MB. Choose a smaller one."'],
          ['Draw a signature, fill Initials and click "Sign it"', 'Toast "Signed"; the stepper moves to Done with "This is signed and locked. It can no longer be edited."'],
          ['Enter an invalid address in "Send to"', 'The Email button stays disabled'],
          ['Enter a valid email, optional message, click Email', 'Toast "Sent to <email>" and the fields clear'],
          ['Close and reopen Sign on the same row', 'The dialog opens directly on Done with chip "Signed" and "Download the signed copy"'],
          ['Call the sign mutation again for the signed document', 'Server refuses with "This contract is already signed."'],
        ],
      },
      {
        name: 'Signing with every method switched off',
        description: 'Signing methods come from feature flags.',
        steps: [
          ['Switch off every signing method flag in Tech > Feature Flags', 'The flags save'],
          ['Open the Sign workflow and go to Signature', 'Warning "Every signing method is switched off for this platform. An admin can turn one back on from the feature flags."'],
        ],
      },
    ],
  },
  {
    name: 'Legal: Policies',
    description: 'Website and app policies at /policies: create, edit with wording history, notify accepted users, hide and delete.',
    sub_flows: [
      {
        name: 'Create a policy',
        description: 'New policy dialog with auto slug.',
        steps: [
          ['Open /policies', 'Header "Policies" / "Website & app policies — managed in one place." with columns Policy ID, Title, Slug, Policy type, Status, Wordings, Sort, Actions'],
          ['Click "New Policy"', 'Dialog "New policy" with Title, Slug ("lowercase letters, numbers and dashes"), Policy Type, Sort order, Active switch and Content'],
          ['Type title "Refund Policy"', 'Slug auto-fills as refund-policy until the slug is edited by hand'],
          ['Clear Title and click Save', 'Alert "Title is required"'],
          ['Fill title, pick type "Refund Policy", leave Active on, click Save', 'Toast "Policy created"; the dialog closes and the row appears with a Policy ID'],
          ['Create another policy with the same slug', 'Error alert "A policy with this slug already exists"'],
          ['Toggle Active off in the dialog', 'Switch label changes from "Active (visible in app)" to "Hidden"'],
        ],
      },
      {
        name: 'Edit a policy and notify accepted users',
        description: 'Optional change notice when the content changes.',
        steps: [
          ['Click Edit on a policy', 'Dialog "Edit · <title>" opens with an extra checkbox "Email everyone who has accepted this policy"'],
          ['Look at the reach caption on a policy nobody accepted', '"Nobody has accepted this policy yet, so there is nobody to tell." and the checkbox is disabled'],
          ['On a policy with acceptances, tick the checkbox', 'Caption "This would reach N people who have accepted it." and a "What changed (optional)" field appears'],
          ['Change only the sort order and Save with the tick on', 'Toast "Policy updated"; no email is sent because content did not change'],
          ['Change the content, tick notify, add a summary and Save', 'Toast "Policy updated"; accepted users are emailed and the caption later reads "Last sent <when> to N people."'],
        ],
      },
      {
        name: 'Send the change notice without editing',
        description: 'Row action for a notice decided afterwards.',
        steps: [
          ['Click the send-notice icon on a row', 'Confirm "Send the change notice?" — "This emails everyone who has accepted “<title>” that its wording has changed. It cannot be unsent."'],
          ['Click "Send the notice now"', 'Toast "Notice sent to N people." or "Nobody has accepted this policy yet, so no notice was sent."'],
        ],
      },
      {
        name: 'Read the wording history',
        description: 'Every wording snapshot taken before an edit.',
        steps: [
          ['Click History on a policy never edited', 'Dialog "Wording history · <title>" shows "No wording history yet — this is the original."'],
          ['Edit its content, then open History again', 'A "Version 1" entry with "Edited by <name>" and a Read action appears; the current one is marked "In force now"'],
          ['Click Read on a version', 'The exact earlier wording is shown'],
        ],
      },
      {
        name: 'Delete a policy',
        description: 'Deleting keeps acceptance records.',
        steps: [
          ['Click Delete on a policy', 'Confirm "Delete policy?" — "This permanently deletes “<title>”, its wording history and nothing else. The acceptance records stay."'],
          ['Confirm', 'Toast "Policy deleted" and the row disappears'],
          ['Open /policy-acceptance-logs and open an acceptance of the deleted policy', 'The record still reads correctly with "This policy has since been deleted..."'],
        ],
      },
    ],
  },
  {
    name: 'Legal: Policy Acceptance Logs',
    description: 'Read-only audit of who accepted which policy, at /policy-acceptance-logs.',
    sub_flows: [
      {
        name: 'Search and inspect an acceptance record',
        description: 'Table plus a detail dialog per row.',
        steps: [
          ['Open /policy-acceptance-logs', 'Header "Policy Acceptance Logs" with columns When, Person, Email, Policy, Policy no., Accepted via, Surface; empty text "Nobody has accepted a policy yet."'],
          ['Search by an email', 'Rows narrow to that person'],
          ['Click a row', 'Dialog "Acceptance record" with sections This acceptance, The person, The policy, Wording history, Their trail through this policy, Everything else they have accepted'],
          ['Check the Accepted via value for a Google signup', 'It reads "Google signup" (others: "Signup form", "Accepted later")'],
          ['Open a record whose policy was edited after acceptance', 'Notice "The policy has been edited since. They agreed to an earlier wording." and the accepted version is tagged "They accepted this"'],
          ['Click "Read this wording" on a version', 'The wording dialog shows that version\'s content'],
          ['Look for edit or delete controls', 'None exist — acceptance records are read-only'],
        ],
      },
    ],
  },
  {
    name: 'Legal: Contracts',
    description: 'Contracts at /contracts: create, view, edit, archive and sign.',
    sub_flows: [
      {
        name: 'Add a contract',
        description: 'New Contract dialog; only Title is required.',
        steps: [
          ['Open /contracts', 'Header "Contracts" with columns Contract ID, Title, Status, Signing, Counterparty, Last updated, Created, Actions; empty text "No contracts yet. Add one to get started."'],
          ['Click "Add Contract"', 'Dialog "New Contract" with Title, Counterparty ("Who the contract is with"), Status (default Draft), Effective from, Effective to, Description and Contract editor'],
          ['Leave Title empty', '"Create Contract" is disabled'],
          ['Fill Title and Counterparty, set status Active and dates, click "Create Contract"', 'Toast "Contract created"; the row appears with a Contract ID, status chip Active and Signing "Unsigned"'],
        ],
      },
      {
        name: 'View and edit a contract',
        description: 'View opens the same dialog locked.',
        steps: [
          ['Click View on a contract', 'Dialog "View · <title>" with every field disabled and only a Close button'],
          ['Click Edit, change Counterparty, click Save', 'Toast "Contract updated" and the Last updated column refreshes'],
          ['Hover Edit on a signed contract', 'The button is disabled with tooltip "Signed — locked to edits"'],
          ['Call updateContract for a signed contract directly', 'Server returns "This contract is signed and can no longer be edited."'],
        ],
      },
      {
        name: 'Archive a contract',
        description: 'Archive keeps the record.',
        steps: [
          ['Click Archive on an active contract', 'Confirm "Archive contract?" — "“<title>” moves to Archived. It stays in the table and keeps its Contract ID — nothing is deleted."'],
          ['Confirm Archive', 'Toast "Contract archived"; status chip reads Archived'],
          ['Hover Archive on the same row', 'Button disabled with tooltip "Already archived"'],
        ],
      },
      {
        name: 'Sign a contract',
        description: 'Same signing workflow as documents.',
        steps: [
          ['Click Sign on an unsigned contract and complete Preview and Signature', 'Toast "Signed"; the Signing column shows a green "Signed" chip'],
          ['Share the signed copy to a valid email', 'Toast "Sent to <email>"'],
          ['Try to share an unsigned contract through the API', 'Server refuses with "This contract has not been signed yet."'],
        ],
      },
    ],
  },
  {
    name: 'Legal: Report By User',
    description: 'Queue of content reports filed from the app and mWeb, at /reports.',
    sub_flows: [
      {
        name: 'Review and action a content report',
        description: 'Open a report, set status and a resolution note.',
        steps: [
          ['Open /reports', 'Header "Report By User" with columns Report ID, Reported, Reason, Reported by, Posted by, Status, Received, Actions; empty text "Nobody has reported anything yet."'],
          ['Search by report ID', 'The matching report row is shown'],
          ['Click Open on a report', 'Dialog "Report <report_no>" with target type and received time, "What was reported" preview, Reason, "In the reporter’s words"'],
          ['Open a report without captured preview', '"No preview was captured for this report." shows'],
          ['Set Status to "In review", add a note in "What we did about it", click Save', 'The dialog closes and the row status chip reads "In review"'],
          ['Reopen and set Status to "Actioned" and save', 'Status chip reads "Actioned"; other statuses available are Received and Dismissed'],
          ['Force the save to fail (e.g. revoked role)', 'Error alert shows the API error or "Could not update this report"'],
        ],
      },
    ],
  },
  {
    name: 'Legal: Grievance',
    description: 'Grievance Tickets queue and the published Grievance Officer details.',
    sub_flows: [
      {
        name: 'Triage a grievance ticket',
        description: 'Open a grievance and move it through its statuses.',
        steps: [
          ['Open /grievance/tickets', 'Header "Grievance Tickets" with columns Grievance ID, Subject, Support ticket, Name, Email, Phone, Status, Source, Received, Actions'],
          ['Click Open on a grievance', 'Dialog "Grievance" with its number, Name, Email, Phone, Address, Support ticket, Received, Subject and "What they told us"'],
          ['Open a grievance raised without a support ticket', 'Support ticket reads "None — support was never contacted"'],
          ['Set Status to Rejected, add a Resolution note, click Apply', 'The dialog closes and the row status shows Rejected; Closed time and Handled by are recorded'],
          ['Set another grievance to Resolved', 'Status chip Resolved; statuses available are Received, In review, Resolved, Rejected'],
          ['Check the Source column', 'Values read App, Website, Portal or Email'],
        ],
      },
      {
        name: 'Publish the Grievance Officer',
        description: 'Grievance Info form (React Hook Form + Zod).',
        steps: [
          ['Open /grievance/info with no officer saved', 'Warning "No Grievance Officer is published yet. Until these details are saved, the app and website show a placeholder instead of a name."'],
          ['Submit with Name empty', 'Field error "Name is required"'],
          ['Enter email "abc"', 'Field error "Enter a valid email address"'],
          ['Enter phone "12"', 'Field error "Enter a valid phone number"'],
          ['Fill valid name, email, phone and address and save', 'Toast "Grievance Officer updated"; the warning disappears and an updated time shows'],
          ['Open the website or app grievance page', 'The officer details appear under "Grievance Officer"'],
        ],
      },
    ],
  },
  // ----------------------------------------------------------------- TECH
  {
    name: 'Tech: Access and role gates',
    description:
      'tech.duncit.com requires TECH_MANAGER. Most tech resolvers allow SUPER_ADMIN and TECH_MANAGER; a few operations are SUPER_ADMIN only (terminal, backups, data clone, purges, key rotation).',
    sub_flows: [
      {
        name: 'Tech portal role gate',
        description: 'Who can open the console and which operations stay Super Admin only.',
        steps: [
          ['Sign in to tech.duncit.com with an account lacking TECH_MANAGER', 'The shell refuses access'],
          ['Sign in as TECH_MANAGER', 'Environment Variables opens at / with nav Maintenance, Feature Flags, Authentication, Emails, Telemetry, GraphQL Monitor, Server, Database, Rate Limiting, Slack, Status Reports, Account Deletions, App Builds, E2E Tests, Stress Testing, Package Documentation, Package Updates'],
          ['As TECH_MANAGER run a command in /server/terminal', 'The terminal prints "Access Denied" — techExec is SUPER_ADMIN only'],
          ['As TECH_MANAGER open /database/backups', 'A red alert "Access Denied"; backups and data clone are SUPER_ADMIN only'],
          ['As TECH_MANAGER open /emails/templates', 'The list stays empty ("No templates yet.") because template resolvers allow only SUPER_ADMIN and CITY_ADMIN'],
          ['Open an unknown path such as /nope', 'Redirects to /'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Environment Variables',
    description:
      'Credential entries per provider category and the portal-to-entry mapping at / (tabs ?selectedtab=variables|mapping, category ?selectedtab_category=).',
    sub_flows: [
      {
        name: 'Add an entry',
        description: 'New entry dialog per category.',
        steps: [
          ['Open / and pick the Email (SMTP) category tab', 'URL gets ?selectedtab_category=EMAIL and the entries table loads; empty "No entries yet. Add one — you can add multiple and pick a default."'],
          ['Click "Add Email (SMTP)"', 'Dialog "New Email (SMTP) entry" with Name, Description, Default, Active and SMTP fields (Host, Port, Username, Password, Use TLS, From Address, From Name, Reply-To)'],
          ['Save without Name', 'Error "Name is required"'],
          ['Save without Password', 'Error "Password is required"'],
          ['Fill all fields and Save', 'Toast "<name> created"; the first entry of a category becomes Default automatically'],
          ['On Twilio, enter Phone Number "98765"', 'Error "Phone Number must be E.164, e.g. +14155552671"'],
        ],
      },
      {
        name: 'Edit, set default and delete an entry',
        description: 'Row actions.',
        steps: [
          ['Click Edit on an entry and leave the secret blank', 'Helper "Leave blank to keep existing"; Save keeps the stored secret and toasts "<name> updated"'],
          ['Click "Set default" on a second entry', 'Toast "<name> is now the default" and the Default chip moves'],
          ['Click Delete on the default entry', 'Confirm "Delete entry" — "Delete "<name>"?"'],
          ['Confirm', 'Toast "<name> deleted"; the first active entry in that category becomes the default'],
        ],
      },
      {
        name: 'Test a connection',
        description: 'Per-category test drawer that records Last tested.',
        steps: [
          ['Click "Test connection" on an SMTP entry', 'Drawer "Test <name>" with "Recipient email" and "Send test email"'],
          ['Enter an email and send', 'Result "Test email sent to <to>" and an Email Logs row with source TEST; Last tested shows "Passed · <date>"'],
          ['Test an OpenAI entry with a prompt', '"OpenAI responded" with the reply text'],
          ['Test a Twilio entry and click "Place test call"', 'Confirm "Place a real call?" warning it is billable; "Call now" returns "Call placed to <to>"'],
          ['Test a Slack entry with a bad token', 'Result "Slack rejected the token…" and Last tested shows Failed'],
          ['Test a GitHub entry missing the repository', '"Access token, owner and repository name are all required"'],
        ],
      },
      {
        name: 'Export and import entries',
        description: 'JSON export with secrets and overwrite-by-name import.',
        steps: [
          ['Click Export → "Email (SMTP) only"', 'Confirm "Export environment variables" warning the file holds real secrets; "Download" saves duncit-env-EMAIL-<date>.json and toasts "Exported N entries"'],
          ['Import a non-JSON file', 'Error "That file is not valid JSON."'],
          ['Import a JSON file without "entries"', 'Error "That file is not an environment export — it has no "entries" list."'],
          ['Import a valid export', 'Confirm "Import N entries" listing CATEGORY · name and warning same-name entries are OVERWRITTEN; on "Import" toast "Imported — x added, y updated"'],
        ],
      },
      {
        name: 'Map entries to a portal',
        description: 'Portal Mapping tab.',
        steps: [
          ['Switch to ?selectedtab=mapping', 'Table Portal, Type, Assigned configs, Actions'],
          ['Click "Assign" on the crm portal', 'Drawer with entries grouped by category and checkboxes'],
          ['Tick an AiSensy and a Twilio entry and click "Save (2)"', 'Toast "Saved 2 entries for CRM"; Assigned configs shows 2'],
          ['Click the info icon', 'Dialog "<portal> — assigned configs" lists the entries with Default / Active / Off chips'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Maintenance',
    description: 'Put a portal, website or app into Maintenance or Development mode at /portal-modes.',
    sub_flows: [
      {
        name: 'Switch a portal into maintenance and back',
        description: 'Confirmed switch on, instant switch off.',
        steps: [
          ['Open /portal-modes', 'Header "Maintenance & Development" with rows for every portal, mWeb and the websites and Status chips (Live / Maintenance / Development)'],
          ['Turn on Maintenance for Marketing', 'Confirm "Marketing: enter maintenance mode?" — visitors are blocked until set back to Live'],
          ['Click Cancel', 'Nothing changes'],
          ['Turn it on again and Confirm', 'Toast "Marketing → maintenance"; Status chip Maintenance; marketing.duncit.com shows the maintenance page'],
          ['Turn on Development for the same row', 'Only one mode is on at a time; Status becomes Development'],
          ['Turn the switch off', 'No confirm; toast "Marketing → live" and the portal works again'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Feature Flags',
    description: 'Platform feature switches at /feature-flags with create, toggle, delete, export and import.',
    sub_flows: [
      {
        name: 'Create and toggle a flag',
        description: 'New Feature Flag dialog and the enabled switch.',
        steps: [
          ['Open /feature-flags and click "New Flag"', 'Dialog "New Feature Flag" with Key ("Lowercase, e.g. venue_booking"), Name, Description, Enabled'],
          ['Leave Key or Name empty', 'Save is disabled'],
          ['Enter key "Venue_Booking", a name and Save', 'Snackbar "Saved"; the row shows key venue_booking (lowercased), type Custom'],
          ['Create another flag with the same key', 'Error in the dialog "Flag key exists"'],
          ['Toggle the Enabled switch', 'Snackbar "<name> enabled" / "<name> disabled"; the feature changes across the platform'],
          ['Edit the flag', 'Dialog "Edit Flag" with the key locked'],
        ],
      },
      {
        name: 'Delete, export and import flags',
        description: 'System flags cannot be deleted.',
        steps: [
          ['Hover Delete on a System flag', 'Disabled with "System (locked)"'],
          ['Delete a custom flag', 'Confirm "Delete flag" — "Delete flag "<key>"?"; on confirm the row disappears'],
          ['Click Export', 'duncit-feature-flags-<date>.json downloads and toast "Exported N flags"'],
          ['Import a file with a flag missing its key', 'Error "One of the flags has no key or name, so nothing was imported."'],
          ['Import a valid file', 'Confirm "Import N flags" listing key · On/Off; on Import toast "Imported — x added, y updated"'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Authentication',
    description: 'JWT token expiry setting at /authentication.',
    sub_flows: [
      {
        name: 'Save JWT expiry settings',
        description: 'Expiry switch, duration and unit.',
        steps: [
          ['Open /authentication', 'Card "Authentication · JWT Token Expiry" with "Tokens never expire", Duration and Unit'],
          ['With "Tokens never expire" on', 'Duration and Unit are disabled; caption "Tokens issued from now will not expire."'],
          ['Turn it off, set Duration 7 and Unit Days', 'Caption "Tokens will expire after 7d (7 days)."'],
          ['Click Save', 'Snackbar "JWT settings saved" and "Last updated <datetime>"'],
          ['Reload the page', 'Known gap: the server still reports tokens never expire and signs tokens without an expiry'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Emails',
    description:
      'Email delivery dashboard, MJML templates (/emails/templates), header/footer fragments, send logs and Gmail mailbox connection for Mail Automation.',
    sub_flows: [
      {
        name: 'Read the emails dashboard',
        description: 'Delivery health across all sends.',
        steps: [
          ['Open /emails', 'Redirects to /emails/dashboard with tiles RECIPIENTS ADDRESSED, ATTEMPTS, SENT, SKIPPED, FAILED'],
          ['Change Range to "Last 30 days"', 'Tiles and charts recompute'],
          ['Read "Why nothing went out"', 'Bars such as No recipient address, Template disabled, Mail server refused; "No data in this range." when empty'],
          ['Read "Addresses failing repeatedly"', 'Address, Failures, Last reason, When for addresses with 2+ failures'],
        ],
      },
      {
        name: 'Create and edit an email template',
        description: 'MJML editor with live preview and auto-save (requires SUPER_ADMIN or CITY_ADMIN on the server).',
        steps: [
          ['Open /email-templates', 'Redirects to /emails/templates'],
          ['Click New template and leave Subject empty', '"Create" stays disabled'],
          ['Enter slug "welcome-back", name and subject and Create', 'Toast "Template created" and the template opens with starter MJML'],
          ['Create another template with slug "welcome-back"', 'Error "Slug already exists"'],
          ['Edit the MJML', 'The Preview re-renders; "Unsaved changes" shows, then auto-save stores it'],
          ['Click "Verify MJML" on broken MJML', 'Toast "N MJML issues"'],
          ['Open the Variables tab and click "Sync to declared list"', 'Detected {{ var }} keys are added to Declared variables'],
          ['Pick a Header / footer fragment and switch Active off, then Save', 'Toast "Template saved"; "Disabled — nothing will send"'],
        ],
      },
      {
        name: 'Send a test and delete a template',
        description: 'Test send through the real pipeline.',
        steps: [
          ['Click "Send test" and enter "abc" in To', 'Error "Enter a valid recipient email"'],
          ['Enter a valid email, fill variables and Send', 'Toast "Test email sent"; a TEST row appears in /emails/logs'],
          ['Click the "Sent N" usage chip', 'Navigates to /emails/logs?template=<slug>&status=SENT'],
          ['Click Delete', 'Confirm "Delete template" — "Delete template "<name>"?"; toast "Deleted"'],
        ],
      },
      {
        name: 'Manage header and footer fragments',
        description: 'System fragments reset; custom fragments delete.',
        steps: [
          ['Open /emails/fragments and pick "marketing"', 'Header and Footer MJML panes, preview and "Used by N templates"'],
          ['Edit the footer and Save', 'Toast "Fragment saved"; templates using it render the new footer'],
          ['Click "Reset to shipped"', 'Confirm "Reset fragment"; toast "Reset to the shipped version"'],
          ['Click New fragment, name "Weekend banner" and Add', 'Toast "Fragment added" with key weekend-banner'],
          ['Delete the custom fragment', 'Confirm warns templates using it go back to no header and footer; toast "Fragment deleted"'],
          ['Try deleting a system fragment via the API', 'Server refuses: it ships with Duncit and cannot be deleted'],
        ],
      },
      {
        name: 'Inspect and delete email logs',
        description: 'Per-attempt log with body and variables.',
        steps: [
          ['Open /emails/logs and click the Failed chip', 'URL gets ?status=FAILED and only failed attempts show with a Reason'],
          ['Click a row', 'Drawer with To/CC/BCC, Provider, Message ID and tabs Preview, HTML, Variables'],
          ['Open the HTML tab and click Copy', 'Toast "HTML copied"'],
          ['Tick two rows and click Delete', 'Confirm "Delete 2 selected row(s)?"; toast "Deleted 2 log row(s)"'],
          ['As TECH_MANAGER look for "Delete all"', 'Not shown — only SUPER_ADMIN sees "Delete all"'],
        ],
      },
      {
        name: 'Connect and disconnect a Gmail mailbox',
        description: 'Mail Automation connection (the reply rule is edited in Support).',
        steps: [
          ['Open /mail-automation without Google OAuth configured', 'Warning "Google OAuth is not configured. Add a Client ID and Client Secret in Environment Variables → Google OAuth, then come back."'],
          ['With OAuth configured click "Connect Gmail"', '"Opening Google…" and the browser goes to Google consent'],
          ['Cancel on Google', 'Back on /mail-automation with toast "Connection cancelled — nothing was changed."'],
          ['Complete consent with every permission', 'Toast "<email> is connected." and the row shows State Running'],
          ['Connect the same mailbox again', 'Warning "<email> was already connected. Its Google access has been refreshed..."'],
          ['Click Disconnect', 'Confirm "Disconnect <email>?"; toast "<email> disconnected"'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Package Documentation',
    description: 'Compiled package docs and runnable live demos at /package-docs (?pkg=, ?selectedtab=docs|demos).',
    sub_flows: [
      {
        name: 'Read docs and edit snippets',
        description: 'Documentation tab with Monaco code blocks.',
        steps: [
          ['Open /emails/docs', 'Redirects to /package-docs with "N packages documented"'],
          ['Search "table" and pick @duncit/table', 'Header card with summary, category chips, Imported by and Exports'],
          ['Edit a code block', '"Reset snippet" appears; edits are not saved'],
          ['Click Copy on a snippet', 'Toast "Copied"'],
          ['Click "Open full screen"', 'Full-screen editor with "Close editor"'],
        ],
      },
      {
        name: 'Run a live demo on edited mock data',
        description: 'Live demos tab.',
        steps: [
          ['Open /package-docs?pkg=utils&selectedtab=demos', 'Demo cards with "Live view", "What the package returned" and "Mock data"'],
          ['Change a value in Mock data', 'The live view and results re-render for the new mock'],
          ['Type invalid JSON in Mock data', 'Warning with the parse error and the last valid data is kept'],
          ['Click "Reset mock"', 'The original mock returns'],
          ['Open a package without demos', '"This package ships no demo yet..." with the expected demo file path'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Package Updates',
    description: 'Every package.json compared with the npm registry at /package-updates.',
    sub_flows: [
      {
        name: 'Check for outdated dependencies',
        description: 'By package.json and By dependency tabs.',
        steps: [
          ['Open /package-updates', 'Chips Manifests, Declared, Tracked on npm, Outdated, Major, Minor, Patch and "Last checked: <datetime>"'],
          ['Click "Check now"', '"Checking…" then the report refreshes'],
          ['Click a package.json row', 'Dialog listing Dependency, Kind, Declared, Latest and Type sorted worst first'],
          ['Switch to ?selectedtab=dependencies and set Type to Major', 'Only dependencies with a major update remain, with Used in paths'],
          ['Run a check with the registry unreachable', 'Warning "The last check could not reach the npm registry — <error>"'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Slack',
    description: 'Read and post to Slack channels from /slack.',
    sub_flows: [
      {
        name: 'Read and reply to a channel',
        description: 'Channel list, history and composer.',
        steps: [
          ['Open /slack without a Slack token', 'Warning "Add a Slack bot token in Environment Variables → Slack to connect a workspace."'],
          ['With Slack configured open /slack', 'Channel list opens on the first joined channel and shows the last 50 messages'],
          ['Click "Bot permissions"', 'Popover "Connected to the <team> workspace." with a tick or cross per scope'],
          ['Type a message and press Enter', 'The message posts and appears in the history'],
          ['Enable "Block Kit payload" and send invalid JSON', 'Error toast "Blocks must be valid JSON"'],
          ['Click "Copy channel ID"', 'Toast "Channel ID copied."'],
        ],
      },
      {
        name: 'Add the bot to a channel',
        description: 'Public vs private channels.',
        steps: [
          ['Pick a public channel marked "Not joined"', 'Warning "The bot is not in this channel" with "Add the bot"'],
          ['Click "Add the bot"', 'The bot joins and the history loads'],
          ['Pick a private channel the bot is not in', 'Text says a member must run /invite @your-bot there; no add button'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Status Reports',
    description: 'Triage problems reported by hand on the public status page, at /status-reports.',
    sub_flows: [
      {
        name: 'Triage a status report',
        description: 'Detail dialog with status, note and attachments.',
        steps: [
          ['Submit a report on the public status page', 'It appears in /status-reports with Status New'],
          ['Open /status-reports and click the row', 'Dialog with When, Env, Reporter, Email, Website, Page address, Signed-in account, IP, Browser, Message and reporter screenshots'],
          ['Add an image under "Team attachments", set Status In progress and write a Triage note', 'Fields accept the values'],
          ['Click Save', 'Toast "Report updated" and the row status reads In progress'],
          ['Open it again and click Delete', 'Confirm "Delete this report?"; toast "Report deleted"'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Account Deletions',
    description: 'Queue of member deletion requests: settings, reject, per-trace purge and full deletion, at /account-deletions.',
    sub_flows: [
      {
        name: 'Change the deletion window',
        description: 'Deletion settings dialog.',
        steps: [
          ['Open /account-deletions and click "Deletion settings"', 'Dialog with "Days before deletion" and the note that it applies to new requests only'],
          ['Enter 400', 'Error "Enter a whole number of days between 1 and 365."'],
          ['Enter 30 and Save', 'Toast "Deletion window updated."'],
        ],
      },
      {
        name: 'Reject a deletion request',
        description: 'Keep the account and reopen it.',
        steps: [
          ['Click a PENDING request', 'Dialog "Deletion request <code>" with Deletes on, time left, reason and "Where this member appears" trace table'],
          ['Click "Reject request"', 'Dialog "Reject this request?" asking for a reason'],
          ['Enter a reason and click "Reject request"', 'Toast "Done"; status becomes REJECTED and the member can sign in again'],
        ],
      },
      {
        name: 'Delete everything for a member',
        description: 'Typed-confirmation full purge (SUPER_ADMIN only).',
        steps: [
          ['As TECH_MANAGER click Delete on a trace row', 'The server answers "Access Denied" — purges are SUPER_ADMIN only'],
          ['As SUPER_ADMIN click "Delete everything"', 'Dialog "Delete everything for <name>?" with "Type <code> to confirm"; the button is disabled'],
          ['Type the reference code', '"Delete everything" enables'],
          ['Click it', '"Carrying out <code>" shows each reference removed or redacted, then the account; toast "The account document has been removed." and status COMPLETED'],
          ['Open a completed request', 'Row delete buttons are disabled'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Telemetry',
    description:
      'Logs and bugs from every surface: /telemetry/dashboard, /telemetry/bugs(/:bugId), /telemetry/logs, /telemetry/log/:logId, /telemetry/error-logs and /telemetry/logs-settings.',
    sub_flows: [
      {
        name: 'Read the telemetry dashboard',
        description: 'Volume, errors and top bugs.',
        steps: [
          ['Open /telemetry', 'Redirects to /telemetry/dashboard with TOTAL LOGS, ERRORS, ACTIVE BUGS, SOURCES and By level / By source / By environment bars'],
          ['Change Range to "Last 24h"', 'Tiles and bars recompute'],
          ['Read "Top open bugs"', 'Top 10 open bugs with "N×" chips, or "No open bugs — nice."'],
        ],
      },
      {
        name: 'Triage a bug',
        description: 'Bug list and detail status buttons.',
        steps: [
          ['Open /bugs', 'Redirects to /telemetry/bugs with Status, Bug, Source, Page, Count, Affected, Last user, Envs, Last seen'],
          ['Click "Triage" on a bug', '/telemetry/bugs/:bugId shows Error, Occurrences, "Who it hits", stack trace and Recent occurrences'],
          ['Click "Mark Resolved"', 'Status chip Resolved and "Resolved <date> · by <user>" appears'],
          ['Trigger the same error again from the app', 'The bug reopens to Open with a higher count'],
          ['Click "Mark Ignored" and trigger the error again', 'The bug stays Ignored'],
          ['Open a deleted bug URL', 'Warning "That bug no longer exists — it may have been deleted or cleared by the retention window."'],
        ],
      },
      {
        name: 'Delete bugs and export or import',
        description: 'Row delete, scoped delete dialog, export/import.',
        steps: [
          ['Click the bin on a bug', 'Confirm "Delete this bug?"; toast "Deleted 1 row"'],
          ['Click "Delete rows…" and pick "Older than 30 days"', 'Count line "N rows are in range and will be deleted permanently."'],
          ['As TECH_MANAGER clear all filters and dates', 'Red alert that it empties the collection and info that it is a Super Admin\'s to run; delete disabled'],
          ['Click Export', 'duncit-bugs-<date>.json downloads with toast "Exported N bugs"'],
          ['Import a bug missing its fingerprint', 'Error "One of the bugs is missing its fingerprint, title, page or source, so nothing was imported."'],
          ['Click "Copy GET API"', 'Toast "GET API URL copied — it needs no login, so treat it as a password."'],
        ],
      },
      {
        name: 'Browse logs by level',
        description: 'Level tabs, log detail and error logs.',
        steps: [
          ['Open /telemetry/logs?selectedtab=warn', 'The Warn tab lists warn logs with When, Env, Source, Page, Component, User, Message'],
          ['Click a row', '/telemetry/log/:logId shows Event, Who, Machine, user agent, stack trace and structured data'],
          ['Click the "Logs" back button', 'Returns to /telemetry/logs?selectedtab=warn'],
          ['Tick all rows and "Select all N matching this view", then Delete', 'Confirm "Delete every row matching this view?"; toast "Deleted N rows" within that level only'],
          ['Open /telemetry/error-logs and click a row', 'Dialog with Kind, GraphQL code, Operation, GraphQL path, User and stack trace'],
        ],
      },
      {
        name: 'Telemetry logs settings and feed key',
        description: 'Levels, retention, SigNoz and key rotation.',
        steps: [
          ['Open /telemetry-logs-settings', 'Redirects to /telemetry/logs-settings'],
          ['Untick every level', 'Error "Select at least one level to persist"'],
          ['Enter Retention 120', 'Error "At most 90 days"'],
          ['Set levels error and warn, retention 30 and Save', 'Snackbar "Telemetry settings saved"'],
          ['As SUPER_ADMIN click "Rotate key"', 'Confirm "Rotate the telemetry feed key?"; toast "New key in place — copy fresh URLs where you need them"'],
          ['Call an old GET API URL', '401 asking for the telemetry key'],
        ],
      },
    ],
  },
  {
    name: 'Tech: GraphQL Monitor',
    description:
      'Per-operation traffic, latency, errors, fields and traces measured on this server: /graphql-monitor/overview, operations, operations/:operationId, query-mutation, fields, errors, settings (?range=).',
    sub_flows: [
      {
        name: 'Find a slow operation',
        description: 'Overview and operations table.',
        steps: [
          ['Open /graphql-monitor', 'Redirects to /graphql-monitor/overview with latency tiles, Traffic and Latency charts and Slowest / Busiest / Most errors cards'],
          ['Change Range to "Last 7 days"', 'URL gets ?range=LAST_7_DAYS and data comes from hourly rollups'],
          ['Click an item in "Slowest"', 'Navigates to /graphql-monitor/operations/:operationId?range=LAST_7_DAYS'],
          ['Open /graphql-monitor/operations and sort by p95', 'Rows with p95 at or above the slow threshold are coloured warning'],
          ['Open /graphql-monitor/query-mutation?selectedtab=MUTATION', 'Only mutations are listed'],
        ],
      },
      {
        name: 'Inspect an operation and a trace',
        description: 'Operation detail page.',
        steps: [
          ['On an operation page read "Latency distribution" and "Request phases"', 'Histogram and Parse / Validate / Execute / Everything else bars render'],
          ['Click a trace row', 'Dialog "Trace · <at>" with Total, Parse, Validate, Execute and the resolver waterfall'],
          ['Click Copy on the Signature card', 'Toast "Signature copied"'],
          ['Open an unknown operation id', '"Operation not found" is shown'],
        ],
      },
      {
        name: 'Fields and errors',
        description: 'Schema usage and grouped failures.',
        steps: [
          ['Open /graphql-monitor/fields', 'Tiles Queries, Mutations, Unused queries & mutations, Deprecated fields and tabs Queries / Mutations / Object fields / All fields'],
          ['Find a field with 0 operations', 'It carries an "Unused" chip'],
          ['Open /graphql-monitor/errors', 'Groups by Message, Code, Operation with Count, First seen, Last seen'],
          ['Click an error row', 'Navigates to the failing operation\'s detail page'],
        ],
      },
      {
        name: 'Monitor settings',
        description: 'Enable, sample, slow threshold and retention.',
        steps: [
          ['Open /graphql-monitor/settings and enter sample 150', 'Error "Enter a whole number from 0 to 100."'],
          ['Enter Slow threshold 20', 'Error "Enter a whole number from 50 to 120000."'],
          ['Set sample 10, threshold 800, retention 14 and Save', 'Toast "Saved" and "Last updated <at>"'],
          ['Switch "Monitor GraphQL requests" off and Save', 'Measuring stops; recorded numbers remain until they expire'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Server',
    description: 'Host metrics with 30-day history and AI advice (/server/info), Docker containers (/server/docker) and a shell terminal (/server/terminal).',
    sub_flows: [
      {
        name: 'Read server info and generate AI advice',
        description: 'Info dashboard.',
        steps: [
          ['Open /server', 'Redirects to /server/info with CPU USAGE, MEMORY, DISK, UPTIME tiles and the live server pulse'],
          ['Read "Last 30 days"', 'Days recorded, CPU and memory averages, Disk used forecast, API p95, Uptime, Requests and six charts'],
          ['Click "Generate recommendations"', '"Reading the month of history…" then toast "Recommendations ready." with grade, Recommendations and Trends'],
          ['Generate with no OpenAI key', 'Error toast "OPENAI_API_KEY is not configured on the server"'],
          ['Read the SSL certificate panel', 'Status "Valid & trusted" with Issuer and "Expires <date> · N days left"'],
        ],
      },
      {
        name: 'Restart a container and watch logs',
        description: 'Docker page.',
        steps: [
          ['Open /server/docker', 'Chips "N running", "N total" and a containers table (Name, Image, State, Status, Created)'],
          ['Open the page where the Docker socket is not mounted', 'Warning "Docker is not reachable from the API container..."'],
          ['Click Restart on a container', 'No confirm; dialog "Logs · <name>" streams the last 300 lines every 1.5 s while it restarts'],
          ['Close the dialog', 'The table refreshes and the container state reads Running'],
        ],
      },
      {
        name: 'Run terminal commands',
        description: 'SUPER_ADMIN shell in the API container.',
        steps: [
          ['As SUPER_ADMIN open /server/terminal', 'Terminal with "Duncit server terminal — type a command and press Enter." and Suggested commands'],
          ['Type "df -h" and press Enter', 'Disk usage prints; each command is audited'],
          ['Click the suggested "Health endpoint"', '"$ wget -qO- http://localhost:2001/health" and its output are echoed'],
          ['Run a failing command', 'stderr prints followed by "[exit N]"'],
          ['Click the copy icon on a suggestion', 'Tooltip changes to "Copied"'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Database Backups',
    description: 'Full database archives: back up now, upload, schedule, download, restore with typed confirmation and delete, at /database/backups (SUPER_ADMIN).',
    sub_flows: [
      {
        name: 'Take a manual backup and download it',
        description: 'Back up now.',
        steps: [
          ['Open /database', 'Redirects to /database/backups'],
          ['Click "Back up now"', 'Toast "Backup started. It keeps running if you leave this page." and a row with status Backing up'],
          ['Click "Back up now" again while it runs', 'The button is disabled (server: "A backup is already running — wait for it to finish.")'],
          ['Wait for it to finish', 'Status Finished with Size, Documents, Collections and Run by'],
          ['Click "Download archive"', 'A signed link opens and the .dbk.gz downloads'],
        ],
      },
      {
        name: 'Schedule automatic backups',
        description: 'Automatic backups card.',
        steps: [
          ['Switch on "Take backups automatically" and choose Every week', 'A Day select appears'],
          ['Enter Archives to keep 0', 'Error "Keep at least 1"'],
          ['Set Sunday 03:00, keep 7 and click "Save schedule"', 'Toast "Backup schedule saved." and "Next run: <datetime>"'],
          ['After more than 7 scheduled runs', 'Older scheduled archives show "Archive deleted"; manual and uploaded ones are kept'],
        ],
      },
      {
        name: 'Upload an archive',
        description: 'Upload and verify a .dbk.gz.',
        steps: [
          ['Click "Upload archive" and choose a .zip', 'Error "Choose a .dbk.gz file — that is what Duncit writes its backups as."'],
          ['Choose a valid .dbk.gz and Upload', 'Progress "Uploading… N%" then "Reading the archive…"; toast "Uploaded. The archive is being read now..."'],
          ['Upload a foreign gzip renamed .dbk.gz', 'The row becomes Failed with "This is not a Duncit backup archive: it carries no header."'],
        ],
      },
      {
        name: 'Restore from a backup',
        description: 'Typed confirmation restore.',
        steps: [
          ['Click "Restore from this backup" on a finished row', 'Dialog "Restore the database" with red "This replaces live data" and "Type <db> to confirm"'],
          ['Type a wrong database name', '"Restore now" stays disabled'],
          ['Type the live database name and click "Restore now"', 'The restore banner shows "Restore running" with progress, then "Restore finished" with collections and documents restored'],
          ['Try restoring a FAILED row', 'Server refuses "Only a finished backup can be restored."'],
        ],
      },
      {
        name: 'Delete an archive',
        description: 'Keeps the history row.',
        steps: [
          ['Click "Delete archive"', 'Confirm "Delete this archive?" explaining the row stays in the table'],
          ['Confirm', 'Toast "Archive deleted." and the row shows "Archive deleted"'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Data Clone',
    description: 'Copy the production database into staging at /database/data-clone (SUPER_ADMIN), with verified connections and safety guards.',
    sub_flows: [
      {
        name: 'Configure clone connections',
        description: 'Settings dialog for production and staging.',
        steps: [
          ['Open /server/data-clone', 'Redirects to /database/data-clone'],
          ['Before connections are verified', 'Red alert "A clone cannot start yet. Add the production connection in Data Clone -> Settings."'],
          ['Click Settings and enter "http://x" as the production connection string', 'Error "A connection string starts with mongodb:// or mongodb+srv://."'],
          ['Enter a valid string and database and click "Save & connect"', 'The accordion chip reads Connected with "Last checked <when> — N collections found"'],
          ['Point staging at the same cluster and database', 'Error "This is the same cluster and database as the production connection..."'],
        ],
      },
      {
        name: 'Clone production into staging',
        description: 'Confirmed clone with progress and nav guard.',
        steps: [
          ['With both connected read the page', 'Chips "Source (production): <db>" → "Target (staging): <db>"'],
          ['Click "Start clone"', 'Confirm "Replace the staging data?" warning staging-only data is lost'],
          ['Click "Clone now"', 'Progress card "Cloning" with "Copying <collection>", per-collection list and documents copied'],
          ['Click another nav item while it runs', 'Dialog "A clone is still running" with "Leave anyway" and "Stay on this page"'],
          ['Wait until done', 'Status Finished; the "Never cloned" list (e.g. enventries, apikeys, emaillogs) kept staging values'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Rate Limiting',
    description: 'Callers, rules, recorded breaches and global switches at /rate-limiting/systems, rules, blocked and settings.',
    sub_flows: [
      {
        name: 'Review systems calling the API',
        description: 'Systems landing page.',
        steps: [
          ['Open /rate-limiting', 'Redirects to /rate-limiting/systems with Refused (24h), Recorded (24h), Counter store tiles'],
          ['Read the table', 'System, Surface, Requests, Blocked, Rules (orange "None" when unlimited), Last seen'],
          ['Read the notice', '"N system(s) have no enabled rule that can reach them. Traffic from those is unlimited."'],
        ],
      },
      {
        name: 'Create a rule in monitor mode',
        description: 'New rule dialog validation.',
        steps: [
          ['Open /rate-limiting/rules and click "New rule"', 'Dialog "New rule" defaulting to Monitor, priority 100, 100 requests / 60 s, sliding window'],
          ['Enter a 2-character name', 'Error "At least 3 characters."'],
          ['Set Algorithm Fixed window with Burst 10', 'Error "Only the token bucket has a burst. Set it to 0 or change the algorithm."'],
          ['Set Requests 0', 'Error "Must be at least 1."'],
          ['Enter valid values for channel GraphQL, fields "login*" and Save', 'Snackbar "Saved"; the rule lists as Monitor with the allowance summary'],
          ['Exceed the limit from a client', 'A Monitor row appears in /rate-limiting/blocked and the request still succeeds'],
        ],
      },
      {
        name: 'Enforce, toggle and delete a rule',
        description: 'Refusals and row actions.',
        steps: [
          ['Edit the rule, set Mode Enforce and Save', 'Snackbar "Saved"'],
          ['Exceed the limit again', 'GraphQL error RATE_LIMITED (HTTP 429) with the refusal message and Retry-After'],
          ['Toggle the Enabled switch off', 'The rule no longer applies'],
          ['Delete the rule', 'Confirm "Delete rule" — traffic it governed becomes ungoverned; the row disappears'],
        ],
      },
      {
        name: 'Clear breaches and change global settings',
        description: 'Blocked page and Settings.',
        steps: [
          ['On /rate-limiting/blocked click "Clear recorded breaches"', 'Confirm "Clear recorded breaches"; the table empties ("Nothing has breached a rule yet.")'],
          ['Open /rate-limiting/settings and enter a 3-character default message', 'Error "Write something the refused caller will understand."'],
          ['Enter Keep breaches for 100', 'Error "Whole days, 1 to 90."'],
          ['Switch "Watch only" on and Save', 'Snackbar "Saved"; every rule records instead of refusing'],
          ['Click "Reset live counters" and confirm', 'Snackbar "Counters reset"; anyone being refused is let back in'],
          ['Switch "Rate limiting on" off and Save', 'Warning "Rate limiting is switched off. No rule is being applied to any request."'],
        ],
      },
    ],
  },
  {
    name: 'Tech: App Builds',
    description:
      'Android and iOS CI builds at /app-builds/android and /app-builds/ios: create a build, watch it, download artifacts, push to Google Play and delete. Server resolvers allow SUPER_ADMIN and TECH_MANAGER.',
    sub_flows: [
      {
        name: 'Browse builds and open build details',
        description: 'Per-platform build table with live polling.',
        steps: [
          ['Open /app-builds', 'Redirects to /app-builds/android with header "Android Builds"'],
          ['Look at the table', 'Columns When, Status, Version, File, Commit, Changes, Size, Took, Environment, Started by, Slack, Google Play, Links; empty text "No builds yet — they appear here after the next merge to main."'],
          ['Search a commit SHA', 'Only builds with that commit are listed'],
          ['Hover the status of a QUEUED/RUNNING row', 'Tooltip "<stage> — Running for N min"; the table refetches every 15 s while it is live'],
          ['Hover a row stuck QUEUED for over 130 minutes', 'Warning tooltip "This build never reported an outcome..."'],
          ['Click a row', 'Build details dialog with Version, Environment, Started by, Size, Took, Progress stages, Artifacts, Google Play pushes and Commits'],
          ['Switch to /app-builds/ios', 'Header "iOS Builds"; rows are IPA builds and no Google Play column is shown'],
        ],
      },
      {
        name: 'Create a build from the portal',
        description: 'Create a build dialog dispatching the android-build or ios-build workflow.',
        steps: [
          ['Remove the GitHub entry in Environment Variables and click "Create build"', 'Warning "No GitHub token is configured, so the portal cannot start a build..." and the submit button is disabled'],
          ['Restore GitHub and open "Create build" on Android', 'Dialog "Create a build" with Server and database (Production), What to build (APK, AAB), Submit AAB to Google Play and Branch (main)'],
          ['Untick both APK and AAB', 'Error "Pick at least one artifact to build."'],
          ['Switch Server and database to Staging', 'Branch follows to staging and the staging hint warns the build must not go to real users'],
          ['Tick "Submit AAB to Google Play"', 'Environment is forced to Production, AAB is ticked and Staging is disabled'],
          ['Enter branch "feature..x"', 'Error "That is not a valid branch or tag name."'],
          ['Enter a valid branch and click "Create build"', 'Toast "Build DUN-BLD-… queued. It appears in the table as soon as a runner picks it up." and a QUEUED row started from Tech portal appears'],
          ['Create a build on a branch without the workflow', 'Error "GitHub refused the run: … Merge the workflow change into that branch first." and no row is kept'],
        ],
      },
      {
        name: 'Push a build to Google Play',
        description: 'Internal or Production track push for a production AAB.',
        steps: [
          ['Hover Internal on a staging or failed build', 'Disabled with "Only a successful production build with a stored AAB can go to Google Play."'],
          ['Click Internal on a successful production build', 'Confirm "Push <build> to Google Play internal?" explaining only listed testers can install it'],
          ['Click Push', 'Toast "Push to Google Play internal started for <build>. The row updates as Google answers." and the cell shows a spinner'],
          ['Wait for Google to accept', 'The cell shows a green check with "On Google Play internal as version code N"'],
          ['Click Production on the same build', 'A destructive confirm warns it rolls out to EVERY user on Google Play'],
          ['Push again while one push is in flight via the API', 'Server refuses "A push to Google Play is already in progress for <build>."'],
          ['Push with Google Play not connected', 'Error "Google Play is not connected. Add a service account key and package name in Environment Variables → Google Play."'],
        ],
      },
      {
        name: 'Download artifacts and delete a build',
        description: 'Artifact links and destructive delete.',
        steps: [
          ['Click the APK download icon on a successful build', 'The stored APK downloads'],
          ['Hover the warning icon on a build whose file never stored', 'Tooltip "The build succeeded but its file was not stored." or the artifact error'],
          ['Click "View run"', 'The GitHub Actions run opens in a new tab'],
          ['Click Delete on a row', 'Confirm "Delete this build?" — "<build> and its stored file are removed for good. The download link stops working immediately."'],
          ['Confirm Delete', 'Toast "Build deleted." and the row disappears'],
        ],
      },
      {
        name: 'App build settings',
        description: 'Slack channels, CI token and Google Play status at /app-builds/settings.',
        steps: [
          ['Open /app-builds/settings with Slack not connected', 'Warning "Slack is not connected. Add a bot token in Environment Variables → Slack first..." and no channel form'],
          ['With Slack connected, paste "abc" as the Android builds channel', 'Error "A Slack channel ID looks like C0123ABCD."'],
          ['Paste an ID the bot cannot see and Save', 'Hint that no channel with this ID is visible to the bot; toast "Build channels saved."'],
          ['Click "Generate CI token"', 'Read-only secret name DUNCIT_RELEASE_TOKEN and a one-time token value with copy buttons; "Shown once — it is not stored here."'],
          ['Click "Copy the token"', 'Toast "Copied."'],
          ['Read the Google Play card when not connected', 'Warning that Google Play is not connected, with an "Open Environment Variables" button that navigates to /'],
        ],
      },
    ],
  },
  {
    name: 'Tech: E2E Runs',
    description: 'End-to-end suite runs at /e2e/runs: run the suite on a branch, watch progress, read suite results and recordings, delete runs.',
    sub_flows: [
      {
        name: 'Start an e2e run',
        description: 'Run the e2e suite dialog dispatching e2e.yml.',
        steps: [
          ['Open /e2e', 'Redirects to /e2e/runs with header "E2E Tests"; empty text "No runs yet. Press Run tests, or wait for the nightly sweep."'],
          ['Click "Run tests"', 'Dialog "Run the e2e suite" with grouped suite checkboxes (All / None), all ticked, and Branch defaulting to the settings branch'],
          ['Click None', 'Error "Pick at least one suite." and the submit is disabled'],
          ['Enter branch "bad..ref"', 'Error "That is not a branch or tag name git would accept."'],
          ['Tick a suite, keep branch staging and click "Run tests"', 'Toast "Run DUN-E2E-… queued. It appears in the table as soon as a runner picks it up."'],
          ['Wait for the runner to start', 'Status changes Queued -> Running with a stage tooltip; the table polls every 15 s'],
          ['Dispatch with GitHub not configured', 'Warning "GitHub is not configured. Add an access token, owner and repository in Environment Variables → GitHub."'],
        ],
      },
      {
        name: 'Read a finished run',
        description: 'Run details dialog.',
        steps: [
          ['Hover the Suites cell of a failed run', 'Red chips name up to 3 failed suites plus "+N"'],
          ['Click the row', 'Dialog with run number, "<branch> · passed/tests tests passed", Branch, Took, Asked for, Started by, Commit and "Identity this run used"'],
          ['Read the Suites section', 'Rows ordered Failed, Running, Passed, Skipped with counts, "Open this job" and "Watch the recording" links'],
          ['Open a run whose recordings failed to upload', 'Info "The recordings did not reach Slack: <reason>"'],
          ['Click "Open the GitHub run"', 'The GitHub run opens in a new tab'],
        ],
      },
      {
        name: 'Delete a run',
        description: 'Destructive delete including Slack recordings.',
        steps: [
          ['Click "Delete run" on a row', 'Confirm "Delete this run?" — "<run> and everything it recorded will be removed. This cannot be undone."'],
          ['Confirm', 'Toast "Run deleted." and the row disappears; its Slack recordings are removed best-effort'],
        ],
      },
    ],
  },
  {
    name: 'Tech: E2E Flows',
    description: 'Documenting e2e flows, sub flows and steps at /e2e/flows and /e2e/flows/:flowId.',
    sub_flows: [
      {
        name: 'Add, edit and delete a flow',
        description: 'Flows table CRUD.',
        steps: [
          ['Open /e2e/flows', 'Header "Flows" with columns Name, Sub flows, Updated, Actions; empty text "No flows yet. Add the first one, e.g. User Authentication."'],
          ['Click "Add flow" and enter a 1-character name', 'Error "Enter between 2 and 120 characters."'],
          ['Enter a 501-character description', 'Error "Keep it to 500 characters or fewer."'],
          ['Enter name "User Authentication" and Save', 'Toast "Flow saved." and the row appears with 0 sub flows'],
          ['Click Edit, change the description and Save', 'Toast "Flow saved." and the description updates'],
          ['Search by a sub flow name', 'The parent flow is listed'],
          ['Click Delete on the flow', 'Confirm "Delete this flow?" — "<name> and every sub flow inside it will be removed..."; on confirm toast "Flow deleted."'],
        ],
      },
      {
        name: 'Add a sub flow with steps',
        description: 'Flow detail page and sub flow dialog.',
        steps: [
          ['Click a flow row', 'Navigates to /e2e/flows/:flowId with "Flow" eyebrow, the name, "Edit flow" and a sub flows table ("No sub flows yet. Add one, e.g. User Login.")'],
          ['Click "Add sub flow"', 'Dialog "Add sub flow" with Name, Description and one empty step (Action, Expected result)'],
          ['Save with the Action empty', 'Error "Describe what the person does."'],
          ['Enter a 301-character action', 'Error "Keep it to 300 characters or fewer."'],
          ['Click "Add step" twice, fill actions, click the remove icon on one', 'Steps renumber; remove is disabled when only one step is left'],
          ['Save a valid sub flow', 'Toast "Sub flow saved." and the row shows its step count'],
          ['Add steps until 100', '"Add step" is disabled at 100 steps'],
        ],
      },
      {
        name: 'Edit and delete a sub flow',
        description: 'Row click opens the editor.',
        steps: [
          ['Click a sub flow row', 'Dialog "Edit sub flow" prefilled with its steps'],
          ['Change a step expected result and Save', 'Toast "Sub flow saved."'],
          ['Click Delete on the sub flow', 'Confirm "Delete this sub flow?"; on confirm toast "Sub flow deleted."'],
          ['Open /e2e/flows/<deleted-id>', '"This flow does not exist. It may have been deleted."'],
          ['Restart the server', 'Catalogue flows missing by name are seeded by "system"; edited sub flows are not overwritten'],
        ],
      },
    ],
  },
  {
    name: 'Tech: E2E Settings',
    description: 'Nightly schedule, swept suites, run identity, test-only overrides and Slack results at /e2e/settings.',
    sub_flows: [
      {
        name: 'Turn on the nightly schedule',
        description: 'Schedule fields and next-run banner.',
        steps: [
          ['Open /e2e/settings with the schedule off', 'Warning "The schedule is off. The suite only runs when somebody starts it."'],
          ['Switch on "Run the suite on a schedule", choose Every week and a Day', 'The Day select appears for weekly'],
          ['Enter Keep last 0', 'Error "Keep between 1 and 1000 runs."'],
          ['Enter an invalid Branch', 'Error "That is not a branch or tag name git would accept."'],
          ['Set Run at 03:00 and Save', 'Toast "Settings saved." and info "Next run <when>."; enabling does not start a run immediately'],
        ],
      },
      {
        name: 'Set the run identity',
        description: 'Email prefix, domain, password and phone.',
        steps: [
          ['Enter an Email prefix without a domain', 'Error "A prefix needs a domain, and a domain needs a prefix."'],
          ['Enter domain "https://duncit.com"', 'Error "That is not a domain — no scheme, no path."'],
          ['Enter a prefix and a plain domain', 'Preview "Runs as <prefix>ddmmyyyyhhmm@<domain>" appears'],
          ['Leave Password blank on an existing identity and Save', 'The saved password is kept; the field shows "A password is saved"'],
        ],
      },
      {
        name: 'Test-only overrides',
        description: 'Hold communications and run-account one-time codes.',
        steps: [
          ['Switch on "Hold all communications" only', 'Warning "Nothing is reaching anyone right now — no booking confirmations, no refund notices, no one-time codes..."'],
          ['Switch on "One-time codes for the run account"', 'Error alert "This server is an e2e target: anyone with the Tech release token can read the run account’s one-time codes..."'],
          ['Save and trigger an email from the platform', 'The email is not sent and is logged with the hold reason'],
          ['Switch both off and Save', 'Toast "Settings saved." and communications flow again'],
        ],
      },
      {
        name: 'Slack results and recordings',
        description: 'Results channel and video recording switch.',
        steps: [
          ['Open Slack results with Slack not connected', 'Info "Slack is not connected, so there is nothing to post to..."'],
          ['With Slack connected enter channel "abc"', 'Error "That is not a Slack channel ID — they look like C0123ABCD."'],
          ['Turn on recording with a bot token lacking files:write', 'Warning "The Slack bot token cannot upload files, so nothing will be posted..."'],
          ['Save a valid channel', 'Toast "Settings saved."; a finished run posts its result there'],
          ['Read "Can CI reach us?"', '"Last reported <when>, as <who>." or "No run has ever reported here..."'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Stress Testing',
    description:
      'Load tests from GitHub runners at /stress-testing/runs, /stress-testing/runs/:runId and /stress-testing/settings, with live pulse, guardrails and an AI verdict.',
    sub_flows: [
      {
        name: 'Watch the live server pulse',
        description: 'Pulse card on the runs page.',
        steps: [
          ['Open /stress-testing', 'Redirects to /stress-testing/runs with header "Stress Testing" and a "Live server pulse" card'],
          ['Read the tiles', 'Signed-in users, Visitors, Open sockets, Requests / s, Bot requests / s, Server p95, Host CPU, Host memory and Event-loop lag refresh every 5 s'],
          ['Read the runs table with no runs', 'Empty text "No stress runs yet."'],
        ],
      },
      {
        name: 'Start a smoke run on staging',
        description: 'New stress test dialog validation and dispatch.',
        steps: [
          ['Click "New stress test" on the staging Tech portal', 'Dialog "New stress test" with a Staging chip; Smoke preset selected (10 users, 1 bot, 1 runner, 10 s ramp-up, 60 s hold)'],
          ['Set Virtual users to 0', 'Error "Between 1 and 500."'],
          ['Set Runners 5 with Virtual users 2', 'Error "Every runner needs at least one virtual user."'],
          ['Set Hold so the total exceeds the max duration', 'Error "Ramp-up + hold + ramp-down must fit in 30 minutes."'],
          ['Untick every journey', 'Error "Pick at least one journey."'],
          ['Restore Smoke and click "Start run"', 'Toast "DUN-STR-… started — waiting for a runner" and navigates to /stress-testing/runs/:runId'],
          ['Open "New stress test" while that run is live', 'Warning "<run> is still running. Stop it before starting another." and Start is disabled'],
        ],
      },
      {
        name: 'Production run safeguards',
        description: 'Only a Super Admin with typed confirmation.',
        steps: [
          ['As a TECH_MANAGER open "New stress test" on production', 'Warning "Only a Super Admin can start a stress run against production."'],
          ['As a SUPER_ADMIN open the dialog on production', 'Red alert about real load on PRODUCTION and a "Type PRODUCTION to confirm" field'],
          ['Type "production"', 'Error "Type PRODUCTION exactly."'],
          ['Open the dialog on a local server', 'Warning "Stress runs cannot target a local server — GitHub runners cannot reach it..."'],
        ],
      },
      {
        name: 'Follow and stop a live run',
        description: 'Run detail page while live.',
        steps: [
          ['Open a QUEUED run', 'Info "Waiting for GitHub to start a runner — this usually takes under a minute."'],
          ['When running, read the page', 'Live KPI tiles, charts (Throughput, Latency, Users, Error rate, Host, API responsiveness), "Bots right now", Run log and Plan'],
          ['Click "Stop run"', 'Confirm "Stop this run?" — "Every runner of <run> will wind down within a few seconds. The results so far are kept."'],
          ['Confirm', 'Status becomes Stopping with "Stopped by <you>" and later Aborted; the Delete action appears only once it is not live'],
          ['Let error rate breach the guardrail for the configured samples', 'The run stops with "Guardrail tripped — error rate X% ≥ Y%"'],
          ['Let host CPU reach the terminate limit', 'Red alert "Terminated — host CPU X% ≥ Y%"'],
        ],
      },
      {
        name: 'Report, AI verdict and delete',
        description: 'After the run ends.',
        steps: [
          ['Open a completed run', 'Tiles Requests, Error rate, p50/p95/p99 latency, Page load, Peak users, Peak host CPU, Elapsed and a "Download report" button'],
          ['Click "Download report"', 'A self-contained <run>-stress-report.html downloads'],
          ['Click "Generate verdict"', '"Reading the run…" then toast "Verdict ready" with grade, Handles comfortably, Breaking point, Confidence, Bottlenecks and What to upgrade'],
          ['Open a run that never generated load', '"Generate verdict" is disabled: "This run never generated load, so there is nothing to judge."'],
          ['Delete a finished run from the table', 'Confirm "Delete this run?"; toast "Run deleted"'],
          ['Call deleteStressRun on a live run', 'Server refuses "Stop the run before deleting it."'],
        ],
      },
      {
        name: 'Stress testing settings',
        description: 'Ceilings, guardrails and retention.',
        steps: [
          ['Open /stress-testing/settings', 'Header "Stress Testing Settings" with Ceilings, Guardrails and Keep samples (days)'],
          ['Set Max runners 25', 'Error "Must be between 1 and 20."'],
          ['Set Stop at p95 latency 50', 'Error "Must be between 100 and 120000."'],
          ['Enter 2.5 in Consecutive samples', 'Error "Enter a whole number."'],
          ['Set valid values and Save', 'Toast "Saved" and "Last updated <at>"; the New stress test dialog uses the new maximums'],
        ],
      },
    ],
  },
  // -------------------------------------------------------------- SUPPORT
  {
    name: 'Support: Access and dashboard',
    description:
      'support.duncit.com requires SUPPORT_MANAGER. Ticket, chat, SOS and callback resolvers also admit SUPER_ADMIN and SUPPORT_USER; FAQ writes admit SUPER_ADMIN, CITY_ADMIN and SUPPORT_MANAGER.',
    sub_flows: [
      {
        name: 'Role gate for the Support portal',
        description: 'Only support staff reach the desk.',
        steps: [
          ['Sign in to support.duncit.com with an account lacking SUPPORT_MANAGER', 'The shell refuses access'],
          ['Call updateMailAutomationRule with a SUPPORT_USER token', 'FORBIDDEN — mail automation rules allow only SUPER_ADMIN and SUPPORT_MANAGER'],
          ['Sign in with a SUPPORT_MANAGER account', 'Dashboard opens with nav SOS Alerts, Callback Requests, Tickets, Chat with Us, FAQs, Mail Automation, Reported Problems'],
        ],
      },
      {
        name: 'Live counters on the Support Dashboard',
        description: 'Five stat cards updated over the support socket.',
        steps: [
          ['Open /', 'Header "Support Dashboard" with cards Active SOS alerts, Pending callbacks, Open tickets, Open chats, New FAQ submissions'],
          ['Raise an SOS from the app while the dashboard is open', 'Active SOS alerts increments without a reload'],
          ['Click the "Open tickets" card', 'Navigates to /tickets'],
          ['Click "New FAQ submissions"', 'Navigates to /faqs/submissions'],
        ],
      },
    ],
  },
  {
    name: 'Support: SOS Alerts',
    description: 'Live safety alerts raised by users during a pod, at /sos and /sos/:id.',
    sub_flows: [
      {
        name: 'Acknowledge and resolve an SOS alert',
        description: 'Status moves ACTIVE -> ACKNOWLEDGED -> RESOLVED.',
        steps: [
          ['Open /sos', 'Header "SOS Alerts" with columns ID, User, Pod, Phone, Status, Raised; empty text "No SOS Alerts Found"'],
          ['Filter Status to Active', 'Only Active alerts are listed'],
          ['Open an active alert', '/sos/:id shows the user, ticket number, status Active, pod, message, a tel: link, "Open in Maps" and the host contact'],
          ['Click "Open in Maps"', 'Google Maps opens in a new tab at the alert coordinates'],
          ['Click Acknowledge', 'Status chip changes to Acknowledged and the Acknowledge button disappears'],
          ['Click "Mark resolved"', 'Status chip changes to Resolved and no action buttons remain'],
          ['Call acknowledgeBouncerSos for the resolved alert', 'Server answers "Already resolved"'],
          ['Open /sos/unknown', 'Text "This alert could not be found."'],
        ],
      },
    ],
  },
  {
    name: 'Support: Callback Requests',
    description: 'Users asking to be called back, at /callbacks and /callbacks/:id.',
    sub_flows: [
      {
        name: 'Mark a callback contacted and close it',
        description: 'Records call duration and conclusion.',
        steps: [
          ['Open /callbacks', 'Header "Callback Requests" with columns ID, User, Description, Requested, Status; empty text "No Callback Requests Found"'],
          ['Open a pending request', 'Detail shows user, ticket number, status Pending, phone link, Pod and Reason, with Call duration (min) and Conclusion fields'],
          ['Enter duration 5 and a conclusion, click "Mark contacted"', 'Status becomes Contacted and "Outcome: 5 min · <conclusion>" shows'],
          ['Click Close', 'The request is closed; the outcome fields and buttons disappear'],
          ['Open /callbacks/unknown', 'Text "This request could not be found."'],
        ],
      },
    ],
  },
  {
    name: 'Support: Tickets',
    description: 'Support tickets from the app, website and connected mailboxes at /tickets and /tickets/:id.',
    sub_flows: [
      {
        name: 'Browse and sort the ticket queue',
        description: 'Table with priority-first sort and live updates.',
        steps: [
          ['Open /tickets', 'Header "Tickets" with columns Ticket ID, Subject, User, Category, Source, Status, Priority, Last activity, Created'],
          ['Change Sort to Low', 'Low priority tickets are listed first'],
          ['Filter Source', 'Options are Duncit App, Duncit\'s Main Website and Connected Mailbox'],
          ['Create a ticket from the app while the list is open', 'The new ticket appears without a reload'],
          ['Click a row', 'Navigates to /tickets/:id'],
        ],
      },
      {
        name: 'Raise a new ticket from the portal',
        description: 'New Ticket dialog.',
        steps: [
          ['Click "New Ticket"', 'Dialog "New Ticket" with Subject, Category (default GENERAL), Description editor and attachments'],
          ['Leave Subject empty or Description blank', 'Create stays disabled'],
          ['Fill subject and description, attach a file, click Create', 'Navigates to the new /tickets/:id; the ticket is OPEN, MEDIUM priority and raised under the signed-in agent\'s own account'],
        ],
      },
      {
        name: 'Reply, prioritise and resolve a ticket',
        description: 'Conversation, priority and status changes.',
        steps: [
          ['Open an OPEN ticket', 'Header shows the ticket number, subject, Mark resolved, transcript menu, Priority and Status selects; the thread and user details panel render'],
          ['Type a reply with an attachment and click Send', 'The reply appears in the thread and the status moves OPEN -> PENDING'],
          ['Reply on a ticket whose Source is Connected Mailbox', 'The reply is also emailed on the original thread; if that fails a system note says it was saved but could NOT be emailed'],
          ['Change Priority to HIGH', 'The priority persists after reload'],
          ['Click "Mark resolved"', 'Confirm "Mark this ticket resolved?" — the user can leave feedback and it can be re-opened'],
          ['Confirm', 'Status becomes RESOLVED with a system note "Ticket marked resolved by <agent>"; the user gets the resolved email; the composer is replaced by "This ticket is resolved..." and a Close button'],
          ['After the user rates it, view the ticket', 'A "User feedback" panel shows the rating emoji, value, label and comment'],
        ],
      },
      {
        name: 'Close and re-open a ticket',
        description: 'Closing makes the ticket read-only.',
        steps: [
          ['On a RESOLVED ticket click Close', 'Confirm "Close this support ticket?" warning it becomes permanently read-only'],
          ['Click "Close ticket"', 'Alert "This ticket is closed and read-only. The user can reopen it within the allowed window."'],
          ['Click "Re-open ticket"', 'Status returns to OPEN, "Re-opened this ticket." is added to the thread and the composer is available again'],
          ['As the user, try to reopen a ticket resolved more than 3 days ago', 'Server refuses: "This ticket can no longer be reopened — the 3-day window has passed. Please raise a new ticket."'],
        ],
      },
      {
        name: 'Export a ticket transcript',
        description: 'TXT/DOCX download or email.',
        steps: [
          ['Open the transcript menu (Export transcript)', 'Options Download .txt, Download .docx, Email transcript…'],
          ['Click "Download .docx"', 'A .docx transcript downloads'],
          ['Choose "Email transcript…", leave the address empty', 'Send is disabled'],
          ['Enter an email and Send', 'Notice "Transcript emailed to <email>."'],
        ],
      },
    ],
  },
  {
    name: 'Support: Chat with Us',
    description: 'Real-time support chat inbox at /live-chat with Open and Resolved tabs.',
    sub_flows: [
      {
        name: 'Pick up and answer a chat',
        description: 'Claim, read receipts, typing and messages over the socket.',
        steps: [
          ['Open /live-chat', 'Session inbox with Open/Resolved tabs, search, and "Select a session to open the chat." in the pane'],
          ['Start a chat from the app', 'A new session appears flagged NEW'],
          ['Click the session', 'It is claimed by you, marked read and the NEW flag clears; the thread loads'],
          ['Type in the app', 'The pane shows "<name> is typing…"'],
          ['Send a message with an attachment', 'The message appears with Sending then Delivered/Seen ticks'],
          ['Search a phrase from a session\'s last message', 'The inbox filters to matching sessions (search matches the last message preview, not the user name)'],
          ['Switch to the Resolved tab with none', '"No resolved chats."'],
        ],
      },
      {
        name: 'Resolve, re-open and export a chat',
        description: 'Session lifecycle and transcript.',
        steps: [
          ['Click "Mark resolved" in the chat header', 'Confirm "Mark this chat resolved?" — the user will be asked for feedback'],
          ['Confirm', 'The session moves to the Resolved tab'],
          ['Open it from Resolved and re-open it', 'It returns to the Open tab'],
          ['Email the transcript to an address', 'Snackbar "Transcript emailed to <email>."'],
        ],
      },
      {
        name: 'Create a user account from the chat inbox',
        description: 'Support can create an account for a caller.',
        steps: [
          ['Click create user in the inbox', 'Dialog "Create user account" with First name, Last name, Email, Ext, Phone (optional), Temporary password'],
          ['Enter a 7-character password', '"Create account" stays disabled (min 8 characters)'],
          ['Fill first name, email and an 8+ character password, click "Create account"', 'supportCreateUser runs the registration schema; today it returns "Validation failed" because phone, WhatsApp verification and date of birth are not sent (known gap)'],
          ['Once those fields are supplied, create the account', 'Alert "Account created for <email>." and the form clears'],
          ['Close the dialog', 'The dialog closes and the success alert resets'],
        ],
      },
    ],
  },
  {
    name: 'Support: FAQs',
    description: 'App FAQs (/faqs), Partner FAQs (/partners/faqs) and the FAQ Submissions queue (/faqs/submissions).',
    sub_flows: [
      {
        name: 'Create, edit and delete an App FAQ',
        description: 'Help Centre answers grouped by super category.',
        steps: [
          ['Open /faqs and click "New FAQ"', 'Dialog "New FAQ" with Super Category ("General (no category)" allowed), Question, Answer, Sort order and Active'],
          ['Enter a 4-character question', 'Error "Question must be at least 5 characters"'],
          ['Clear the Answer', 'Error "Answer is required"'],
          ['Save a valid FAQ', 'Toast "FAQ created" and the row appears; it shows in the app Help Centre'],
          ['Edit it and toggle Active off', 'Toast "FAQ updated"; status Hidden and it leaves the app'],
          ['Delete it', 'Confirm "Delete this FAQ?" — "This action cannot be undone."; on confirm toast "Deleted" and the row is removed'],
        ],
      },
      {
        name: 'Manage Partner FAQs',
        description: 'Answers for hosts, venues and brands filtered by topic.',
        steps: [
          ['Open /partners/faqs and click "New FAQ"', 'Dialog "New Partner FAQ" with Topic (Host, Venue, Products)'],
          ['Save without a Topic', 'Error "Topic is required" (server: "Partner FAQ topic is required")'],
          ['Save a Venue topic FAQ', 'Toast "Partner FAQ created"; it shows only to venue owners in the Partners console'],
          ['Delete it', 'Confirm "Delete this partner FAQ?"; toast "Partner FAQ deleted"'],
        ],
      },
      {
        name: 'Triage FAQ submissions',
        description: 'Questions from duncit.com with no published answer.',
        steps: [
          ['Open /faqs/submissions', 'Header "FAQ Submissions" with columns Question, Email, Super Cat., Status, Received, Actions'],
          ['Click "Mark Converted" on a New row', 'Status becomes Converted and the button disables'],
          ['Click Ignore on another row', 'Status becomes Ignored and Ignore disables'],
          ['Search by email', 'Only that person\'s submissions show'],
        ],
      },
    ],
  },
  {
    name: 'Support: Mail Automation',
    description: 'Reply rules for mailboxes connected in Tech: the auto-reply message, AI rewrite, queue and action time, at /mail-automation.',
    sub_flows: [
      {
        name: 'Configure a mailbox rule',
        description: 'Three-step wizard: Mailbox, Reply message, Ticket & action time.',
        steps: [
          ['Open /mail-automation with no mailbox connected', 'Empty text "No mailbox is connected yet. Ask Tech to connect one under Tech → Mail Automation."'],
          ['With a connected mailbox click Configure', 'Dialog "Rule for <email>" on step Mailbox; backdrop click and Escape do not close it'],
          ['Go Next and clear the reply message', 'Error "Write the reply message"'],
          ['Write a message without {{ticket_no}}', 'Error "Include {{ticket_no}} so the sender gets their reference"'],
          ['Add {{ticket_no}} and click "Preview the reply"', '"What the sender receives" shows "Your message, as written" (or "Written by AI from your message" when AI is on)'],
          ['Go Next and set Minimum hours 50 and Maximum hours 24', 'Error "Minimum cannot be more than maximum"'],
          ['Set Maximum hours 800', 'Error "Between 1 and 720 hours"'],
          ['Pick "Grievance ticket", valid hours, click Save', 'Toast "Rule saved"; the table row shows Opens = Grievance ticket and Acts within "24-48 hours"'],
        ],
      },
      {
        name: 'Recently answered threads',
        description: 'What the mailbox has replied to.',
        steps: [
          ['Configure a mailbox and look under the table', '"Recently answered" lists From, Subject, Ticket, Status, Received'],
          ['Send a first email to the mailbox', 'A ticket opens and the row reads "Replied <when>"'],
          ['Reply on the same email thread', 'No new ticket and no auto-reply — only the first message opens a ticket'],
        ],
      },
    ],
  },
  {
    name: 'Support: Reported Problems',
    description: 'In-app problem reports at /reported-problems and the Report a Problem configuration at /reported-problems/settings.',
    sub_flows: [
      {
        name: 'Review a reported problem',
        description: 'Report detail with the reporter snapshot and status.',
        steps: [
          ['Open /reported-problems', 'Header "Reported Problems" with columns Report ID, Category, What happened, Reported by, From, Status, Slack, Reported'],
          ['Open a report', 'Detail shows report number, status, category, platform, app version, screenshots, reporter snapshot and "Where it happened"'],
          ['Open a report whose Slack post failed', 'Warning "Not announced on Slack — <error>. The report itself is saved."'],
          ['Change Status to IN REVIEW', 'The status chip updates after the save'],
          ['Open /reported-problems/unknown', 'Warning "Report not found."'],
        ],
      },
      {
        name: 'Configure the Report a Problem form',
        description: 'Categories, prompt and screenshot limits the app shows.',
        steps: [
          ['Open /reported-problems/settings', 'Title "Configure Report a Problem" with Categories, The prompt and Screenshots'],
          ['Type a new category and press Enter', 'A category row is added with a Shown switch'],
          ['Turn a category\'s Shown switch off and Save', 'Snackbar "Saved — the app picks this up on its next open."; the chip disappears from the app form'],
          ['Remove every category', 'Save is disabled'],
          ['Turn off "Let reporters attach screenshots"', 'Max screenshots becomes disabled'],
        ],
      },
      {
        name: 'Route new reports to Slack',
        description: 'Slack notification card.',
        steps: [
          ['View the Slack notification card without a Slack bot token', 'Warning "No Slack bot token is configured. Connect Slack in the Tech portal before reports can be announced."'],
          ['With Slack connected pick a channel the bot is not in', 'Warning "The bot is not in this channel yet, so Slack will refuse the post. Invite it from the Tech portal first."'],
          ['Pick a joined channel and Save', 'Snackbar "Saved — new reports go to this channel from now on."'],
          ['File a report from the app', 'It is posted to the channel and the Slack column reads Sent'],
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ CRM
  {
    name: 'CRM: Access and dashboard',
    description:
      'crm.duncit.com requires CRM_MANAGER (SUPER_ADMIN also passes); almost every CRM resolver allows only SUPER_ADMIN and CRM_MANAGER. The dashboard charts venue and host leads.',
    sub_flows: [
      {
        name: 'Role gate for the CRM portal',
        description: 'Only CRM staff reach the console.',
        steps: [
          ['Sign in with an account lacking CRM_MANAGER', '"You do not have access to Duncit CRM. Please contact your administrator."'],
          ['Call venueLeadsTable with a CITY_ADMIN token', 'The server answers "Access Denied" (FORBIDDEN)'],
          ['Sign in as CRM_MANAGER', 'Dashboard opens with nav Leads, Tools, Reminders, Data, Email Templates, AI Call Prompts, Settings'],
        ],
      },
      {
        name: 'Read the CRM dashboard',
        description: 'Date range, KPIs and charts.',
        steps: [
          ['Open /', 'Header "CRM Dashboard" with tiles VENUE LEADS, HOST LEADS, TOTAL LEADS, WON %, SERVICES OFFERED'],
          ['Choose "All time"', 'Counts include every venue and host lead'],
          ['Choose Custom and pick From/To', 'Charts Leads by Stage, Leads by Priority, Leads by Super Category and Services Mix recompute for the range'],
          ['Pick a range with no leads', 'Charts show "No leads in the selected period."'],
          ['Mark a lead Won and reload', 'WON % increases'],
        ],
      },
    ],
  },
  {
    name: 'CRM: Venue Leads',
    description: 'Venue partnership leads at /venue-leads (list, /new, /:id edit, /:id/view detail) with import, export, AI fill and delete.',
    sub_flows: [
      {
        name: 'Create a venue lead',
        description: 'Sectioned form validation.',
        steps: [
          ['Open /venue-leads and click "New Venue Lead"', 'Navigates to /venue-leads/new with 14 collapsible sections and "Expand all" / "Collapse all"'],
          ['Click "Create venue lead" with everything empty', 'Top alert "N field(s) have validation errors"; sections with errors open with red headers'],
          ['Read the messages', '"Super category is required", "Venue name is required", "Select at least one venue type", "City is required", "Full address is required", "Primary contact name is required", "Primary contact mobile is required"'],
          ['Pick Venue Type "Other" without specifying', 'Error "Please specify the "Other" venue type"'],
          ['Enter website "example"', 'Error "Enter a valid website"'],
          ['Fill all required fields, amenities and a follow-up date and create', 'Navigates to /venue-leads and the new lead is listed with status New and priority Medium'],
          ['Create another lead with the same primary mobile', 'Alert "A venue lead with this phone number already exists. Each lead must have a unique phone number."'],
        ],
      },
      {
        name: 'Edit and delete a venue lead',
        description: 'Status changes happen in the edit form.',
        steps: [
          ['Click Edit on a row', '/venue-leads/:id opens "Edit <venue_name>" prefilled'],
          ['Set Lead Status to Negotiation and Priority High and update', 'Back on the list the row shows Negotiation and High'],
          ['Click Delete on a row', 'Confirm "Delete venue lead" — "Delete "<name>"? This cannot be undone."'],
          ['Confirm', 'Toast "Venue lead deleted" and the row disappears'],
        ],
      },
      {
        name: 'Import venue leads from Excel',
        description: 'Template, column mapping and per-row results.',
        steps: [
          ['Click Template', 'duncit-venue-leads-template.xlsx downloads with Template and Instructions sheets; toast "Template downloaded"'],
          ['Click Import and choose a file with no header row', 'Error "No column headers found in the first row."'],
          ['Choose a filled template', 'Column mapping step; venue_name, city and full_address show "required" chips and Import is disabled until mapped'],
          ['Map columns and click Import', 'Result "Imported X of Y rows · N failed" with a Row/Reason table; toast "Imported X of Y rows"'],
          ['Include a row whose phone already exists', 'That row fails with "A lead with phone "…" already exists — skipped to avoid a duplicate..."'],
          ['Click Export', 'duncit-venue-leads-export.xlsx downloads; toast "Venue leads exported"'],
        ],
      },
      {
        name: 'Fill venue leads with AI',
        description: 'Parse free text into editable rows.',
        steps: [
          ['Click "Fill with AI" and Parse with empty text', 'Error "Paste some text to parse first."'],
          ['Paste a description of two venues and Parse', '"2 records found. Edit any cell, then Confirm & save." with an editable grid'],
          ['Clear the City of one row and click "Confirm & save 2"', 'That row turns red with "City is required"; result "1 created · 1 need fixing"'],
          ['Fix the row and confirm again', 'Toast "Created 1 venue lead(s)" and the dialog closes'],
        ],
      },
      {
        name: 'Venue lead detail tabs',
        description: 'Overview, contacts, commercial, services, linked hosts and custom fields.',
        steps: [
          ['Click a venue row', '/venue-leads/:id/view shows name, status, priority, city chips, Ask AI, Edit, Call, WhatsApp, Email and stat tiles'],
          ['Open ?selectedtab=overview', 'Venue details, Location with Google map and Lead tracking'],
          ['Open the Commercial tab', 'Pricing models, Expected charges, Security deposit, GST, Invoice'],
          ['Open the Linked Hosts tab and click a host', 'Navigates to that host lead\'s detail page'],
          ['Open the Custom Fields tab with none defined', '"No custom fields defined yet. Open Settings → Dynamic Fields to add some."'],
          ['Click "Ask AI" and choose "Summarise this lead"', 'The drawer answers with a summary using the lead, reminders and fetched website pages'],
        ],
      },
      {
        name: 'Manage venue services catalogue',
        description: '/venue-leads/services.',
        steps: [
          ['Click "Manage Venue Services"', 'Page "Manage Venue Services" with Order, Service name, Active, Actions'],
          ['Click "Add service" and save an empty name', 'Error "Service name is required"'],
          ['Add "Coaching / Training"', 'The row appears active'],
          ['Add the same name again', 'Error "A service with that name already exists for this catalogue"'],
          ['Delete a service', 'Confirm explains existing leads keep their entries; the row is removed'],
        ],
      },
    ],
  },
  {
    name: 'CRM: Host Leads',
    description: 'Host and organizer leads at /host-leads (list, /new, /:id, /:id/view, /services).',
    sub_flows: [
      {
        name: 'Create and qualify a host lead',
        description: 'Host lead form.',
        steps: [
          ['Open /host-leads and click "New Host Lead"', 'Form "New Host Lead" with Basic Details, Contact Details, Event Preferences, Budget & Revenue, Timeline, Social / Reach, Website, Services Offered, Photo & Tags, Custom Fields, Internal Tracking'],
          ['Submit without Host Name', 'Error "Host name is required"'],
          ['Enter Community Size "abc"', 'Error "Community size must be a whole number"'],
          ['Fill required fields, set Host Intent Score and Lead Status Qualified and create', 'Navigates to /host-leads with the lead listed as Qualified'],
          ['Open its detail page and the Plans & Timeline tab', 'Budget, Revenue models, Needs venue, Needs vendor and preferred date/day/slot'],
        ],
      },
      {
        name: 'Import, export and delete host leads',
        description: 'Excel import and hard delete.',
        steps: [
          ['Import a host sheet with a row missing host_name', 'That row fails with "host_name is required"'],
          ['Click Export', 'duncit-host-leads-export.xlsx downloads; toast "Host leads exported"'],
          ['Delete a host lead', 'Confirm "Delete host lead"; toast "Host lead deleted"'],
          ['Open /host-leads/services', 'Page "Manage Host Services" (catalogue type HOST)'],
        ],
      },
      {
        name: 'Validate the new host lead form at /host-leads/new',
        description: 'Zod rules on the sectioned host form and the server duplicate-phone guard (CRM_MANAGER or SUPER_ADMIN).',
        steps: [
          ['Open /host-leads/new directly', 'Heading "New Host Lead" with sections 1. Basic Details (open) to 11. Internal Tracking, Lead status New, priority Medium, Cancel and "Create host lead"'],
          ['Click "Create host lead" with everything empty', 'Top alert "4 fields have validation errors" listing "Super category is required", "Host name is required", "Primary contact name is required" and "Primary contact mobile is required"; the button disables until fixed'],
          ['Look at the collapsed 2. Contact Details section', 'It opens on its own with a red header and an error count'],
          ['Enter Host Name "A"', 'Error "Host name is too short"'],
          ['Enter Community Size "12.5"', 'Error "Community size must be a whole number"'],
          ['Enter Website "example"', 'Error "Enter a valid website"'],
          ['Enter the primary contact Email "abc"', 'Error "Enter a valid email"'],
          ['Click "Add Another Contact" and leave it blank', 'Only the Primary Contact needs a name and mobile; the extra row can be removed with "remove contact"'],
          ['Fix every field and create', 'Button reads "Saving…" then navigates to /host-leads with the new lead listed'],
          ['Create another host lead with the same primary mobile', 'Alert "A host lead with this phone number already exists. Each lead must have a unique phone number." and the form stays open'],
          ['Click Cancel on /host-leads/new', 'Returns to /host-leads without saving'],
        ],
      },
    ],
  },
  {
    name: 'CRM: Ecomm Leads',
    description: 'Product seller leads at /ecomm-leads (list, /new, /:id, /:id/view, /services); no import/export or contact actions.',
    sub_flows: [
      {
        name: 'Create an ecomm lead',
        description: 'Seller form and detail page.',
        steps: [
          ['Open /ecomm-leads', 'Header "Ecomm Leads" with only "Manage Ecomm Services" and "New Ecomm Lead"'],
          ['Create a lead without Seller Name', 'Error "Seller name is required"'],
          ['Enter a 25-character GST number', 'Error "GST number is too long"'],
          ['Fill required fields with product categories and marketplace links and create', 'The lead is listed with its Brand and City'],
          ['Open the detail page', 'Tabs Overview, Contacts, Services, Survey, Custom Fields, Manual Logs, Communications; only an Edit button in the header'],
          ['Delete the lead', 'Confirm "Delete ecomm lead"; toast "Ecomm lead deleted"'],
        ],
      },
      {
        name: 'Validate the new ecomm lead form at /ecomm-leads/new',
        description: 'Seven sections, Zod rules and the duplicate-phone guard.',
        steps: [
          ['Click "New Ecomm Lead" on /ecomm-leads', 'Navigates to /ecomm-leads/new with heading "New Ecomm Lead", sections 1. Basic Details to 7. Internal Tracking and "Create ecomm lead"'],
          ['Click "Create ecomm lead" with everything empty', 'Top alert "4 fields have validation errors": "Super category is required", "Seller name is required", "Primary contact name is required", "Primary contact mobile is required"'],
          ['Enter Seller Name "A"', 'Error "Seller name is too short"'],
          ['Enter Website "shop.example.com"', 'Error "Enter a valid website" (it must start with http(s):// or www.)'],
          ['In 3. Products & Catalogue type "snacks" in Product categories and press Enter', 'A "snacks" chip is added'],
          ['In 4. Tax & Online Presence add an Amazon store link to Marketplace links and turn on "GST applicable"', 'The link chip is added and the switch is on'],
          ['Pick a super category and open 5. Services Offered', 'Services load from CRM > Data > Services Offered for ecomm, or "No catalogue services for this category — add them under Data → Services Offered, or type your own."'],
          ['Fill the required fields and create', 'Navigates to /ecomm-leads with the lead listed as New / Medium'],
          ['Create another ecomm lead with the same primary mobile', 'Alert "A ecomm lead with this phone number already exists. Each lead must have a unique phone number."'],
        ],
      },
      {
        name: 'Manage the ecomm services catalogue at /ecomm-leads/services',
        description: 'Inline add, edit, activate and delete of the ECOMM service catalogue.',
        steps: [
          ['Click "Manage Ecomm Services" on /ecomm-leads', '/ecomm-leads/services opens "Manage Ecomm Services" with columns Order, Service name, Active and Actions, or "No services yet. Click "Add service" to create the first one."'],
          ['Click "Add service" and save with an empty Service name', 'Alert "Service name is required"'],
          ['Enter "Catalogue shoot" (placeholder "e.g. Coaching / Training") and save', 'The row is added with the next order number and Active on; "Add service" is disabled while a row is being edited'],
          ['Add "Catalogue shoot" again', 'Alert "A service with that name already exists for this catalogue"'],
          ['Turn off Active on the row', 'An "Inactive" chip appears on the row'],
          ['Edit the row\'s order and name and save', 'The list re-sorts by order, then name'],
          ['Click Delete and confirm', 'Dialog "Delete service" — "Delete "Catalogue shoot"? Existing leads keep their entries — only the dropdown is affected."; the row disappears'],
          ['Open /host-leads/services', 'The HOST catalogue is separate and does not list the ecomm service'],
        ],
      },
    ],
  },
  {
    name: 'CRM: Lead calls and emails',
    description: 'Twilio bridged calls, AI calls, WhatsApp links and template emails from a venue or host lead detail page, recorded in the Communications tab.',
    sub_flows: [
      {
        name: 'Place a bridged call',
        description: 'Call dialog with live status.',
        steps: [
          ['On a lead without a mobile hover Call', 'Disabled with "No phone number on file"'],
          ['Click Call on a lead with a mobile', 'Dialog "Call · <venue>" with CALL FROM (Twilio number) → CALL TO and "Start Call"'],
          ['Click "Start Call" with Twilio not configured', 'Red alert "Twilio is not configured. Set the TWILIO account SID, auth token and phone number in the Tech portal."'],
          ['With Twilio configured click "Start Call"', 'Status moves Connecting… → Ringing… → In call → Call over via live updates'],
          ['Open the Communications tab', 'A "Portal Call" CALL log with status and a transcript chip'],
          ['Click "Get transcript" on a recorded call', 'The transcript text appears once ready'],
        ],
      },
      {
        name: 'Place an AI call',
        description: 'AI agent using Static Content.',
        steps: [
          ['Open the Call menu and choose "AI Call"', 'Dialog "AI Call · <venue>" with "Static content prompt" and "Servam voice"'],
          ['With no active prompts', '"No active prompts — add one under AI Call Prompts." and Start is disabled'],
          ['Pick a prompt and voice Anushka and click "Start AI call"', 'The live view shows an AI badge; a log "AI Call · <prompt>" is created'],
          ['Deactivate the prompt and try again', 'Error "Selected AI prompt is missing or inactive."'],
        ],
      },
      {
        name: 'Send a template email to a lead',
        description: 'Email compose window.',
        steps: [
          ['On a lead without email hover Email', 'Disabled with "No email on file"'],
          ['Click Email', 'Compose window "Email · <name>" with Provider, To and content toggle Template / Simple Text / Rich Text'],
          ['Choose Template and pick a venue template', 'Variables auto-fill from the lead and the Preview renders'],
          ['Click "Send email"', 'Toast "Email sent to <to> via <entry>"; an EMAIL log appears in Communications'],
          ['Click WhatsApp', 'wa.me opens for the lead\'s WhatsApp number'],
        ],
      },
    ],
  },
  {
    name: 'CRM: Lead survey, website, reminders and logs',
    description: 'Detail-page tabs shared by leads: Survey (manual and public link), Website scraping, Reminders and Manual Logs.',
    sub_flows: [
      {
        name: 'Fill a survey and share a public link',
        description: 'Survey tab and /s/:token.',
        steps: [
          ['Open the Survey tab on a lead with no matching survey', '"No onboarding survey matches this lead\'s category (or the selected category) yet..."'],
          ['On a matching lead click "Fill manually" and press Next without a required answer', 'Error "Please answer: <label>"'],
          ['Answer and click "Save survey"', 'Toast "Survey saved" and a MANUAL entry shows Filled'],
          ['Click "Generate link"', 'Toast "Link generated & copied to clipboard" and a LINK entry shows Pending'],
          ['Open the copied /s/:token link signed out', 'Public page "For <lead> — a few quick questions." with the stepper'],
          ['Submit the answers', '"Thank you!"; the CRM entry shows Filled'],
          ['Revoke a link and open it', '"This survey link is invalid or has been revoked."'],
        ],
      },
      {
        name: 'Scrape a lead website',
        description: 'Website tab.',
        steps: [
          ['Open the Website tab on a lead with no website', '"No website on record for this lead. Open Edit and add a website to scrape its pages."'],
          ['On a lead with a website click "Scrape pages" and enter 500', 'Error "Enter a number from 1 to 200."'],
          ['Enter 20 and scrape', 'Pages are listed as DISCOVERED with a "N pages saved" chip'],
          ['Click "Fetch all"', 'Progress "Fetching x/y" and pages move to FETCHED with character counts'],
          ['Click "View content" on a page', 'Dialog with the extracted text'],
        ],
      },
      {
        name: 'Add a reminder and a manual log',
        description: 'Reminders and Manual Logs tabs.',
        steps: [
          ['Open Reminders and click "Add reminder" with no title', 'Save stays disabled'],
          ['Enter a title and due date and Save', 'The reminder is listed and also appears on /reminders'],
          ['Click "Mark done"', 'The title is struck through with a Done chip'],
          ['Open Manual Logs and click "New log", save with empty body', 'Error "Please write something before saving."'],
          ['Write a note and click "Save log"', 'The note appears grouped under today'],
        ],
      },
    ],
  },
  {
    name: 'CRM: WhatsApp Leads',
    description: 'WhatsApp user leads at /user-leads and /user-leads/:id with create, import, export, clean, edit and delete.',
    sub_flows: [
      {
        name: 'Manage WhatsApp user leads',
        description: 'List actions.',
        steps: [
          ['Open /user-leads', 'Cards Total Leads, Communities, Groups, Contacts and a table Name, Phone, Community, Groups, Imported'],
          ['Click New and enter phone "123"', 'Error "Enter a valid phone number (8–15 digits, with country code)."'],
          ['Enter a valid phone with name and Create', 'The lead appears and Total Leads increases'],
          ['Click Import and choose an .xlsx with phone and name columns', 'Toast "Imported X new · Y duplicates · Z invalid skipped."'],
          ['Click Clean and "Clean now"', 'Toast "Cleaned: X invalid + Y duplicate leads removed · Z remain."'],
          ['Click Export', 'whatsapp-leads.xlsx downloads'],
          ['Delete a lead', 'Confirm "Delete lead?"; toast "Deleted 1 lead(s)."'],
        ],
      },
      {
        name: 'View a WhatsApp lead',
        description: 'Detail page.',
        steps: [
          ['Click a row', '/user-leads/:id shows +phone, Source WhatsApp account, Imported, Contact JID, Communities and Groups'],
          ['Open an unknown id', 'Warning "Lead not found."'],
        ],
      },
    ],
  },
  {
    name: 'CRM: WhatsApp Lead Generator',
    description: 'Connect a WhatsApp gateway, browse communities, groups and users, and extract leads at /tools/whatsapp.',
    sub_flows: [
      {
        name: 'Connect the WhatsApp gateway',
        description: 'Gateway URL, API key and QR link.',
        steps: [
          ['Open /tools/whatsapp while disconnected', '"Gateway connection" card with status DISCONNECTED, Gateway URL and API Key'],
          ['Click "Generate API key" with a wrong master key', 'Error from the gateway (e.g. "OpenWA POST … failed")'],
          ['Enter a valid key and click "Save & Connect"', 'Status CONNECTING with "Open WhatsApp → Linked devices → Link a device, then scan:" and a QR'],
          ['Scan the QR on a phone', 'Card shows "Connected" with +phone and a Disconnect button'],
          ['Click Disconnect', 'The session stops and the connect card returns'],
        ],
      },
      {
        name: 'Extract leads from WhatsApp',
        description: 'Background extraction with a global widget.',
        steps: [
          ['Click Extract', '"Extraction in progress — data updates automatically." and the bottom-right widget "Extracting data…" with progress'],
          ['Navigate to /venue-leads', 'The extraction widget stays visible with Valid, Invalid, Duplicates, New leads chips'],
          ['Click Details on the widget', 'Dialog "Extraction summary" with communities, groups and counts'],
          ['Click "Cancel extraction"', 'The widget reads "Extraction cancelled"'],
          ['Open a group on the Groups tab', 'The members dialog lists members and they are saved as user leads'],
        ],
      },
    ],
  },
  {
    name: 'CRM: Reminders',
    description: 'Calendar of reminders and venue/host lead follow-ups at /reminders.',
    sub_flows: [
      {
        name: 'Use the reminders calendar',
        description: 'Views, filters and the item drawer.',
        steps: [
          ['Open /reminders', 'Month view with reminders and "Follow-up · <lead>" items coloured red (overdue), amber (within 24 h) or green'],
          ['Switch to Upcoming', 'Items for the next 60 days grouped by day, or "Nothing scheduled in this range."'],
          ['Set Type Venue and Status Done', 'Only done venue reminders remain and follow-ups hide'],
          ['Click "Add" and create a general reminder', 'It appears on its due day'],
          ['Click a reminder', 'Drawer with FROM, NOTES, "Mark done", Edit and Delete'],
          ['Click a follow-up item and "Open venue lead"', 'Navigates to the lead detail page'],
        ],
      },
    ],
  },
  {
    name: 'CRM: Data catalogues',
    description: 'Services Offered, venue Amenities and Event Suitability lists that drive the lead forms.',
    sub_flows: [
      {
        name: 'Add services offered',
        description: '/data/services-offered.',
        steps: [
          ['Open /data/services-offered and click "Add Service Offered"', 'Dialog with Super Category, Category, Sub Category, Service titles and Venue/Host/Both switches'],
          ['Click Add with no super category', 'Error "Pick a super category and add at least one title."'],
          ['Turn both Venue and Host off', 'Warning "Turn on Venue, Host, or Both."'],
          ['Add titles Catering and Decor for Venue and Host', 'Rows appear with Applies to Both; they load in the lead form Services Offered picker'],
          ['Edit a title to match an existing one in the same category', 'Error "A service with that title already exists in this category"'],
        ],
      },
      {
        name: 'Manage amenities and event suitability',
        description: '/data/venues/amenities and /data/venues/event-suitability.',
        steps: [
          ['Open /data/venues/amenities and click "Add amenity" with an empty name', 'Error "Name is required."'],
          ['Add "Power Backup"', 'The amenity is listed and appears as a checkbox on the venue lead form'],
          ['Add a duplicate name', 'Error "An option with that name already exists in this list"'],
          ['Toggle Active off', 'The amenity no longer shows on the form'],
          ['Delete an event type on /data/venues/event-suitability', 'Confirm explains existing leads keep their entries; the row is removed'],
        ],
      },
    ],
  },
  {
    name: 'CRM: Email Templates',
    description: 'CRM-owned MJML templates for venue, host, ecomm or static emails at /email-templates and /email-templates/:id.',
    sub_flows: [
      {
        name: 'Create and edit a CRM template',
        description: 'Type picker, editor, variables and attachments.',
        steps: [
          ['Open /email-templates and click "New template"', 'Step "Who is this template for?" with Venue, Host, Ecomm and Static cards'],
          ['Pick "Venue lead emails" and Create without a subject', 'Error "Pick a type and fill name + subject."'],
          ['Fill name and subject and Create', 'The editor opens at /email-templates/:id'],
          ['Create another with the same slug', 'Error "A CRM template with that slug already exists"'],
          ['Insert {{ venue_name }} and open the Variables tab', 'It is detected and valid; a {{ foo }} placeholder shows a not-available warning'],
          ['Attach a 30 MB video', 'Error "Max 25MB per attachment."'],
          ['Click Save', 'Snackbar "Template saved"'],
        ],
      },
      {
        name: 'Send a test and delete a CRM template',
        description: 'Test email and delete.',
        steps: [
          ['Click "Send test" and enter an invalid address', 'Error "Enter a valid email"'],
          ['Enter a valid address and Send', 'Snackbar "Email sent to <to> via <entry>"'],
          ['Delete the template from the list', 'Confirm "Delete template"; toast "Template deleted"'],
        ],
      },
    ],
  },
  {
    name: 'CRM: AI Call Prompts',
    description: 'Static Content prompts the AI agent speaks from, at /call-prompts.',
    sub_flows: [
      {
        name: 'Create and deactivate Static Content',
        description: 'Prompt form (RHF + Zod).',
        steps: [
          ['Open /call-prompts and click "Add Static Content"', 'Dialog with Name, Description, Language (Auto-detect), Static content and Active'],
          ['Enter a 1-character name', 'Error "Name must be at least 2 characters"'],
          ['Enter 5 characters of static content', 'Error "Add at least 10 characters of context"'],
          ['Fill valid values with language Hindi and click Add', 'The prompt is listed as Active and offered in the AI Call dialog'],
          ['Edit it, switch Active off and "Save changes"', 'It no longer appears in the AI Call prompt list'],
          ['Delete it', 'Confirm "Delete Static Content"; the row disappears'],
        ],
      },
    ],
  },
  {
    name: 'CRM: Dynamic Fields',
    description: 'Custom fields rendered on venue, host and ecomm lead forms, at /settings/dynamic-fields.',
    sub_flows: [
      {
        name: 'Add, reorder and delete a dynamic field',
        description: 'Inline field editor.',
        steps: [
          ['Open /settings/dynamic-fields and click "New field"', 'Inline card with Label, Type, Placeholder, Default, Hint, Applies to and Required'],
          ['Save with an empty label', 'Alert "Label is required"'],
          ['Choose Type Select with no options', 'Alert "Add at least one option for a Select field."'],
          ['Untick Venue, Host and Ecomm', 'Alert "Pick at least one of: applies to Venue / Host / Ecomm."'],
          ['Save a Select field "Parking type" with two options for Venue', 'The field is listed and appears in the venue form Custom Fields section'],
          ['Create another field with the same label', 'Error "A dynamic field with that key already exists"'],
          ['Click "Move Parking type up"', 'The order changes and is saved'],
          ['Delete the field', 'Confirm explains stored values stay but are no longer rendered'],
        ],
      },
    ],
  },
  // -------------------------------------------------------------- FINANCE
  {
    name: 'Finance: Access and dashboards',
    description:
      'finance.duncit.com requires FINANCE_MANAGER (SUPER_ADMIN also passes). Most finance resolvers allow SUPER_ADMIN, CITY_ADMIN and FINANCE_MANAGER. Covers / and /startup-dashboard.',
    sub_flows: [
      {
        name: 'Role gate for the Finance portal',
        description: 'Only finance staff reach the console.',
        steps: [
          ['Sign in with an account lacking FINANCE_MANAGER', '"You do not have access to Duncit Finance. Please contact your administrator."'],
          ['Call financeDashboardStats with a plain user token', 'The server answers "Access Denied" (FORBIDDEN)'],
          ['Sign in with a FINANCE_MANAGER account', '"Welcome back, <first name>" with the Finance overview cards'],
        ],
      },
      {
        name: 'Read the finance overview',
        description: 'GMV, revenue, GST and payout cards.',
        steps: [
          ['Open /', 'Cards Total Collected (GMV), Duncit Revenue, GST Collected, Pending Payouts, Completed Payouts, Pod Expenses with "+x.x% vs last month"'],
          ['Record a pod expense this month and reload', 'Pod Expenses rises and its change shows in red'],
          ['Click "Customise layout", move a widget and "Save layout"', 'The arrangement persists after reload for this user only'],
          ['Click "Reset to default" and confirm "Reset layout"', 'The default layout returns'],
        ],
      },
      {
        name: 'Startup dashboard metrics and settings',
        description: 'Founder KPIs with manual inputs.',
        steps: [
          ['Open /startup-dashboard', 'Header "Startup Dashboard" with From/To pickers, Founder Overview cards (Total Revenue, Net Profit, Cash in Bank, Burn Rate, Runway...) and category sections'],
          ['Change From to three months ago', 'All KPIs and sparklines refetch for the range'],
          ['Click "About Runway (Months Left)"', 'Drawer with "What is this?" definition and Formula'],
          ['Open "Settings for Cash in Bank", enter a value and Save', 'The drawer closes and Cash in Bank and Runway recompute; the card shows a "Manual" chip'],
          ['Open settings for a computed metric', '"This metric is computed automatically — nothing to configure."'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Default Deductions',
    description: 'Global GST, platform fee, commission, club admin and backout deduction rates used at settlement, at /default-deductions.',
    sub_flows: [
      {
        name: 'Change default deductions',
        description: 'Slider cards saved together.',
        steps: [
          ['Open /default-deductions', 'Cards GST (max 28), Platform Fees (max 30), Host, Venue, Products (max 50), Club Admin (0-10) and Backouts, each with a live % chip'],
          ['Move Platform fee to 7.5%', 'The chip reads 7.5%'],
          ['Click "Save Deductions"', 'Toast "Default deductions saved"; values persist after reload'],
          ['Send gst_pct 60 via the API', 'Server refuses "gst_pct must be between 0 and 50"'],
          ['Open /calculators/pod-profit', 'The calculator starts with the new rates'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Pod Finance',
    description: 'Pods with money movement and the per-pod money waterfall, at /pod-finance and /pod-finance/:podId (read-only).',
    sub_flows: [
      {
        name: 'Inspect a pod money waterfall',
        description: 'List of pods with releases and the breakdown page.',
        steps: [
          ['Open /pod-finance', 'Columns Pod, Releases, Requested, Release statuses; empty "No pods with payment activity yet."'],
          ['Search a pod title and click the row', 'Navigates to /pod-finance/:podId with a settlement chip Live, Pending Approval or Settled'],
          ['Read "Money Waterfall"', 'Steps Customer Payment, GST, Platform Fee, Remaining Pool, Club Admin Cut, Venue Amount, Host Amount, Duncit Total Revenue, GST Collected'],
          ['Check the footer', '"Total (matches customer payment)" equals the collected amount'],
          ['Read "Host Earnings Summary"', 'Host Amount, Host Commission and Host Receives with "The host earns x% of the customer payment."'],
          ['Open a pod finance URL for an unknown pod', 'A red alert "Pod not found"'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Cancellations',
    description: 'Cancelled pods, who cancelled them and refunds, at /cancellations, /cancellations/venue and /cancellations/host.',
    sub_flows: [
      {
        name: 'Review cancelled pods',
        description: 'Dashboard with all cancellations and a detail dialog.',
        steps: [
          ['Open /cancellations', 'Cards Total pod cancels, Cancelled by hosts, by venues, by club admins and Total refund amount; table "Every cancelled pod"'],
          ['Filter "Cancelled by" to Host', 'Only host-cancelled pods remain'],
          ['Click a row', 'Dialog with Cancellation (by, reason, at, scheduled for, hosts), Attendee refunds and Venue cards'],
          ['Open a pod with unrefunded payments', 'Warning "Successful payments are still unrefunded — review them in Payment Logs (filter by this pod)."'],
          ['Open /cancellations/venue', 'Header "Venue Cancel" with the info that attendee refunds should always be zero'],
          ['Open /cancellations/host', 'Header "Host Cancel"; empty text "No host-cancelled pods yet." when none'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Backout Refunds',
    description: 'Backout requests and refunds once the spot is filled, at /backout-refunds and /backout-refunds/:id.',
    sub_flows: [
      {
        name: 'Process a backout refund',
        description: 'Refund breakup dialog for a filled spot.',
        steps: [
          ['Open /backout-refunds', 'Columns Backout ID, Member, Pod, Status, Backed out, Amount, Refund status, Actions'],
          ['Look at a row with status "Backout In Process"', 'No Refund button — Actions shows "—"'],
          ['Click Refund on a "Spot Filled" row', 'Dialog "Refund breakup" with Amount paid, Backout deduction (x%), Refund payable and coin lines if coins were used'],
          ['Click "Refund now"', 'Toast "Refund processed"; Refund status reads PROCESSED and the button is gone'],
          ['Call processBackoutRefund again for it', 'Server refuses "This Backout request has already been refunded"'],
          ['Call it for a request still in process', 'Server refuses "Refund can be processed only after the spot is filled"'],
        ],
      },
      {
        name: 'Read a backout request detail',
        description: 'Read-only detail page.',
        steps: [
          ['Click a backout row', '/backout-refunds/:id shows Pod, Host & Club, Backout Attempts, Replacement Confirmed?, Member, Replacement, Payment and Refund cards'],
          ['Read "Backout Timeline"', 'The participation timeline highlights this request'],
          ['Open an unknown id', 'Warning "Backout refund request not found."'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Payment Logs',
    description: 'Every payment with totals, invoice download, manual refund, the refund log and the payment audit with retry, at /payment-logs, /payment-logs/:id and /user-refund-logs.',
    sub_flows: [
      {
        name: 'Browse payments and download an invoice',
        description: 'Payment Logs table and KPI cards.',
        steps: [
          ['Open /payment-logs', 'Cards Successful Payments, Gross, Platform Fees, GST Collected, Multi-ticket discounts and a table polling every 30 s'],
          ['Search by invoice number', 'Only that payment shows and the cards follow the search'],
          ['Filter Status to Failed', 'The KPI cards drop to zero (they count SUCCESS only)'],
          ['Hover "Download invoice" on a payment without an invoice', 'Disabled with "No invoice generated"'],
          ['Click "Download invoice" on a paid row', 'invoice-<invoice_no>.pdf downloads'],
        ],
      },
      {
        name: 'Refund a successful payment',
        description: 'Manual refund dialog.',
        steps: [
          ['Hover Refund on a pending payment', 'Disabled with "Only successful payments can be refunded"'],
          ['Click Refund on a SUCCESS payment', 'Dialog "Refund payment" — "Refund ₹<total> to <name>?" with the payment ID and "Reason (optional)"'],
          ['Enter a reason and click "Confirm refund"', 'The dialog closes; the row shows REFUNDED and the refund icon disables; the buyer gets the refund email'],
          ['Open /user-refund-logs', 'The refund appears with Refund amount, Kind "Full", Reason and Initiated by'],
          ['Refund the same payment via the API', 'Server refuses "Only SUCCESS payments can be refunded"'],
        ],
      },
      {
        name: 'Audit a payment and retry failed steps',
        description: 'Payment detail with artifacts, pipeline steps and retry.',
        steps: [
          ['Click a payment row', '/payment-logs/:id shows Amount Breakup, Duncit Coins, "The payment itself" and "What checkout created" with tabs Pod / Products / Gift card'],
          ['Open ?selectedtab=giftcard on a pod-only payment', 'Info "This payment bought no gift card."'],
          ['Open a payment whose receipt email failed', 'Artifact "Receipt e-mailed" shows Missing with a Retry button; the step shows FAILED'],
          ['Click Retry on that row', 'Toast "Re-run finished — this page is the fresh result." and the row shows Created'],
          ['Open a payment whose core failed and click "Retry all failed"', 'Confirm "Re-run the whole checkout?" explaining an existing booking is reused'],
          ['Click Re-run', 'The booking, seat and ticket are written and the "Checkout finalization failed" warning disappears'],
          ['Retry on a refunded payment via the API', 'Server refuses "This payment has been refunded — there is nothing to re-run"'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Payment Release',
    description: 'Venue billing, host, club admin and brand payout release requests at /payment-release (new pods auto-approve on completion).',
    sub_flows: [
      {
        name: 'Review a pending release',
        description: 'Review Payment Release dialog (RHF + Zod).',
        steps: [
          ['Open /payment-release', 'Columns Type, Pod, Beneficiary, Requested, Proof, Status, Actions'],
          ['Click Review on a PENDING request', 'Dialog "Review Payment Release" with the settlement breakdown, Decision, Release type, Approved amount and Reason'],
          ['Choose Partial Release with no reason', 'Error "Reason is required"'],
          ['Enter an approved amount above the requested amount', 'Error "Cannot exceed requested amount"'],
          ['Choose Approve + Full Release and click "Submit Review"', 'The dialog closes; status reads APPROVED, Review disables and the beneficiary wallet is credited with a payout statement'],
          ['Choose Reject with a reason on another request', 'Status reads REJECTED'],
          ['Review an already reviewed request via the API', 'Server refuses "Only pending requests can be reviewed"'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Withdrawals',
    description: 'Partner withdrawal requests grouped by pod, review (mark paid or reject) and per-role minimums, at /withdrawals, /withdrawals/:podId and /withdrawals/settings.',
    sub_flows: [
      {
        name: 'Mark a withdrawal paid',
        description: 'Manual payout confirmation.',
        steps: [
          ['Open /withdrawals', 'Pods table with Pod Title, Requested From roles and Status; Role filter "All roles"'],
          ['Set Role to "Venue Owner"', 'Only pods with venue owner requests remain'],
          ['Click a pod', '/withdrawals/:podId lists Withdrawer Name, Withdrawal Method, Role, Scheduled, Amount, Account Details, Status'],
          ['Click "Mark Paid" on a PENDING row', 'Confirm "Mark withdrawal as paid" showing "Release ₹x to <name> (<role>)" and the full payout account'],
          ['Confirm', 'Toast "Marked as paid"; the row shows PAID; the pod shows Approved once every request is paid'],
        ],
      },
      {
        name: 'Reject a withdrawal',
        description: 'Reject and refund to wallet.',
        steps: [
          ['Click Reject on a PENDING row', 'Dialog "Reject withdrawal" explaining the wallet is credited back'],
          ['Enter a 3-character reason', 'Error "Give the withdrawer at least a short reason (5 characters)."'],
          ['Enter a proper reason and click "Reject & refund"', 'Toast "Withdrawal rejected"; the request leaves the pod list and the wallet shows a reversal "Withdrawal rejected: <reason>"'],
          ['Review it again via the API', 'Server refuses "Only pending withdrawals can be reviewed"'],
        ],
      },
      {
        name: 'Set minimum withdrawal per role',
        description: 'Withdrawal Settings cards saved individually.',
        steps: [
          ['Open /withdrawals/settings', 'Cards Host, Venue Owner, E-Commerce Brand and Club Admin, each with "Minimum Withdrawal Amount" and Save'],
          ['Clear the Host amount', 'Error "Enter a minimum amount."'],
          ['Enter 1500.50', 'Error "Whole rupees only — digits, no decimals or symbols."'],
          ['Enter 2000000', 'Error "Keep the floor at or under 10,00,000."'],
          ['Enter 2000 and Save the Host card', 'Toast "Host minimum saved"; other roles are unchanged'],
          ['As a host with ₹1500 balance, request a withdrawal', 'Refused: "A Host can withdraw once the wallet balance reaches ₹2000. Available: ₹1500."'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Invoices',
    description: 'Business identity for tax invoices and tickets, and venue/host/product payout invoice templates, at /invoices and /invoices/:kind.',
    sub_flows: [
      {
        name: 'Edit business identity and invoice document',
        description: 'Invoice Management with live preview.',
        steps: [
          ['Open /invoices', 'Header "Invoice Management" with Business identity, Invoice document, Payment processing and a Live preview'],
          ['Change the Invoice prefix', 'The preview Invoice No updates as you type'],
          ['Enter support email "abc"', 'Field error "Enter a valid email"'],
          ['Click "Save changes" with that email', 'Alert "Please fix the support email before saving." and nothing is sent'],
          ['Fix the email and Save', 'Toast "Invoice settings saved"; new invoice PDFs carry the new identity'],
          ['Toggle the payment switch to "Live payment mode (Razorpay)" and Save', 'Checkout charges go live (there is no confirmation)'],
        ],
      },
      {
        name: 'Edit a payout invoice template',
        description: 'Venue, Host and Product invoice templates.',
        steps: [
          ['Open /invoices/host', 'Header "Host Invoice" with Document heading, Terms & conditions, Footer note and Email note'],
          ['Change the footer and click Save', 'Toast "Invoice template saved"; the venue and product templates are untouched'],
          ['Approve a host payout release', 'The host payout invoice uses the new heading, terms and footer'],
          ['Open /invoices/product', 'Header "Product Invoice" with its own saved values'],
        ],
      },
      {
        name: 'Edit the venue payout invoice template at /invoices/venue',
        description: 'The template the venue payout PDF uses when a venue release is approved (SUPER_ADMIN, CITY_ADMIN or FINANCE_MANAGER).',
        steps: [
          ['Open /invoices/venue', 'Header "Venue Invoice" — "Sent to the venue owner when a pod is completed and approved." with Document heading, Terms & conditions, Footer note, Email note (covering message) and Save'],
          ['Read the defaults on a fresh finance settings row', 'Document heading "VENUE PAYOUT INVOICE", Terms empty and the default footer'],
          ['Read the caption under the fields', '"Business identity (name, address, GSTIN, logo, currency) is shared — set it under Invoices → Business Identity."'],
          ['Change only Terms & conditions and click Save', 'Button reads "Saving…", toast "Invoice template saved"; after reload the heading and footer are unchanged'],
          ['Open /invoices/host', 'The host template is unchanged'],
          ['Approve a VENUE_PAYMENT release that has a settlement breakdown in /payment-release', 'The venue owner gets "Payout approved · <pod>" with payout-<release id>.pdf titled with the venue heading and carrying the new terms'],
          ['Clear Footer note, save and approve another venue release', 'The PDF footer falls back to the invoice footer note set on /invoices'],
          ['Call updateFinanceSettings with invoice_templates.venue as a user without SUPER_ADMIN, CITY_ADMIN or FINANCE_MANAGER', 'Server refuses "Access Denied" and the template is unchanged'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Expense Dashboard',
    description: 'Filterable totals and breakdowns of Duncit expenses and their compensation at /expenses/dashboard.',
    sub_flows: [
      {
        name: 'Filter the expense dashboard',
        description: 'Every filter drives tiles and breakdowns together.',
        steps: [
          ['Open /expenses/dashboard', 'Header "Expense Dashboard" with tiles Total expenses, Total compensation, Pending compensation, This month and per-status tiles'],
          ['Pick From and To dates', 'Tiles and the three breakdown cards recompute; This month ignores the date range'],
          ['Open "Related entity" without choosing a type', 'It is disabled with "Pick an Expense Related From type first."'],
          ['Choose type Pod and search a pod title', 'Matching pods appear; picking one narrows every tile'],
          ['Set Compensation status "Rejected"', 'Only rejected expenses count; breakdowns show "No expenses match these filters." when empty'],
          ['Click "Clear filters"', 'All filters reset and totals return to all expenses'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Duncit Expenses',
    description: 'Record, compensate, refund and delete Duncit business expenses at /ledger.',
    sub_flows: [
      {
        name: 'Record an expense',
        description: 'New expense drawer (RHF + Zod).',
        steps: [
          ['Open /ledger and click "New expense"', 'Drawer "New expense" with Date, Category, Amount, Expense Related From, Vendor / payee, Paid by, Payment method, Reference, Receipt URL with Upload, Description and Compensation'],
          ['Submit with Amount 0', 'Error "Enter an amount greater than 0"'],
          ['Submit without a Category', 'Error "Pick a category"'],
          ['Choose Expense Related From = Venue without an entity', 'Error "Pick what this expense was for"'],
          ['Upload a PDF receipt', 'The receipt URL fills in'],
          ['Fill valid values and click "Add expense"', 'The drawer closes; the row appears and the summary chips Gross/Refund/Net update'],
        ],
      },
      {
        name: 'Compensate or reject an expense',
        description: 'Status derived from the compensated amount.',
        steps: [
          ['Open an expense row', 'Drawer "Expense details" with the Compensation section and a live status chip'],
          ['Enter a compensated amount above the expense amount', 'Error "Compensation cannot be more than the expense itself"'],
          ['Enter half the amount and Save', 'Compensation status becomes Partially compensated'],
          ['Enter the full amount and Save', 'Status becomes Fully compensated'],
          ['Switch on "Reject this expense — nobody pays it back" and Save', 'Status becomes Rejected'],
        ],
      },
      {
        name: 'Record and remove refunds',
        description: 'Refunds & timeline in the edit drawer.',
        steps: [
          ['In an expense drawer enter a refund amount and click "Add refund"', 'The timeline shows the refund and Net drops by that amount'],
          ['Add a refund larger than the remaining net via the API', 'Server refuses "Refund cannot exceed the remaining expense amount"'],
          ['Lower the expense amount below recorded refunds and Save', 'Error "Amount cannot be less than refunds already recorded"'],
          ['Click "Remove refund" on a timeline entry', 'The refund is removed and Net goes back up'],
        ],
      },
      {
        name: 'Delete an expense',
        description: 'Destructive delete including refunds.',
        steps: [
          ['Click "Delete expense" in the drawer', 'Confirm "Delete expense" — "This expense and every refund recorded against it will be removed."'],
          ['Confirm Delete', 'The drawer closes and the row and summary update'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Pod Expenses',
    description: 'Bills recorded against each pod at /pod-expenses.',
    sub_flows: [
      {
        name: 'Record a bill against a pod',
        description: 'Pod drawer with entries table and form.',
        steps: [
          ['Open /pod-expenses', 'Tiles Total pod spend, Spent this month, Pods with expenses, Bills uploaded, and tabs All pods / With expenses / Bill missing'],
          ['Switch to "Bill missing"', 'URL gets ?selectedtab=missing-bills and only pods with entries lacking bills are listed'],
          ['Click a pod row', 'Drawer with pod title, status, "Spent ₹X", "Bills: b / n" and the entries table ("Nothing recorded against this pod yet.")'],
          ['Click "Add expense" and submit Amount empty', 'Error "Enter an amount greater than 0"'],
          ['Fill Category Venue Rent, amount, attach a bill and click "Add expense"', 'The entry appears with its bill link; header and page tiles refresh'],
          ['Add an entry without a bill', 'The Bill column shows "No bill" in warning colour and the Bills chip turns warning'],
        ],
      },
      {
        name: 'Edit and delete a pod expense',
        description: 'Entry row actions.',
        steps: [
          ['Click Edit on an entry and add a bill number', 'Saved; the Bill column shows the bill number link'],
          ['Click Delete on an entry', 'Confirm "Delete expense" — "This removes the entry and its bill from the pod. It cannot be undone."'],
          ['Confirm', 'The entry disappears and Spent recalculates'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Employee Expenses',
    description: 'Approval queue for out-of-pocket employee claims at /employee-expenses.',
    sub_flows: [
      {
        name: 'Approve a claim',
        description: 'Review dialog for a pending claim.',
        steps: [
          ['Open /employee-expenses', 'Tiles Awaiting your decision, Approved, Rejected, Claimed all time; tab "Awaiting review" selected'],
          ['Click a pending claim', 'Dialog "Review claim" with employee, claim id, spend date, amount, category, bill and "Note to the employee"'],
          ['Open a claim without a bill', 'Warning "No bill is attached to this claim."'],
          ['Click Approve', 'The dialog closes; the claim moves to the Approved tab and the KPIs update'],
        ],
      },
      {
        name: 'Reject a claim',
        description: 'Rejection requires a note.',
        steps: [
          ['Open a pending claim with the note empty', 'Reject is disabled; helper "Required — tell the employee why this was rejected."'],
          ['Type a reason and click Reject', 'The claim moves to the Rejected tab'],
          ['Open the rejected claim', 'Info "This claim has already been decided." with "Decided <date>" and only Close'],
          ['Call reviewEmployeeExpense again for it', 'Server refuses "This claim is not awaiting a decision"'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Expense Settings',
    description: 'Dropdown option lists for the expense screens at /settings/expenses.',
    sub_flows: [
      {
        name: 'Add, edit and switch off an option',
        description: 'Tabs: Expense Related From, Expense Categories, Payment Methods, Compensation Methods.',
        steps: [
          ['Open /settings/expenses?selectedtab=CATEGORY', 'Tab "Expense Categories" lists options with Status, Used by and Origin'],
          ['Click "Add option" and save with an empty display name', 'Error "Give the option a display name"'],
          ['Type Display name "Office Snacks"', 'Hint "Saved as OFFICE_SNACKS"'],
          ['Save', 'The option appears as Offered and shows up in the New expense Category dropdown'],
          ['Add another option with the same key', 'Error "That key is already used in this list"'],
          ['Edit the option', 'Stored key is disabled; switch off "Offered on the Expense form" and Save'],
          ['Open the expense form', 'The hidden option is no longer offered but still labels existing expenses'],
        ],
      },
      {
        name: 'Delete restrictions',
        description: 'Built-in and in-use options cannot be deleted.',
        steps: [
          ['Hover Delete on a built-in option', 'Disabled with "Built-in options and options already used by an expense cannot be deleted — switch them off instead."'],
          ['Delete an unused custom option', 'Confirm "Delete option" — "<label> will be removed from this list for good."; on confirm the row is removed'],
          ['Call deleteExpenseOption on an option used by 3 expenses', 'Server refuses "3 expense(s) use this option — switch it off instead of deleting it"'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Referrals',
    description: 'Referral share message, gift line and redeemed codes at /referrals.',
    sub_flows: [
      {
        name: 'Edit the referral share message',
        description: 'Reward & message form with preview.',
        steps: [
          ['Open /referrals', 'Info about one redemption per account, a read-only "COINS PER REFERRAL" box linking to /duncit-coin/settings and the referrals table'],
          ['Type a message without {link}', 'Error "Include {link} so the message carries a signup link. Available: {code}, {link}, {coins}"'],
          ['Type a 501-character message', 'Error "Keep the share message under 500 characters."'],
          ['Enter a message with {code}, {link} and {coins}', 'PREVIEW renders it with code DUN-9F3A2C, the mWeb register link and the coin rate'],
          ['Click "Save settings"', 'Toast "Referral settings saved" and the button disables until the next change'],
          ['Search the referrals table by code', 'The matching Referrer / Referred / Code / When row is shown'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Duncit Coin',
    description: 'Coin dashboard, transactions ledger, payout rules, expiry and manual grants at /duncit-coin/*.',
    sub_flows: [
      {
        name: 'Read the coin dashboard',
        description: 'Circulation tiles and month chart.',
        steps: [
          ['Open /duncit-coin/dashboard', 'Tiles Coins Circulated, Coins Redeemed, Not Redeemed, Coin Holders, Ledger Entries, Pod Join Earn, Shop Earn'],
          ['Change Period to "Last 24 months"', 'URL gets ?months=24 and the Earned vs Redeemed chart re-renders'],
          ['Click the Pod Join Earn tile', 'Navigates to /duncit-coin/settings'],
          ['View when ledger and wallet balances disagree', 'A warning states the ledger outstanding, user balances and the gap'],
        ],
      },
      {
        name: 'Browse coin transactions',
        description: 'Ledger table with pod filter.',
        steps: [
          ['Open /duncit-coin/transactions', 'Columns When, User, Pod, Type, Source, Coins, Balance After, Order Total, Payment, Reason; newest first'],
          ['Pick a pod in the Pod filter', 'URL gets ?pod_id=<id> and only that pod\'s coin rows show'],
          ['Filter Source to "Admin grant"', 'Only manual grants are listed'],
          ['Clear the pod filter', '?pod_id is removed and all rows return'],
        ],
      },
      {
        name: 'Change coin payout rules and expiry',
        description: 'Coin Settings form.',
        steps: [
          ['Open /duncit-coin/settings and set Pod join earn rate 120', 'Error "A rate cannot go above 100%."'],
          ['Enter Shop earn rate 5.5', 'Error "Whole percents only — digits, no decimals or symbols."'],
          ['Enter Coin expiry 4000', 'Error "Keep the expiry at or under 3650 days."'],
          ['Set valid values and click "Save settings"', 'Toast "Coin settings saved"; new earnings use the new rates and past grants keep their expiry'],
          ['Save as a CITY_ADMIN via the API', 'FORBIDDEN — only SUPER_ADMIN and FINANCE_MANAGER can update coin settings'],
        ],
      },
      {
        name: 'Grant or deduct coins for one member',
        description: '"Give one member coins" card.',
        steps: [
          ['Click "Apply adjustment" without a user', 'Inline error "Choose the account this applies to."'],
          ['Search a user by 2+ characters of email', 'Options show "Name — email" with "holds N coins"'],
          ['Enter Coins 0', 'Error "Zero coins is not an adjustment."'],
          ['Enter a 3-character reason', 'Error "Say why — this is the only explanation the ledger will ever carry."'],
          ['Grant 50 coins with a reason', 'Toast "<name> now holds <balance> coins"; an Admin grant row appears in Transactions'],
          ['Deduct more coins than the member holds', 'Error "That account holds N coins — it cannot give up M"'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Gift Cards',
    description: 'Gift card sales dashboard and policy, sold cards and card logs at /gift-cards/*. Cards are created only by purchases.',
    sub_flows: [
      {
        name: 'Update the gift card sales policy',
        description: 'Dashboard stats and policy form.',
        steps: [
          ['Open /gift-cards/dashboard', 'Tiles Cards sold, Value sold, Converted to coins, Outstanding liability, Expired unredeemed, Validity and a Sold vs redeemed chart'],
          ['Enter Amount presets "500, abc"', 'Error "Comma-separated whole rupees, e.g. 500, 1000, 2000"'],
          ['Enter presets "500, 1000, 2500", min 100, max 20000, validity 12 and click "Save policy"', 'Toast "Gift card policy saved"; the app offers the new presets'],
          ['Save with the server rejecting', 'Toast "The policy could not be saved. Please try again."'],
        ],
      },
      {
        name: 'Browse sold cards and logs',
        description: 'Read-only tables.',
        steps: [
          ['Open /gift-cards/cards', 'Columns Purchased, Code, Theme, Amount, Status, Buyer, Recipient, Redeemed by, Expires, Payment; empty "No gift cards sold yet."'],
          ['Search a card code', 'The card row is shown with status Active, Redeemed or Expired'],
          ['Open /gift-cards/logs and filter Type "Redeemed"', 'Only REDEEM_TO_COINS rows with balance after are listed'],
          ['Look for create or disable actions', 'None exist — cards are issued only when a purchase payment succeeds'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Payout Cycles',
    description: 'When approved venue and host payouts are disbursed, at /payouts.',
    sub_flows: [
      {
        name: 'Set a weekly payout cycle',
        description: 'Disbursement schedule form.',
        steps: [
          ['Open /payouts', 'Card "Disbursement schedule" with Venue payout and Host payout (Immediately / Weekly / Month end)'],
          ['Set Host payout to Weekly', '"Payout day (weekly)" and "Payout time" appear'],
          ['Pick Friday at 18:00 and click "Save cycle"', 'Toast "Payout cycle saved"; new host withdrawals are scheduled for the next Friday 18:00'],
          ['Send payout_time "25:00" via the API', 'Server refuses "payout_time must be in HH:mm format"'],
          ['Set both to Immediately', 'Day and time fields are hidden'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Pod Profit Calculator',
    description: 'Single-pod and multi-pod profit calculations, saved, downloaded as PDF and emailed, at /calculators/pod-profit.',
    sub_flows: [
      {
        name: 'Calculate and save a single pod',
        description: 'Single pod tab.',
        steps: [
          ['Open /calculators/pod-profit', 'Tab "Single pod" with Pod pricing, Venue & host split, Expenses and results prefilled from Default Deductions'],
          ['Set ticket ₹1000 and 30 spots', 'Payable spots reads "29 of 30" and Total collection is ₹29,000'],
          ['Set the venue fixed cost above the pool', 'Host receives turns red with the shortfall note'],
          ['Add an expense borne by Host', 'Chips Host expenses and Total expenses appear and Host net drops'],
          ['Leave the name empty', 'Save is disabled'],
          ['Enter a name and click Save', 'Toast "Calculation saved" and URL gets ?calculation=<id>; it appears in the library'],
        ],
      },
      {
        name: 'Download and email a calculation report',
        description: 'Report actions for a saved calculation.',
        steps: [
          ['Change an input on a saved calculation', 'Download PDF and Email report are disabled: "Save your changes first — the report is built from what is stored."'],
          ['Save, then click "Download PDF"', '<name>-report.pdf downloads'],
          ['Click "Email report" and type an invalid email', 'Send stays disabled'],
          ['Enter a valid email and click Send', 'Toast "Report sent"; the email "Pod profit report - <name>" arrives with the PDF'],
          ['Delete the calculation', 'Confirm "Delete this saved calculation?"; toast "Calculation deleted" and ?calculation is cleared'],
        ],
      },
      {
        name: 'Compare multiple pods',
        description: 'Multiple pods tab.',
        steps: [
          ['Switch to ?selectedtab=multi and click "New comparison"', 'An "Untitled comparison" with "Pod 1" opens'],
          ['Click "Add pod"', '"Pod 2" copies the previous pod inputs and opens expanded'],
          ['Clear the comparison name and Save', 'Error "Give this comparison a name before saving."'],
          ['Name it and Save', 'Toast "Comparison saved"; Grand total sums Total collection, Duncit revenue, Venue and Host receives and GST'],
          ['Edit a pod and click "Back to saved comparisons"', 'Confirm "Leave without saving?" with "Discard changes"'],
          ['Delete the comparison', 'Confirm "Delete this comparison?"; toast "Comparison deleted" and the list shows again'],
        ],
      },
    ],
  },
  // ------------------------------------------------------------ MARKETING
  {
    name: 'Marketing: Access and dashboard',
    description:
      'marketing.duncit.com requires MARKETING_MANAGER; its resolvers also admit SUPER_ADMIN and (for most sections) CITY_ADMIN. The dashboard summarises campaigns, short links, audience lists and ads.',
    sub_flows: [
      {
        name: 'Role gate for the Marketing portal',
        description: 'Only marketing staff reach the console.',
        steps: [
          ['Sign in to marketing.duncit.com with an account lacking MARKETING_MANAGER', 'The shell refuses access and no marketing page renders'],
          ['Call reviewAdRequest with a CITY_ADMIN token', 'FORBIDDEN — ad review allows only SUPER_ADMIN and MARKETING_MANAGER'],
          ['Sign in with a MARKETING_MANAGER account', 'The Dashboard opens with nav Target Audience, Campaigns (Email, WhatsApp, Notifications, App Popups, Mail Preferences), Short Links, Coupons, Ads'],
        ],
      },
      {
        name: 'Read the marketing dashboard',
        description: 'KPI tiles and breakdown cards.',
        steps: [
          ['Open /', 'Header "Dashboard" with subtitle "Marketing at a glance · last N days"'],
          ['Look at the KPI tiles', 'Tiles for Emails delivered, Link clicks, Revenue from links and Live ads show numbers'],
          ['Check "Where clicks came from" with no link traffic', 'Empty text "No clicks recorded yet."'],
          ['Read "What is set up"', 'Counts for Active short links, Short links in total, Saved audience lists, Campaigns scheduled and Campaigns failed'],
          ['Click a link in the top links card', 'Navigates to /short-links/:linkId'],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Target Audience',
    description: 'Saved audience lists built from filters, with hand-picked additions and removals, at /audience.',
    sub_flows: [
      {
        name: 'Create an audience list',
        description: 'Two-step create: choose the audience with filters, then name the list.',
        steps: [
          ['Open /audience and click "Create list"', 'Navigates to /audience/new with a stepper "Choose the audience" > "Name the list" and a people count chip'],
          ['Apply filters (e.g. City, Age, Email verified)', 'The people table and the count chip update to the matching members'],
          ['Apply filters nobody matches', 'Table empty text "No one matches these filters."'],
          ['Click Next', 'Step 2 shows List name, List description and List owner (defaults to you)'],
          ['Submit with List name empty', 'Error "Give the list a name"'],
          ['Enter a 501-character description', 'Error "Keep the description under 500 characters"'],
          ['Fill the name and click "Save list"', 'Toast "“<name>” saved" and navigates back to /audience with the new row'],
        ],
      },
      {
        name: 'Leave the create page with filters applied',
        description: 'Unsaved filters ask before discarding.',
        steps: [
          ['On /audience/new apply two filters and press Back', 'Confirm "Leave without saving?" — "You have 2 filters applied. Leaving now discards them and no list is created."'],
          ['Click "Discard filters"', 'Navigates to /audience and no list is created'],
          ['Open /audience/new with no filters and press Back', 'Navigates straight to /audience without a dialog'],
        ],
      },
      {
        name: 'Add and remove members by hand',
        description: 'Manual overrides on a saved list.',
        steps: [
          ['Click a list row on /audience', 'Navigates to /audience/:listId showing "Owned by <owner>", "<N> people right now" and a chip per filter (or "No filters — everyone")'],
          ['Click "Add user"', 'Dialog "Add people to this list" with search "Search by name, email or phone" and "Whoever you pick stays in this list, whether or not they match its filters."'],
          ['Search a name that is not a candidate', '"No one matches that search." shows'],
          ['Tick two people', 'Footer reads "2 selected" and Add is enabled'],
          ['Click Add', 'Toast "People added to the list"; the chip "2 added by hand" appears and the member count grows'],
          ['Click Remove on a member', 'Confirm "Remove this person from the list?" explaining they stay out even if they match its filters'],
          ['Confirm', 'Toast "Removed from the list" and a "1 removed by hand" chip appears'],
          ['Open /audience/<deleted-id>', 'Warning "That audience list no longer exists."'],
        ],
      },
      {
        name: 'Delete an audience list',
        description: 'Deleting a list does not touch the people in it.',
        steps: [
          ['Click Delete on a list row', 'Confirm "Delete this audience list?" — "“<name>” will be removed. The people in it are not affected — a list only stores filters."'],
          ['Click Delete', 'Toast "“<name>” deleted" and the row disappears'],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Email campaigns',
    description: 'MJML email campaigns at /campaigns/email: compose with live preview, send now or schedule, resend, view and delete.',
    sub_flows: [
      {
        name: 'Compose and send a campaign now',
        description: 'New campaign form with Zod validation and a debounced server-rendered preview.',
        steps: [
          ['Open /campaigns/email and click "New campaign"', 'Navigates to /campaigns/email/new with the form on the left and "Live Preview" on the right'],
          ['Type a 2-character Campaign name', 'Error "Campaign name must be at least 3 characters"'],
          ['Type a 2-character Email subject', 'Error "Subject must be at least 3 characters"'],
          ['Replace the MJML with text lacking an <mjml> root', 'Error "MJML must include an <mjml> root element" and the submit button is disabled'],
          ['Restore valid MJML using a {{app_name}} variable', 'The preview renders the email after a short pause; the variables panel lists known variables'],
          ['Use an unknown {{foo}} variable', 'The variables panel flags foo as unknown'],
          ['Leave "Schedule at" empty', 'The submit button reads "Send Now"'],
          ['Click "Send Now"', 'Toast "Campaign sent"; navigates to /campaigns/email where the row shows status SENT with recipient count'],
        ],
      },
      {
        name: 'Target a saved audience list and schedule',
        description: 'Audience list reach and scheduling.',
        steps: [
          ['Set Audience to "Saved audience list"', 'An "Audience list" select appears with hint "Membership is recomputed when the campaign sends."'],
          ['Pick a list with members', 'Info "This campaign reaches N people."'],
          ['Pick a list with zero members', 'Warning "This campaign reaches nobody right now."'],
          ['Pick a future date and time in "Schedule at"', 'The submit button reads "Schedule Campaign"'],
          ['Click "Schedule Campaign"', 'Toast "Campaign scheduled"; the row shows status SCHEDULED with the schedule time'],
        ],
      },
      {
        name: 'Leave a dirty draft',
        description: 'Back from a changed form asks first.',
        steps: [
          ['Change the name on /campaigns/email/new and click "Campaigns"', 'Confirm "Leave without sending?" — "This campaign has not been saved. Going back discards the draft, including everything written in the editor."'],
          ['Click "Discard draft"', 'Navigates to /campaigns/email and nothing is created'],
        ],
      },
      {
        name: 'View, resend and delete a campaign',
        description: 'Row actions on the campaigns table.',
        steps: [
          ['Click a row', 'The campaign details dialog opens with the email as it went out, links and images tracking and engagement counts'],
          ['Hover Send on a SENT row', 'The button is disabled with tooltip "Already sent"'],
          ['Click "Send campaign now" on a SCHEDULED or FAILED row', 'Toast "Campaign sent" (or the server error, e.g. "Campaign send failed") and the table refreshes'],
          ['Click Delete on a SCHEDULED campaign', 'Confirm "Delete this campaign?" — "“<name>” is scheduled and has not gone out yet. Deleting it cancels that send — nobody will receive it."'],
          ['Click Delete on a SENT campaign', 'Message says it was delivered to N recipients and deleting only removes the record'],
          ['Confirm delete', 'Toast "“<name>” deleted" and the row disappears'],
          ['Hover Delete on a SENDING row', 'Disabled with tooltip "Sending right now — wait for it to finish"'],
        ],
      },
    ],
  },
  {
    name: 'Marketing: WhatsApp campaigns',
    description:
      'WhatsApp through AiSensy at /campaigns/whatsapp with tabs Dashboard, Campaigns, Templates, Automation, Logs and Settings (?selectedtab=). The AiSensy API key is set in Tech > Environment Variables.',
    sub_flows: [
      {
        name: 'Missing AiSensy key warning',
        description: 'The page warns when WhatsApp is not configured.',
        steps: [
          ['Remove the AiSensy API key in Tech > Environment Variables', 'The key is saved as empty'],
          ['Open /campaigns/whatsapp?selectedtab=campaigns', 'Warning "No AiSensy API key yet — add one in the Tech portal under Environment Variables → AiSensy before sending."'],
          ['Switch to the Settings tab', 'The warning is not shown on Settings'],
          ['Reload the page on ?selectedtab=logs', 'The Logs tab stays selected after reload'],
        ],
      },
      {
        name: 'Send a campaign to an audience',
        description: 'Send form opened from a campaign row.',
        steps: [
          ['On the Campaigns tab click Send on a campaign', 'The "Send WhatsApp campaign" form opens pointed at that campaign name'],
          ['Enter a 2-character name', 'Error "Give this campaign a name of at least 3 characters"'],
          ['Choose audience "Saved audience list" without picking one', 'Error "Pick the audience list to send to"'],
          ['Choose Specific users and pick nobody', 'Error "Pick at least one person to send to"'],
          ['Choose Manual numbers and add a contact with number "12"', 'Error "Number is 6–12 digits, without the country code"'],
          ['Leave a template value blank', 'Error "Fill this in — WhatsApp renders a blank where it goes"'],
          ['For a media-header template leave the media URL empty', 'Error "This template sends a header image, video or document — add its public link"'],
          ['Set "Send at" in the past', 'Error "Pick a time in the future"'],
          ['Fix all fields and submit', 'Toast "Campaign started — the table updates as it sends"; the send appears on the Logs tab'],
        ],
      },
      {
        name: 'Send a test message',
        description: 'One test message from a campaign row.',
        steps: [
          ['Click "Send one test message" on a campaign row', 'The test form opens for that campaign'],
          ['Submit with a valid number and values', 'Toast "Test sent — message id <id>"'],
          ['Submit when AiSensy rejects it', 'Error toast "The test message did not go out" (or the AiSensy error)'],
        ],
      },
      {
        name: 'Submit a template and create a campaign',
        description: 'Templates tab: Meta review then campaign binding.',
        steps: [
          ['On the Templates tab click "New template"', 'Dialog "Submit a WhatsApp template" with the PENDING and no-edit warnings'],
          ['Enter Template name "Diwali Offer"', 'Error "Use lowercase letters, numbers and underscores only"'],
          ['Leave a {{1}} placeholder in the Sample message', 'Error "Replace every placeholder in the sample with a real example value"'],
          ['Fill valid fields and click "Submit for review"', 'Toast "Template submitted. Meta is reviewing it — it is not usable yet."'],
          ['Once approved, open "New campaign", pick the approved template and a campaign name, click "Create campaign"', 'Toast "Campaign created." and the template leaves "Approved templates with no campaign"'],
          ['Delete a template', 'Confirm "Delete this template?" warns campaigns pointing at it stop sending; on confirm toast "Template deleted."'],
        ],
      },
      {
        name: 'Automation scenarios',
        description: 'Kill switch and per-scenario switches for platform-sent WhatsApp.',
        steps: [
          ['Open the Automation tab', 'Title "WhatsApp Automation" with the global "WhatsApp sending" switch and the scenarios table (Scenario, Audience, Category, Campaign, Template, Values, Media, Status, Enabled, Blocker)'],
          ['With the global switch off', 'Warning "WhatsApp sending is off. Nothing below is going out."'],
          ['Try to switch off a transactional scenario', 'The switch is locked with "Cannot be switched off" / "A ticket, a refund and an account change always send."'],
          ['Click "Reconcile with AiSensy"', 'Toast "Reconciled with AiSensy." or "Could not reach AiSensy."'],
          ['Open "Set media…" on a scenario and save a non-URL', 'Validation requires a full public http(s) link'],
          ['Save a valid public URL', 'Toast "Header asset saved." and the Media cell shows "Custom asset"'],
        ],
      },
      {
        name: 'Logs: cancel, retry, duplicate and export',
        description: 'Everything that went out, per send.',
        steps: [
          ['Open the Logs tab', '"Everything that went out" table with Kind (Campaign or Automatic), Send, Sent to, Reached, Cost'],
          ['Open a scheduled send and click "Cancel this send"', 'Toast "“<name>” cancelled — it will not go out" and the status reads Cancelled'],
          ['Hover cancel on a send already sent', 'Disabled with "Only a scheduled send can be cancelled"'],
          ['On a send with failures click "Retry N not reached"', 'Toast "Retrying the people it did not reach — the table updates as it goes"'],
          ['Click Duplicate', 'The send form opens prefilled with "<name> (copy)" and the same audience and values'],
          ['Click "Download CSV"', 'A CSV of recipients and results downloads'],
          ['Delete a finished send', 'Confirm explains delivered messages are not recalled; on confirm toast "“<name>” deleted"'],
        ],
      },
      {
        name: 'WhatsApp settings',
        description: 'Campaign names, per-message pricing and default header media.',
        steps: [
          ['On Settings add a campaign name with an empty name', 'Error "Campaign name is required"'],
          ['Add a valid campaign name', 'It appears in the list and in the send form campaign picker'],
          ['Enter a negative Marketing rate in pricing', 'Error "Marketing rate must be zero or more"'],
          ['Enter a 5-character currency symbol', 'Error "Keep the symbol to 4 characters"'],
          ['Save a default header image with an invalid link', 'Error "Use a full public link that starts with http:// or https://"'],
          ['Save a valid default image', 'Toast "Default header image saved."'],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Notifications',
    description: 'Push and in-app notifications at /notifications, targeted globally, by location, zone, users or a saved list.',
    sub_flows: [
      {
        name: 'Send a notification',
        description: 'New Notification dialog with scope-dependent validation.',
        steps: [
          ['Open /notifications and click "New Notification"', 'Dialog with Title, Body, Image URL (optional), Link URL (optional, e.g. /pods/abc), audience scope and "Silent (in-app only — no push alert)"'],
          ['Submit a 2-character title', 'Error "Title must be at least 3 characters"'],
          ['Submit a 4-character body', 'Error "Body must be at least 5 characters"'],
          ['Pick "By Location" without a location', 'Error "Pick a location"'],
          ['Pick "By Zone" with a location but no zone', 'Error "Pick a zone"'],
          ['Pick "Specific Users" and select nobody', 'Error "Pick at least one user"'],
          ['Pick "Saved audience list" without a list', 'Error "Pick an audience list"'],
          ['Choose "All users (Global)" and submit valid content', 'Snackbar "Sent · delivered N · failed M" and the row appears in the table'],
        ],
      },
      {
        name: 'Delete a notification',
        description: 'Confirmed delete.',
        steps: [
          ['Click Delete on a row', 'Confirm "Delete notification" — "Delete notification "<title>"?"'],
          ['Confirm', 'Snackbar "Deleted" and the row disappears'],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Status',
    description:
      'The Duncit statuses published at /status: media, caption and an optional link, sent to everyone or to chosen cities, kept for 24 hours, for ever or until a picked date. They ride at the front of the apps\' status rail.',
    sub_flows: [
      {
        name: 'Publish a global status',
        description: 'The simplest status: everyone sees it for 24 hours.',
        steps: [
          ['Open Marketing > Status', 'The table lists published statuses with their scope, expiry, Live chip and view count'],
          ['Press New status', 'The dialog asks for a title, media, caption, link, scope and expiry'],
          ['Upload an image, add a caption, leave the link empty, keep scope Global and expiry 24 hours, then save', 'A toast confirms it and the row shows "Global", an expiry 24 hours from now and a Live chip'],
          ['Open the customer app in any city', 'A Duncit ring sits first in the status rail; opening it shows the image and caption'],
        ],
      },
      {
        name: 'Publish to chosen cities only',
        description: 'A location-wise status reaches only the cities picked.',
        steps: [
          ['Create a status, choose scope "Selected cities" and pick two cities', 'The cities show as chips; saving with none picked is refused with "Pick at least one city"'],
          ['Save it', 'The table row lists both city names instead of "Global"'],
          ['Open the app with one of those cities selected', 'The Duncit ring shows'],
          ['Switch the app to a city that was not picked', 'The Duncit ring is gone, and the rest of the rail is unchanged'],
        ],
      },
      {
        name: 'Expiry: never and custom',
        description: 'The three expiry choices, and what the apps do at the end.',
        steps: [
          ['Create a status with expiry Never', 'The table shows "Never" and the status stays in the rail indefinitely'],
          ['Create one with expiry Custom and pick a past date', 'The form refuses it and asks for a future date and time'],
          ['Pick a time a few minutes ahead and save', 'The table shows that date; the app still shows the ring'],
          ['Wait until that time passes and reload the app', 'The Duncit ring is gone, while the row stays in the table marked Expired'],
          ['Reopen that expired row', 'It reopens as Custom with its stored date, not back at 24 hours'],
        ],
      },
      {
        name: 'A status with a link',
        description: 'The slide can send someone somewhere.',
        steps: [
          ['Create a status with the link /pod-ideas', 'It saves; a link of plain http:// is refused'],
          ['Open it in the app and tap "See more"', 'The app closes the status and opens Pod Ideas'],
          ['Create one with an https link and tap "See more"', 'It opens outside the app'],
        ],
      },
      {
        name: 'Switch a status off, and delete one',
        description: 'Taking a status out of the rail, with and without keeping the record.',
        steps: [
          ['Turn Active off on a live status and save', 'The Live chip clears and the app no longer shows it'],
          ['Turn it back on', 'The app shows it again while it is still inside its expiry'],
          ['Delete a status', 'A confirm names it; afterwards the row is gone and so is its view count'],
        ],
      },
      {
        name: 'Views and the unseen ring',
        description: 'Watching a status is counted once per person.',
        steps: [
          ['Open the app as a member who has not seen it', 'The Duncit ring shows unseen'],
          ['Watch the status, then go back to Home', 'The ring is greyed out, on both mWeb and the app'],
          ['Reload the app and look again', 'It stays greyed'],
          ['Open Marketing > Status', 'The Views count for that status went up by one; watching it twice does not count twice'],
        ],
      },
    ],
  },
  {
    name: 'Marketing: App Popups',
    description: 'Full-screen image popups shown once per person when the app opens, at /app-popups.',
    sub_flows: [
      {
        name: 'Create a popup',
        description: 'Popup form (RHF + Zod).',
        steps: [
          ['Open /app-popups and click "New Popup"', 'Dialog "New popup" with Name, Popup image, Starts/Ends (default a 7-day window), Enabled, Target platform, "Show ✕ close button", CTA button label, CTA link and Audience'],
          ['Submit without an image', 'Error "Upload the popup image"'],
          ['Set Ends before Starts', 'Error "End date must be after the start date"'],
          ['Enter a CTA link without a label', 'Error "Give the button a label"'],
          ['Enter a CTA label without a link', 'Error "Give the button a link"'],
          ['Enter CTA link "ftp://x"', 'Error "Use a full https:// link or an in-app path like /earn"'],
          ['Pick Audience "Saved audience list" without a list', 'Error "Pick an audience list"'],
          ['Fill valid values with platform "Android only" and click "Create popup"', 'Snackbar "Popup created" and the row appears'],
        ],
      },
      {
        name: 'Edit and delete a popup',
        description: 'Row actions.',
        steps: [
          ['Click Edit on a popup', 'Dialog "Edit popup" prefilled; button "Save changes"'],
          ['Change the end date and save', 'Snackbar "Popup updated"'],
          ['Click Delete', 'Confirm "Delete popup" — "Delete "<name>"? It stops showing in the app immediately."'],
          ['Confirm', 'Snackbar "Deleted" and the popup no longer shows in the app'],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Mail Preferences analytics',
    description: 'Opt-out analytics at /campaigns/mail-preferences.',
    sub_flows: [
      {
        name: 'Read opt-out analytics',
        description: 'KPIs, breakdowns and the change log.',
        steps: [
          ['Open /campaigns/mail-preferences', 'Header "Mail Preference Analytics" with tiles People opted out, Fully opted out, Opt-outs and Came back'],
          ['Change Range to "Last 7 days"', 'Opt-outs and Came back counts recompute for the range'],
          ['Read "By category" and "Where the change was made"', 'Per-category opted-out counts and per-surface counts; "No changes in this range." when empty'],
          ['Search "Every change, per user" by email', 'Rows for that person with Category, Action (Opted out / Opted back in), Made from and When'],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Short Links',
    description: 'Tracked duncit.com short links with UTM tagging and click analytics, at /short-links.',
    sub_flows: [
      {
        name: 'Create a short link',
        description: 'Create dialog with an allowlisted destination.',
        steps: [
          ['Open /short-links and click "New short link"', 'Form with Label, Destination, Link creating for, Medium and optional Campaign'],
          ['Enter destination "https://example.com"', 'Error "Use a full https:// link to a Duncit site or an app store listing"'],
          ['Pick "Link creating for" = Other and leave "Which channel?" empty', 'Error "Say what the channel is"'],
          ['Pick Medium = Other and leave "Which medium?" empty', 'Error "Say what the medium is"'],
          ['Fill a valid Duncit destination and click "Create link"', 'Navigates to /short-links/:linkId for the new link'],
        ],
      },
      {
        name: 'Inspect link analytics',
        description: 'Summary, clicks over time, breakdowns, clicks and journeys.',
        steps: [
          ['Open /short-links/:linkId', 'Summary with short URL, QR, status Active, total clicks and unique visitors'],
          ['Read the breakdown cards', 'Came from, Country, City, Device, Operating system and Browser cards render'],
          ['Search the clicks table by city', 'Matching click rows are shown'],
          ['Open a journey row', 'The journey timeline dialog shows how far that visitor got'],
        ],
      },
      {
        name: 'Retire, reactivate and delete a link',
        description: 'Retire stops new traffic; delete 404s the link.',
        steps: [
          ['Click "Retire link" on the detail page', 'Toast "“<label>” retired"; status reads Retired and the button changes to "Reactivate link"'],
          ['Click "Reactivate link"', 'Toast "“<label>” reactivated"'],
          ['On /short-links click Delete on a row', 'Confirm "Delete this short link?" warning it stops working immediately and printed links will 404'],
          ['Confirm', 'Toast "“<label>” deleted" and the row disappears'],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Coupons',
    description: 'Global and pod-specific discount codes at /coupons and /coupons/:couponId (shared @duncit/coupons).',
    sub_flows: [
      {
        name: 'Create a coupon',
        description: 'Coupon form validation and uniqueness.',
        steps: [
          ['Open /coupons and click "New coupon"', 'Dialog "New coupon" with Code (3–30 chars: A–Z, 0–9, - or _), Description, Discount %, Min order ₹, Scope, Valid from/until, Max total uses, Per-user limit, Active'],
          ['Enter Discount % = 0', 'Error "Minimum 1%"'],
          ['Enter Discount % = 150', 'Error "Maximum 100%"'],
          ['Enter Min order = -1', 'Error "Must be 0 or greater"'],
          ['Enter Max total uses = 1.5', 'Error "Must be a whole number"'],
          ['Choose Scope "Pod-specific" without a pod', 'Error "Pick a pod for a pod-scoped coupon"'],
          ['Fill valid values and click Create', 'Toast "Coupon created" and the row appears'],
          ['Create another coupon with the same code', 'Error "A coupon with this code already exists"'],
        ],
      },
      {
        name: 'Coupon detail, edit and delete',
        description: 'Rules, stats and redemptions.',
        steps: [
          ['Click a coupon row', 'Navigates to /coupons/:couponId showing Rules and stats Redeemed, Members, Discount given, Order value'],
          ['Read "Who used this coupon" for an unused code', 'Empty text "Nobody has used this coupon yet."'],
          ['Edit the coupon and save', 'Toast "Coupon updated"'],
          ['Delete the coupon', 'Confirm "Delete coupon" — "Delete coupon "<code>"?"; on confirm toast "Coupon deleted"'],
          ['Open the URL of a deleted coupon', '"This coupon no longer exists."'],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Ads',
    description: 'Ads Approval, Live Ads and Ads Settings for requests submitted from the Ads portal.',
    sub_flows: [
      {
        name: 'Approve or reject an ad request',
        description: 'Review dialog; approval freezes the cost.',
        steps: [
          ['Open /ads-approvals', 'Header "Ads Approval"; the status filter defaults to Pending (options Pending, Approved, Rejected, All)'],
          ['Open a pending request', 'Dialog "<trace id> · <ad title>" with details and a Remarks field ("Optional, but recommended — shared with the advertiser")'],
          ['Enter remarks and click Approve', 'Toast "Ad request approved"; it leaves the Pending filter and its cost is frozen at current pricing'],
          ['Open another pending request and click Reject', 'Toast "Ad request rejected"'],
          ['Open an already reviewed request', 'Only a Close button is shown'],
          ['Filter to a status with no rows', 'Empty text "No ad requests match the current filters."'],
        ],
      },
      {
        name: 'Stop or delete a live ad',
        description: 'Live Ads actions.',
        steps: [
          ['Open /live-ads', 'Header "Live Ads" listing ads running now; empty text "No ads are running right now."'],
          ['Click "Stop ad" on a row', 'Confirm "Stop this ad?" — it stops showing immediately, the record is kept for billing and it cannot be restarted'],
          ['Confirm', 'Toast "“<title>” stopped" and the row leaves the table'],
          ['Click Delete on a row', 'Confirm "Delete this ad?" — removed permanently along with its billing record'],
          ['Confirm', 'Toast "“<title>” deleted"'],
        ],
      },
      {
        name: 'Update ad pricing',
        description: 'Ads Settings pricing form.',
        steps: [
          ['Open /ads-settings', 'Per-placement per-day prices, currency symbol, Minimum/Maximum campaign days and rate card wording'],
          ['Clear the Sidebar price', 'Error "Sidebar price is required"'],
          ['Enter -5 for Pod List', 'Error "Pod List price cannot be negative"'],
          ['Set Minimum days 10 and Maximum days 5', 'Error "Maximum days cannot be shorter than minimum days"'],
          ['Enter valid values and click "Save Pricing"', 'Toast "Ad pricing updated"; new requests in the Ads portal quote the new prices'],
        ],
      },
    ],
  },
];
