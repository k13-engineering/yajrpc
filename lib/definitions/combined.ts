import type {
  TNotifyMethod,
  TRequestMethod
} from "../types.ts";
import type { TRpcNotificationsDefinition } from "./notification.ts";
import type { TRpcRequestsDefinition } from "./requests.ts";

const createCombined = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSideARequests extends TRpcRequestsDefinition<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSideANotifications extends TRpcNotificationsDefinition<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSideBRequests extends TRpcRequestsDefinition<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSideBNotifications extends TRpcNotificationsDefinition<any>>({
    sideADefinitions,
    sideBDefinitions
  }: {
    sideADefinitions: {
      requests: TSideARequests;
      notifications: TSideANotifications;
    },
    sideBDefinitions: {
      requests: TSideBRequests;
      notifications: TSideBNotifications;
    }
  }) => {

  const sideA = ({
    incomingRequests,
    incomingNotifications,

    outgoingRequest,
    outgoingNotify
  }: {
    incomingRequests: Parameters<TSideARequests["createServer"]>[0];
    incomingNotifications: Parameters<TSideANotifications["createServer"]>[0];

    outgoingRequest: TRequestMethod;
    outgoingNotify: TNotifyMethod;
  }) => {
    const { handleRequest } = sideADefinitions.requests.createServer(incomingRequests);
    const { handleNotification } = sideADefinitions.notifications.createServer(incomingNotifications);

    const outgoingRequests = sideBDefinitions.requests.createClient({
      request: outgoingRequest
    });

    const outgoingNotifications = sideBDefinitions.notifications.createClient({
      notify: outgoingNotify
    });

    return {
      outgoingRequests: outgoingRequests as ReturnType<TSideBRequests["createClient"]>,
      outgoingNotifications: outgoingNotifications as ReturnType<TSideBNotifications["createClient"]>,

      handleIncomingRequest: handleRequest,
      handleIncomingNotification: handleNotification
    };
  };

  const sideB = ({
    incomingRequests,
    incomingNotifications,

    outgoingRequest,
    outgoingNotify
  }: {
    incomingRequests: Parameters<TSideBRequests["createServer"]>[0];
    incomingNotifications: Parameters<TSideBNotifications["createServer"]>[0];

    outgoingRequest: TRequestMethod
    outgoingNotify: TNotifyMethod;
  }) => {
    const { handleRequest } = sideBDefinitions.requests.createServer(incomingRequests);
    const { handleNotification } = sideBDefinitions.notifications.createServer(incomingNotifications);

    const outgoingRequests = sideADefinitions.requests.createClient({
      request: outgoingRequest
    });

    const outgoingNotifications = sideADefinitions.notifications.createClient({
      notify: outgoingNotify
    });

    return {
      outgoingRequests: outgoingRequests as ReturnType<TSideARequests["createClient"]>,
      outgoingNotifications: outgoingNotifications as ReturnType<TSideANotifications["createClient"]>,

      handleIncomingRequest: handleRequest,
      handleIncomingNotification: handleNotification
    };
  };

  return {
    sideA,
    sideB
  };
};

export { createCombined };
