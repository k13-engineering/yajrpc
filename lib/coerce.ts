import type {
  TJsonRpcError,
  TJsonRpcMessage,
  TJsonRpcNotification,
  TJsonRpcOptionalId,
  TJsonRpcParameters,
  TJsonRpcRequest,
  TJsonRpcResponse
} from "./types.ts";

type TCoerceParamsResult = {
  error: Error;
  params: undefined;
} | {
  error: undefined;
  params: TJsonRpcParameters | undefined;
};

const coerceParams = ({ params }: { params: unknown }): TCoerceParamsResult => {
  if (params !== undefined && (typeof params !== "object" || params === null)) {
    return {
      error: Error("invalid params"),
      params: undefined
    };
  }

  return {
    error: undefined,
    params: params as TJsonRpcParameters | undefined
  };
};

type TCoerceErrorResult = {
  error: Error;
  errorField: undefined;
} | {
  error: undefined;
  errorField: TJsonRpcError | undefined;
};

// eslint-disable-next-line complexity
const coerceErrorField = ({ error }: { error: unknown }): TCoerceErrorResult => {
  if (error === undefined) {
    return {
      error: undefined,
      errorField: undefined
    };
  }

  if (typeof error !== "object" || error === null) {
    return {
      error: Error("invalid error field"),
      errorField: undefined
    };
  }

  const errorObj = error as Record<string, unknown>;

  if (typeof errorObj.code !== "number") {
    return {
      error: Error("invalid field type for error.code"),
      errorField: undefined
    };
  }

  if (!Number.isInteger(errorObj.code)) {
    return {
      error: Error("error.code is not an integer"),
      errorField: undefined
    };
  }

  if (typeof errorObj.message !== "string") {
    return {
      error: Error("invalid field type for error.message"),
      errorField: undefined
    };
  }

  return {
    error: undefined,
    errorField: {
      code: errorObj.code,
      message: errorObj.message,
      data: errorObj.data
    }
  };
};

type TCoerceIdResult = {
  error: Error;
  id: undefined;
} | {
  error: undefined;
  id: TJsonRpcOptionalId | undefined;
};

// eslint-disable-next-line complexity
const coerceId = ({ id }: { id: unknown }): TCoerceIdResult => {
  if (id === undefined) {
    return {
      error: undefined,
      id: undefined
    };
  }

  if (id === null) {
    return {
      error: undefined,
      id: null
    };
  }

  if (typeof id === "string" || typeof id === "number") {
    return {
      error: undefined,
      id
    };
  }

  return {
    error: Error("invalid id type"),
    id: undefined
  };
};

const extractJrpcFields = ({ messageObj }: { messageObj: Record<string, unknown> }) => {
  const { jsonrpc, id, method, params, result, error, ...otherFields } = messageObj;

  return {
    jrpcFields: {
      jsonrpc,
      id,
      method,
      params,
      result,
      error,
    },
    otherFields
  };
};

type TCoerceMethodResult = {
  error: Error;
  method: undefined;
} | {
  error: undefined;
  method: string | undefined;
};

const coerceMethod = ({ method }: { method: unknown }): TCoerceMethodResult => {
  if (method === undefined) {
    return {
      error: undefined,
      method: undefined
    };
  }

  if (typeof method !== "string") {
    return {
      error: Error("invalid field type for method"),
      method: undefined
    };
  }

  return {
    error: undefined,
    method
  };
};

type TCoerceJrpcMessageResult = {
  error: Error;
  jrpcMessage: undefined;
} | {
  error: undefined;
  jrpcMessage: TJsonRpcMessage;
};

type TJrpcFields = {
  jsonrpc: string;
  id: TJsonRpcOptionalId | undefined;
  method: string | undefined;
  params: TJsonRpcParameters | undefined;
  result: unknown | undefined;
  error: TJsonRpcError | undefined;
};

type TCoerceJrpcFieldsResult = {
  error: Error;
  jrpcFields: undefined;
} | {
  error: undefined;
  jrpcFields: TJrpcFields;
};

