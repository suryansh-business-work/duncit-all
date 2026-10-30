import { gql } from '@/generated/graphql';

/**
 * Tutorials — RN twins of mWeb's pages/tutorials-page/queries. Only the fields
 * the feed, its overlay and the comment sheet draw are selected.
 */
export const MobileTutorialsDocument = gql(`
  query MobileTutorials($search: String, $topic: String, $language: TutorialLanguage, $page: Int, $page_size: Int) {
    tutorials(search: $search, topic: $topic, language: $language, page: $page, page_size: $page_size) {
      rows {
        id
        title
        description
        topic
        language
        video_url
        thumbnail_url
        duration_sec
        like_count
        comment_count
        liked_by_me
        watched_by_me
      }
      page
      has_more
    }
  }
`);

export const MobileTutorialTopicsDocument = gql(`
  query MobileTutorialTopics {
    tutorialTopics {
      id
      key
      label
    }
  }
`);

export const MobileTutorialCommentsDocument = gql(`
  query MobileTutorialComments($tutorial_id: ID!, $page: Int) {
    tutorialComments(tutorial_id: $tutorial_id, page: $page) {
      rows {
        id
        text
        is_mine
        created_at
        author {
          user_id
          full_name
          profile_photo
        }
      }
      page
      has_more
    }
  }
`);

export const MobileToggleTutorialLikeDocument = gql(`
  mutation MobileToggleTutorialLike($tutorial_id: ID!) {
    toggleTutorialLike(tutorial_id: $tutorial_id) {
      tutorial_id
      liked
      like_count
    }
  }
`);

export const MobileAddTutorialCommentDocument = gql(`
  mutation MobileAddTutorialComment($tutorial_id: ID!, $text: String!) {
    addTutorialComment(tutorial_id: $tutorial_id, text: $text) {
      id
      text
      is_mine
      created_at
      author {
        user_id
        full_name
        profile_photo
      }
    }
  }
`);

export const MobileDeleteMyTutorialCommentDocument = gql(`
  mutation MobileDeleteMyTutorialComment($comment_id: ID!) {
    deleteMyTutorialComment(comment_id: $comment_id)
  }
`);

export const MobileMarkTutorialWatchedDocument = gql(`
  mutation MobileMarkTutorialWatched($tutorial_id: ID!) {
    markTutorialWatched(tutorial_id: $tutorial_id) {
      tutorial_id
      watched
    }
  }
`);
