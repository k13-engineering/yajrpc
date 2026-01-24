type TObjectParseResult<T> = {
  error: Error;
  value: undefined;
} | {
  error: undefined;
  value: T;
};

type TObjectParser<T> = {
  parse: ({ raw }: { raw: unknown }) => TObjectParseResult<T>;
  format: ({ value }: { value: T }) => unknown;
};

export type {
  TObjectParser,
  TObjectParseResult
};