const coerceJrcpFields = ({
  jrpcFields
}: {
  jrpcFields: {
    jsonrpc: unknown;
    id: unknown;
    method: unknown;
    params: unknown;
    result: unknown;
    error: unknown;
  };
  // eslint-disable-next-line complexity
}): TCoerceJrpcFieldsResult => {

  if (typeof jrpcFields.jsonrpc !== "string") {
    return {
      error: Error("invalid field type for jsonrpc"),
      jrpcFields: undefined
    };
  }

  const { error: idError, id } = coerceId({ id: jrpcFields.id });
  if (idError !== undefined) {
    return {
      error: idError,
      jrpcFields: undefined
    };
  }

  const { error: methodError, method } = coerceMethod({ method: jrpcFields.method });
  if (methodError !== undefined) {
    return {
      error: methodError,
      jrpcFields: undefined
    };
  }

  const { error: paramsError, params } = coerceParams({ params: jrpcFields.params });
  if (paramsError !== undefined) {
    return {
      error: paramsError,
      jrpcFields: undefined
    };
  }

  const { error: errorFieldError, errorField } = coerceErrorField({ error: jrpcFields.error });
  if (errorFieldError !== undefined) {
    return {
      error: errorFieldError,
      jrpcFields: undefined
    };
  }

  return {
    error: undefined,
    jrpcFields: {
      jsonrpc: jrpcFields.jsonrpc as "2.0",
      id,
      method,
      params,
      result: jrpcFields.result,
      error: errorField
    }
  };
};

type TCoerceJrcpNotificationResult = {
  error: Error;
  jrpcNotification: undefined;
} | {
  error: undefined;
  jrpcNotification: TJsonRpcNotification;
};

const coerceJrcpNotification = ({
  jrpcFields
}: {
  jrpcFields: TJrpcFields;
  // eslint-disable-next-line complexity
}): TCoerceJrcpNotificationResult => {

  if (jrpcFields.id !== undefined) {
    return {
      error: Error("notification must not have an id"),
      jrpcNotification: undefined
    };
  }

  if (jrpcFields.error !== undefined) {
    return {
      error: Error("notification must not have an error (maybe id is missing and this is not a notification?)"),
      jrpcNotification: undefined
    };
  }

  if (jrpcFields.result !== undefined) {
    return {
      error: Error("notification must not have a result (maybe id is missing and this is not a notification?)"),
      jrpcNotification: undefined
    };
  }

  if (jrpcFields.method === undefined) {
    return {
      error: Error("no method in notification"),
      jrpcNotification: undefined
    };
  }

  return {
    error: undefined,
    jrpcNotification: {
      jsonrpc: "2.0",
      method: jrpcFields.method,
      params: jrpcFields.params,
      id: undefined
    }
  };
};

type TCoerceJrpcRequestResult = {
  error: Error;
  jrpcRequest: undefined;
} | {
  error: undefined;
  jrpcRequest: TJsonRpcRequest;
};

const coerceJrpcRequest = ({
  jrpcFields
}: {
  jrpcFields: TJrpcFields;
  // eslint-disable-next-line complexity
}): TCoerceJrpcRequestResult => {
  if (jrpcFields.id === undefined) {
    return {
      error: Error("request must have an id"),
      jrpcRequest: undefined
    };
  }

  if (jrpcFields.method === undefined) {
    return {
      error: Error("no method in request"),
      jrpcRequest: undefined
    };
  }

  if (jrpcFields.error !== undefined) {
    return {
      error: Error("request must not have an error"),
      jrpcRequest: undefined
    };
  }

  if (jrpcFields.result !== undefined) {
    return {
      error: Error("request must not have a result"),
      jrpcRequest: undefined
    };
  }

  return {
    error: undefined,
    jrpcRequest: {
      jsonrpc: "2.0",
      id: jrpcFields.id,
      method: jrpcFields.method,
      params: jrpcFields.params
    }
  };
};

