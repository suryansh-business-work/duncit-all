export const cmsTypeDefs = /* GraphQL */ `
  enum CmsCollection {
    BLOG
    CAREER
    NEWSLETTER
    CASE_STUDY
    NEWSROOM
  }

  enum CmsPageKind {
    PAGE
    COLLECTION_LIST
    COLLECTION_DETAIL
  }

  enum CmsFragmentKind {
    HEADER
    FOOTER
    SECTION
  }

  enum CmsVersionOwner {
    PAGE
    FRAGMENT
  }

  type CmsToken {
    name: String!
    value: String!
    group: String!
  }

  enum CmsFontSource {
    GOOGLE
    CUSTOM
  }

  enum CmsFontRole {
    HEADING
    BODY
    ACCENT
    NONE
  }

  type CmsFontFile {
    weight: Int!
    style: String!
    url: String!
  }

  "A typeface a site uses: a Google font in chosen weights, or uploaded files."
  type CmsFont {
    family: String!
    source: CmsFontSource!
    weights: [Int!]!
    italic: Boolean!
    role: CmsFontRole!
    "Another CSS variable to bind the family to, e.g. --font-display."
    variable: String!
    fallback: String!
    files: [CmsFontFile!]!
  }

  "A family in the Google Fonts catalogue."
  type CmsGoogleFont {
    family: String!
    category: String!
    "Weights it ships (100–900)."
    weights: [Int!]!
    italic: Boolean!
    popularity: Int!
  }

  type CmsGoogleFontPage {
    fonts: [CmsGoogleFont!]!
    total: Int!
    categories: [String!]!
  }

  "A site's design system: tokens become CSS variables, base_css is its stylesheet."
  type CmsDesign {
    tokens: [CmsToken!]!
    fonts: [CmsFont!]!
    font_urls: [String!]!
    base_css: String!
  }

  type CmsCollectionPath {
    collection: CmsCollection!
    path: String!
  }

  "One extra <meta>: a name (description, author, og:locale…) and its content."
  type CmsMetaTag {
    name: String!
    content: String!
  }

  type CmsSeo {
    title: String!
    description: String!
    og_image_url: String!
    canonical_url: String!
    noindex: Boolean!
    "The share card's title and text, when they should differ from the page's."
    og_title: String!
    og_description: String!
    "'' lets the page decide, else summary or summary_large_image."
    twitter_card: String!
    keywords: String!
    "Structured data (schema.org) as JSON, rendered as application/ld+json."
    json_ld: String!
    meta_tags: [CmsMetaTag!]!
  }

  "A website the CMS serves, chosen by the request's hostname."
  type CmsSite {
    id: ID!
    key: String!
    name: String!
    domains: [String!]!
    legacy_site: WebsiteNavSite
    is_active: Boolean!
    design: CmsDesign!
    head_html: String!
    body_end_html: String!
    custom_css: String!
    custom_js: String!
    favicon_url: String!
    seo: CmsSeo!
    header_fragment_id: ID
    footer_fragment_id: ID
    collections: [CmsCollection!]!
    collection_paths: [CmsCollectionPath!]!
    page_count: Int!
    created_at: String!
    updated_at: String!
  }

  type CmsDraftContent {
    project: String!
    html: String!
    "The visual editor's styles."
    css: String!
    "Styles written by hand (SCSS); compiled when rendered — a component's scoped to the component."
    scss: String!
    "The page's or component's own script; a component's runs once per placement with root bound to it."
    js: String!
  }

  type CmsPublishedContent {
    html: String!
    css: String!
    scss: String!
    js: String!
    version: Int!
    published_at: String
    published_by: String!
  }

  type CmsPage {
    id: ID!
    site_id: ID!
    kind: CmsPageKind!
    collection_type: CmsCollection
    title: String!
    path: String!
    is_published: Boolean!
    "The draft differs from what is live."
    has_unpublished_changes: Boolean!
    seo: CmsSeo!
    show_header: Boolean!
    show_footer: Boolean!
    head_html: String!
    custom_css: String!
    custom_js: String!
    sort_order: Int!
    draft: CmsDraftContent!
    published: CmsPublishedContent!
    updated_by: String!
    created_at: String!
    updated_at: String!
  }

  type CmsPageTablePage {
    rows: [CmsPage!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type CmsFragment {
    id: ID!
    site_id: ID!
    key: String!
    name: String!
    kind: CmsFragmentKind!
    "What the component is for."
    description: String!
    "A group to find it by in the Components list (Hero, Footer, Pricing…)."
    category: String!
    "The live blocks this component holds (reel-slider, newsletter…); empty for a plain section."
    blocks: [String!]!
    is_published: Boolean!
    has_unpublished_changes: Boolean!
    draft: CmsDraftContent!
    published: CmsPublishedContent!
    updated_by: String!
    created_at: String!
    updated_at: String!
  }

  type CmsFragmentTablePage {
    rows: [CmsFragment!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type CmsVersion {
    id: ID!
    owner_kind: CmsVersionOwner!
    owner_id: ID!
    version: Int!
    "This version's live-demo link on the site's own domain (signed, short-lived). Null when the site has no domain."
    preview_url: String
    published_by: String!
    created_at: String!
  }

  "Which part of a website a revision snapshots."
  enum CmsSiteSection {
    SETTINGS
    DESIGN
    CODE
  }

  "One saved state of a website's settings, design system or site code."
  type CmsSiteRevision {
    id: ID!
    revision: Int!
    section: CmsSiteSection!
    "The revision this one brought back, when it was a restore."
    restored_from: Int
    saved_by: String!
    created_at: String!
  }

  type CmsEntryField {
    key: String!
    value: String!
  }

  "A blog post, job opening, newsletter issue, case study or press item."
  type CmsEntry {
    id: ID!
    site_id: ID!
    collection_type: CmsCollection!
    title: String!
    slug: String!
    summary: String!
    body_html: String!
    cover_image_url: String!
    category: String!
    tags: [String!]!
    author_name: String!
    fields: [CmsEntryField!]!
    seo: CmsSeo!
    is_published: Boolean!
    published_at: String
    sort_order: Int!
    updated_by: String!
    created_at: String!
    updated_at: String!
  }

  type CmsEntryTablePage {
    rows: [CmsEntry!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  "The site-wide part of a rendered response."
  type CmsRenderSite {
    key: String!
    name: String!
    legacy_site: WebsiteNavSite
    design: CmsDesign!
    head_html: String!
    body_end_html: String!
    custom_css: String!
    custom_js: String!
    favicon_url: String!
  }

  type CmsPagination {
    page: Int!
    total_pages: Int!
    base_path: String!
  }

  enum CmsCodeLanguage {
    SCSS
    JS
    ASTRO
    HTML
  }

  enum CmsCodeSeverity {
    ERROR
    WARNING
  }

  "One problem in a piece of code, for the editor's markers. Line and column are 1-based."
  type CmsCodeProblem {
    line: Int!
    column: Int!
    message: String!
    severity: CmsCodeSeverity!
  }

  "A page's real address with a signed preview flag: its draft or one saved version, on its own domain."
  type CmsPreviewLink {
    url: String!
    expires_at: String!
  }

  """
  One request's page, fully composed by the server: header + page + footer
  html (fragments expanded, collection fields bound), their css joined, and the
  SEO to put in <head>. status is 200, or 404 when nothing lives at the path.
  """
  type CmsRenderResult {
    status: Int!
    site: CmsRenderSite
    title: String!
    html: String!
    css: String!
    seo: CmsSeo!
    head_html: String!
    custom_js: String!
    pagination: CmsPagination
  }

  "One of a website's hostnames, and its address records in the GoDaddy zone."
  type CmsSiteDnsHost {
    host: String!
    "The record name inside the zone: @ for the apex, www for www.<zone>."
    name: String!
    "False when the hostname is outside the zone configured in Tech → Domain."
    in_zone: Boolean!
    records: [DnsRecord!]!
  }

  type CmsSiteDns {
    "Whether Tech → Domain holds a GoDaddy key for a zone."
    configured: Boolean!
    zone: String!
    hosts: [CmsSiteDnsHost!]!
  }

  input CmsSiteARecordInput {
    host: String!
    "IPv4 the hostname should point at."
    ip: String!
    ttl: Int
    "The record's current IPv4, to repoint it; omit to add a new A record."
    current: String
  }

  type CmsSitemapUrl {
    path: String!
    updated_at: String!
  }

  input CmsTokenInput {
    name: String!
    value: String!
    group: String
  }

  input CmsFontFileInput {
    weight: Int!
    style: String!
    url: String!
  }

  input CmsFontInput {
    family: String!
    source: CmsFontSource!
    weights: [Int!]!
    italic: Boolean
    role: CmsFontRole
    variable: String
    fallback: String
    files: [CmsFontFileInput!]
  }

  input CmsDesignInput {
    tokens: [CmsTokenInput!]!
    fonts: [CmsFontInput!]
    font_urls: [String!]!
    base_css: String!
  }

  input CmsCollectionPathInput {
    collection: CmsCollection!
    path: String!
  }

  input CmsMetaTagInput {
    name: String!
    content: String
  }

  input CmsSeoInput {
    title: String
    description: String
    og_image_url: String
    canonical_url: String
    noindex: Boolean
    og_title: String
    og_description: String
    twitter_card: String
    keywords: String
    json_ld: String
    meta_tags: [CmsMetaTagInput!]
  }

  input CmsSiteInput {
    key: String!
    name: String!
    domains: [String!]!
    legacy_site: WebsiteNavSite
    is_active: Boolean
    favicon_url: String
    seo: CmsSeoInput
    header_fragment_id: ID
    footer_fragment_id: ID
    collections: [CmsCollection!]
    collection_paths: [CmsCollectionPathInput!]
  }

  input CmsSiteCodeInput {
    head_html: String!
    body_end_html: String!
    custom_css: String!
    custom_js: String!
  }

  input CmsPageInput {
    kind: CmsPageKind
    collection_type: CmsCollection
    title: String!
    path: String
    seo: CmsSeoInput
    show_header: Boolean
    show_footer: Boolean
    head_html: String
    custom_css: String
    custom_js: String
    sort_order: Int
  }

  "base_updated_at guards against two editors overwriting each other."
  input CmsDraftInput {
    project: String!
    html: String!
    css: String!
    scss: String
    js: String
    base_updated_at: String
  }

  input CmsFragmentInput {
    key: String!
    name: String!
    kind: CmsFragmentKind!
    description: String
    category: String
  }

  input CmsEntryFieldInput {
    key: String!
    value: String!
  }

  input CmsEntryInput {
    collection_type: CmsCollection!
    title: String!
    slug: String
    summary: String
    body_html: String
    cover_image_url: String
    category: String
    tags: [String!]
    author_name: String
    fields: [CmsEntryFieldInput!]
    seo: CmsSeoInput
    is_published: Boolean
    published_at: String
    sort_order: Int
  }

  extend type Query {
    "Public: the page a CMS site serves at a path, composed and ready to send."
    cmsRender(host: String!, path: String!, page: Int): CmsRenderResult!
    "Public: every published address of a site, for sitemap.xml."
    cmsSitemap(host: String!): [CmsSitemapUrl!]!
    "Everything wrong with a piece of SCSS, JavaScript or Astro, as the editor types it. Editors only."
    cmsValidateCode(language: CmsCodeLanguage!, source: String!): [CmsCodeProblem!]!
    "Public: a site's designed error page (404, 500, 503), or null when it has none."
    cmsErrorPage(host: String!, code: Int!): CmsRenderResult
    "A page's DRAFT rendered exactly as cmsRender would serve it."
    cmsPreview(page_id: ID!, entry_id: ID): CmsRenderResult!
    "A shareable live-demo link: the draft, or (with version) that published version. Editors only."
    cmsPreviewLink(page_id: ID!, version: Int, entry_id: ID): CmsPreviewLink!
    "A component on its own, in its site's styles: the draft, or (with version) that published version. Editors only."
    cmsComponentPreviewLink(fragment_id: ID!, version: Int): CmsPreviewLink!
    "Public: what a preview link shows. Null when the token is forged or expired."
    cmsRenderPreview(token: String!): CmsRenderResult
    "The Google Fonts catalogue, searchable, most popular first."
    cmsGoogleFonts(search: String, category: String, offset: Int, limit: Int): CmsGoogleFontPage!
    "A website's hostnames and their A/AAAA/CNAME records (Tech managers)."
    cmsSiteDns(site_id: ID!): CmsSiteDns!
    cmsSites: [CmsSite!]!
    cmsSite(site_id: ID!): CmsSite
    cmsPagesTable(site_id: ID!, query: TableQueryInput): CmsPageTablePage!
    cmsPage(page_id: ID!): CmsPage
    cmsFragmentsTable(site_id: ID!, query: TableQueryInput): CmsFragmentTablePage!
    cmsFragments(site_id: ID!): [CmsFragment!]!
    cmsFragment(fragment_id: ID!): CmsFragment
    cmsVersions(owner_kind: CmsVersionOwner!, owner_id: ID!): [CmsVersion!]!
    "Newest first; one section, or all three."
    cmsSiteRevisions(site_id: ID!, section: CmsSiteSection): [CmsSiteRevision!]!
    cmsEntriesTable(site_id: ID!, collection_type: CmsCollection!, query: TableQueryInput): CmsEntryTablePage!
    cmsEntry(entry_id: ID!): CmsEntry
  }

  extend type Mutation {
    createCmsSite(input: CmsSiteInput!): CmsSite!
    updateCmsSite(site_id: ID!, input: CmsSiteInput!): CmsSite!
    updateCmsSiteDesign(site_id: ID!, input: CmsDesignInput!): CmsSite!
    updateCmsSiteCode(site_id: ID!, input: CmsSiteCodeInput!): CmsSite!
    deleteCmsSite(site_id: ID!): Boolean!
    "Adds or repoints an A record for one of the website's own hostnames (Tech managers)."
    setCmsSiteARecord(site_id: ID!, input: CmsSiteARecordInput!): Boolean!

    createCmsPage(site_id: ID!, input: CmsPageInput!): CmsPage!
    updateCmsPage(page_id: ID!, input: CmsPageInput!): CmsPage!
    saveCmsPageDraft(page_id: ID!, input: CmsDraftInput!): CmsPage!
    publishCmsPage(page_id: ID!): CmsPage!
    unpublishCmsPage(page_id: ID!): CmsPage!
    duplicateCmsPage(page_id: ID!, title: String!, path: String!): CmsPage!
    deleteCmsPage(page_id: ID!): Boolean!

    createCmsFragment(site_id: ID!, input: CmsFragmentInput!): CmsFragment!
    updateCmsFragment(fragment_id: ID!, input: CmsFragmentInput!): CmsFragment!
    saveCmsFragmentDraft(fragment_id: ID!, input: CmsDraftInput!): CmsFragment!
    publishCmsFragment(fragment_id: ID!): CmsFragment!
    deleteCmsFragment(fragment_id: ID!): Boolean!

    "Copies a published version back into the draft; publish to make it live."
    restoreCmsVersion(version_id: ID!): Boolean!
    "Makes that saved version live: it becomes the draft and is published."
    publishCmsVersion(version_id: ID!): Boolean!
    "Saves that revision's snapshot again — itself a new revision, so a restore can be undone."
    restoreCmsSiteRevision(revision_id: ID!): CmsSite!

    createCmsEntry(site_id: ID!, input: CmsEntryInput!): CmsEntry!
    updateCmsEntry(entry_id: ID!, input: CmsEntryInput!): CmsEntry!
    deleteCmsEntry(entry_id: ID!): Boolean!
  }
`;
