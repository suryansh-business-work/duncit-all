import { gql } from '@apollo/client';
import type { Tutorial, TutorialStats, TutorialTopic } from '@duncit/gql-types';

const TUTORIAL_ROW_FIELDS = gql`
  fragment SupportTutorialRow on Tutorial {
    id
    title
    description
    topic
    language
    video_url
    thumbnail_url
    duration_sec
    status
    sort_order
    view_count
    like_count
    comment_count
    created_at
  }
`;

export const TUTORIALS_TABLE = gql`
  query SupportTutorialsTable($query: TableQueryInput) {
    tutorialsTable(query: $query) {
      total
      rows {
        ...SupportTutorialRow
      }
    }
  }
  ${TUTORIAL_ROW_FIELDS}
`;

const TOPIC_ROW_FIELDS = gql`
  fragment SupportTutorialTopicRow on TutorialTopic {
    id
    key
    label
    sort_order
    is_active
    created_at
  }
`;

export const TUTORIAL_TOPICS = gql`
  query SupportTutorialTopics {
    tutorialTopics(include_inactive: true) {
      ...SupportTutorialTopicRow
    }
  }
  ${TOPIC_ROW_FIELDS}
`;

export const TUTORIAL_TOPICS_TABLE = gql`
  query SupportTutorialTopicsTable($query: TableQueryInput) {
    tutorialTopicsTable(query: $query) {
      total
      rows {
        ...SupportTutorialTopicRow
      }
    }
  }
  ${TOPIC_ROW_FIELDS}
`;

export const TUTORIAL_STATS = gql`
  query SupportTutorialStats {
    tutorialStats {
      total_views
      unique_viewers
      published_tutorials
      total_likes
      total_comments
      top_tutorials {
        tutorial_id
        title
        view_count
        like_count
        comment_count
      }
    }
  }
`;

export const CREATE_TUTORIAL = gql`
  mutation SupportCreateTutorial($input: TutorialInput!) {
    createTutorial(input: $input) {
      id
    }
  }
`;

export const UPDATE_TUTORIAL = gql`
  mutation SupportUpdateTutorial($tutorial_id: ID!, $input: TutorialInput!) {
    updateTutorial(tutorial_id: $tutorial_id, input: $input) {
      id
    }
  }
`;

export const DELETE_TUTORIAL = gql`
  mutation SupportDeleteTutorial($tutorial_id: ID!) {
    deleteTutorial(tutorial_id: $tutorial_id)
  }
`;

export const CREATE_TUTORIAL_TOPIC = gql`
  mutation SupportCreateTutorialTopic($input: TutorialTopicInput!) {
    createTutorialTopic(input: $input) {
      id
    }
  }
`;

export const UPDATE_TUTORIAL_TOPIC = gql`
  mutation SupportUpdateTutorialTopic($topic_id: ID!, $input: TutorialTopicInput!) {
    updateTutorialTopic(topic_id: $topic_id, input: $input) {
      id
    }
  }
`;

export const DELETE_TUTORIAL_TOPIC = gql`
  mutation SupportDeleteTutorialTopic($topic_id: ID!) {
    deleteTutorialTopic(topic_id: $topic_id)
  }
`;

/** The fields the tutorials table selects. */
export type TutorialRow = Omit<Tutorial, 'updated_at' | 'liked_by_me' | 'watched_by_me'>;

/** The fields the topic list and table select. */
export type TutorialTopicRow = Omit<TutorialTopic, 'updated_at'>;

export interface TutorialTopicsData {
  tutorialTopics: TutorialTopicRow[];
}

export interface TutorialStatsData {
  tutorialStats: Omit<TutorialStats, 'total_tutorials'>;
}
