import { gql } from '@apollo/client';
import type {
  Tutorial,
  TutorialComment,
  TutorialCommentPage,
  TutorialLikeResult,
  TutorialPage,
  TutorialTopic,
  TutorialWatchResult,
  User,
} from '@duncit/gql-types';

/** The Learnings feed (server name: tutorials). Only what the card draws. */
export const LEARNINGS_FEED = gql`
  query MwebLearningsFeed($search: String, $topic: String, $language: TutorialLanguage, $page: Int, $page_size: Int) {
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
      total
      page
      has_more
    }
  }
`;

export const LEARNING_TOPICS = gql`
  query MwebLearningTopics {
    tutorialTopics {
      id
      key
      label
    }
  }
`;

export const LEARNING_COMMENTS = gql`
  query MwebLearningComments($tutorial_id: ID!, $page: Int) {
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
      total
      page
      has_more
    }
  }
`;

export const TOGGLE_LEARNING_LIKE = gql`
  mutation MwebToggleLearningLike($tutorial_id: ID!) {
    toggleTutorialLike(tutorial_id: $tutorial_id) {
      tutorial_id
      liked
      like_count
    }
  }
`;

export const MARK_LEARNING_WATCHED = gql`
  mutation MwebMarkLearningWatched($tutorial_id: ID!) {
    markTutorialWatched(tutorial_id: $tutorial_id) {
      tutorial_id
      watched
    }
  }
`;

export const ADD_LEARNING_COMMENT = gql`
  mutation MwebAddLearningComment($tutorial_id: ID!, $text: String!) {
    addTutorialComment(tutorial_id: $tutorial_id, text: $text) {
      id
    }
  }
`;

export const DELETE_LEARNING_COMMENT = gql`
  mutation MwebDeleteLearningComment($comment_id: ID!) {
    deleteMyTutorialComment(comment_id: $comment_id)
  }
`;

export type LearningCard = Pick<
  Tutorial,
  | 'id'
  | 'title'
  | 'description'
  | 'topic'
  | 'language'
  | 'video_url'
  | 'thumbnail_url'
  | 'duration_sec'
  | 'like_count'
  | 'comment_count'
  | 'liked_by_me'
  | 'watched_by_me'
>;

export interface LearningsFeedData {
  tutorials: Pick<TutorialPage, 'total' | 'page' | 'has_more'> & { rows: LearningCard[] };
}

export type LearningTopic = Pick<TutorialTopic, 'id' | 'key' | 'label'>;
export interface LearningTopicsData {
  tutorialTopics: LearningTopic[];
}

export type LearningComment = Pick<TutorialComment, 'id' | 'text' | 'is_mine' | 'created_at'> & {
  author?: Pick<User, 'user_id' | 'full_name' | 'profile_photo'> | null;
};
export interface LearningCommentsData {
  tutorialComments: Pick<TutorialCommentPage, 'total' | 'page' | 'has_more'> & { rows: LearningComment[] };
}

export interface ToggleLikeData {
  toggleTutorialLike: TutorialLikeResult;
}
export interface MarkWatchedData {
  markTutorialWatched: Pick<TutorialWatchResult, 'tutorial_id' | 'watched'>;
}
