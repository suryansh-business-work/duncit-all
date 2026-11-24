import { describe, expect, it } from 'vitest';
import {
  AI_MODEL_ID,
  FOLDER_PATH,
  GIT_BRANCH,
  GITHUB_NAME,
  MONGO_COLLECTION,
  MONGO_DATABASE,
  MONGO_URI,
  DB_HOST,
  isAiModelId,
  isFolderPath,
  isGitBranch,
  isGithubName,
  isMongoCollection,
  isMongoDatabase,
  isMongoUri,
  isDbHost,
} from '../regex.mjs';

/** The Duncit Intel console's form patterns (Media Manager folders and connector settings). */

describe('FOLDER_PATH / isFolderPath', () => {
  it('accepts the root and nested folders of letters, digits, spaces, dots, dashes and underscores', () => {
    for (const path of ['/', '/Reports', '/Reports/2026 Q1', '/a_b/c-d/e.f']) {
      expect(isFolderPath(path)).toBe(true);
      expect(FOLDER_PATH.test(path)).toBe(true);
    }
  });

  it('refuses relative paths, empty segments, trailing slashes and other characters', () => {
    for (const path of ['', 'Reports', '/a//b', '/a/', '/a/../b?', '/a|b', '/a\b']) expect(isFolderPath(path)).toBe(false);
  });

  it('allows eight levels and a 60-character segment, but not nine levels or 61 characters', () => {
    expect(isFolderPath(`/${Array.from({ length: 8 }, () => 'x').join('/')}`)).toBe(true);
    expect(isFolderPath(`/${Array.from({ length: 9 }, () => 'x').join('/')}`)).toBe(false);
    expect(isFolderPath(`/${'x'.repeat(60)}`)).toBe(true);
    expect(isFolderPath(`/${'x'.repeat(61)}`)).toBe(false);
  });
});

describe('AI_MODEL_ID / isAiModelId', () => {
  it('accepts provider model ids', () => {
    for (const id of ['gpt-4o', 'gpt-4o-mini', 'text-embedding-3-small', 'ft:gpt-4o:duncit', 'o4.mini_v2']) expect(isAiModelId(id)).toBe(true);
  });
  it('refuses spaces, slashes, empty and over-long ids', () => {
    for (const id of ['', 'gpt 4o', 'gpt/4o', 'x'.repeat(81)]) expect(AI_MODEL_ID.test(id)).toBe(false);
  });
});

describe('GITHUB_NAME / isGithubName and GIT_BRANCH / isGitBranch', () => {
  it('accepts owners, repositories and branches', () => {
    for (const name of ['duncit-all', 'suryansh-business-work', 'repo.js', 'a_b']) expect(isGithubName(name)).toBe(true);
    for (const branch of ['staging', 'main', 'feature/intel-chat', 'release/1.86.x']) expect(isGitBranch(branch)).toBe(true);
  });
  it('refuses slashes in names and spaces or shell characters in branches', () => {
    for (const name of ['', 'owner/repo', 'my repo', 'x'.repeat(101)]) expect(GITHUB_NAME.test(name)).toBe(false);
    for (const branch of ['', 'my branch', 'main;rm', 'x'.repeat(201)]) expect(GIT_BRANCH.test(branch)).toBe(false);
  });
});

describe('MONGO_COLLECTION / isMongoCollection and MONGO_DATABASE / isMongoDatabase', () => {
  it('accepts ordinary collection and database names', () => {
    for (const name of ['pods', 'intel_documents', 'app.settings', 'pod-drafts']) expect(isMongoCollection(name)).toBe(true);
    for (const name of ['duncit', 'duncit_staging', 'db-1']) expect(isMongoDatabase(name)).toBe(true);
  });
  it('refuses system collections, dollar signs, spaces and empty names', () => {
    for (const name of ['', 'system.users', 'system.profile', 'a$b', 'my coll', 'x'.repeat(121)]) expect(MONGO_COLLECTION.test(name)).toBe(false);
    for (const name of ['', 'my.db', 'db name', 'x'.repeat(65)]) expect(MONGO_DATABASE.test(name)).toBe(false);
  });
});

describe('MONGO_URI / isMongoUri and DB_HOST / isDbHost', () => {
  it('accepts Atlas SRV and standard connection strings', () => {
    for (const uri of ['mongodb+srv://intel:pw@cluster0.ab1cd.mongodb.net/', 'mongodb://user:p%40ss@db.example.com:27017/?authSource=admin', 'mongodb://duncit-mongo:27017']) expect(isMongoUri(uri)).toBe(true);
  });
  it('refuses other schemes, whitespace, a bare scheme and over-long strings', () => {
    for (const uri of ['', 'mongodb://', 'mongodb+srv://a', 'postgres://u:p@h/db', 'https://cluster0.mongodb.net', 'mongodb://user:pass @host', `mongodb://${'x'.repeat(2001)}`]) expect(MONGO_URI.test(uri)).toBe(false);
  });
  it('accepts DNS names, Docker service names and IPv4 hosts', () => {
    for (const host of ['db.example.com', 'duncit-mongo', 'localhost', '10.0.0.12']) expect(isDbHost(host)).toBe(true);
  });
  it('refuses ports, schemes, paths, spaces and over-long hosts', () => {
    for (const host of ['', 'db.example.com:27017', 'mongodb://db', 'db/x', 'my host', 'x'.repeat(254)]) expect(DB_HOST.test(host)).toBe(false);
  });
});
