/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { signInRunMember } from '../../../support/access-steps';
import { expectSharedLink, notice, signInOnLoginPage, watchClipboard } from '../../../support/ui-apps-2';
import { loadPhoto, runPhoto } from '../../../support/support-steps';
import { runAccount } from '../../../support/run-account';

/**
 * Posts (UI), live on staging, on the run account's OWN profile and post.
 *
 * The account starts with no posts. PO-04 shares one photo post (the image is
 * uploaded under a name carrying the run stamp, the caption carries the run
 * marker); every later scenario likes, comments, shares and deep-links that
 * post, and PO-11 deletes it. Nothing here touches another member's content,
 * so no notification reaches anyone else.
 */

const MY_POSTS = `query E2eUiMyPosts { myPosts { id } }`;
const COMMENT_LIMIT = 1000;

const uploadDialog = () => cy.byTestId('upload-dialog');
const likes = () => cy.byTestId('post-actions-likes-count');
const commentInput = () => cy.byTestId('post-actions-comment-input');
const deleteCommentButtons = () => cy.byTestIdPrefix('post-comment-list-comment-', '-delete');

const myPostIds = () => cy.gql<{ myPosts: Array<{ id: string }> }>(MY_POSTS).then(({ myPosts }) => myPosts.map((p) => p.id));

