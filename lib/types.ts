/* c8 ignore start */
type TJsonRpcParameterValue = Exclude<unknown, undefined>;
type TRequestResponseValue = NonNullable<unknown> | null;

type TJsonRpcParameters = Array<TJsonRpcParameterValue> | Record<string, TJsonRpcParameterValue>;

type TJsonRpcOptionalId = string | number | null;
type TJsonRpcMandatoryId = string | number;

type TJsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

type TJsonRpcRequest = {
  jsonrpc: "2.0";
  id: TJsonRpcOptionalId;
  method: string;
  params?: TJsonRpcParameters;
  result?: undefined;
  error?: undefined;
};

type TJsonRpcNotification = {
  jsonrpc: "2.0";
  id?: undefined;
  method: string;
  params?: TJsonRpcParameters;
  result?: undefined;
  error?: undefined;
};

type TJsonRpcSuccessResponse = {
  jsonrpc: "2.0";
  id: TJsonRpcMandatoryId;
  method?: undefined;
  params?: undefined;
  result: TRequestResponseValue;
  error?: undefined;
};

type TJsonRpcErrorResponse = {
  jsonrpc: "2.0";
  id: TJsonRpcOptionalId;
  method?: undefined;
  params?: undefined;
  result?: undefined;
  error: TJsonRpcError;
};

type TJsonRpcResponse = TJsonRpcSuccessResponse | TJsonRpcErrorResponse;

type TJsonRpcMessage = TJsonRpcRequest | TJsonRpcNotification | TJsonRpcResponse;

type TRequestErrorResponse = {
  result?: never;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
  ignore?: never;
};

type TRequestResponse = {
  error: TJsonRpcError;
  result: undefined;
} | {
  error: undefined;
  result: TRequestResponseValue;
};

type TRequestResult = {
  error: Error;
  response: undefined;
} | {
  error: undefined;
  response: TRequestResponse;
};


// -----------

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

export type {
  TJsonRpcRequest,
  TJsonRpcResponse,
  TJsonRpcNotification,
  TJsonRpcSuccessResponse,
  TJsonRpcErrorResponse,
  TJsonRpcMessage,
  TJsonRpcParameters,
  TJsonRpcOptionalId,
  TJsonRpcMandatoryId,
  TRequestResponse,
  TRequestResult,
  TRequestErrorResponse,
  TRequestResponseValue,
  TJsonRpcError,

  // -------

  TRequestHandlerResponse,
  TRequestHandler,
  TNotificationHandler,
  TNotifyMethod,
  TRequestMethod
};
/* c8 ignore end */
