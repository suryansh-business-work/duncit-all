import { commonTypeDefs } from './typeDefs.common';
import { publicTypeDefs } from './typeDefs.public';
import { adminTypeDefs } from './typeDefs.admin';

/** The whole Lite schema, in the order the extensions need their bases. */
export const typeDefs = [commonTypeDefs, publicTypeDefs, adminTypeDefs];
