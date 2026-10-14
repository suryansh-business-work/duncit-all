/// <reference types="cypress" />
import { expectRefused, signInRunMember } from '../../../support/access-steps';
import { refusal } from '../../../support/api-apps';
import { launchedLocation, listedPod, runMe, selectLocation } from '../../../support/ui-apps-2';
import { loadPhoto, runPhoto } from '../../../support/support-steps';
import { runAccount } from '../../../support/run-account';

/**
 * Stories (UI), live on staging, with the run account's OWN story only.
 *
 * Home needs a launched city to show its feed and story rail, so the run
 * account's saved city is set to one for this file and put back in `after()`.
 * ST-01 uploads a photo story (a name carrying the run stamp); it is viewed
 * and deleted by its author here, and any story left behind expires in 24h
 * and is purged with the account.
 */

const MY_STORIES = `query E2eUiMyStories($author: ID) { stories(author_id: $author) { id kind image_url created_at expires_at } }`;
const CLUB_ID = `query E2eUiClubId($slug: String!) { clubBySlug(club_slug: $slug) { id } }`;
const CREATE_STORY = `mutation E2eUiCreateStory($input: CreatePostInput!) { createPost(input: $input) { id } }`;
const DELETE_POST = `mutation E2eUiDeletePost($id: ID!) { deletePost(post_doc_id: $id) }`;
const DAY_MS = 24 * 60 * 60 * 1000;

interface Story {
  id: string;
  kind: string;
  image_url: string;
  created_at: string;
  expires_at: string | null;
}

const addAnother = () => cy.byTestId('my-status-upload-tile-add');

function openHome(): void {
  cy.interceptOperation('HomeFeedLive');
  cy.visitApp('/');
  cy.wait('@HomeFeedLive');
  cy.byTestId('home-status-rail').should('be.visible');
}

/** Tap My status, choose the fixture photo, keep No Crop and upload it. */
function uploadStory(stamp: string, what: string): void {
  loadPhoto();
  cy.byTestId('status-mine').click();
  cy.byTestId('status-upload-input').selectFile(runPhoto(stamp, what), { force: true });
  cy.byTestId('status-crop-dialog').should('be.visible');
  cy.interceptOperation('UploadStatusMedia');
  cy.interceptOperation('CreateStatusPost');
  cy.byTestId('status-crop-confirm').should('have.text', 'Upload').click();
  cy.wait('@UploadStatusMedia');
  cy.wait('@CreateStatusPost');
  cy.byTestId('status-upload-notice').should('contain.text', 'Status uploaded.');
}

/** Open the run account's own story from the rail and delete it behind the confirmation. */
function deleteOpenStory(): void {
  cy.byTestId('status-mine').click();
  cy.byTestId('home-status-viewer').should('be.visible');
  cy.byTestId('status-kebab').click();
  cy.byTestId('status-report').should('not.exist');
  cy.byTestId('status-delete').click();
  cy.byTestId('status-delete-confirm-title').should('have.text', 'Delete story?');
  cy.byTestId('status-delete-confirm').should('contain.text', "This story will be removed for everyone. This can't be undone.");
  cy.interceptOperation('DeleteStoryPost');
  cy.byTestId('status-delete-confirm-confirm').click();
  cy.wait('@DeleteStoryPost');
  cy.byTestId('home-status-viewer').should('not.exist');
}

describe('Social - stories', { testIsolation: false }, () => {
  const account = runAccount();
  let meId = '';
  let savedLocationId: string | null = null;
  let storyImage = '';

  const myStories = () =>
    cy.gql<{ stories: Story[] }>(MY_STORIES, { author: meId }).then(({ stories }) => stories);

  before(() => {
    signInRunMember();
    runMe().then((me) => {
      meId = me.user_id;
      savedLocationId = me.selected_location_id;
    });
    launchedLocation().then((city) => selectLocation(city.id));
    cy.then(() => myStories().should('have.length', 0));
  });

  after(() => {
    cy.then(() => selectLocation(savedLocationId));
  });

  it('ST-01 My status uploads a photo through the crop step; the story lives 24 hours and shows on the rail', () => {
    openHome();
    cy.byTestId('status-mine').should('contain.text', 'My status');
    addAnother().should('not.exist');
    uploadStory(account.stamp, 'story');
    myStories().then((stories) => {
      expect(stories, 'one active story').to.have.length(1);
      const [story] = stories;
      expect(story.kind).to.equal('STORY');
      const lifetime = new Date(String(story.expires_at)).getTime() - new Date(story.created_at).getTime();
      expect(Math.abs(lifetime - DAY_MS), 'expires 24 hours after it was created').to.be.lessThan(60_000);
      storyImage = story.image_url;
    });
    openHome();
    addAnother().should('be.visible');
  });

  it('ST-02 your own story has no like button, and nobody has viewed it yet', () => {
    openHome();
    cy.byTestId('status-mine').click();
    cy.byTestId('home-status-viewer').should('be.visible');
    cy.byTestId('status-like').should('not.exist');
    cy.interceptOperation('StoryViewers');
    cy.byTestId('status-viewers').click();
    cy.wait('@StoryViewers');
    cy.byTestId('story-viewers-dialog').should('be.visible');
    cy.byTestId('story-viewers-empty').should('have.text', 'No one has viewed this story yet.');
    cy.byTestId('story-viewers-close').click();
    cy.byTestId('status-close').click();
    cy.byTestId('home-status-viewer').should('not.exist');
  });

  it('ST-03 a member gets no add tile on a club page, and the server refuses a club story from them', () => {
    listedPod(meId).then((pod) => {
      cy.gql<{ clubBySlug: { id: string } | null }>(CLUB_ID, { slug: pod.club_slug }).then(({ clubBySlug }) => {
        if (!clubBySlug) throw new Error(`The listed pod's club "${pod.club_slug}" does not resolve.`);
        cy.interceptOperation('ClubStories');
        cy.visitApp(`/club/${pod.club_slug}`);
        cy.wait('@ClubStories');
        cy.byTestId('club-stories').should('exist');
        cy.byTestId('club-story-add').should('not.exist');
        cy.gqlRaw(CREATE_STORY, {
          input: { image_url: storyImage, kind: 'STORY', media_type: 'IMAGE', club_id: clubBySlug.id },
        }).then((body) =>
          expectRefused('createPost', body, refusal('FORBIDDEN', 'Only this club’s admins can post a story to it')),
        );
      });
    });
  });

  // The rail's delete and the upload both refetch HomeFeedLive, which carries the stories.
  it('ST-04 deleting your story drops it from the rail without a reload', () => {
    cy.gql<{ createPost: { id: string } }>(CREATE_STORY, {
      input: { image_url: storyImage, kind: 'STORY', media_type: 'IMAGE' },
    });
    openHome();
    deleteOpenStory();
    // One story is left from ST-01, so the add-another badge stays — delete it too, still without a reload.
    deleteOpenStory();
    addAnother().should('not.exist');
  });

  it('ST-05 Story options › Delete asks first and removes the story', () => {
    openHome();
    deleteOpenStory();
    myStories().should('have.length', 0);
    openHome();
    addAnother().should('not.exist');
    cy.byTestId('status-mine').should('contain.text', 'My status');
  });

  it('ST-06 an uploaded story shows on the rail without a reload', () => {
    openHome();
    addAnother().should('not.exist');
    uploadStory(account.stamp, 'story-again');
    addAnother().should('be.visible');
    myStories().then((stories) => stories.forEach((story) => cy.gql(DELETE_POST, { id: story.id })));
  });
});
