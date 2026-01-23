import { coerceJrpcMessage } from "./coerce.ts";
import type { TJsonRpcError, TJsonRpcMandatoryId, TJsonRpcMessage, TJsonRpcParameters, TRequestResponse, TRequestResponseValue, TRequestResult } from "./types.ts";

type TPendingRequestHandle = {
  resolve: (args: TRequestResult) => void;
};

type TRequestHandlerResponse = {
  result: TRequestResponseValue;
  error: undefined;
} | {
  result: undefined;
  error: TJsonRpcError;
} | {
  result: undefined;
  error: undefined;
};

type TRequestHandler = (args: { method: string, params: TJsonRpcParameters | undefined }) => Promise<TRequestHandlerResponse>;
type TNotificationHandler = (args: { method: string, params: TJsonRpcParameters | undefined }) => void;

type TNotifyMethod = (args: { method: string, params: TJsonRpcParameters }) => void;
type TRequestMethod = (args: { method: string, params: TJsonRpcParameters, timeoutMs?: number }) => Promise<TRequestResult>;

const createJrpc = ({
  sendMessage,
  handleRequest,
  handleNotification
}: {
  sendMessage: (args: { message: TJsonRpcMessage }) => void;
  handleRequest: TRequestHandler;
  handleNotification: TNotificationHandler;
}) => {

  let closed = false;

  const receivedRequest = ({
    id,
    method,
    params
  }: {
    id: TJsonRpcMandatoryId,
    method: string,
    params: TJsonRpcParameters | undefined
  }): { error: Error | undefined } => {

    handleRequest({ method, params }).then((response) => {

      if (response.error !== undefined) {
        sendMessage({
          message: {
            jsonrpc: "2.0",
            id,
            error: response.error
          }
        });
        return;
      }

      if (response.result !== undefined) {
        sendMessage({
          message: {
            jsonrpc: "2.0",
            result: response.result,
            id
          }
        });
        return;
      }

      // send nothing if we neither have a result nor an error
      // this is a valid case
    });

    return {
      error: undefined
    };
  };

  let pendingRequests: Record<string, TPendingRequestHandle> = {};

  const receivedResponse = ({ id, response }: { id: TJsonRpcMandatoryId, response: TRequestResponse }): { error: Error | undefined } => {
    const pendingRequest = pendingRequests[id];
    if (pendingRequest === undefined) {
      return {
        error: Error("received response for non-pending id")
      };
    }

    pendingRequest.resolve({
      response,
      error: undefined
    });

    return {
      error: undefined
    };
  };

  // eslint-disable-next-line complexity
  const receivedMessage = ({ message }: { message: unknown }): { error: Error | undefined } => {
    if (closed) {
      throw Error("connection closed");
    }

    const { error: coerceError, jrpcMessage } = coerceJrpcMessage({ message });
    if (coerceError !== undefined) {
      return {
        error: coerceError
      };
    }

    if (jrpcMessage.id === null) {
      return {
        error: Error("this library does not support null ids")
      };
    }

    if (jrpcMessage.id === undefined) {
      handleNotification({
        method: jrpcMessage.method,
        params: jrpcMessage.params
      });

      return { error: undefined };
    }

    if (jrpcMessage.result !== undefined) {
      return receivedResponse({
        id: jrpcMessage.id,
        response: {
          result: jrpcMessage.result,
          error: undefined
        }
      });
    }

    if (jrpcMessage.error !== undefined) {
      return receivedResponse({
        id: jrpcMessage.id,
        response: {
          result: undefined,
          error: jrpcMessage.error
        }
      });
    }

    return receivedRequest({
      id: jrpcMessage.id,
      method: jrpcMessage.method,
      params: jrpcMessage.params
    });
  };

  const close = () => {
    if (closed) {
      throw Error("connection already closed");
    }

    Object.keys(pendingRequests).forEach((id) => {
      const pendingRequest = pendingRequests[id];
      pendingRequest.resolve({
        error: Error("connection closed"),
        response: undefined
      });
    });

    closed = true;
  };

  let requestIdCounter = 0;

  const request: TRequestMethod = ({
    method,
    params,
    timeoutMs
  }): Promise<TRequestResult> => {

    const requestId = requestIdCounter;
    requestIdCounter += 1;

    let timeoutHandle: NodeJS.Timeout | undefined = undefined;
    if (timeoutMs !== undefined) {
      timeoutHandle = setTimeout(() => {
        const pendingRequest = pendingRequests[requestId];
        pendingRequest.resolve({
          error: Error("timeout"),
          response: undefined
        });
      }, timeoutMs);
    }

    sendMessage({
      message: {
        jsonrpc: "2.0",
        method,
        params,
        id: requestId
      }
    });

    return new Promise((resolve) => {
      pendingRequests = {
        ...pendingRequests,
        [requestId]: {
          resolve: (result) => {
            // remove the request from the pending requests
            const { [requestId]: requestToDrop, ...otherPendingRequests } = pendingRequests;
            pendingRequests = otherPendingRequests;

            // clear the timeout
            clearTimeout(timeoutHandle);

            resolve(result);
          },
          timeoutHandle
        }
      };
    });
  };

  const notify: TNotifyMethod = ({ method, params }) => {
    sendMessage({
      message: {
        jsonrpc: "2.0",
        method,
        params
      }
    });
  };

  return {
    receivedMessage,
    request,
    notify,
    close
  };
};

type TJrpc = ReturnType<typeof createJrpc>;

export {
  createJrpc
};

export type {
  TJsonRpcMessage,
  TRequestResponse,
  TRequestResult,
  TJrpc,
  TRequestHandler,
  TNotificationHandler,
  TRequestMethod,
  TNotifyMethod
};
