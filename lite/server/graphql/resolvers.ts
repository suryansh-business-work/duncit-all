import { adminResolvers } from './resolvers.admin';
import { publicResolvers } from './resolvers.public';

export const resolvers = {
  Query: { ...publicResolvers.Query, ...adminResolvers.Query },
  Mutation: { ...publicResolvers.Mutation, ...adminResolvers.Mutation },
};
