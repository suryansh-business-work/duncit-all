/**
 * Turns an introspected schema into a request the server will actually accept.
 *
 * Two halves, both driven entirely by the schema so a new field is swept the
 * day it is added and nothing here has to be edited:
 *
 *  - `argumentsFor` supplies a value for every REQUIRED argument and omits
 *    every optional one. A required argument left out is rejected at
 *    validation, and a resolver that never runs covers nothing; an optional one
 *    guessed wrong is a coercion error for no gain.
 *  - `selectionFor` picks the leaves of an object result. A selection set is
 *    mandatory on an object type, so a field with nothing pickable falls back
 *    to `__typename`, which every type answers.
 */
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  isEnumType,
  isInputObjectType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  type GraphQLArgument,
  type GraphQLInputType,
  type GraphQLOutputType,
} from 'graphql';

/** A 24-hex string is a valid ID, a valid String, and a valid ObjectId — one
 * literal that satisfies every id-shaped argument in the schema. */
export const OBJECT_ID = '000000000000000000000001';

const literal = (value: unknown): string => JSON.stringify(value);

const scalarValue = (type: GraphQLScalarType): string => {
  if (type.name === 'Int') return '1';
  if (type.name === 'Float') return '1';
  if (type.name === 'Boolean') return 'true';
  return literal(OBJECT_ID);
};

const enumValue = (type: GraphQLEnumType): string => {
  const [first] = type.getValues();
  return first ? first.name : 'null';
};

/**
 * A literal for one input type. Only required input fields are filled, for the
 * same reason only required arguments are: an optional field guessed wrong
 * fails coercion, and a missing one costs nothing.
 *
 * `depth` stops a self-referencing input (a filter that nests filters) from
 * recursing forever.
 */
export function inputValue(type: GraphQLInputType, depth = 0): string {
  if (isNonNullType(type)) return inputValue((type as GraphQLNonNull<GraphQLInputType>).ofType, depth);
  if (isListType(type)) {
    const inner = (type as GraphQLList<GraphQLInputType>).ofType;
    return depth > 3 ? '[]' : `[${inputValue(inner, depth + 1)}]`;
  }
  if (isScalarType(type)) return scalarValue(type);
  if (isEnumType(type)) return enumValue(type);
  if (isInputObjectType(type)) {
    if (depth > 3) return '{}';
    const fields = Object.values((type as GraphQLInputObjectType).getFields());
    const required = fields.filter((field) => isNonNullType(field.type) && field.defaultValue === undefined);
    const body = required
      .map((field) => `${field.name}: ${inputValue(field.type, depth + 1)}`)
      .join(', ');
    return `{${body}}`;
  }
  return 'null';
}

/** `(a: 1, b: "x")`, or an empty string when the field takes nothing required. */
export function argumentsFor(args: readonly GraphQLArgument[]): string {
  const required = args.filter((arg) => isNonNullType(arg.type) && arg.defaultValue === undefined);
  if (required.length === 0) return '';
  return `(${required.map((arg) => `${arg.name}: ${inputValue(arg.type)}`).join(', ')})`;
}

const namedOutput = (type: GraphQLOutputType): GraphQLOutputType => {
  if (isNonNullType(type)) return namedOutput((type as GraphQLNonNull<GraphQLOutputType>).ofType);
  if (isListType(type)) return namedOutput((type as GraphQLList<GraphQLOutputType>).ofType);
  return type;
};

/**
 * The selection set for one field's result — the scalar and enum leaves, plus
 * one level into object fields so a wrapper like `{ rows { … } total }` is not
 * swept as `__typename` alone.
 */
export function selectionFor(type: GraphQLOutputType, depth = 0): string {
  const named = namedOutput(type);
  if (isLeafType(named)) return '';
  if (!isObjectType(named)) return ' { __typename }';

  const fields = Object.values((named as GraphQLObjectType).getFields()).filter(
    (field) => field.args.every((arg) => !isNonNullType(arg.type) || arg.defaultValue !== undefined)
  );

  const leaves = fields.filter((field) => isLeafType(namedOutput(field.type))).map((field) => field.name);
  const nested =
    depth >= 2
      ? []
      : fields
          .filter((field) => !isLeafType(namedOutput(field.type)))
          .slice(0, 4)
          .map((field) => `${field.name}${selectionFor(field.type, depth + 1)}`);

  const picked = [...leaves, ...nested];
  return picked.length > 0 ? ` { ${picked.join(' ')} }` : ' { __typename }';
}