/** In the open "New post" dialog: pick the fixture photo through the media picker's device tab. */
function pickPhoto(stamp: string, what: string): void {
  loadPhoto();
  cy.byTestId('upload-dialog-choose-image').click();
  cy.byTestId('media-device-dropzone').should('be.visible');
  cy.byTestId('media-device-file-input').selectFile(runPhoto(stamp, what), { force: true });
  cy.interceptOperation('UploadImageToImagekit');
  cy.byTestId('media-picker-done').should('be.enabled').click();
  cy.wait('@UploadImageToImagekit');
  cy.byTestId('upload-dialog-preview').should('have.attr', 'src').and('match', /^https:\/\//);
}

function openProfile(): void {
  cy.interceptOperation('MeAndMyPosts');
  cy.visitApp('/profile');
  cy.wait('@MeAndMyPosts');
  cy.byTestId('profile-page').should('be.visible');
}

describe('Social - posts', { testIsolation: false }, () => {
  const account = runAccount();
  const caption = `${runMarker(account.stamp, 'mweb-post')} Sunday hike photo`;
  let postId = '';

  const openPost = () => {
    openProfile();
    cy.interceptOperation('PostDetails');
    cy.byTestId(`profile-posts-grid-post-${postId}`).click();
    cy.wait('@PostDetails');
    cy.byTestId('post-dialog').should('be.visible');
  };

  before(() => {
    signInRunMember();
    myPostIds().then((ids) => expect(ids, 'the run account starts with no posts').to.have.length(0));
  });

  it('PO-01 an empty profile offers Share your first photo, which opens New post', () => {
    openProfile();
    cy.byTestId('profile-posts-grid-empty').should('contain.text', 'Share Photos');
    cy.byTestId('profile-posts-grid-share-first').should('have.text', 'Share your first photo').click();
    uploadDialog().should('be.visible');
    cy.byTestId('upload-dialog-title').should('have.text', 'New post');
    cy.byTestId('upload-dialog-empty').should('contain.text', 'Pick an image to share.');
    cy.byTestId('upload-dialog-close').click();
    uploadDialog().should('not.exist');
  });

  it('PO-02 /profile?newPost=1 opens the composer and drops the param', () => {
    cy.visitApp('/profile?newPost=1');
    uploadDialog().should('be.visible');
    cy.location('search').should('eq', '');
    cy.byTestId('upload-dialog-close').click();
  });

  it('PO-03 closing the composer discards the picked image and caption', () => {
    openProfile();
    cy.byTestId('profile-header-new-post').click();
    pickPhoto(account.stamp, 'post-discarded');
    cy.byTestId('upload-dialog-caption-input').type('This caption is thrown away');
    cy.byTestId('upload-dialog-close').click();
    uploadDialog().should('not.exist');
    cy.byTestId('profile-header-new-post').click();
    cy.byTestId('upload-dialog-empty').should('contain.text', 'Pick an image to share.');
    cy.byTestId('upload-dialog-preview').should('not.exist');
    cy.byTestId('upload-dialog-caption-input').should('not.exist');
    cy.byTestId('upload-dialog-close').click();
    myPostIds().should('have.length', 0);
  });

  it('PO-04 a photo with a caption is shared and becomes the first tile with 0 likes and 0 comments', () => {
    openProfile();
    cy.byTestId('profile-header-new-post').click();
    pickPhoto(account.stamp, 'post');
    cy.byTestId('upload-dialog-caption-input').type(caption);
    cy.interceptOperation('CreatePost');
    cy.byTestId('upload-dialog-share').should('have.text', 'Share').click();
    cy.wait('@CreatePost').then(({ response }) => {
      postId = String(response?.body?.data?.createPost?.id ?? '');
      expect(postId, 'the server answered with the new post').to.not.equal('');
    });
    uploadDialog().should('not.exist');
    cy.byTestId('profile-page-toast').should('contain.text', 'Post shared.');
    cy.byTestIdPrefix('profile-posts-grid-post-', '-likes').should('have.length', 1);
    cy.then(() => {
      cy.byTestId(`profile-posts-grid-post-${postId}-likes`).should('have.text', '0');
      cy.byTestId(`profile-posts-grid-post-${postId}-comments`).should('have.text', '0');
    });
  });

  it('PO-05 the heart likes and unlikes; a double tap on the image only ever likes', () => {
    openPost();
    likes().should('have.text', '0 likes');
    cy.interceptOperation('TogglePostLike');
    cy.byTestId('post-actions-like').should('have.attr', 'aria-pressed', 'false').click();
    cy.wait('@TogglePostLike');
    cy.byTestId('post-actions-like').should('have.attr', 'aria-pressed', 'true');
    likes().should('have.text', '1 like');
    cy.byTestId('post-actions-like').click();
    cy.wait('@TogglePostLike');
    likes().should('have.text', '0 likes');

    cy.byTestId('post-media').click().click();
    cy.wait('@TogglePostLike');
    likes().should('have.text', '1 like');
    cy.byTestId('post-media').click().click();
    likes().should('have.text', '1 like');
    cy.byTestId('post-actions-like').should('have.attr', 'aria-pressed', 'true').click();
    cy.wait('@TogglePostLike');
    likes().should('have.text', '0 likes');
  });

  it('PO-06 a comment is added with Enter; one over 1000 characters is refused and kept in the box', () => {
    const comment = `${runMarker(account.stamp, 'mweb-comment')} Lovely trail`;
    openPost();
    cy.byTestId('post-comment-list-empty').should('have.text', 'No comments yet. Be the first to comment.');
    cy.byTestId('post-actions-send').should('be.disabled');
    cy.interceptOperation('AddPostComment');
    commentInput().type(`${comment}{enter}`);
    cy.wait('@AddPostComment');
    cy.byTestId('post-comment-list-comments').should('contain.text', comment);
    commentInput().should('have.value', '');

    const tooLong = 'a'.repeat(COMMENT_LIMIT + 1);
    commentInput().type(tooLong, { delay: 0 });
    cy.byTestId('post-actions-send').click();
    cy.wait('@AddPostComment').its('response.body.errors.0.message').should('eq', 'Comment too long (max 1000 chars)');
    commentInput().should('have.value', tooLong);
    deleteCommentButtons().should('have.length', 1);
  });

  it('PO-07 the author deletes a comment and the list is empty again', () => {
    openPost();
    cy.interceptOperation('DeletePostComment');
    deleteCommentButtons().should('have.length', 1).click();
    cy.wait('@DeletePostComment');
    cy.byTestId('post-comment-list-empty').should('be.visible');
  });

  it('PO-08 Share copies the post’s tracked link and says so', () => {
    openPost();
    watchClipboard();
    cy.interceptOperation('ShareLink');
    cy.byTestId('post-dialog-header-share').click();
    cy.location('origin').then((origin) => expectSharedLink(`${origin}/post/${postId}`));
    notice().should('have.text', 'Link copied to clipboard');
  });

  it('PO-09 /post/:id opens the post dialog, and closing it goes back', () => {
    openProfile();
    cy.visitApp(`/post/${postId}`);
    cy.byTestId('post-dialog').should('be.visible');
    cy.byTestId('post-comment-list-caption').should('contain.text', caption);
    cy.byTestId('post-dialog-header-close').click();
    cy.location('pathname').should('eq', '/profile');
  });

  it('PO-10 signed out, /post/:id asks to sign in and opens the post afterwards', () => {
    cy.clearAuth();
    cy.visitApp(`/post/${postId}`);
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=${encodeURIComponent(`/post/${postId}`)}`);
    signInOnLoginPage();
    cy.location('pathname').should('eq', `/post/${postId}`);
    cy.byTestId('post-dialog').should('be.visible');
    signInRunMember();
  });

  it('PO-11 Delete post asks first, removes the post, and its link then reads Post not found', () => {
    openPost();
    cy.byTestId('post-actions-menu-trigger').click();
    cy.byTestId('post-actions-menu-delete').click();
    cy.byTestId('post-dialog-delete-confirm-title').should('have.text', 'Delete this post?');
    cy.byTestId('post-dialog-delete-confirm').should('contain.text', 'This will permanently remove the post and all its comments.');
    cy.interceptOperation('DeletePost');
    cy.byTestId('post-dialog-delete-confirm-confirm').click();
    cy.wait('@DeletePost');
    cy.byTestId('post-dialog').should('not.exist');
    cy.byTestId('profile-posts-grid-empty').should('be.visible');
    cy.visitApp(`/post/${postId}`);
    cy.byTestId('post-dialog-not-found').should('have.text', 'Post not found.');
  });
});
