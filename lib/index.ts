import { createJrpc } from "./jrpc.ts";
import { createWebSocketJrpc } from "./websocket.ts";
import { createRpcRequestsDefinition } from "./definitions/requests.ts";
import { createRpcNotificationsDefinition } from "./definitions/notification.ts";
import { createCombined } from "./definitions/combined.ts";

import type { TObjectParser } from "./definitions/parser.ts";

export {
  createJrpc,
  createWebSocketJrpc,
  createRpcRequestsDefinition,
  createRpcNotificationsDefinition,
  createCombined
};

export type {
  TObjectParser
};
