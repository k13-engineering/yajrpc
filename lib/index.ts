import { createJrpc } from "./jrpc.ts";
import { createWebSocketJrpc, createJsonParser } from "./websocket.ts";
import { createRpcRequestsDefinition } from "./definitions/requests.ts";
import { createRpcNotificationsDefinition } from "./definitions/notification.ts";
import { createCombined } from "./definitions/combined.ts";

import type { TObjectParser } from "./definitions/parser.ts";
import type { TWebSocketMessageParser } from "./websocket.ts";
import type {
  TJrpc,
  TJsonRpcMessage,
  TNotificationHandler,
  TNotifyMethod,
  TRequestHandler,
  TRequestResponse,
  TRequestMethod,
  TRequestResult
} from "./jrpc.ts";

export {
  createJrpc,
  createWebSocketJrpc,
  createJsonParser,
  createRpcRequestsDefinition,
  createRpcNotificationsDefinition,
  createCombined
};

export type {
  TObjectParser,
  TWebSocketMessageParser,
  TJrpc,
  TJsonRpcMessage,
  TNotificationHandler,
  TNotifyMethod,
  TRequestHandler,
  TRequestResponse,
  TRequestMethod,
  TRequestResult
};
