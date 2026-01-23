import { createJrpc } from "../lib/index.ts";

const sideA = createJrpc({
  sendMessage: ({ message }) => {
    // eslint-disable-next-line no-use-before-define
    sideB.receivedMessage({ message });
  },

  handleNotification: ({ method, params }) => {
    console.log("Side A received notification", { method, params });
  },

  handleRequest: async ({ method, params }) => {
    console.log("Side A received request", { method, params });

    return {
      result: "response from side A",
      error: undefined,
    };
  },
});

const sideB = createJrpc({
  sendMessage: ({ message }) => {
    sideA.receivedMessage({ message });
  },

  handleNotification: ({ method, params }) => {
    console.log("Side B received notification", { method, params });
  },

  handleRequest: async ({ method, params }) => {
    console.log("Side B received request", { method, params });

    if (method === "sample-no-response") {
      return {
        result: undefined,
        error: undefined,
      };
    }

    if (method === "sample-error-response") {
      return {
        result: undefined,
        error: {
          code: -32000,
          message: "Sample error from side B",
          data: { detail: "Additional error details" },
        },
      };
    }

    return {
      result: "response from side B",
      error: undefined,
    };
  },
});


sideA.notify({
  method: "notification-from-A",
  params: { info: "Hello from A" },
});

sideB.notify({
  method: "notification-from-B",
  params: { info: "Hello from B" },
});

const { error: requestError01, response: response01 } = await sideA.request({
  method: "request-to-B",
  params: { question: "How are you, B?" },
});

if (requestError01 !== undefined) {
  throw requestError01;
}

console.log("Side A received response:", response01);

const { error: expectedTimeoutError } = await sideA.request({
  method: "sample-no-response",
  params: {},
  timeoutMs: 100,
});

if (expectedTimeoutError === undefined) {
  throw Error("Expected timeout error did not occur");
}

console.log("Side B request timed out as expected:", expectedTimeoutError);

const { error: requestError02, response: response02 } = await sideA.request({
  method: "sample-error-response",
  params: {},
});

if (requestError02 !== undefined) {
  throw requestError02;
}

console.log("Side B received response (expects error):", response02);