type TCoerceJrpcResponseResult = {
  error: Error;
  jrpcResponse: undefined;
} | {
  error: undefined;
  jrpcResponse: TJsonRpcResponse;
};

const coerceJrcpResponse = ({
  jrpcFields,
}: {
  jrpcFields: TJrpcFields;
  // eslint-disable-next-line complexity
}): TCoerceJrpcResponseResult => {
  if (jrpcFields.id === undefined || jrpcFields.id === null) {
    return {
      error: Error("response must have an id"),
      jrpcResponse: undefined
    };
  }

  const { error: errorFieldError, errorField } = coerceErrorField({ error: jrpcFields.error });
  if (errorFieldError !== undefined) {
    return {
      error: errorFieldError,
      jrpcResponse: undefined
    };
  }

  if (errorField !== undefined) {

    if (jrpcFields.result !== undefined) {
      return {
        error: Error("both result and error in response"),
        jrpcResponse: undefined
      };
    }

    return {
      error: undefined,
      jrpcResponse: {
        jsonrpc: "2.0",
        id: jrpcFields.id,
        error: errorField
      }
    };
  }

  if (jrpcFields.result === undefined) {
    return {
      error: Error("no result in response"),
      jrpcResponse: undefined
    };
  }

  return {
    error: undefined,
    jrpcResponse: {
      jsonrpc: "2.0",
      id: jrpcFields.id,
      result: jrpcFields.result
    }
  };
};

// eslint-disable-next-line max-statements, complexity
const coerceJrpcMessage = ({ message }: { message: unknown }): TCoerceJrpcMessageResult => {
  if (typeof message !== "object" || message === null) {
    return {
      error: Error("invalid message"),
      jrpcMessage: undefined
    };
  }

  const messageObj = message as Record<string, unknown>;

  const { jrpcFields, otherFields } = extractJrpcFields({ messageObj });
  if (jrpcFields.jsonrpc !== "2.0") {
    return {
      error: Error("invalid jsonrpc version"),
      jrpcMessage: undefined
    };
  }

  const keysOfOtherFields = Object.keys(otherFields);

  if (keysOfOtherFields.length > 0) {
    return {
      error: Error(`unexpected field "${keysOfOtherFields[0]}" in message`),
      jrpcMessage: undefined
    };
  }

  const { error: jrpcFieldsError, jrpcFields: coercedJrpcFields } = coerceJrcpFields({ jrpcFields });
  if (jrpcFieldsError !== undefined) {
    return {
      error: jrpcFieldsError,
      jrpcMessage: undefined
    };
  }

  const { jsonrpc, id, method } = coercedJrpcFields;

  if (jsonrpc !== "2.0") {
    return {
      error: Error("invalid jsonrpc version"),
      jrpcMessage: undefined
    };
  }

  if (id === undefined) {
    const { error: notificationError, jrpcNotification } = coerceJrcpNotification({ jrpcFields: coercedJrpcFields });
    if (notificationError !== undefined) {
      return {
        error: notificationError,
        jrpcMessage: undefined
      };
    }

    return {
      error: undefined,
      jrpcMessage: jrpcNotification
    };
  } else {
    if (method === undefined) {
      const { error: responseError, jrpcResponse } = coerceJrcpResponse({ jrpcFields: coercedJrpcFields });
      if (responseError !== undefined) {
        return {
          error: responseError,
          jrpcMessage: undefined
        };
      }

      return {
        error: undefined,
        jrpcMessage: jrpcResponse
      };
    }

    const { error: requestError, jrpcRequest } = coerceJrpcRequest({ jrpcFields: coercedJrpcFields });
    if (requestError !== undefined) {
      return {
        error: requestError,
        jrpcMessage: undefined
      };
    }

    return {
      error: undefined,
      jrpcMessage: jrpcRequest
    };
  }
};

export {
  coerceParams,
  coerceErrorField,
  coerceId,
  coerceMethod,
  coerceJrcpFields,
  coerceJrcpNotification,
  coerceJrpcMessage
};
