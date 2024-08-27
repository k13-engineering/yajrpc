type TJsonRpcRequest = {
    jsonrpc: "2.0";
    method: string;
    params?: Array<any> | Record<string, any>;
    id?: string | number | null;
};

type TJsonRpcParameterValue = string | number | boolean | object | null;
type TRequestResponseValue = string | number | boolean | object;

type TJsonRpcParameters = Array<TJsonRpcParameterValue> | Record<string, TJsonRpcParameterValue>;

type TJsonRpcOptionalId = string | number | null;
type TJsonRpcMandatoryId = string | number;

type TJsonRpcNotification = {
    jsonrpc: "2.0";
    method: string;
    params?: TJsonRpcParameters;
    id?: undefined;
};

type TJsonRpcSuccessResponse = {
    jsonrpc: "2.0";
    result: TRequestResponseValue;
    error?: undefined;
    id: TJsonRpcMandatoryId;
};

type TJsonRpcErrorResponse = {
    jsonrpc: "2.0";
    error: {
        code: number;
        message: string;
        data?: any;
    };
    result?: undefined;
    id: TJsonRpcOptionalId;
};

type TJsonRpcMessage = TJsonRpcRequest | TJsonRpcNotification | TJsonRpcSuccessResponse | TJsonRpcErrorResponse;


type TRequestSuccessResponse = {
    result: TRequestResponseValue;
    error?: never;
    ignore?: never;
};

type TRequestErrorResponse = {
    result?: never;
    error: {
        code: number;
        message: string;
        data?: any;
    };
    ignore?: never;
};

type TRequestResponse = TRequestSuccessResponse | TRequestErrorResponse;

type TRequestNoResponse = {
    result?: never;
    error?: never;
    ignore: true;
};

type TRequestMaybeResponse = TRequestSuccessResponse | TRequestErrorResponse | TRequestNoResponse;

type TRequestSuccessResult = {
    response: TRequestResponse;
    error?: undefined;
};

type TRequestErrorResult = {
    response?: undefined;
    error: Error
};

type TRequestResult = TRequestSuccessResult | TRequestErrorResult;

type TPendingRequestHandle = {
    resolve: (args: TRequestResult) => void;
};

type TRequestHandler = (args: { method: string, params: TJsonRpcParameters }) => Promise<TRequestMaybeResponse>;
type TNotificationHandler = (args: { method: string, params: TJsonRpcParameters }) => void;

type TNotifyMethod = (args: { method: string, params: TJsonRpcParameters }) => void;
type TRequestMethod = (args: { method: string, params: TJsonRpcParameters, timeoutMs?: number }) => Promise<TRequestResult>;

const create = ({
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
        params: TJsonRpcParameters
    }) : { error: Error | undefined } => {

        handleRequest({ method, params }).then((response) => {

            if (response.error !== undefined) {
                sendMessage({
                    message: {
                        jsonrpc: "2.0",
                        id,
                        error: response.error
                    }
                });
            } else if (response.result !== undefined) {
                sendMessage({
                    message: {
                        jsonrpc: "2.0",
                        result: response.result,
                        id
                    }
                });
            } else {
                // send nothing if we neither have a result nor an error
                // this is a valid case
            }
        });

        return {
            error: undefined
        };
    };

    const receivedNotification = ({
        method,
        params
    }: {
        method: string,
        params: TJsonRpcParameters
    }): { error: Error | undefined } => {

        handleNotification({ method, params });

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

    const receivedMessage = ({ message }: { message: any }): { error: Error | undefined } => {
        if (closed) {
            throw Error("connection closed");
        }

        if (typeof message !== "object") {
            return {
                error: Error("invalid message")
            };
        }

        const { jsonrpc, id, method, params, result, error, ...otherFields } = message;

        if (jsonrpc !== "2.0") {
            return {
                error: Error("invalid jsonrpc version")
            };
        }

        const keysOfOtherFields = Object.keys(otherFields);

        if (keysOfOtherFields.length > 0) {
            return {
                error: Error(`unexpected field "${keysOfOtherFields[0]}" in message`)
            };
        }

        if (id === undefined || id === null) {
            if (error !== undefined) {
                return {
                    error: Error("remote end gave an error without id")
                };
            } else {

                if (result !== undefined) {
                    return {
                        error: Error("remote end gave a result without id")
                    };
                }

                return receivedNotification({
                    method,
                    params
                });
            }
        } else {
            if (error !== undefined) {

                if (result !== undefined) {
                    return {
                        error: Error("both result and error in response")
                    };
                }

                return receivedResponse({
                    id,
                    response: {
                        result: undefined,
                        error
                    }
                });
            } else {
                if (result !== undefined) {
                    return receivedResponse({
                        id,
                        response: {
                            result,
                            error: undefined
                        }
                    });
                } else {
                    return receivedRequest({
                        id,
                        method,
                        params
                    });
                }
            }
        }
    };

    const close = () => {
        if (closed) {
            throw Error("connection already closed");
        }

        Object.keys(pendingRequests).forEach((id) => {
            const pendingRequest = pendingRequests[id];
            pendingRequest.resolve({
                error: Error("connection closed")
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

        let timeoutHandle: any = undefined;
        if (timeoutMs !== undefined) {
            timeoutHandle = setTimeout(() => {
                const pendingRequest = pendingRequests[requestId];
                pendingRequest.resolve({
                    error: Error("timeout")
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
                        const { [requestId]: request, ...otherPendingRequests } = pendingRequests;
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

type TJrpc = ReturnType<typeof create>;

export {
    create
};

export type {
    TJsonRpcMessage,
    TJsonRpcRequest,
    TJsonRpcNotification,
    TJsonRpcSuccessResponse,
    TJsonRpcErrorResponse,
    TRequestResponse,
    TRequestSuccessResponse,
    TRequestErrorResponse,
    TRequestNoResponse,
    TRequestMaybeResponse,
    TRequestSuccessResult,
    TRequestErrorResult,
    TRequestResult,
    TJrpc,
    TRequestHandler,
    TNotificationHandler,
    TRequestMethod,
    TNotifyMethod
};
