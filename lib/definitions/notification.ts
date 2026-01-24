import { type TObjectParser } from "./parser.ts";
import type {
  TJsonRpcParameters,
  TNotificationHandler,
  TNotifyMethod
} from "../types.ts";

type RpcNotificationDefinition<TParams = unknown> = {
  paramsParser: TObjectParser<TParams>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RpcNotificationsDefinitionMap = Record<string, RpcNotificationDefinition<any>>;

type ExtractParserType<T> = T extends TObjectParser<infer U> ? U : never;

type ServerHandlers<TMap extends RpcNotificationsDefinitionMap> = {
  [K in keyof TMap]: (params: ExtractParserType<TMap[K]["paramsParser"]>) => void;
};

type ClientMethods<TMap extends RpcNotificationsDefinitionMap> = {
  [K in keyof TMap]: (params: ExtractParserType<TMap[K]["paramsParser"]>) => void;
};

const createRpcNotificationsDefinition = <const TMap extends RpcNotificationsDefinitionMap>(
  definitions: TMap
) => {
  const createServer = ({
    notifications,
    handleUnknownNotification,
    handleParametersParseError
  }: {
    notifications: ServerHandlers<TMap>;
    handleUnknownNotification: TNotificationHandler;
    handleParametersParseError: (args: {
      method: string;
      params: TJsonRpcParameters | undefined;
      parseError: Error;
    }) => void;
  }) => {
    const handleNotification: TNotificationHandler = ({ method, params }) => {
      const definition = definitions[method];
      if (!definition) {
        handleUnknownNotification({ method, params });
        return;
      }

      const parseResult = definition.paramsParser.parse({ raw: params });
      if (parseResult.error) {
        handleParametersParseError({
          method,
          params,
          parseError: parseResult.error
        });
        return;
      }

      const handler = notifications[method as keyof TMap];
      handler(parseResult.value as ExtractParserType<TMap[keyof TMap]["paramsParser"]>);
    };

    return {
      handleNotification
    };
  };

  const createClient = ({ notify }: { notify: TNotifyMethod }) => {
    const client = {} as ClientMethods<TMap>;

    for (const method of Object.keys(definitions) as Array<keyof TMap & string>) {
      const definition = definitions[method];
      (client as Record<string, unknown>)[method] = (params: unknown) => {
        const formattedParams = definition.paramsParser.format({ value: params });
        notify({ method, params: formattedParams as Record<string, unknown> });
      };
    }

    return client;
  };

  return {
    createServer,
    createClient
  };
};

type TRpcNotificationsDefinition<TMap extends RpcNotificationsDefinitionMap> = ReturnType<
  typeof createRpcNotificationsDefinition<TMap>
>;

export { createRpcNotificationsDefinition };

export type {
  TRpcNotificationsDefinition
};
