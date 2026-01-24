import { createJrpc } from "./index.ts";
import type { TJsonRpcMessage, TNotificationHandler, TRequestHandler } from "./jrpc.ts";

type TMessageParseResult = {
  error: Error;
  message: undefined;
} | {
  error: undefined;
  message: unknown;
};

type TWebSocketMessageParser = {
  parse: (args: { data: string | Uint8Array }) => TMessageParseResult;
  format: (args: { message: unknown }) => string | Uint8Array;
};

const createWebSocketJrpc = ({
  socket,

  parser,

  handleRequest,
  handleNotification,

  onConnectionError,
  onRemoteClose
}: {
  socket: WebSocket,

  parser: TWebSocketMessageParser;

  handleRequest: TRequestHandler;
  handleNotification: TNotificationHandler;

  onConnectionError: (args: { error: Error }) => void;
  onRemoteClose: () => void;
}) => {

  let closedByUs = false;
  let connectionError: Error | undefined = undefined;
  socket.binaryType = "arraybuffer";

  let sendQueue: (string | Uint8Array)[] = [];

  const maybeSendNext = () => {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    sendQueue.forEach((data) => {
      socket.send(data);
    });
    sendQueue = [];
  };

  const sendOrQueueRawMessage = ({ data }: { data: string | Uint8Array }) => {
    sendQueue.push(data);
    maybeSendNext();
  };

  const sendMessage = ({ message }: { message: TJsonRpcMessage }) => {
    const encoded = parser.format({ message });
    sendOrQueueRawMessage({ data: encoded });
  };

  const jrpc = createJrpc({
    sendMessage,
    handleRequest,
    handleNotification
  });

  const dataFromMessageEvent = ({ messageEvent }: { messageEvent: MessageEvent }): string | Uint8Array => {
    if (typeof messageEvent.data === "string") {
      return messageEvent.data;
    }

    if (messageEvent.data instanceof ArrayBuffer) {
      return new Uint8Array(messageEvent.data);
    }

    throw Error("unsupported WebSocket data type");
  };

  socket.addEventListener("message", (event) => {

    if (closedByUs) {
      throw Error("WebSocket was closed by us, but received a message from remote");
    }

    const data = dataFromMessageEvent({ messageEvent: event });

    const { error: parseError, message } = parser.parse({ data });
    if (parseError !== undefined) {
      closedByUs = true;
      socket.close();
      onConnectionError({
        error: Error("failed to parse WebSocket message", { cause: parseError })
      });
      return;
    }

    const { error: jrpcError } = jrpc.receivedMessage({ message });
    if (jrpcError !== undefined) {
      closedByUs = true;
      socket.close();
      onConnectionError({
        error: Error("failed to handle JRPC message", { cause: jrpcError })
      });
      return;
    }
  });

  socket.addEventListener("close", () => {
    sendQueue = [];
    jrpc.close();

    if (closedByUs) {
      return;
    }

    if (connectionError !== undefined) {
      return;
    }

    onRemoteClose();
  });

  socket.addEventListener("error", () => {
    if (closedByUs) {
      return;
    }

    const error = Error("WebSocket connection error");
    connectionError = error;

    onConnectionError({ error });
  });

  const close = () => {
    closedByUs = true;
    socket.close();
  };

  const bufferedAmount = () => {
    return socket.bufferedAmount;
  };

  return {
    request: jrpc.request,
    notify: jrpc.notify,

    bufferedAmount,

    close
  };
};

type TWebsocketJrpcHandle = ReturnType<typeof createWebSocketJrpc>;

const createJsonParser = (): TWebSocketMessageParser => {

  const parse: TWebSocketMessageParser["parse"] = ({ data }) => {

    if (typeof data === "string") {
      try {
        const message = JSON.parse(data);
        return {
          error: undefined,
          message
        };
      } catch (err) {
        return {
          error: err as Error,
          message: undefined
        };
      }
    }

    return {
      error: Error("unsupported WebSocket data type"),
      message: undefined
    };
  };

  const format: TWebSocketMessageParser["format"] = ({ message }) => {
    return JSON.stringify(message);
  };

  return {
    parse,
    format
  };
};

export {
  createWebSocketJrpc,
  createJsonParser
};

export type {
  TWebsocketJrpcHandle,
};
