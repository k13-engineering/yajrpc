import { type TObjectParser } from "./parser.ts";
import type {
  TJsonRpcParameters,
  TRequestHandler,
  TRequestHandlerResponse,
  TRequestMethod,
  TRequestResponseValue
} from "../types.ts";

type RpcRequestDefinition<TParams = unknown, TResult = unknown> = {
  paramsParser: TObjectParser<TParams>;
  resultParser: TObjectParser<TResult>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RpcRequestsDefinitionMap = Record<string, RpcRequestDefinition<any, any>>;

type ExtractParserType<T> = T extends TObjectParser<infer U> ? U : never;

type ServerHandlers<TMap extends RpcRequestsDefinitionMap> = {
  [K in keyof TMap]: (
    params: ExtractParserType<TMap[K]["paramsParser"]>
  ) => Promise<ExtractParserType<TMap[K]["resultParser"]>>;
};

type ClientMethods<TMap extends RpcRequestsDefinitionMap> = {
  [K in keyof TMap]: (
    params: ExtractParserType<TMap[K]["paramsParser"]>
  ) => Promise<
    | { error: Error; result: undefined }
    | { error: undefined; result: ExtractParserType<TMap[K]["resultParser"]> }
  >;
};

const createRpcRequestsDefinition = <const TMap extends RpcRequestsDefinitionMap>(
  definitions: TMap
) => {
  const createServer = ({
    requests,
    handleUnknownRequest,
    handleParametersParseError
  }: {
    requests: ServerHandlers<TMap>;
    handleUnknownRequest: TRequestHandler;
    handleParametersParseError: (args: {
      method: string;
      params: TJsonRpcParameters | undefined;
      parseError: Error;
    }) => Promise<TRequestHandlerResponse>;
  }) => {
    const handleRequest: TRequestHandler = async ({ method, params }) => {
      const definition = definitions[method];
      if (!definition) {
        return await handleUnknownRequest({ method, params });
      }

      const parseResult = definition.paramsParser.parse({ raw: params });
      if (parseResult.error) {
        return await handleParametersParseError({
          method,
          params,
          parseError: parseResult.error
        });
      }

      const handler = requests[method as keyof TMap];
      const result = await handler(
        parseResult.value as ExtractParserType<TMap[keyof TMap]["paramsParser"]>
      );
      const formattedResult = definition.resultParser.format({ value: result });

      return {
        result: formattedResult as TRequestResponseValue,
        error: undefined
      };
    };

    return {
      handleRequest
    };
  };

  const createClient = ({ request }: { request: TRequestMethod }) => {
    const client = {} as ClientMethods<TMap>;

    for (const method of Object.keys(definitions) as Array<keyof TMap & string>) {
      const definition = definitions[method];
      (client as Record<string, unknown>)[method] = async (params: unknown) => {
        const formattedParams = definition.paramsParser.format({ value: params });
        const { error: requestError, response } = await request({
          method,
          params: formattedParams as Record<string, unknown>
        });
        if (requestError !== undefined) {
          return {
            error: Error("failed to execute request", { cause: requestError }),
            result: undefined
          };
        }
        const { error: parseError, value } = definition.resultParser.parse({
          raw: response.result
        });
        if (parseError !== undefined) {
          return {
            error: Error("failed to parse result", { cause: parseError }),
            result: undefined
          };
        }

        return {
          error: undefined,
          result: value
        };
      };
    }

    return client;
  };

  return {
    createServer,
    createClient
  };
};

type TRpcRequestsDefinition<TMap extends RpcRequestsDefinitionMap> = ReturnType<
  typeof createRpcRequestsDefinition<TMap>
>;

export { createRpcRequestsDefinition };

export type {
  TRpcRequestsDefinition
};
