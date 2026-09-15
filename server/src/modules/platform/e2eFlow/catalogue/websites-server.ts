import type { CatalogueFlow } from './catalogue.types';

/** The Astro marketing websites, the status page, and the server flows no screen drives (boot, schedulers, webhooks, REST routes). */
export const WEBSITE_SERVER_FLOWS: readonly CatalogueFlow[] = [
  /* ------------------------------------------------------------------ */
  /* duncit.com (website/main-website)                                   */
  /* ------------------------------------------------------------------ */
  {
    name: 'Website: Home page',
    description:
      'The duncit.com landing page: hero reel, sign-in and join CTAs, the download band, the Duncit network cards and the earn section.',
    sub_flows: [
      {
        name: 'Hero and account CTAs',
        description: 'The hero reel and the two account buttons that hand a visitor to mWeb.',
        steps: [
          ['Open https://duncit.com/ in a desktop browser', 'The hero renders with the muted looping reel behind a dark scrim, the badge, the two-line headline and the intro text'],
          ['Watch the banner border for a few seconds', 'The marquee ribbon text drifts slowly around the rounded banner edge and wraps seamlessly'],
          ['Click the Join button', 'The browser navigates to https://mweb.duncit.com/register'],
          ['Go back and click Sign in', 'The browser navigates to https://mweb.duncit.com/login'],
          ['Click the scroll cue under the CTAs', 'The page scrolls to the #download section'],
          ['Click the Get app chip in the hero nav', 'The page scrolls to the #download section'],
        ],
      },
      {
        name: 'Reel respects reduced motion',
        description: 'A visitor who asked for less motion sees the poster frame instead of the reel.',
        steps: [
          ['Enable prefers-reduced-motion in the OS or DevTools rendering panel and reload the home page', 'The hero shows the static poster image; the video is paused and does not autoplay'],
          ['Disable reduced motion, block autoplay in the browser, reload, then tap anywhere on the page', 'The reel starts playing after the first pointer, touch or key interaction'],
        ],
      },
      {
        name: 'Download band store buttons',
        description: 'Store buttons come from Admin branding android_app_url and ios_app_url, baked in at build time.',
        steps: [
          ['With both store URLs set in Admin branding, rebuild and open the #download section', 'Google Play and App Store buttons render as live links with the perks list beside them'],
          ['Click the Google Play button', 'The Play Store listing opens in a new tab'],
          ['Clear the iOS store URL in Admin branding, rebuild the site and reload', 'The App Store tile renders in its coming-soon state with no link'],
        ],
      },
      {
        name: 'Duncit network and earn cards',
        description: 'Cross-site cards pointing at earnwith, ads and partners sites.',
        steps: [
          ['Scroll to the Duncit network section', 'Three cards render: Earn with Duncit, Ads and Partners, each with a CTA'],
          ['Click the Ads card CTA', 'https://ads.duncit.com opens in a new tab and the link carries the external-link glyph and a screen-reader "opens in a new tab" label'],
          ['Scroll to the Earn with Duncit section and click the Host, Venue or Sell card', 'https://earnwith.duncit.com opens in a new tab'],
        ],
      },
      {
        name: 'Theme toggle and menu',
        description: 'The slide-out menu opened from the hero burger, with the persisted light/dark theme toggle.',
        steps: [
          ['Click the burger (Menu) button in the hero', 'The site menu slides in with About, Community, Safety Hub and Support groups plus the policy links'],
          ['Click the moon theme toggle inside the menu', 'The page switches to dark theme and localStorage key duncit-theme is set to dark'],
          ['Reload the page', 'The page renders dark before first paint with no light flash'],
          ['Click the Close menu button or the backdrop', 'The menu closes'],
        ],
      },
    ],
  },
  {
    name: 'Website: Navigation and footer',
    description:
      'Header and footer navigation from the Website portal Navigation manager (MAIN site), the Policy Hub strip and social links.',
    sub_flows: [
      {
        name: 'Navigation from the Website portal',
        description: 'publicWebsiteNav(site: MAIN) groups win; bundled fallback groups render when the portal has none.',
        steps: [
          ['In the Website portal add a HEADER link for site MAIN in group "Support", then rebuild duncit.com', 'The new link appears under Support in the site menu in its sort order'],
          ['Delete every MAIN HEADER link and rebuild', 'The menu falls back to the bundled groups: About, Community, Safety Hub and Support with their default pages'],
          ['Add a FOOTER link with an absolute https URL and rebuild', 'The footer column shows it; clicking it opens a new tab with the external-link glyph'],
          ['Add a FOOTER link with a relative path such as /faq and rebuild', 'The link opens in the same tab without the external glyph'],
        ],
      },
      {
        name: 'Policy Hub strip in the footer',
        description: 'Every active policy from the Legal portal rendered across the footer.',
        steps: [
          ['Scroll to the footer on any page', 'The Policy Hub strip lists every active policy title plus an All policies link'],
          ['Click one policy title', 'The browser opens /policy/<slug> for that policy'],
          ['Click All policies', 'The browser opens /policies'],
          ['Check the copyright line', 'It reads © <app name> <current year> | All Rights Reserved'],
        ],
      },
    ],
  },
  {
    name: 'Website: Newsletter signup',
    description:
      'The shared @duncit/brand newsletter form used in footers on all four marketing sites. Posts subscribeNewsletter with a deferred captcha.',
    sub_flows: [
      {
        name: 'Subscribe from the duncit.com footer',
        description: 'Happy path for a new address with source WEBSITE_FOOTER.',
        steps: [
          ['Scroll to the duncit.com footer newsletter row', 'The "Get Duncit updates" heading, an email field and a Notify button render; no captcha is visible yet'],
          ['Type a new email address into the field', 'The captcha widget appears on the first keystroke with a code image, a refresh button and an answer field'],
          ['Type the characters from the captcha image and click Notify', 'The button disables, the status line shows the busy text, then "Subscribed! Check your inbox." and the field clears'],
          ['Query the newsletter subscribers collection for the address', 'One subscriber row exists with source WEBSITE_FOOTER and unsubscribed_at null'],
          ['Open Tech or CRM email logs for the address', 'A newsletter-welcome email row exists with category marketing'],
        ],
      },
      {
        name: 'Subscribe with an existing or unsubscribed address',
        description: 'The server reactivates instead of creating a duplicate.',
        steps: [
          ['Submit the newsletter form with an address that is already subscribed', 'The status line shows "You are subscribed." and no second subscriber row is created'],
          ['Call unsubscribeNewsletter for the address, then subscribe again from the footer', 'The existing row has unsubscribed_at reset to null and the status reads "You are subscribed."'],
        ],
      },
      {
        name: 'Newsletter validation and captcha failures',
        description: 'Browser validation first, then the server captcha verdicts.',
        steps: [
          ['Type "not-an-email" and click Notify', 'The browser email validation message appears and no request is sent'],
          ['Enter a valid email, type a wrong captcha answer and submit', 'The captcha shows "That code does not match. Here is a new one to try." and a new image loads; no subscriber row is created'],
          ['Enter a valid email and leave the captcha answer empty, then submit', 'Browser validation blocks the submit because the visible captcha answer is required'],
          ['Wait more than 10 minutes after the captcha image loaded, answer it and submit', 'The captcha shows "That code has expired. Here is a new one to try." and reloads'],
        ],
      },
      {
        name: 'Consent checkbox variant',
        description: 'The card variant on ads and earnwith sites asks for consent before sending.',
        steps: [
          ['Open https://earnwith.duncit.com and scroll to the footer newsletter card', 'The card shows heading, text, email field, Subscribe button and a consent checkbox linking to duncit.com/policies'],
          ['Enter a valid email and captcha but leave consent unticked, then click Subscribe', 'Browser validation stops the submit on the consent checkbox'],
          ['Tick consent and submit', 'The status reads the success message and a subscriber row is created'],
          ['Click the consent policy link', 'https://duncit.com/policies opens in a new tab'],
        ],
      },
    ],
  },
  {
    name: 'Website: Policies',
    description:
      'The Policy Hub at /policies and the per-policy pages at /policy/<slug>, answered by the Node HTML server against the live Legal portal policy.',
    sub_flows: [
      {
        name: 'Browse and search the Policy Hub',
        description: 'publicPolicies fetched in the browser, filtered as you type by title or slug.',
        steps: [
          ['Open https://duncit.com/policies', 'Skeleton cards show, then one card per active policy with a "read current" line; the search field appears once the list loads'],
          ['Type part of a policy title into the search field', 'Only matching cards remain and the count line reads "<n> policies match “<query>”" (or "policy matches" for one)'],
          ['Type words from a slug with spaces instead of dashes, e.g. "data deletion"', 'The policy whose slug contains data-deletion is listed'],
          ['Type a string that matches nothing', 'The list shows "Nothing matches “<query>”" with a Show all policies button'],
          ['Click Show all policies', 'The search clears, focus returns to the field and every policy is listed again'],
        ],
      },
      {
        name: 'Policy Hub empty and error states',
        description: 'No active policies, or the API is unreachable.',
        steps: [
          ['Deactivate every policy in the Legal portal and reload /policies', 'The list reads "No policies are published yet — check back soon." and the search field stays hidden'],
          ['Block requests to server.duncit.com/graphql in DevTools and reload /policies', 'The list reads "Policies could not be loaded right now. Please try again later."'],
        ],
      },
      {
        name: 'Open a policy by slug',
        description: 'A policy that existed at build time, with its live text loaded client-side.',
        steps: [
          ['Open https://duncit.com/policy/<active-slug>', 'The server responds 200, skeleton lines show, then the policy content from policyBySlug renders'],
          ['Check the page heading and tab title', 'The heading shows the policy title and the document title reads "<title> — Duncit"'],
          ['Edit the policy text in the Legal portal and reload the page', 'The new text renders immediately without a site redeploy'],
          ['Click All policies under the content', 'The browser opens /policies'],
        ],
      },
      {
        name: 'Policy published after the build',
        description: 'The HTML server answers an unknown slug with the reader page when the live policy exists.',
        steps: [
          ['Create and activate a new policy in the Legal portal without redeploying the website', 'The policy is active in the database'],
          ['Wait at least 15 seconds (the server policy cache TTL) and open /policy/<new-slug>', 'The response is 200 and the reader page loads the new policy text by the slug in the address'],
          ['View the page source', 'The meta block carries og:title and og:description from the live policy title and plain-text content'],
        ],
      },
      {
        name: 'Renamed policy slug redirects',
        description: 'A renamed policy keeps old links working with a temporary redirect.',
        steps: [
          ['Rename the slug of an active policy in the Legal portal from old-slug to new-slug', 'The policy now resolves under both slugs through policyBySlug'],
          ['Wait 15 seconds, then request /policy/old-slug with curl -I', 'The response is 302 with Location /policy/new-slug and Cache-Control no-store'],
          ['Follow the redirect in a browser', 'The policy renders at /policy/new-slug'],
        ],
      },
      {
        name: 'Retired policy and reserved paths',
        description: 'Negative paths for /policy/<slug>.',
        steps: [
          ['Deactivate a policy that was built into the site, wait 15 seconds and request /policy/<that-slug>', 'The response is a real 404 serving the site 404 page'],
          ['Request /policy/_reader directly', 'The response is 404; the reader page is never served at its own address'],
          ['Request /policy/Not_A_Valid_Slug', 'The path does not match the lowercase slug rule and falls through to the static 404 page with status 404'],
          ['Open /policy/<slug-that-never-existed> with the API reachable', 'The response is 404'],
        ],
      },
      {
        name: 'Legacy /policy?slug= alias',
        description: 'The old address is answered as a permanent move.',
        steps: [
          ['Request https://duncit.com/policy?slug=privacy-policy with curl -I', 'The response is 301 with Location /policy/privacy-policy'],
          ['Request https://duncit.com/policy with no query', 'The response is 301 with Location /policies'],
        ],
      },
      {
        name: 'Policy pages with the API unreachable',
        description: 'The HTML server degrades to the built page when it cannot ask the API.',
        steps: [
          ['Stop the API (or point SERVER_URL at an unreachable host) and request /policy/<built-slug>', 'The built page is served with 200 and no live meta block injected'],
          ['Let the page script run while the API is still down', 'The body reads "The policy could not be loaded right now. Please try again later."'],
        ],
      },
    ],
  },
  {
    name: 'Website: Short link hop and meta cards',
    description:
      'The duncit.com Node HTML server: short-code paths redirect to the API resolver, per-request meta cards for blog posts and policies, and static file rules.',
    sub_flows: [
      {
        name: 'Short code path redirects to the resolver',
        description: 'Exactly 8 base62 characters with at least one digit and one uppercase letter.',
        steps: [
          ['Create an active short link in the Marketing portal and note its 8-character code', 'The code matches the pattern, e.g. aB3xY9Zq'],
          ['Request https://duncit.com/<code> with curl -I and a Referer header of https://instagram.com/', 'The response is 302 to https://server.duncit.com/r/<code>?dr=https%3A%2F%2Finstagram.com%2F with Cache-Control no-store'],
          ['Request https://duncit.com/<code>?dr=https://x.com with a different Referer', 'The existing dr query value is kept and not overwritten by the Referer'],
          ['Request https://duncit.com/<code>/ with a trailing slash', 'The trailing slash is trimmed and the same 302 to /r/<code> is returned'],
        ],
      },
      {
        name: 'Non-code paths are never treated as links',
        description: 'Real pages and malformed codes are served normally.',
        steps: [
          ['Request https://duncit.com/about', 'The About page is served with 200; no redirect happens'],
          ['Request https://duncit.com/abcdefgh (8 lowercase letters)', 'No redirect; the response is the 404 page with status 404'],
          ['Request https://duncit.com/ABCDEFGH1 (9 characters)', 'No redirect; the response is 404'],
        ],
      },
      {
        name: 'Blog post card for crawlers',
        description: 'The one route whose card depends on the query string.',
        steps: [
          ['Publish a BLOG post with a summary and image in the Website portal', 'The post is returned by publicWebsiteContent(type: BLOG)'],
          ['Request https://duncit.com/blog/post?slug=<slug> with curl', 'The HTML head carries og:title = post title, og:description = plain-text summary, og:type article and twitter:card summary_large_image'],
          ['Request /blog/post?slug=does-not-exist', 'The built blog page meta is served unchanged with 200'],
        ],
      },
      {
        name: 'Page meta tags at build time',
        description: 'Every page head is built by SiteMeta from its localized title and description.',
        steps: [
          ['View source of https://duncit.com/careers', 'The head has a canonical link, og:site_name from branding app_name, og:title, og:description, og:url https://duncit.com/careers and the branding header logo as og:image'],
          ['Check the favicon link', 'It points at the Admin branding website_favicon_url, or /duncit-logo.svg when that is blank'],
        ],
      },
      {
        name: 'HTML server method, 404 and cache rules',
        description: 'Negative and caching behaviour of the static half.',
        steps: [
          ['Send POST https://duncit.com/about', 'The response is 405 with header Allow: GET, HEAD'],
          ['Request https://duncit.com/this-page-does-not-exist', 'The response status is 404 and the body is the site 404 page with Take me home and Get help buttons'],
          ['Request a hashed asset under /_astro/ with Accept-Encoding gzip', 'Cache-Control is public, max-age=31536000, immutable and Content-Encoding is gzip for JS/CSS'],
          ['Request /duncit-logo.svg', 'Cache-Control is public, max-age=2592000'],
          ['Request /..%2f..%2fetc/passwd', 'The path is refused and a 404 is returned; no file outside dist is read'],
          ['Send HEAD https://duncit.com/about', 'The response is 200 with headers and an empty body'],
        ],
      },
    ],
  },
  {
    name: 'Website: Contact form',
    description:
      'duncit.com/contact: reach-us cards from Admin branding and the contact form posting submitContactForm with the captcha.',
    sub_flows: [
      {
        name: 'Send a message',
        description: 'Happy path for an anonymous visitor.',
        steps: [
          ['Open https://duncit.com/contact', 'The Email us card shows the branding support email; a Call us card shows when support_phone is set, otherwise a Help Center card linking /help'],
          ['Fill name, email, subject and a message of at least 5 characters, answer the captcha and click Send', 'The button shows a spinner with "Sending", then "Message sent!" with a check, and the form resets with a fresh captcha'],
          ['Open the CRM Contact Submissions inbox', 'A new submission with the entered name, email, subject and message exists and carries a ticket_id'],
          ['Open the Support portal tickets', 'A support ticket raised from the contact message exists'],
          ['Check the email log for the visitor address', 'A contact-received email was sent with subject "We received your message — Duncit"'],
        ],
      },
      {
        name: 'Contact form validation',
        description: 'Browser-required fields and server validation messages.',
        steps: [
          ['Click Send with name, email and message empty', 'Browser validation stops the submit on the first required field'],
          ['Submit with a 3-character message and a correct captcha', 'The red error line shows the server validation message for message minimum length and the captcha reloads'],
          ['Leave subject empty and submit a valid form', 'The message is accepted; subject is stored empty and the ack email says "(no subject)"'],
        ],
      },
      {
        name: 'Contact captcha failures',
        description: 'A spent or wrong code is answered by the captcha widget itself.',
        steps: [
          ['Fill the form, type a wrong captcha answer and click Send', 'The captcha shows "That code does not match. Here is a new one to try.", a new image loads and the form error line stays hidden'],
          ['Use the refresh button next to the captcha image', 'A new image loads, the answer field clears and receives focus'],
          ['Block the captchaChallenge request and reload the page', 'The captcha shows "The check could not load. Please try again in a moment."'],
        ],
      },
      {
        name: 'Contact API failure',
        description: 'Network failure while sending.',
        steps: [
          ['Fill a valid form, go offline in DevTools and click Send', 'The error line shows "Could not send. Please try again." or the network error text, the captcha reloads and the button returns to Send'],
        ],
      },
    ],
  },
  {
    name: 'Website: FAQ and Help Center',
    description:
      'duncit.com/faq (grouped FAQs plus Ask a question) and duncit.com/help (topic cards and search), both reading publicFaqGroups.',
    sub_flows: [
      {
        name: 'Read grouped FAQs',
        description: 'FAQs grouped by super category with anchored headings.',
        steps: [
          ['Open https://duncit.com/faq', 'Each super category renders as a heading followed by expandable question cards; the first card in each group is open'],
          ['Click a closed question', 'The card expands to show the answer and the plus icon rotates'],
          ['Open https://duncit.com/faq#<category-slug>', 'After the FAQs load the page scrolls smoothly to that category heading'],
          ['Unpublish every FAQ and reload', 'The page reads "No FAQs published yet — ask your question below and we\'ll answer."'],
        ],
      },
      {
        name: 'Ask a question',
        description: 'submitFaqQuestion with client checks and the captcha.',
        steps: [
          ['Type a question shorter than 5 characters with an email and captcha, then click Ask', 'The error line reads "Please type a longer question." and no request is sent'],
          ['Type a valid question, clear the email field and submit', 'Browser validation stops on the required email field'],
          ['Type a valid question and email, answer the captcha and click Ask', 'The button shows "Got it!", the form resets and the captcha reloads'],
          ['Open the FAQ submissions queue in the Support portal', 'A FAQ submission with the question and email exists in its initial status'],
          ['Check the email log for the address', 'A faq-received email was sent with subject "We received your question — Duncit"'],
          ['Submit again with a wrong captcha answer', 'The captcha shows its wrong-code message and no submission is created'],
        ],
      },
      {
        name: 'Help Center topics and search',
        description: 'Topic cards per FAQ category with a client-side search.',
        steps: [
          ['Open https://duncit.com/help', 'A card per FAQ category shows its name and question count ("1 question" or "<n> questions")'],
          ['Type part of a category name into the search box', 'Only topic cards whose name contains the text stay visible'],
          ['Click a topic card', 'The browser opens /faq#<category-slug> and scrolls to that group'],
          ['Check the Still need help section', 'Email, Call (when support_phone is set), Contact form (/contact) and Ask a question (/faq) cards render'],
          ['Block the GraphQL request and reload /help', 'The topics area reads "Topics could not be loaded right now — reach us directly below."'],
        ],
      },
    ],
  },
  {
    name: 'Website: Careers and job applications',
    description:
      'duncit.com/careers: open roles from Website portal CAREERS content and the Apply dialog posting submitJobApplication.',
    sub_flows: [
      {
        name: 'Apply for an open role',
        description: 'Happy path through the apply dialog.',
        steps: [
          ['Publish a CAREERS entry in the Website portal and open https://duncit.com/careers', 'The open roles list shows the role title, category or summary, body and an Apply now button'],
          ['Click Apply now on the role', 'A modal dialog opens titled "Apply for" with the role title and empty fields'],
          ['Fill full name, email, phone +919876543210, a resume URL, a portfolio URL and a note, then click Submit application', 'The button shows "Sending…", then the feedback reads "Application received — the team will reach out if it\'s a match." and the dialog closes after about 2 seconds'],
          ['Open the Website portal Job Applications inbox', 'A new application with role_content_id, role title and all entered fields exists'],
        ],
      },
      {
        name: 'Duplicate application within a minute',
        description: 'Soft de-duplication of the same email and role inside 60 seconds.',
        steps: [
          ['Submit an application for a role, reopen the dialog and submit again with the same email within 60 seconds', 'The feedback reads "Application received — we already have your submission."'],
          ['Check the Job Applications inbox', 'Only one application exists for that email and role'],
        ],
      },
      {
        name: 'Apply dialog validation',
        description: 'Browser and server validation of the application.',
        steps: [
          ['Enter a one-character name and submit', 'Browser validation stops the submit on the name minimum length of 2'],
          ['Enter phone "12ab" and submit', 'Browser validation rejects the phone pattern (+ and 6–15 digits)'],
          ['Enter resume "not a url" and submit', 'Browser validation rejects the URL field'],
          ['Close the dialog with the X button', 'The dialog closes without sending'],
        ],
      },
      {
        name: 'No open roles',
        description: 'Empty CAREERS content.',
        steps: [
          ['Unpublish every CAREERS entry and reload /careers', 'The roles area reads "No published items yet." and the no-role paragraph with the support email mailto link still renders'],
        ],
      },
    ],
  },
  {
    name: 'Website: Grievance redressal',
    description:
      'duncit.com/grievance: the published Grievance Officer, the escalation ladder and the signed-out grievance form (submitGrievance with source WEBSITE).',
    sub_flows: [
      {
        name: 'Grievance Officer block',
        description: 'Officer details published from the Legal portal and read at build time.',
        steps: [
          ['Leave the Grievance Officer name blank in the Legal portal, rebuild and open /grievance', 'The officer section reads "Our Grievance Officer details will be published here shortly."'],
          ['Fill officer name, email, phone and address, rebuild and reload', 'A card lists each filled value with its label; blank fields are omitted'],
        ],
      },
      {
        name: 'Raise a grievance',
        description: 'Happy path for a visitor with a support ticket reference.',
        steps: [
          ['Open https://duncit.com/grievance', 'The escalation ladder with three steps and the warning note renders above the form'],
          ['Fill support ticket reference, name, email, phone, subject and description, answer the captcha and submit', 'The form and ladder hide and a card shows "Grievance received" with a reference number starting GRV'],
          ['Open the Legal portal grievance queue', 'The grievance exists with source WEBSITE, the entered fields and the ticket reference'],
          ['Check the email log for the visitor address', 'A grievance acknowledgement email was sent quoting the GRV reference'],
        ],
      },
      {
        name: 'Grievance validation',
        description: 'Required fields and server-side checks.',
        steps: [
          ['Submit with the support ticket reference empty', 'Browser validation stops on the required ticket reference field'],
          ['Enter phone "12345" (fewer than 7 digits) with everything else valid and submit', 'The error line reads "Enter a valid phone number" and the captcha reloads'],
          ['Enter an invalid email such as "a@b" and submit', 'The error line reads "Enter a valid email address"'],
          ['Submit with a wrong captcha answer', 'The captcha widget shows its wrong-code message, the button re-enables and no grievance is created'],
        ],
      },
    ],
  },
  {
    name: 'Website: Blog and newsroom',
    description:
      'duncit.com/blog, /blog/post?slug= and /newsroom, all loaded live from Website portal content.',
    sub_flows: [
      {
        name: 'Browse the blog',
        description: 'Blog cards from BLOG content.',
        steps: [
          ['Open https://duncit.com/blog', 'Skeletons show, then one card per published post with image, category, date, title and summary'],
          ['Click a blog card', 'The browser opens /blog/post?slug=<slug>'],
        ],
      },
      {
        name: 'Read a blog post',
        description: 'Post body with Suggested, Related and Archive sidebars.',
        steps: [
          ['Open /blog/post?slug=<published-slug>', 'The heading and tab title become the post title ("<title> — Duncit Blog") and the image, category, date and body render'],
          ['Check the Suggested sidebar', 'Up to 3 other posts from the same category, or "No other posts in this category yet."'],
          ['Check the Related sidebar', 'Up to 3 other recent posts, or "More posts coming soon."'],
          ['Check the Archive sidebar', 'Month rows (newest first) with the post count for each month'],
        ],
      },
      {
        name: 'Blog post negative paths',
        description: 'Missing and unknown slugs.',
        steps: [
          ['Open /blog/post with no slug query', 'The page redirects to /blog'],
          ['Open /blog/post?slug=unknown-post', 'The body reads "This post could not be found. It may have been unpublished."'],
          ['Block the GraphQL request and open a valid post', 'The body reads "The post could not be loaded right now. Please try again later."'],
        ],
      },
      {
        name: 'Newsroom',
        description: 'NEWSROOM content rendered as news rows.',
        steps: [
          ['Publish a NEWSROOM entry with a CTA URL and open https://duncit.com/newsroom', 'A row shows category, date, title and summary'],
          ['Click the news row', 'The browser follows the CTA URL; a non-http(s) CTA URL renders as # instead'],
          ['Check the press paragraph', 'It links the branding support email as a mailto link'],
        ],
      },
    ],
  },
  {
    name: 'Website: Content pages',
    description:
      'The static localized pages of duncit.com: About, Community, Guidelines, the Safety Hub pages and the 404 page.',
    sub_flows: [
      {
        name: 'About, Community and Guidelines',
        description: 'Localized static pages with internal links.',
        steps: [
          ['Open https://duncit.com/about', 'The page layout renders eyebrow, heading, intro, hero image and the why, beliefs, going and team sections'],
          ['Click the download link in the About text', 'The browser opens /#download'],
          ['Open https://duncit.com/community and click the guidelines link', 'The browser opens /guidelines with the six rule sections'],
        ],
      },
      {
        name: 'Safety Hub pages',
        description: '/safety/approach, /safety/advice, /safety/tools and /safety/resources.',
        steps: [
          ['Open each of /safety/approach, /safety/advice, /safety/tools and /safety/resources', 'Each page renders its localized heading and sections with 200'],
          ['On /safety/advice click the resources link', 'The browser opens /safety/resources'],
          ['On /safety/resources check the contact line', 'It links the branding support email as a mailto link'],
        ],
      },
      {
        name: '404 page',
        description: 'The branded not-found page.',
        steps: [
          ['Open https://duncit.com/nope/nowhere', 'The 404 page shows the stroked 404 heading, floating stickers and the not-found text with status 404'],
          ['Click Take me home', 'The browser opens /'],
          ['Go back and click Get help', 'The browser opens /help'],
        ],
      },
    ],
  },
  {
    name: 'Website: Localization',
    description:
      'Build-time copy for all four Astro sites from Admin > Localization via publicTranslations, over the bundled WEBSITE fallback.',
    sub_flows: [
      {
        name: 'Server translation wins at build',
        description: 'An admin-edited translation reaches the static page after a rebuild.',
        steps: [
          ['In Admin > Localization > Translations change website.main.home.join for en-IN to "Join the fun"', 'The translation is saved'],
          ['Rebuild and redeploy duncit.com, then open the home page', 'The hero join button reads "Join the fun"'],
        ],
      },
      {
        name: 'Fallback bundle when a key is blank or the API is down',
        description: 'The static build never renders a blank string.',
        steps: [
          ['Clear the en-IN value for website.footer.newsletterTitle and rebuild', 'The footer heading renders the bundled "Get Duncit updates"'],
          ['Build the site with the API unreachable', 'The build completes within the 10-second per-call timeout and every page renders bundled copy and branding defaults (app name Duncit)'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* ads.duncit.com                                                      */
  /* ------------------------------------------------------------------ */
  {
    name: 'Ads Website: Landing page',
    description: 'ads.duncit.com: hero, nav anchors, header, design service, steps, why, download band and CTA band.',
    sub_flows: [
      {
        name: 'Header and hero',
        description: 'Overlay header over the hero banner, links to the Ads console.',
        steps: [
          ['Open https://ads.duncit.com/ at the top of the page', 'The header is transparent with a dark top scrim and white nav text over the hero photograph'],
          ['Scroll down more than 24px', 'The header turns solid with a soft shadow and dark text'],
          ['Click Placements, Pricing, Design, How it works and Why in the nav', 'The page scrolls to #placements, #calculator, #design, #how and #why respectively'],
          ['Click the hero primary CTA', 'https://ads-portal.duncit.com opens in a new tab'],
          ['Click the hero secondary CTA', 'The page scrolls to #calculator'],
        ],
      },
      {
        name: 'Theme toggle and mobile drawer',
        description: 'Persisted theme and the phone-width menu.',
        steps: [
          ['Click the moon toggle in the header', 'The site switches to dark, the icon becomes a sun, aria-pressed is true and duncit-theme=dark is stored'],
          ['Resize to 400px wide and open the burger menu', 'The drawer lists the nav anchors plus Sign up and Log in actions pointing at the Ads console'],
        ],
      },
      {
        name: 'Design service and CTA band',
        description: 'Creative services section and the closing CTA.',
        steps: [
          ['Scroll to #design', 'Four service items render with the design CTA and the pricing note'],
          ['Click the design CTA and the CTA band button', 'Both open the Ads console in a new tab'],
          ['Open https://ads.duncit.com/unknown', 'The ads 404 page renders its heading and text'],
        ],
      },
    ],
  },
  {
    name: 'Ads Website: Placements and campaign calculator',
    description:
      'The rate table and calculator built from publicAdRateCard at build time and refreshed live in the browser.',
    sub_flows: [
      {
        name: 'Rate table from the live rate card',
        description: 'Placements and per-day prices Marketing edits.',
        steps: [
          ['Open #placements on ads.duncit.com', 'A table lists each placement label, its note and its ₹ price per day'],
          ['Change a placement price in the Marketing rate card without redeploying, then reload', 'The calculator chips and totals use the new live price after the refresh request completes'],
          ['Deploy a build made while the API was unreachable and open the page', 'The empty table and chips are filled from the live rate card once the browser fetch succeeds'],
        ],
      },
      {
        name: 'Estimate a campaign',
        description: 'Default pick HOME_BOTTOM for 7 days, then tick placements and drag days.',
        steps: [
          ['Scroll to #calculator', 'HOME_BOTTOM is ticked, the days slider sits at 7 (or the max if lower) and the total shows price × 7'],
          ['Tick a second placement chip', 'A breakdown row per ticked placement shows "<label> · ₹<price>/day" and its subtotal; the total is the sum'],
          ['Drag the days slider to 14', 'The output reads "14 days" and every subtotal and the total recompute'],
          ['Tick the AUTO placement', 'Every zone of the phone preview lights up'],
          ['Click the calculator CTA', 'The Ads console opens in a new tab'],
        ],
      },
      {
        name: 'Calculator empty and failure states',
        description: 'No placements ticked, rate card unavailable, days window narrowed.',
        steps: [
          ['Untick every placement', 'The total shows "—", rows clear and the note reads "Pick at least one placement to see a price." in warning style'],
          ['Serve a build with no baked rate card and block the GraphQL request', 'The note reads the rate card failed message and no price is shown'],
          ['Set max days lower than the slider value in the rate card and reload', 'The slider is clamped into the live min–max window'],
        ],
      },
    ],
  },
  {
    name: 'Ads Website: Footer and newsletter',
    description: 'Footer groups, policy strip to duncit.com and the consent newsletter card with source ADS_WEBSITE_FOOTER.',
    sub_flows: [
      {
        name: 'Footer links',
        description: 'Website portal ADS footer navigation or the bundled fallback groups.',
        steps: [
          ['With no ADS FOOTER links in the Website portal, open the footer', 'Advertise and Duncit groups render, including Ads console, duncit.com, Earn with Duncit and Support links'],
          ['Click a policy in the footer policy strip', 'https://duncit.com/policy/<slug> opens'],
        ],
      },
      {
        name: 'Subscribe from the ads footer',
        description: 'Consent card newsletter posting source ADS_WEBSITE_FOOTER.',
        steps: [
          ['Enter an email, tick consent, answer the captcha and click Subscribe', 'The status reads a success message and the field clears'],
          ['Query the newsletter subscriber row for the email', 'A subscriber row exists recording that it came from the ads website footer'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* earnwith.duncit.com                                                 */
  /* ------------------------------------------------------------------ */
  {
    name: 'Earn With Website: Landing page and earn paths',
    description: 'earnwith.duncit.com: hero, the four earn paths handing off to mWeb surveys, nav and footer links.',
    sub_flows: [
      {
        name: 'Hero and navigation',
        description: 'Links to mWeb and the main site.',
        steps: [
          ['Open https://earnwith.duncit.com/', 'The overlay header, hero, earn paths, why, steps, calculator, download and CTA band render'],
          ['Click the hero primary CTA', 'https://mweb.duncit.com/earn opens'],
          ['Click About us, Resources and Blog in the header', 'duncit.com/about, duncit.com/safety/resources and duncit.com/blog open'],
          ['Click Log in and Sign up', 'mweb.duncit.com/login and mweb.duncit.com/register open'],
        ],
      },
      {
        name: 'Choose an earn path',
        description: 'Venue, Host, Club admin and Brand cards.',
        steps: [
          ['Scroll to #paths', 'Four cards render: venue, host, club, brand, each with image, icon badge, text and CTA'],
          ['Click the venue card CTA', 'https://mweb.duncit.com/survey/venue opens'],
          ['Click the host, club and brand CTAs', 'mweb.duncit.com/survey/host, /survey/club_admin and /survey/ecomm open respectively'],
          ['Check the screenshots section with no configured items', 'The screenshots section is not rendered at all'],
        ],
      },
    ],
  },
  {
    name: 'Earn With Website: Earnings calculator',
    description:
      'Host and Club admin estimates from publicPodEarningsEstimate — the server settlement waterfall — plus the downloadable PDF.',
    sub_flows: [
      {
        name: 'Host estimate',
        description: 'Default sliders: ticket ₹499, 12 spots, venue ₹500, 8 pods.',
        steps: [
          ['Scroll to #calculator', 'The Host tab is selected, slider outputs read ₹499, 12, ₹500 and 8, and the take-home shows a figure with two decimals'],
          ['Check the breakdown rows', 'Gross, GST, platform fee, venue, club admin and host commission rows show monthly figures, then per-pod payout and "× 8"'],
          ['Drag the ticket slider to ₹999', 'After a short debounce one estimate request is sent and the rows and take-home update'],
          ['Drag the pods slider to 20', 'The take-home and monthly rows recompute without a new network request and the pods row reads "× 20"'],
          ['Check the duties panel', 'The Host duties title and four duty lines render'],
        ],
      },
      {
        name: 'Club admin estimate',
        description: 'Switching roles repaints from the same figures.',
        steps: [
          ['Click the Club admin tab', 'The tab is aria-selected, the take-home label and duties switch to club admin and rows show gross, GST, platform, per pod and pods without a new request'],
          ['Set the platform club admin share to 0% in Admin and reload', 'The take-home shows "—" and the note reads the no-share message'],
        ],
      },
      {
        name: 'Shortfall and failure notes',
        description: 'A pod that cannot cover its costs, and an unreachable API.',
        steps: [
          ['On the Host tab set ticket ₹99, spots 2 and venue ₹30000', 'The take-home turns red and the note reads "At this ticket price the pod does not cover its costs — raise the price, add spots, or find a cheaper slot."'],
          ['Block the GraphQL request and reload the page', 'The take-home shows "—" and the note says the estimate could not be loaded right now'],
        ],
      },
      {
        name: 'Download the estimate PDF',
        description: 'jsPDF loaded on first click, A4 vector estimate.',
        steps: [
          ['After the estimate loads click Download PDF', 'The button reads "Preparing…", then duncit-earnings-estimate.pdf downloads'],
          ['Open the PDF', 'It shows the logo or duncit wordmark, the title, role name, inputs, the breakdown, the take-home box, duties, disclaimer and the printed date; rupee signs print as "Rs."'],
          ['Block cdnjs.cloudflare.com and click Download PDF again in a fresh tab', 'The note reads "The PDF could not be prepared right now — please try again." and the button resets'],
        ],
      },
    ],
  },
  {
    name: 'Earn With Website: Footer and newsletter',
    description: 'earnwith footer groups, policy strip and the consent newsletter card with source WEBSITE_FOOTER.',
    sub_flows: [
      {
        name: 'Footer link groups',
        description: 'Fallback groups when the Website portal has no EARNWITH footer links.',
        steps: [
          ['Open the earnwith footer', 'Groups list earn with us, how it works, estimator, resources, blog, the four survey links, help, contact, FAQ, safety, guidelines, about, careers, newsroom, login and signup'],
          ['Click For venues', 'https://mweb.duncit.com/survey/venue opens'],
        ],
      },
      {
        name: 'Subscribe from the earnwith footer',
        description: 'Consent is required before sending.',
        steps: [
          ['Enter an email, tick consent, answer the captcha and click Subscribe', 'The status reads the success message and a subscriber row with source WEBSITE_FOOTER is created'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* partners.duncit.com                                                 */
  /* ------------------------------------------------------------------ */
  {
    name: 'Partners Website: Landing page',
    description: 'partners.duncit.com: hero with venue and host CTAs into the Partners app, ways to partner, stats and download band.',
    sub_flows: [
      {
        name: 'Venue and host CTAs',
        description: 'Handing a prospective partner to partners-app.',
        steps: [
          ['Open https://partners.duncit.com/', 'The hero shows the badge, heading, text, the venue and host CTAs and the proof card with three stats (24h, 0, 2)'],
          ['Click the venue CTA', 'https://partners-app.duncit.com/register-venue opens'],
          ['Click the host CTA', 'https://partners-app.duncit.com/become-host opens'],
          ['Click the header brand mark', 'https://duncit.com opens'],
          ['Click the header Log in link', 'https://partners-app.duncit.com opens'],
        ],
      },
      {
        name: 'Ways to partner section',
        description: 'Pillars and header anchors.',
        steps: [
          ['Click How it works in the header', 'The page scrolls to #ways showing three pillar cards'],
          ['Click Get the app in the header', 'The page scrolls to #download'],
        ],
      },
    ],
  },
  {
    name: 'Partners Website: Footer and newsletter',
    description: 'Support email, footer navigation, policy strip to duncit.com and the newsletter with source PARTNERS_WEBSITE_FOOTER.',
    sub_flows: [
      {
        name: 'Footer contact and policies',
        description: 'Branding support email and the policy strip.',
        steps: [
          ['Scroll to the partners footer', 'The blurb, the branding support email as a mailto link and social links render'],
          ['Click a policy in the strip', 'https://duncit.com/policy/<slug> opens'],
        ],
      },
      {
        name: 'Subscribe from the partners footer',
        description: 'Card newsletter without a consent checkbox.',
        steps: [
          ['Enter an email, answer the captcha and click Subscribe', 'The status reads the success message and the field clears'],
          ['Query the newsletter subscriber row for the email', 'A subscriber row exists recording that it came from the partners website footer'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* status.duncit.com                                                   */
  /* ------------------------------------------------------------------ */
  {
    name: 'Status Website: Service board',
    description:
      'status.duncit.com: service catalogue from /status/services, live summary every 60 seconds, incidents every 5 minutes.',
    sub_flows: [
      {
        name: 'Load the board',
        description: 'First load and the overall banner.',
        steps: [
          ['Open https://status.duncit.com/', 'A skeleton board shows, then the header "<app> Status", the overall banner, the 90-day chart, filters and the Consoles, Platform and Websites groups'],
          ['With every service answering, read the banner', 'It reads "All systems operational" with a green dot and "Last checked <time>"'],
          ['Stop one monitored console so its probe fails, wait for the next 5-minute sweep and 60-second refresh', 'The banner reads "1 of <n> services experiencing an outage" with a red dot and that row shows a Down chip'],
          ['Watch the top of the page at a 60-second refresh', 'A thin refresh indicator shows while the summary request is in flight'],
        ],
      },
      {
        name: 'Service rows',
        description: 'Per-service uptime chips and links.',
        steps: [
          ['Look at any service row', 'It shows the service name, description, a 24h uptime chip, a 90d uptime chip, a state chip and a 90-bar daily strip'],
          ['Click the open-in-new-tab link on a row', 'The service URL opens in a new tab and the details dialog does not open'],
          ['Open a service with an unresolved incident', 'The row shows a "<n> active" warning chip and the incident impact state'],
        ],
      },
      {
        name: 'Staging board and load failure',
        description: 'Environment chip and error alert.',
        steps: [
          ['Open https://staging.status.duncit.com/', 'A Staging chip shows beside the title and service URLs use staging.<host>; SignOz and SonarQube are not listed'],
          ['Block /status/services in DevTools and reload', 'An error alert reads "Could not load the service catalog."'],
          ['Block only /status/summary', 'An error alert reads "Could not refresh service status."'],
        ],
      },
    ],
  },
  {
    name: 'Status Website: Filters',
    description: 'Search, group and status filters over the service catalogue.',
    sub_flows: [
      {
        name: 'Filter services',
        description: 'Client-side filtering.',
        steps: [
          ['Type "finance" into Search services', 'Only services whose name or description contains finance remain'],
          ['Choose the Websites group', 'Only the Websites group card is shown'],
          ['Click the Issues toggle while every service is operational', 'The board reads "No services match your filters."'],
          ['Click Operational', 'Only services with an operational or no-data state show'],
          ['Click All and clear the search', 'Every group and service is shown again'],
        ],
      },
    ],
  },
  {
    name: 'Status Website: Service details dialog',
    description: 'Live endpoint probe via /status/probe, the server /health report and 24-hour/90-day history via /status/history.',
    sub_flows: [
      {
        name: 'Open details for the API server',
        description: 'Probe, health and history sections.',
        steps: [
          ['Click the API Server row', 'A dialog opens with the service name and a status dot'],
          ['Read the Endpoint section', 'It shows the HTTP status and SSL rows: Valid & trusted, issuer, subject, protocol, valid from and "<date> · <n> days left"'],
          ['Read the Server health section', 'It shows status, database, version, environment, process and system uptime, node, platform, hostname and memory'],
          ['Read the History section', 'A "Daily uptime — last 90 days" chart and a "Latency — last 24 hours" chart render'],
          ['Close the dialog with the X button', 'The dialog closes'],
        ],
      },
      {
        name: 'Details negative states',
        description: 'Unreachable host, no history, failed history.',
        steps: [
          ['Open details for a service whose host is down', 'The endpoint shows the probe error or "Unreachable" and the dot turns red'],
          ['Open details for a service with no StatusCheck rows yet', 'History reads "No history recorded yet — checks run every 5 minutes."'],
          ['Block /status/history and open any service', 'History reads "History is unavailable right now."'],
          ['Open a service without a health URL', 'No Server health section is rendered'],
        ],
      },
    ],
  },
  {
    name: 'Status Website: Uptime history and incidents',
    description: 'The 90-day global uptime chart, per-service daily strips and the Past incidents list from /status/incidents.',
    sub_flows: [
      {
        name: '90-day uptime history',
        description: 'Daily states derived from probe ratios and incident impact.',
        steps: [
          ['Read the "Overall uptime — last 90 days" chart', 'One point per day for 90 days with the overall uptime percent'],
          ['Hover a bar in a service daily strip', 'The tooltip reads "<YYYY-MM-DD> · <uptime>% · <state>"'],
          ['Record an incident with impact partial_outage for a service on a past day', 'That day bar turns to the partial outage colour after the next summary refresh'],
          ['Check a day where probe uptime was below 90%', 'The day is shown as Major outage'],
        ],
      },
      {
        name: 'Past incidents list',
        description: 'Incidents overlapping the last 90 days plus any still open.',
        steps: [
          ['With no incidents in 90 days, read the Past incidents section', 'It reads "No incidents reported in the last 90 days." with a green check'],
          ['Create a resolved incident and wait up to 5 minutes', 'A row shows the impact chip, title, service name chip, a Resolved chip, the body and "<start> — <end>"'],
          ['Create an unresolved incident', 'The row shows "Since <start>" and a warning chip instead of Resolved'],
        ],
      },
    ],
  },
  {
    name: 'Status Website: Report a problem',
    description:
      'The public report form (React Hook Form + Zod) posting submitStatusReport with screenshots and the captcha; reports land in Tech > Status Reports.',
    sub_flows: [
      {
        name: 'Send a report',
        description: 'Happy path for a signed-out visitor.',
        steps: [
          ['Scroll to Report a problem and click the Report a problem button', 'The form expands with service, impact, name, email, page address, message, screenshots and the captcha'],
          ['Pick Payments service, impact "A payment failed or is stuck", fill name, email, https page URL and a 20-character message', 'No validation messages show'],
          ['Attach one PNG under 5 MB', 'A 96px preview with a remove button appears'],
          ['Answer the captcha and click Send report', 'The button reads "Sending…", the form collapses and a success alert reads "Report received"'],
          ['Open Tech > Status Reports', 'A NEW report shows the service name and URL, impact PAYMENT, environment, the screenshot image URL, and the reporter IP and user agent'],
          ['Click Report something else', 'A fresh form opens with a new captcha'],
        ],
      },
      {
        name: 'Report validation',
        description: 'Zod messages before any round trip.',
        steps: [
          ['Touch and leave name and email empty', '"Please tell us your name." and "Please enter your email address." show'],
          ['Type email "abc"', '"That does not look like an email address." shows'],
          ['Type page address "ftp://x"', '"That does not look like a web address." shows'],
          ['Type a 5-character message', '"Please add a little more detail — at least 10 characters." shows'],
          ['Leave the captcha answer empty and submit', 'The captcha field shows "Please type the code shown above." and nothing is sent'],
        ],
      },
      {
        name: 'Screenshot limits',
        description: 'Up to 3 images, 5 MB each.',
        steps: [
          ['Attach a 6 MB image', 'The helper reads "That image is over 5 MB. Please attach a smaller one." and no preview is added'],
          ['Attach three images, then try a fourth', 'The Add an image button is disabled at three; selecting four at once shows "Up to 3 images can be attached to one report."'],
          ['Remove one preview', 'The preview disappears and the add button is enabled again'],
        ],
      },
      {
        name: 'Report captcha and server failures',
        description: 'Wrong code and transport failure.',
        steps: [
          ['Submit a valid report with a wrong captcha answer', 'The captcha field shows the wrong-code message, the answer clears, a new image loads and no report is stored'],
          ['Go offline and submit a valid report', 'An error alert reads "Your report could not be sent. Check your connection and try again."'],
          ['Click Cancel on an open form', 'The form collapses without sending'],
        ],
      },
    ],
  },
  {
    name: 'Status Website: Theme, branding and language',
    description: 'Colour mode, admin branding and the visitor locale on the status page.',
    sub_flows: [
      {
        name: 'Colour mode and branding',
        description: 'System default with a persisted toggle; branding from the branding query.',
        steps: [
          ['Open the page with the OS in dark mode and no saved preference', 'The page renders in dark mode'],
          ['Click "Switch to light mode" and reload', 'The page stays light and localStorage status_color_mode is light'],
          ['Change the branding app name and primary colour in Admin and reload', 'The title, tab title "<app> Status" and accent colour follow the new branding'],
          ['Block the branding query and reload', 'The bundled Duncit name and /duncit-logo.svg are used'],
        ],
      },
      {
        name: 'Visitor language',
        description: 'Locale resolved from navigator.language against publicLocales.',
        steps: [
          ['Set the browser language to an active non-default locale with status.* translations and reload', 'Board and form copy render in that locale'],
          ['Block the translations query and reload', 'The bundled English status copy renders with no raw keys'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Server                                                              */
  /* ------------------------------------------------------------------ */
  {
    name: 'Server: Status probes and status API',
    description:
      'startStatusScheduler probes every catalogue service every 5 minutes (first sweep ~10s after boot) and the public /status routes read the results.',
    sub_flows: [
      {
        name: 'Probe sweep writes status checks',
        description: 'One StatusCheck per service per sweep.',
        steps: [
          ['Boot the server with NODE_ENV not test and STATUS_PROBES_DISABLED unset, wait 15 seconds', 'The statuschecks collection gains one row per monitored service with ok, status_code, latency_ms and a shared checked_at'],
          ['Wait 5 more minutes', 'A second batch of rows with a new checked_at is inserted'],
          ['Make a monitored host return 503', 'Its next row has ok false and status_code 503; a host that times out after 8s has status_code null and latency_ms null'],
          ['Restart with STATUS_PROBES_DISABLED=1', 'No new status check rows are written'],
        ],
      },
      {
        name: 'Probe endpoint guards',
        description: 'GET /status/probe with the SSRF host allowlist.',
        steps: [
          ['GET /status/probe?url=https://admin.duncit.com/', 'HTTP 200 JSON with ok, statusCode, statusText and an ssl object including daysRemaining'],
          ['GET /status/probe?url=not-a-url', 'HTTP 400 {"ok":false,"error":"Invalid url parameter"}'],
          ['GET /status/probe?url=http://admin.duncit.com/', 'HTTP 400 {"ok":false,"error":"Only https urls can be probed"}'],
          ['GET /status/probe?url=https://example.com/', 'HTTP 403 {"ok":false,"error":"Host not allowed"}'],
        ],
      },
      {
        name: 'Status read routes',
        description: '/status/services, /summary, /history and /incidents.',
        steps: [
          ['GET /status/services', '200 with generated_at, environment production|staging and groups Consoles, Platform, Websites'],
          ['GET /status/summary', '200 with overall {state, operational, degraded, down, total, uptime_90d}, per-service uptime_24h/7d/90d, state, active_incidents, 90 daily points and the global series'],
          ['GET /status/history?service=server&hours=24', '200 with up to 500 chronological points and the 90-day daily series'],
          ['GET /status/history?service=nope', '404 {"error":"Unknown service"}'],
          ['GET /status/history?service=server&hours=5000', '400 "hours must be an integer between 1 and 2160"'],
          ['GET /status/incidents', '200 with incidents from the last 90 days plus open ones, each carrying service_name'],
        ],
      },
      {
        name: 'Status incident seed',
        description: 'Historical incidents seeded only on staging or when opted in.',
        steps: [
          ['Boot a staging server (APP_ENV=staging) against an empty incidents collection', 'Five resolved historical incidents are inserted and appear on the status page'],
          ['Boot production with STATUS_SEED_INCIDENTS unset', 'No incidents are seeded'],
          ['Reboot staging with incidents already present', 'Nothing new is inserted'],
        ],
      },
    ],
  },
  {
    name: 'Server: Health, logs ingest and API root',
    description: 'GET /health, GET /, POST /logs and the notification SSE stream.',
    sub_flows: [
      {
        name: 'Health report and landing',
        description: 'The Docker healthcheck and status-page health source.',
        steps: [
          ['GET https://server.duncit.com/health', '200 JSON with status ok|degraded, service, version, environment, node, platform, hostname, timestamp, uptime, memory and checks {database, redis}'],
          ['Disconnect MongoDB briefly and GET /health', 'Still HTTP 200 with checks.database not connected and status degraded'],
          ['GET https://server.duncit.com/', 'The branded landing HTML renders instead of "Cannot GET /"'],
        ],
      },
      {
        name: 'Frontend log ingest',
        description: 'POST /logs from @duncit/logs httpTransport.',
        steps: [
          ['POST /logs with {"app":"duncit.com","page":"/contact","component":"form","level":"error"}', 'HTTP 204 and a structured log row appears in SignOz / Tech telemetry with the caller IP and user agent from the request'],
          ['POST /logs with a body missing component', 'HTTP 204 and nothing is recorded'],
          ['POST /logs with a body claiming another user', 'HTTP 204; the stored record carries the identity from the request headers, not the body'],
        ],
      },
      {
        name: 'Notification SSE stream',
        description: 'GET /notifications/stream?token= for real-time unread counts.',
        steps: [
          ['GET /notifications/stream with no token', 'HTTP 401 and the connection closes'],
          ['GET /notifications/stream?token=<valid member JWT>', 'A text/event-stream opens and the first event is "hello" with unread_count'],
          ['Create a notification for that member from the Marketing portal', 'A "notify" event arrives on the stream with the payload and the new unread_count'],
          ['Keep the stream idle for 30 seconds', 'A ": ping" comment arrives about every 25 seconds'],
        ],
      },
    ],
  },
  {
    name: 'Server: Boot seeding and gated migrations',
    description:
      'bootstrap() in server/src/index.ts: every seed runs through safeSeed so one failing subsystem never crashes the API.',
    sub_flows: [
      {
        name: 'Fresh database boot',
        description: 'Defaults created on first boot, additive on later boots.',
        steps: [
          ['Boot the server against an empty database', 'RBAC roles, the root super admin, settings, rate limit rules and systems, categories, VAPID keys, policies, localization keys, AI prompts, email fragments and templates, website content, nav, badges and the E2E flow catalogue are created'],
          ['Edit a seeded email template and a seeded E2E sub flow, then reboot', 'Both edits survive; only missing rows or sub flows are added'],
          ['Check logs after boot', 'Info lines such as bootstrap localization {created: n} appear only when something was created'],
        ],
      },
      {
        name: 'Failing seed does not crash boot',
        description: 'safeSeed isolation.',
        steps: [
          ['Make one seed throw (for example revoke write access to the badges collection) and boot', 'An error log "badges failed" is written and the server still logs "Server ready" and serves /graphql'],
        ],
      },
      {
        name: 'Gated data migrations',
        description: 'Pod type migration and Club Admin backfill run only when the environment asks.',
        steps: [
          ['Boot with RUN_POD_TYPE_MIGRATION unset against pods holding legacy NATIVE_* pod_type values', 'The legacy values are left untouched'],
          ['Boot with RUN_POD_TYPE_MIGRATION=1', 'Legacy pod_type values are rewritten to FREE or PAID before traffic is served'],
          ['Boot with RUN_CLUB_ADMIN_BACKFILL=1', 'Club Admins without an onboarding record get one and a bootstrap clubAdminBackfill info log reports the result'],
        ],
      },
    ],
  },
  {
    name: 'Server: App version sync and force update',
    description:
      'settingsService.applyEnvVersion upserts APP_VERSION into branding.app_latest_version on boot; the public appVersionInfo query drives the native force-update gate.',
    sub_flows: [
      {
        name: 'Version upserted on boot',
        description: 'The deploy workflow passes app.json expo.version as APP_VERSION.',
        steps: [
          ['Boot the server with APP_VERSION=2.4.1', 'The branding singleton has app_latest_version "2.4.1"'],
          ['Query appVersionInfo { latest_version android_store_url ios_store_url } without auth', 'latest_version is "2.4.1" with the branding store URLs'],
          ['Reboot with APP_VERSION unset', 'app_latest_version keeps its previous value'],
        ],
      },
      {
        name: 'Force-update gate reacts to the version',
        description: 'A native build older than the DB version is blocked.',
        steps: [
          ['Boot with APP_VERSION higher than the installed native build version and open the app', 'The app shows its force-update screen pointing at the Play Store listing'],
          ['Boot with APP_VERSION equal to the installed build version and reopen the app', 'The app opens normally with no update gate'],
        ],
      },
    ],
  },
  {
    name: 'Server: Pod auto-cancel',
    description:
      'Every 10 minutes (first ~90s after boot): cancel UPCOMING pods inside their auto-cancel window whose settlement leaves host_receives negative, refunding under the venue ladder.',
    sub_flows: [
      {
        name: 'Sweep disabled by default',
        description: 'Admin > Pods > Pod Settings auto-cancel is off until enabled.',
        steps: [
          ['With pod auto-cancel disabled, create a finance-negative pod starting in 2 hours and wait for a tick', 'The pod stays live and no refunds or cancellation notifications are sent'],
        ],
      },
      {
        name: 'Cancel a finance-negative pod at a venue',
        description: 'Inside the venue trigger_hours window (default 6).',
        steps: [
          ['Enable auto-cancel, set lead hours 24 and give a venue trigger_hours 6 with a refund ladder band hours_before 4 at 50%', 'Settings are saved'],
          ['Create a paid pod at that venue starting in 5 hours with one booking whose ticket money cannot cover the venue slot price', 'Finance breakdown shows host_receives below zero'],
          ['Wait for the next 10-minute sweep', 'The pod is soft-deleted, each SUCCESS payment is refunded at 50% and the delete audit note reads "Cancelled automatically — the pod could not cover its venue cost (venue policy refund: 50%)"'],
          ['Check attendee and host communications', 'Attendees receive the cancellation and refund notifications; the host receives the auto-cancelled email'],
          ['Check server logs', 'An info log pod-auto-cancel "finance-negative pod auto-cancelled" names pod_id, refunded_payments and refund_pct 50'],
        ],
      },
      {
        name: 'Refund ladder edge cases',
        description: 'Empty ladder, unmatched band and reschedule-only venues.',
        steps: [
          ['Repeat with a venue that has no refund tiers', 'The pod is cancelled with a 100% refund'],
          ['Repeat with a ladder whose smallest band is hours_before 12 for a pod starting in 5 hours', 'The pod is cancelled with a 0% refund'],
          ['Repeat with a venue whose cancellation policy is reschedule_only', 'The pod is not cancelled and a warn log reads "finance-negative pod skipped: venue is reschedule_only"'],
        ],
      },
      {
        name: 'Pods outside the window or healthy',
        description: 'Only pods inside their own window and negative are touched.',
        steps: [
          ['Create a negative pod at a 6-hour trigger venue starting in 10 hours', 'It is left alone until its start is within 6 hours'],
          ['Create a pod in the window whose bookings cover the venue cost', 'It is not cancelled'],
          ['Create a negative virtual pod (no venue) starting within the platform lead hours', 'It is cancelled with a full refund'],
          ['Cancel a pod by hand at the same moment the sweep reaches it', 'Only one cancellation and one refund per payment happen'],
        ],
      },
    ],
  },
  {
    name: 'Server: Pod cancellation risk alerts',
    description:
      'Runs after the auto-cancel sweep: flags pods inside the risk window (default 72h) that would be auto-cancelled and alerts host and club admins every alert interval (default 4h).',
    sub_flows: [
      {
        name: 'Flag and alert an at-risk pod',
        description: 'WhatsApp and email alerts naming the shortfall.',
        steps: [
          ['With auto-cancel enabled, create a negative pod starting in 48 hours', 'After the next tick the pod document has cancellation_risk set and the Admin pods table tints its row'],
          ['Check the host and club admin communications', 'Each receives a WhatsApp and email alert naming the shortfall, the bookings needed and when the sweep would cancel the pod'],
          ['Wait for ticks inside the next 4 hours', 'No second alert round is sent until the alert interval passes'],
          ['Add enough bookings to cover the venue cost and wait a tick', 'The risk flag is cleared and no further alerts go out'],
        ],
      },
      {
        name: 'No risk while auto-cancel is off',
        description: 'Risk is only raised when a cancellation could happen.',
        steps: [
          ['Disable auto-cancel and wait a tick with a negative pod inside 72 hours', 'The pod carries no risk flag and nobody is alerted'],
        ],
      },
    ],
  },
  {
    name: 'Server: Held cancellation refunds',
    description:
      'With Admin > Pods > Pod Settings "Hold cancellation refunds" on, refunds are scheduled for the pod start; the sweep every 5 minutes (first ~1 min) releases due ones.',
    sub_flows: [
      {
        name: 'Hold then release at pod start',
        description: 'A held refund is paid when the pod start passes.',
        steps: [
          ['Enable the refund hold and cancel a paid pod starting in 20 minutes', 'Each SUCCESS payment stays SUCCESS with metadata.refund_hold true, refund_hold_amount and refund_hold_release_at equal to the pod start'],
          ['Wait until the start passes and the next 5-minute sweep runs', 'Each held payment flips to REFUNDED with refunded_amount, cancel_refund_amount, refunded_at and refund_hold false'],
          ['Check the attendee mailbox', 'A pod refund email with the amount and reason arrives'],
        ],
      },
      {
        name: 'Revoke before start voids the hold',
        description: 'Reinstating a cancelled pod cancels held refunds.',
        steps: [
          ['Cancel a paid pod with the hold on, then revoke the cancellation before its start', 'Payments keep SUCCESS with refund_hold false and refund_hold_cancelled_at set'],
          ['Wait past the start for a sweep', 'No refund is paid and no refund email is sent'],
        ],
      },
      {
        name: 'Hold off or start already passed',
        description: 'Immediate refunds.',
        steps: [
          ['Disable the hold and cancel a paid pod', 'Payments refund immediately with no refund_hold metadata'],
        ],
      },
    ],
  },
  {
    name: 'Server: Pod draft cleanup',
    description: 'Daily sweep (first ~1 min after boot) deleting Create-Pod drafts older than draft_retention_days (default 3) from their creation date.',
    sub_flows: [
      {
        name: 'Expire old drafts',
        description: 'Retention counted from created_at, not the last autosave.',
        steps: [
          ['Set draft_retention_days to 3 and create a pod draft with created_at 4 days ago but updated today', 'The draft exists'],
          ['Create another draft created 1 day ago', 'The draft exists'],
          ['Restart the server and wait about a minute for the first sweep', 'The 4-day-old draft is deleted; the 1-day-old draft remains'],
        ],
      },
    ],
  },
  {
    name: 'Server: Auto Pod sweep',
    description:
      'Every 10 minutes (first ~1 min): expire stale Auto Pod offers, recover stuck materializations, retry complete offers and pin legacy club offers.',
    sub_flows: [
      {
        name: 'Expire offers that can no longer complete',
        description: 'Start passed, venue window and assignment window.',
        steps: [
          ['Create a CLAIMING physical offer whose claimed venue slot start is in the past', 'After the next sweep the offer stage is EXPIRED with event note "Start date passed before everyone enrolled", the venue slot is released and enrolled people are notified'],
          ['Create a physical offer no venue accepted within auto_pod_venue_expiry_hours (default 24)', 'It becomes EXPIRED with note "No venue accepted within 24 hours" and enrollees get the released notice'],
          ['Create an offer still missing a role after auto_pod_assignment_expiry_hours (default 72)', 'It becomes EXPIRED with note "Not fully assigned within 72 hours — still waiting on <roles>"'],
        ],
      },
      {
        name: 'Recover a stuck materialization',
        description: 'MATERIALIZING for more than 10 minutes.',
        steps: [
          ['Leave an offer in MATERIALIZING with updated_at 15 minutes ago and a pod already created with source_auto_pod_id', 'After the sweep the offer is LIVE with pod_id set, event "Recovered after an interrupted create" and the slot hold transferred to the pod'],
          ['Leave an offer in MATERIALIZING 15 minutes old with no pod created', 'It returns to CLAIMING with event MATERIALIZE_FAILED "Interrupted — returned for retry"'],
        ],
      },
      {
        name: 'Retry complete offers and pin legacy offers',
        description: 'Complete but not live, and club offers without a location.',
        steps: [
          ['Fix the pricing on a CLAIMING offer that has every enrolment and a future start, untouched for 2+ minutes', 'The sweep materializes it and the stage becomes LIVE'],
          ['Leave a club-claimed pre-live offer with location null', 'The sweep pins it to the club city location'],
        ],
      },
    ],
  },
  {
    name: 'Server: Venue slot request expiry',
    description:
      'Every 10 minutes (first ~90s): decline PENDING venue slot requests whose slot start has passed, with reason "Missed View Deadline by the Venue".',
    sub_flows: [
      {
        name: 'Auto-decline an unanswered request',
        description: 'The same path as an owner decline, sourced SYSTEM.',
        steps: [
          ['As a host, request a partner venue slot starting in 15 minutes and do not answer as the venue owner', 'The slot is PENDING with booked_by_pod_id and the pod waits offline'],
          ['Wait until after the slot start and the next sweep', 'The slot returns to AVAILABLE and its decline reason is "Missed View Deadline by the Venue"'],
          ['Check the pod and host notifications', 'The pod is out of PENDING and offline; the host has a declined notification'],
          ['Check the audit trail and logs', 'An audit row with source SYSTEM exists and an info log venue-slot-expiry "unanswered slot request auto-declined" names slot_id and pod_id'],
          ['Approve the same request as the owner after it was declined', 'The approval is refused because the request is no longer PENDING'],
        ],
      },
    ],
  },
  {
    name: 'Server: Venue slot auto-extend',
    description:
      'autoExtendService.resumeSchedules at boot runs immediately, then every 24 hours: rolls each auto-extend venue slot template forward to its horizon.',
    sub_flows: [
      {
        name: 'Top up a venue to its horizon',
        description: 'Approved, active venue with auto_extend enabled.',
        steps: [
          ['Enable auto-extend on an approved active venue with horizon_days 14, max_advance_days 30 and a default slot template', 'Settings are saved'],
          ['Restart the server', 'Slots from the template are created for the next 14 days, skipping holidays and any overlapping existing slots'],
          ['Restart again without changes', 'No duplicate slots are created'],
          ['Set auto_extend.until to 5 days from now and restart', 'No slots are generated beyond the until date'],
        ],
      },
      {
        name: 'Venues that are skipped',
        description: 'Disabled, unapproved, inactive or template-less venues.',
        steps: [
          ['Disable auto-extend or deactivate the venue and restart', 'No new slots are created for it'],
          ['Enable auto-extend on a venue whose owner has no default template and no referenced template', 'No slots are created and other venues still run'],
          ['Set horizon_days above max_advance_days', 'Slots stop at max_advance_days (capped at 60)'],
        ],
      },
    ],
  },
  {
    name: 'Server: Duncit Coin expiry',
    description:
      'Every 10 minutes (first ~2 min): take back unspent coins from grant lots whose expires_at passed (Finance > Duncit Coin > Settings, default 30 days), writing COIN_EXPIRY debits.',
    sub_flows: [
      {
        name: 'Expire an unspent lot',
        description: 'Lots expire at end of day in the app time zone.',
        steps: [
          ['With coin expiry at 30 days, grant a member 100 coins', 'The CREDIT row has remaining 100 and expires_at at 23:59:59.999 app-time 30 days after the grant date'],
          ['Set that lot expires_at to one minute ago and wait for the next sweep', 'remaining becomes 0, the balance drops by 100 and a DEBIT row with source COIN_EXPIRY reads "Unused coins from <grant date> expired"'],
          ['Run the sweep again', 'No second debit is written'],
        ],
      },
      {
        name: 'Partial spend and never-expiring coins',
        description: 'Soonest-expiring lots are spent first.',
        steps: [
          ['Grant 100 coins, spend 60, then expire the lot', 'Only the remaining 40 are taken back'],
          ['Set coin expiry days to 0 and grant coins', 'The CREDIT row has no expires_at or remaining and is never swept'],
          ['Hold gift-card coins alongside an expiring lot and expire the lot', 'Only the lot is taken back; the balance never goes below zero'],
        ],
      },
    ],
  },
  {
    name: 'Server: Payment reconciliation',
    description:
      'startPaymentReconciler every 5 minutes (first ~1 min): adopt Razorpay captures the client never verified and retry failed finalization side effects. There is no Razorpay webhook route.',
    sub_flows: [
      {
        name: 'Adopt an unverified capture',
        description: 'PENDING payments aged 5 minutes to 24 hours.',
        steps: [
          ['Start a Razorpay checkout, complete payment, then close the tab before verifyRazorpayCheckout runs', 'The payment stays PENDING with gateway_ref holding the order id'],
          ['Wait 5+ minutes for the reconciler', 'gateway_ref becomes the Razorpay payment id, metadata has razorpay_order_id, razorpay_payment_id and reconciled_at, and the booking is finalized'],
          ['Check logs', 'An info log payment-reconciler "Adopted a Razorpay capture the client never verified" names payment_id and amount_paise'],
          ['Leave a checkout abandoned without paying', 'It stays PENDING and reconcile_checked_at is stamped so it does not block the batch'],
        ],
      },
      {
        name: 'Retry failed side effects',
        description: 'CORE_DONE payments whose receipt or shipment failed.',
        steps: [
          ['Break SMTP, complete a paid booking so phase 2 fails, then fix SMTP', 'The payment reaches CORE_DONE without its receipt'],
          ['Wait for the next reconciler tick', 'The side effects re-run and the receipt email is sent'],
          ['Leave a side effect permanently failing', 'After 6 attempts (about 30 minutes) the reconciler stops retrying and logs a warning naming the payment for a human'],
        ],
      },
    ],
  },
  {
    name: 'Server: ShipRocket webhook',
    description:
      'POST /shiprocket/webhook authenticated with x-api-key equal to the configured SHIPROCKET_WEBHOOK_SECRET; always answers 200 unless the key is wrong.',
    sub_flows: [
      {
        name: 'Apply a shipment status update',
        description: 'Matched by awb, else by order_id.',
        steps: [
          ['POST /shiprocket/webhook with the configured webhook key and {"awb":"<order awb>","current_status":"OUT FOR DELIVERY"}', 'HTTP 200 {"ok":true}; the product order fulfilment_status is OUT_FOR_DELIVERY and shiprocket.tracking_status and last_synced_at are updated'],
          ['POST with current_status "DELIVERED"', 'fulfilment_status becomes DELIVERED'],
          ['POST with current_status "RTO INITIATED"', 'fulfilment_status becomes RTO'],
          ['POST with current_status "PICKUP SCHEDULED"', 'fulfilment_status becomes PICKUP_SCHEDULED'],
          ['POST with no awb and "order_id":"<shiprocket order id>" and "IN TRANSIT"', 'The order is matched by shiprocket.order_id and becomes SHIPPED'],
        ],
      },
      {
        name: 'Webhook negative paths',
        description: 'Wrong key, unknown order and malformed payloads.',
        steps: [
          ['POST with a wrong x-api-key value', 'HTTP 401 {"ok":false} and no order changes'],
          ['POST with no x-api-key header while the secret is configured', 'HTTP 401 {"ok":false}'],
          ['POST with a valid key and an awb that matches no order', 'HTTP 200 {"ok":true} and nothing changes'],
          ['POST a body larger than 256 KB', 'The request is rejected by the JSON parser and no order changes'],
        ],
      },
    ],
  },
  {
    name: 'Server: WhatsApp and email reminder sweeps',
    description:
      'startWhatsappScheduler every 30 minutes (first ~90s): time-based pod reminders, complete-pod nudges, pending slot reminders, replacement-not-found notices and feedback asks, each on WhatsApp and email.',
    sub_flows: [
      {
        name: 'Global WhatsApp switch and cutoff',
        description: 'Nothing is swept while disabled; nothing before enabled_at is looked at.',
        steps: [
          ['Disable the global WhatsApp setting and wait a tick with a pod starting in 23 hours', 'No reminder is sent on either channel'],
          ['Enable WhatsApp now with pods that ended weeks ago', 'No feedback asks are sent for pods that ended before the enabled_at cutoff'],
        ],
      },
      {
        name: 'Pod reminder and feedback asks',
        description: 'Pod reminder lead default 24h; feedback delay default 1h after the end.',
        steps: [
          ['Create a pod with attendees starting in 23.5 hours and wait a tick', 'Each attendee gets USER_POD_REMINDER on WhatsApp and the matching reminder email'],
          ['Wait for the next tick', 'No duplicate reminder is sent; the send log unique index rejects the repeat'],
          ['Let the pod end and wait 1 hour plus a tick', 'Attendees get USER_POD_FEEDBACK, the host HOST_POD_FEEDBACK, the venue owner VENUE_POD_FEEDBACK and each club admin CLUB_ADMIN_FEEDBACK'],
        ],
      },
      {
        name: 'Host, venue and backout nudges',
        description: 'Complete-pod reminder, pending slot reminder and replacement not found.',
        steps: [
          ['Let a pod end without the host completing it and wait past the complete reminder window (default 12h)', 'The host receives HOST_COMPLETE_POD_REMINDER quoting the completion deadline'],
          ['Leave a venue slot request PENDING with its start inside 48 hours', 'The venue owner receives VENUE_SLOT_PENDING_REMINDER'],
          ['Leave a backout request IN_PROCESS whose released seat was never taken until the pod starts', 'The member receives USER_REPLACEMENT_NOT_FOUND'],
        ],
      },
      {
        name: 'Retry unreached WhatsApp messages',
        description: 'Messages from the last hour that failed for want of a connection.',
        steps: [
          ['Make AiSensy unreachable, trigger a WhatsApp send, then restore connectivity', 'The first send row is FAILED with a connection reason'],
          ['Wait for the next sweep', 'The row is re-sent and marked SENT with a submitted_message_id'],
        ],
      },
    ],
  },
  {
    name: 'Server: Scheduled marketing campaigns',
    description:
      'Marketing email and WhatsApp campaigns with status SCHEDULED are armed as timers; resumeSchedules re-arms them at boot. Email opens and clicks go through /t routes.',
    sub_flows: [
      {
        name: 'Send a scheduled email campaign',
        description: 'Sends at scheduled_at in bcc batches of 50.',
        steps: [
          ['Schedule an email campaign 5 minutes ahead for an audience of 120 members', 'The campaign status is SCHEDULED'],
          ['Wait until scheduled_at', 'Status goes SENDING then SENT, sent_at and recipient_count 120 are set, and three bcc batches appear in the email log named "<campaign> (batch n/3)"'],
          ['Check the campaign delivery field', 'accepted and rejected counts and any rejected addresses from SMTP are stored'],
        ],
      },
      {
        name: 'Schedules survive a restart',
        description: 'Timers re-armed from the database.',
        steps: [
          ['Schedule an email campaign and a WhatsApp campaign 10 minutes ahead, then restart the server', 'Both remain SCHEDULED after boot'],
          ['Wait until scheduled_at', 'Both campaigns send at their scheduled time'],
        ],
      },
      {
        name: 'Campaign failures',
        description: 'No recipients, render errors and cancelled WhatsApp campaigns.',
        steps: [
          ['Schedule an email campaign for an audience with no members', 'At send time status becomes FAILED with error "No recipients found for selected audience"'],
          ['Schedule a WhatsApp campaign and cancel it before its time', 'It stays CANCELLED and nothing is sent'],
          ['Run a WhatsApp campaign where every send fails', 'Its status becomes FAILED; with at least one delivered it becomes SENT'],
        ],
      },
      {
        name: 'Campaign open and click tracking',
        description: 'Public /t routes hit by mail clients.',
        steps: [
          ['Open a sent campaign email with images enabled', 'GET /t/o/<campaignId> returns a GIF with no-store caching and the campaign open count increments'],
          ['Click a tracked link in the email', 'GET /t/c/<campaignId>/<index> redirects 302 to the stored URL and its click count increments'],
          ['Request /t/c/<campaignId>/999', '404 "This link has expired."'],
          ['Request /t/o/<unknown-campaign>', 'The GIF pixel is still returned with 200'],
          ['Request /t/i/<campaignId>/999', 'The GIF pixel is returned instead of a 404'],
        ],
      },
    ],
  },
  {
    name: 'Server: Email sending and localization',
    description:
      'sendEmail renders a DB email template with {{t:key}} copy in the recipient profile.locale, gates opt-outs and records every outcome in the email log.',
    sub_flows: [
      {
        name: 'Localized email by recipient language',
        description: 'Locale looked up from the recipient address.',
        steps: [
          ['Set a member profile.locale to a non-default locale that has translated email.* keys', 'The locale is saved'],
          ['Trigger a templated email to that member (for example a password reset code)', 'The rendered email uses the translated {{t:email.*}} copy for that locale'],
          ['Trigger the same email to an address with no user account', 'The email uses the platform default locale copy'],
          ['Blank one translation for that locale and resend after 60 seconds (cache TTL)', 'That line falls back to the bundled server copy; no raw key appears'],
        ],
      },
      {
        name: 'Email log outcomes',
        description: 'SENT, SKIPPED and FAILED rows.',
        steps: [
          ['Send a templated email successfully', 'The email log row has status SENT, provider, message_id, the rendered html and the vars'],
          ['Deactivate a template in Tech > Email templates and trigger it', 'The log row is SKIPPED with reason Template "<slug>" is not active'],
          ['Trigger a send with a slug that does not exist', 'The log row is FAILED with reason Template "<slug>" does not exist'],
          ['Opt a member out of marketing email and send them a marketing template', 'The row is SKIPPED with "Recipient opted out of marketing email"'],
          ['Break the SMTP env entry and send', 'The row is FAILED with the provider error and the caller does not throw'],
        ],
      },
      {
        name: 'Held communications during an E2E run',
        description: 'Mute and run-account code capture.',
        steps: [
          ['Turn on the E2E communications mute and trigger any email', 'The row is SKIPPED with the muted reason and nothing leaves the SMTP server'],
          ['Request an OTP email for the E2E run account', 'The code is recorded for the suite and the row is SKIPPED with the held reason'],
        ],
      },
      {
        name: 'Email source attribution',
        description: 'The surface is read from the request Origin.',
        steps: [
          ['Submit the duncit.com contact form', 'The contact-received log row is attributed to the website surface'],
          ['Let a scheduler send an email (for example a held refund release)', 'The row is attributed to SERVER'],
        ],
      },
    ],
  },
  {
    name: 'Server: Public form intake and captcha',
    description:
      'Anonymous website mutations (submitContactForm, submitFaqQuestion, subscribeNewsletter, submitGrievance, submitStatusReport) pass requireHuman; signed-in callers skip the captcha.',
    sub_flows: [
      {
        name: 'Captcha verdicts',
        description: 'Tokens live 10 minutes and are burned on every attempt.',
        steps: [
          ['Call submitContactForm signed out with no captcha_token', 'GraphQL error "Please complete the verification below." with code CAPTCHA_REQUIRED'],
          ['Call it with a valid token and a wrong 5-character answer', 'Error code CAPTCHA_WRONG "The verification code does not match. Please try again."'],
          ['Reuse the same token with the right answer', 'Error code CAPTCHA_EXPIRED; a token is single use'],
          ['Use a token older than 10 minutes', 'Error code CAPTCHA_EXPIRED "The verification code expired. Please try a new one."'],
          ['Use a tampered token string', 'Error code CAPTCHA_INVALID'],
          ['Call submitContactForm with a valid member JWT and no captcha fields', 'The submission is accepted without a captcha'],
        ],
      },
      {
        name: 'Contact submission becomes a support ticket',
        description: 'Contact row, best-effort ticket and ack email.',
        steps: [
          ['Submit a valid contact form', 'Response {ok:true, message:"Thanks! We have received your message."}; the submission row carries ticket_id'],
          ['Make ticket creation fail and submit again', 'The visitor still gets ok:true, the submission has no ticket_id and an error log reads "contact ticket not raised — this message never reached Support"'],
        ],
      },
      {
        name: 'Status report intake',
        description: 'submitStatusReport server validation and image upload.',
        steps: [
          ['Submit a report with service_key "not-a-service"', 'The report is stored with empty service_key, service_name and service_url'],
          ['Submit with a 5-character message', 'BAD_USER_INPUT error with the yup message and no row'],
          ['Submit with four base64 images', 'Only the first three are uploaded to ImageKit and stored in image_urls'],
          ['Make the ImageKit upload fail', 'The report is still stored with fewer or no image_urls and ok:true is returned'],
        ],
      },
      {
        name: 'Job application intake has no captcha',
        description: 'submitJobApplication is validated but not captcha-gated.',
        steps: [
          ['Call submitJobApplication signed out with no captcha fields and valid input', 'Response ok:true and an application row is created'],
          ['Call it with email "bad"', 'A validation error "Enter a valid email" is returned'],
        ],
      },
    ],
  },
  {
    name: 'Server: Mail automation (Gmail)',
    description:
      'Every 2 minutes (first ~30s): read each connected Gmail mailbox from its history cursor, open one ticket and send one acknowledgement per new conversation.',
    sub_flows: [
      {
        name: 'Connect a mailbox via OAuth callback',
        description: 'GET /gmail/oauth/callback redirects back to Tech /mail-automation.',
        steps: [
          ['Start a Gmail connection from Tech and approve access in Google', 'The browser returns to tech.duncit.com/mail-automation?connected=<mailbox email>'],
          ['Reconnect a mailbox that is already connected', 'The redirect carries connected=<email>&reconnected=1'],
          ['Click Cancel on the Google consent screen', 'The redirect carries error=access_denied'],
          ['Open /gmail/oauth/callback with no code or state', 'The redirect carries error=missing_code'],
        ],
      },
      {
        name: 'Answer a new conversation',
        description: 'Claim, ticket, reply.',
        steps: [
          ['Connect a mailbox and wait for the first poll', 'The account last_history_id is set to the current mailbox position and no old mail is answered'],
          ['Send a new email to the mailbox from an external address and wait up to 2 minutes', 'A thread row is claimed, a ticket of the configured ticket type is opened and one acknowledgement reply quoting the ticket number is sent in the same thread'],
          ['Reply again on the same thread', 'No second ticket or acknowledgement is created'],
          ['Send an auto-responder or bounce message to the mailbox', 'It is ignored; no ticket is opened'],
        ],
      },
      {
        name: 'Mail automation failures',
        description: 'Send failure, poison message and expired cursor.',
        steps: [
          ['Make the Gmail send fail while a new email arrives', 'The ticket is opened and the thread row records reply_error; an error log says the acknowledgement could not be sent'],
          ['Cause one message fetch to throw', 'That thread records reply_error and later messages in the same batch are still answered and the cursor advances'],
          ['Let the stored history id expire in Gmail', 'A warn log says the cursor expired and the account is re-baselined without answering old mail'],
          ['Revoke the refresh token for one mailbox', 'That account gets last_error set and other mailboxes continue polling'],
        ],
      },
    ],
  },
  {
    name: 'Server: Push and web push notifications',
    description:
      'VAPID keys ensured at boot, web push to browser subscriptions and Expo push to native tokens, pruning dead endpoints.',
    sub_flows: [
      {
        name: 'VAPID keys at boot',
        description: 'Generated once and reused.',
        steps: [
          ['Boot against a database with no push key', 'A default push key is created and an info log reads "Generated new VAPID keys"'],
          ['Reboot', 'The same key pair is reused and no new key is generated'],
        ],
      },
      {
        name: 'Fan out a notification',
        description: 'Web push and Expo push delivery counts.',
        steps: [
          ['Send a notification from the Marketing portal to a member with a browser push subscription and a native Expo token', 'The browser shows the web push and the device shows the native push; the notification row records delivered counts'],
          ['Leave a browser subscription whose endpoint now returns 410 Gone and send again', 'failed increments and that push subscription row is deleted'],
          ['Leave an Expo token that Expo reports DeviceNotRegistered and send again', 'That Expo token row is deleted'],
          ['Make exp.host unreachable and send', 'Every message in the chunk counts as failed and an error log "expo push failed" is written'],
        ],
      },
    ],
  },
  {
    name: 'Server: Upload endpoint',
    description:
      'POST /upload?ticket= multipart upload with a one-time ticket from getImagekitAuth; the server uploads to ImageKit with the private key under Upload Settings.',
    sub_flows: [
      {
        name: 'Upload an image with a ticket',
        description: 'Happy path for a signed-in user.',
        steps: [
          ['Call getImagekitAuth(folder: "/uploads", surface: MWEB) as a signed-in member', 'The response has uploadUrl, a ticket and urlEndpoint'],
          ['POST the image as multipart field "file" to uploadUrl?ticket=<ticket>&fileName=photo.jpg', 'HTTP 200 with the ImageKit url and fileId; the file lands in the ticket folder'],
          ['Check AI Monitoring media scans', 'The uploaded image is recorded for review with the ticket surface and user'],
        ],
      },
      {
        name: 'Upload negative paths',
        description: 'Tickets are single use and expire in 10 minutes.',
        steps: [
          ['POST again with the same ticket', 'HTTP 401 "This upload link is no longer valid. Try again."'],
          ['POST with a ticket older than 10 minutes', 'HTTP 401 with the same message'],
          ['POST with a fresh ticket and no file part', 'HTTP 400 "No file received"'],
          ['POST a file larger than 300 MB', 'HTTP 413 "That file is too large to upload"'],
          ['POST a format the surface Upload Settings do not allow', 'HTTP 400 with the Upload Settings rejection message'],
          ['POST more than the Uploads rate limit in a minute with the rule in ENFORCE', 'HTTP 429 {"error":"rate_limited"}'],
        ],
      },
    ],
  },
  {
    name: 'Server: Venue partner public API',
    description:
      'REST /api/v1 for integrators, authenticated per request with x-api-key and scopes venues:read, slots:read and bookings:write, limited by the Public API keys rule (120/60s).',
    sub_flows: [
      {
        name: 'Read venues and slots',
        description: 'Approved active venues only.',
        steps: [
          ['GET /api/v1/ with no key', '200 {"name":"Duncit Venue API","version":"v1","docs":"https://developers.duncit.com"}'],
          ['GET /api/v1/venues with a key holding venues:read', '200 with venues exposing only id, name, description, address fields, lat/lng, capacity, category and images (no owner, bank, GSTIN or PAN)'],
          ['GET /api/v1/venues/<approved id>', '200 {"venue":{...}}'],
          ['GET /api/v1/venues/<id>/slots?to=2026-12-31 with slots:read', '200 with available slots starting on or before that date, each with id, starts_at, ends_at, space_label, capacity, price and status'],
        ],
      },
      {
        name: 'Book and release a slot',
        description: 'External bookings with bookings:write.',
        steps: [
          ['POST /api/v1/venues/<id>/slots/<slotId>/book with {"external_ref":"ORD-1001"}', '200 {"booking":{...,"external_ref":"ORD-1001"}} and the slot is booked by that key'],
          ['POST the same book request again', '409 {"error":"slot_unavailable"}'],
          ['DELETE the booking with a different API key', '409 {"error":"slot_unavailable"}; keys only release their own bookings'],
          ['DELETE the booking with the booking key', '200 {"released":true} and the slot is available again'],
        ],
      },
      {
        name: 'API key and request errors',
        description: 'Authentication, scope, validation and rate limit.',
        steps: [
          ['GET /api/v1/venues with no x-api-key', '401 {"error":"invalid_api_key"}'],
          ['GET /api/v1/venues with a revoked key', '401 {"error":"invalid_api_key"}'],
          ['POST a booking with a key lacking bookings:write', '403 {"error":"insufficient_scope"}'],
          ['GET /api/v1/venues/<pending or invalid id>', '404 {"error":"venue_not_found"}'],
          ['GET /api/v1/venues/<id>/slots?to=not-a-date', '400 {"error":"to must be a valid date"}'],
          ['GET /api/v1/unknown', '404 {"error":"not_found"} as JSON'],
          ['Send 121 requests within 60 seconds with one key', 'The 121st returns 429 {"error":"rate_limited"} with a Retry-After header'],
        ],
      },
    ],
  },
  {
    name: 'Server: Short link resolver and attribution',
    description:
      'GET /r/<code> counts the click and redirects with utm, dl and dlc tags; crawlers get a card; GET /r/v records landings reported by destination surfaces.',
    sub_flows: [
      {
        name: 'Resolve a short link',
        description: 'A 302 with attribution tags and a recorded click.',
        steps: [
          ['Create an active short link to https://mweb.duncit.com/club/<slug> with utm_source ig and utm_medium story', 'The link has an 8-character code'],
          ['GET /r/<code>?dr=https://instagram.com/ with a normal browser user agent', '302 to the destination with utm_source, utm_medium, dl=<code> and dlc=<click id> added'],
          ['Check the short link and click collections', 'The link click count increments and a click row with journey step CLICKED, the dr referrer, user agent and IP exists'],
          ['GET /r/<code> for a link minted by a member share', 'The destination also carries dls=1'],
        ],
      },
      {
        name: 'Unknown, retired and malformed codes',
        description: 'Negative paths.',
        steps: [
          ['Deactivate the short link and GET /r/<code>', '404 text "This link is no longer active." and no click recorded'],
          ['GET /r/<code shaped but never created>', '404 "This link is no longer active."'],
          ['GET /r/abc', '404 "Link not found." without a database lookup'],
        ],
      },
      {
        name: 'Link preview crawler card',
        description: 'Unfurlers get meta tags, not a counted visit.',
        steps: [
          ['GET /r/<code> for a pod or club destination with user agent "WhatsApp/2.23"', '200 HTML with og:title and og:description from the entity, og:url https://duncit.com/<code>, Cache-Control public max-age=300'],
          ['Check the click count', 'It did not increment for the crawler request'],
          ['Repeat with a destination that is not an entity route (e.g. a campaign landing page)', '302 redirect to the destination so it describes itself'],
          ['Repeat for a destination pod that has been deleted', '302 redirect to the destination'],
        ],
      },
      {
        name: 'Landing visit report and journey',
        description: 'Destination surfaces call /r/v with dlc or dl markers.',
        steps: [
          ['Follow a short link into duncit.com, ads, earnwith or mWeb', 'The landing page calls /r/v?dlc=<click id> and the click gets a LANDED journey step; localStorage duncit_short_link_click holds the click id'],
          ['Open a tagged destination URL directly with only dl=<code>', '/r/v?dl=<code> mints a new click on the link and returns {click_id}'],
          ['Call /r/v with an unknown dlc and no dl', '{"click_id":null} and nothing is recorded'],
          ['After landing, click an outbound link to another *.duncit.com site', 'The link carries the stored utm tags and dlc so attribution survives the hop; links to other domains are not decorated'],
          ['Sign up and pay through the attributed session', 'The click journey advances through SIGNED_UP and PAID'],
        ],
      },
    ],
  },
  {
    name: 'Server: Rate limiter',
    description:
      'Rules seeded at boot and enforced by the Apollo plugin (GraphQL), the Express middleware (REST) and the socket guard, configured in Tech > Rate Limiting.',
    sub_flows: [
      {
        name: 'Seeded rules on a fresh database',
        description: 'Shipped defaults created once by name.',
        steps: [
          ['Boot against an empty database', 'Rules exist: Global request ceiling (MONITOR 600/60s), Anonymous browsing ceiling (MONITOR 240/60s), Sign-in and one-time codes (ENFORCE 20/300s, block 300s), Mutation ceiling per account, Uploads, Public API keys (ENFORCE 120/60s), Socket connections'],
          ['Edit a seeded rule limit and reboot', 'The edited limit is kept'],
        ],
      },
      {
        name: 'Enforced sign-in rule',
        description: 'Credential-guessing protection on login and OTP mutations.',
        steps: [
          ['Send 21 login mutations from one IP within 5 minutes', 'The 21st returns a GraphQL error code RATE_LIMITED with message "Too many attempts. Please wait a few minutes before trying again.", rule name and retry_after, HTTP status 429'],
          ['Retry a login immediately from the same IP', 'It is refused for the 300-second block period'],
          ['Open Tech > Rate Limiting > Blocked', 'A breach event for the rule, key and IP is listed'],
        ],
      },
      {
        name: 'Monitor mode, master switch and exemptions',
        description: 'Breaches recorded but allowed; paths never limited.',
        steps: [
          ['Exceed a MONITOR rule such as the Global request ceiling', 'Requests still succeed and a MONITOR breach event is recorded'],
          ['Turn on monitor_only in rate limit settings and exceed the sign-in rule', 'Requests succeed and events are recorded as MONITOR'],
          ['Turn the master switch off and exceed any rule', 'Every request is allowed'],
          ['Hammer /health and /status/summary well past every ceiling', 'Every response is 200; these paths are skipped'],
          ['Enable limit headers in settings and trip a REST rule', '429 {"error":"rate_limited"} with X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset and Retry-After'],
          ['Send stress-test traffic carrying an active stress traffic key header', 'The requests are not counted against any rule'],
        ],
      },
      {
        name: 'Rate limit retention sweep',
        description: 'Daily purge of old breach events (first ~90s after boot).',
        steps: [
          ['Set breach retention to 7 days with events older than that present and restart', 'After about 90 seconds the old events are deleted and an info log rateLimit cleanup {deleted: n} is written'],
        ],
      },
    ],
  },
  {
    name: 'Server: Account deletion sweep',
    description:
      'One-minute tick (first ~2 min) running due PENDING deletion requests on the Admin schedule (default off, daily 03:00, batch 25, 30-day retention), plus the seal map refresh.',
    sub_flows: [
      {
        name: 'Scheduled purge of due requests',
        description: 'Only PENDING requests whose scheduled_delete_at has passed.',
        steps: [
          ['Enable the deletion schedule for daily at a time 2 minutes from now', 'Settings are saved with cron_enabled true'],
          ['Create one PENDING request with scheduled_delete_at in the past and one with it next week', 'Both are PENDING'],
          ['Wait past the scheduled time', 'A run row DUN-ADX-XXXXXX with trigger SCHEDULED, status SUCCEEDED, eligible 1 and purged 1 exists; only the past-due account is purged'],
          ['Wait another minute', 'No second run happens for the same window'],
          ['Keep the schedule disabled with a past-due request', 'No run row is created and nothing is purged'],
        ],
      },
      {
        name: 'Failures and catch-up',
        description: 'One bad account never stops the run.',
        steps: [
          ['Make one due account fail to purge and run the sweep', 'The run is SUCCEEDED with failed 1, that result has outcome FAILED and an error, and the request returns to PENDING'],
          ['Stop the server across the scheduled time, then start it', 'The missed run executes within about two minutes of boot'],
          ['Trigger Run now twice quickly from the Admin Panel', 'The second call returns "A deletion sweep is already running"'],
        ],
      },
      {
        name: 'Sealed accounts refresh',
        description: 'Filing a deletion request ends the account; the lock map refreshes every 60 seconds.',
        steps: [
          ['Insert a PENDING deletion request for a signed-in member directly in the database', 'Within 60 seconds that member JWT is refused on authenticated requests'],
          ['Cancel the request directly in the database', 'Within 60 seconds the member can sign in again'],
        ],
      },
    ],
  },
  {
    name: 'Server: Retention sweeps and samplers',
    description: 'Telemetry cleanup, Tech server history sampler and GraphQL Monitor flusher.',
    sub_flows: [
      {
        name: 'Telemetry retention',
        description: 'Daily sweep (first ~1 min) with the Tech Telemetry Logs retention (default 30 days).',
        steps: [
          ['Seed telemetry logs and bugs older than 30 days and restart the server', 'About a minute after boot the rows past the window are deleted; newer rows remain'],
        ],
      },
      {
        name: 'Server history sampler',
        description: 'One host sample every 5 minutes, expired by TTL.',
        steps: [
          ['Boot the server and wait 5 minutes', 'A server history sample row with CPU, memory, disk, latency, containers and expires_at is inserted'],
          ['Inspect the collection indexes', 'A TTL index on expires_at removes rows automatically'],
        ],
      },
      {
        name: 'GraphQL Monitor flush',
        description: 'Per-minute rollups from the in-memory collector.',
        steps: [
          ['Run several GraphQL operations and wait one minute', 'The GraphQL Monitor rollups gain counts and latency histograms for those operations'],
          ['Restart the server mid-minute', 'At most the in-memory minute is lost; earlier rollups remain'],
        ],
      },
    ],
  },
  {
    name: 'Server: Database backup and E2E schedules',
    description:
      'One-minute ticks that start a scheduled database backup (Tech > Database > Backups) and dispatch the nightly E2E workflow (Tech > E2E Tests > Settings, 03:00 default).',
    sub_flows: [
      {
        name: 'Scheduled database backup',
        description: 'runIfDue stamps last_run_at, starts the backup and prunes to keep_last.',
        steps: [
          ['Enable backups with a time 2 minutes ahead and keep_last 7 while 7 backups already exist', 'Settings are saved'],
          ['Wait past the scheduled time', 'last_run_at is stamped, a SCHEDULED backup row starts and the oldest backup is pruned so 7 remain'],
          ['Stop the server across the window and start it again', 'The missed backup runs within about 90 seconds of boot'],
          ['GET /db-backups/download?token=<tampered>', '404 "Not found" with no-store caching'],
        ],
      },
      {
        name: 'Nightly E2E dispatch',
        description: 'The server is the only scheduler for the E2E workflow.',
        steps: [
          ['Set the E2E schedule 2 minutes ahead in Tech > E2E Tests > Settings', 'The schedule is saved'],
          ['Wait past the time', 'A scheduled E2E run is dispatched to the GitHub workflow and a run row appears in Tech > E2E Tests > Runs'],
        ],
      },
    ],
  },
  {
    name: 'Server: Signed and keyed file feeds',
    description: 'GET /tickets/:token/ticket.pdf for AiSensy, the /telemetry JSON feeds and the /ai-prompts feed.',
    sub_flows: [
      {
        name: 'Ticket PDF signed link',
        description: 'A 30-minute signed link naming one ticket.',
        steps: [
          ['Complete a booking that sends a WhatsApp confirmation with a document header', 'AiSensy fetches /tickets/<token>/ticket.pdf and the member receives the ticket PDF'],
          ['GET the same URL in a browser within 30 minutes', '200 application/pdf download with Cache-Control no-store and X-Robots-Tag noindex, nofollow'],
          ['GET the URL after 30 minutes or with a tampered token', '404 text "Not found"'],
        ],
      },
      {
        name: 'Telemetry and AI prompt feeds',
        description: 'Keyed telemetry feeds and the open prompt feed.',
        steps: [
          ['GET /telemetry/logs.json?key=<telemetry key>&level=error', '200 pretty-printed JSON of error logs'],
          ['GET /telemetry/bugs.json with no key', '401 with a message to copy a fresh URL from Tech → Telemetry'],
          ['Send the key in the x-telemetry-key header instead of the query', '200 JSON'],
          ['GET /ai-prompts/prompts.json?kind=AI', '200 JSON of ACTIVE prompts without usage sites or created_by'],
          ['GET /ai-prompts/prompt.json?key=<inactive prompt key>', 'The inactive prompt is not served'],
        ],
      },
    ],
  },
  {
    name: 'Server: Twilio call webhooks',
    description: 'CRM softphone and AI call webhooks under /twilio plus the legacy /twilio/recordings callback.',
    sub_flows: [
      {
        name: 'Portal call bridging and status',
        description: 'Twilio posts urlencoded bodies; the server answers TwiML.',
        steps: [
          ['Start a CRM portal call so Twilio posts /twilio/voice/portal?logId=<id>&userId=<id>&agent=<number>', 'TwiML dials the agent number with call-status and recording callbacks'],
          ['POST /twilio/voice/portal without agent', 'TwiML says "No agent number to connect. Goodbye." and hangs up'],
          ['Let Twilio post /twilio/call-status with CallStatus completed and CallDuration 42', 'The communication log is updated to completed with 42 seconds and the agent receives a live status event'],
          ['POST /twilio/call-status?kind=recording with RecordingUrl lacking an extension', 'The log recording_url is stored with .mp3 appended'],
          ['POST /twilio/call-status without logId or userId', 'An empty TwiML Response is returned and nothing is updated'],
        ],
      },
      {
        name: 'AI call turns and audio',
        description: 'Servam-voiced AI conversation.',
        steps: [
          ['POST /twilio/voice/ai without logId', 'TwiML says "Call setup failed. Goodbye."'],
          ['Make the AI turn handler throw', 'TwiML says "Sorry, we hit a problem. Goodbye." instead of a 500'],
          ['GET /twilio/ai-audio/<unknown token>', '404 with an empty body'],
          ['POST /twilio/recordings with any body, even invalid', '204 always'],
        ],
      },
    ],
  },
  {
    name: 'Server: City launch message',
    description: 'The background WhatsApp send behind Admin > Subscribe for location (scenario USER_CITY_LAUNCHED).',
    sub_flows: [
      {
        name: 'Background send updates each subscriber',
        description: 'The mutation returns at once and the rows settle as messages go out.',
        steps: [
          ['Call sendLocationLaunchMessage for a launched city with pending subscribers', 'It returns queued = the PENDING + FAILED count immediately'],
          ['Wait for the batches to finish', 'SENT rows get notified_at; SKIPPED and FAILED rows store the reason; the WhatsApp log shows one row per number'],
          ['Call it twice in quick succession', 'No number is billed twice — the second attempt logs "Already sent" and the row stays Sent'],
        ],
      },
      {
        name: 'Opt-outs and the kill switch are respected',
        description: 'A marketing send goes through the automatic WhatsApp gates.',
        steps: [
          ['Switch marketing WhatsApp off for a subscriber, then send', 'That row is Skipped with "Recipient switched this off"'],
          ['Turn the global WhatsApp kill switch off and send', 'Rows are Skipped with the switched-off reason and can be retried later'],
        ],
      },
    ],
  },
];
