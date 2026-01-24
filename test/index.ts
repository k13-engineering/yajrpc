import assert from "node:assert";
import { describe, it } from "mocha";
import { createJrpc } from "../lib/index.ts";
import type { TJsonRpcMessage, TRequestHandler, TNotificationHandler } from "../lib/jrpc.ts";

describe("createJrpc", () => {
  describe("request/response - success", () => {
    it("should handle successful response", async () => {
      const sentMessages: TJsonRpcMessage[] = [];

      const client = createJrpc({
        sendMessage: ({ message }) => {
          sentMessages.push(message);
          // Simulate server response
          setTimeout(() => {
            client.receivedMessage({
              message: {
                jsonrpc: "2.0",
                id: 0,
                result: { success: true, data: "test result" }
              }
            });
          }, 10);
        },
        handleRequest: async () => ({ result: undefined, error: undefined }),
        handleNotification: () => {}
      });

      const result = await client.request({
        method: "testMethod",
        params: { foo: "bar" }
      });

      assert.strictEqual(result.error, undefined);
      assert.notStrictEqual(result.response, undefined);
      assert.deepStrictEqual(result.response?.result, { success: true, data: "test result" });
      assert.strictEqual(sentMessages.length, 1);
      assert.strictEqual(sentMessages[0].method, "testMethod");
    });

    it("should handle multiple concurrent requests", async () => {
      const sentMessages: TJsonRpcMessage[] = [];

      const client = createJrpc({
        sendMessage: ({ message }) => {
          sentMessages.push(message);
          // Simulate server responses with different delays
          const id = message.id;
          setTimeout(() => {
            client.receivedMessage({
              message: {
                jsonrpc: "2.0",
                id,
                result: `result-${id}`
              }
            });
          }, Math.random() * 50);
        },
        handleRequest: async () => ({ result: undefined, error: undefined }),
        handleNotification: () => {}
      });

      const [result1, result2, result3] = await Promise.all([
        client.request({ method: "method1", params: {} }),
        client.request({ method: "method2", params: {} }),
        client.request({ method: "method3", params: {} })
      ]);

      assert.strictEqual(result1.error, undefined);
      assert.strictEqual(result1.response?.result, "result-0");
      assert.strictEqual(result2.error, undefined);
      assert.strictEqual(result2.response?.result, "result-1");
      assert.strictEqual(result3.error, undefined);
      assert.strictEqual(result3.response?.result, "result-2");
    });
  });

  describe("request/response - error", () => {
    it("should handle error response", async () => {
      const client = createJrpc({
        sendMessage: ({ message }) => {
          // Simulate server error response
          setTimeout(() => {
            client.receivedMessage({
              message: {
                jsonrpc: "2.0",
                id: message.id,
                error: {
                  code: -32600,
                  message: "Invalid Request",
                  data: { details: "something went wrong" }
                }
              }
            });
          }, 10);
        },
        handleRequest: async () => ({ result: undefined, error: undefined }),
        handleNotification: () => {}
      });

      const result = await client.request({
        method: "failingMethod",
        params: { test: true }
      });

      assert.strictEqual(result.error, undefined);
      assert.notStrictEqual(result.response, undefined);
      assert.strictEqual(result.response?.result, undefined);
      assert.deepStrictEqual(result.response?.error, {
        code: -32600,
        message: "Invalid Request",
        data: { details: "something went wrong" }
      });
    });
  });

  describe("request/response - timeout", () => {
    it("should timeout when no response is received", async () => {
      const client = createJrpc({
        sendMessage: () => {
          // Server doesn't respond - simulating ignore/timeout
        },
        handleRequest: async () => ({ result: undefined, error: undefined }),
        handleNotification: () => {}
      });

      const result = await client.request({
        method: "ignoredMethod",
        params: {},
        timeoutMs: 100
      });

      assert.notStrictEqual(result.error, undefined);
      assert.strictEqual(result.error?.message, "timeout");
      assert.strictEqual(result.response, undefined);
    });

    it("should not timeout when response is received in time", async () => {
      const client = createJrpc({
        sendMessage: ({ message }) => {
          setTimeout(() => {
            client.receivedMessage({
              message: {
                jsonrpc: "2.0",
                id: message.id,
                result: "quick response"
              }
            });
          }, 50);
        },
        handleRequest: async () => ({ result: undefined, error: undefined }),
        handleNotification: () => {}
      });

      const result = await client.request({
        method: "quickMethod",
        params: {},
        timeoutMs: 200
      });

      assert.strictEqual(result.error, undefined);
      assert.strictEqual(result.response?.result, "quick response");
    });
  });

  describe("handleRequest - incoming requests", () => {
    it("should handle incoming request with success result", async () => {
      const sentMessages: TJsonRpcMessage[] = [];
      const handleRequest: TRequestHandler = async ({ method, params }) => {
        assert.strictEqual(method, "incomingMethod");
        assert.deepStrictEqual(params, { input: "data" });
        return {
          result: { processed: true },
          error: undefined
        };
      };

      const client = createJrpc({
        sendMessage: ({ message }) => {
          sentMessages.push(message);
        },
        handleRequest,
        handleNotification: () => {}
      });

      const { error } = client.receivedMessage({
        message: {
          jsonrpc: "2.0",
          id: 42,
          method: "incomingMethod",
          params: { input: "data" }
        }
      });

      assert.strictEqual(error, undefined);

      // Wait for async handler to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.strictEqual(sentMessages.length, 1);
      assert.strictEqual(sentMessages[0].id, 42);
      assert.deepStrictEqual(sentMessages[0].result, { processed: true });
    });

    it("should handle incoming request with error result", async () => {
      const sentMessages: TJsonRpcMessage[] = [];
      const handleRequest: TRequestHandler = async ({ method }) => {
        return {
          result: undefined,
          error: {
            code: -32601,
            message: "Method not found",
            data: { method }
          }
        };
      };

      const client = createJrpc({
        sendMessage: ({ message }) => {
          sentMessages.push(message);
        },
        handleRequest,
        handleNotification: () => {}
      });

      client.receivedMessage({
        message: {
          jsonrpc: "2.0",
          id: 123,
          method: "unknownMethod",
          params: {}
        }
      });

      // Wait for async handler to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.strictEqual(sentMessages.length, 1);
      assert.strictEqual(sentMessages[0].id, 123);
      assert.deepStrictEqual(sentMessages[0].error, {
        code: -32601,
        message: "Method not found",
        data: { method: "unknownMethod" }
      });
    });

    it("should handle incoming request with no response (ignore)", async () => {
      const sentMessages: TJsonRpcMessage[] = [];
      const handleRequest: TRequestHandler = async () => {
        return {
          result: undefined,
          error: undefined
        };
      };

      const client = createJrpc({
        sendMessage: ({ message }) => {
          sentMessages.push(message);
        },
        handleRequest,
        handleNotification: () => {}
      });

      client.receivedMessage({
        message: {
          jsonrpc: "2.0",
          id: 999,
          method: "ignoredMethod",
          params: {}
        }
      });

      // Wait for async handler to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // No response should be sent
      assert.strictEqual(sentMessages.length, 0);
    });
  });

  describe("notifications", () => {
    it("should send notifications without id", () => {
      const sentMessages: TJsonRpcMessage[] = [];

      const client = createJrpc({
        sendMessage: ({ message }) => {
          sentMessages.push(message);
        },
        handleRequest: async () => ({ result: undefined, error: undefined }),
        handleNotification: () => {}
      });

      client.notify({
        method: "notificationMethod",
        params: { event: "test" }
      });

      assert.strictEqual(sentMessages.length, 1);
      assert.strictEqual(sentMessages[0].method, "notificationMethod");
      assert.strictEqual(sentMessages[0].id, undefined);
      assert.deepStrictEqual(sentMessages[0].params, { event: "test" });
    });

    it("should handle incoming notifications", () => {
      const receivedNotifications: Array<{ method: string, params: unknown }> = [];
      const handleNotification: TNotificationHandler = ({ method, params }) => {
        receivedNotifications.push({ method, params });
      };

      const client = createJrpc({
        sendMessage: () => {},
        handleRequest: async () => ({ result: undefined, error: undefined }),
        handleNotification
      });

      client.receivedMessage({
        message: {
          jsonrpc: "2.0",
          method: "notifyEvent",
          params: { data: "notification data" }
        }
      });

      assert.strictEqual(receivedNotifications.length, 1);
      assert.strictEqual(receivedNotifications[0].method, "notifyEvent");
      assert.deepStrictEqual(receivedNotifications[0].params, { data: "notification data" });
    });
  });

  describe("close", () => {
    it("should reject all pending requests on close", async () => {
      const client = createJrpc({
        sendMessage: () => {
          // Never send response
        },
        handleRequest: async () => ({ result: undefined, error: undefined }),
        handleNotification: () => {}
      });

      const promise1 = client.request({ method: "method1", params: {} });
      const promise2 = client.request({ method: "method2", params: {} });

      client.close();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      assert.notStrictEqual(result1.error, undefined);
      assert.strictEqual(result1.error?.message, "connection closed");
      assert.notStrictEqual(result2.error, undefined);
      assert.strictEqual(result2.error?.message, "connection closed");
    });

    it("should throw on receivedMessage after close", () => {
      const client = createJrpc({
        sendMessage: () => {},
        handleRequest: async () => ({ result: undefined, error: undefined }),
        handleNotification: () => {}
      });

      client.close();

      assert.throws(() => {
        client.receivedMessage({
          message: {
            jsonrpc: "2.0",
            method: "test"
          }
        });
      }, /connection closed/);
    });
  });

  describe("invalid messages", () => {
    it("should return error for null id", () => {
      const client = createJrpc({
        sendMessage: () => {},
        handleRequest: async () => ({ result: undefined, error: undefined }),
        handleNotification: () => {}
      });

      const { error } = client.receivedMessage({
        message: {
          jsonrpc: "2.0",
          id: null,
          method: "test"
        }
      });

      assert.notStrictEqual(error, undefined);
      assert.match(error?.message || "", /null ids/);
    });

    it("should return error for response to non-pending request", () => {
      const client = createJrpc({
        sendMessage: () => {},
        handleRequest: async () => ({ result: undefined, error: undefined }),
        handleNotification: () => {}
      });

      const { error } = client.receivedMessage({
        message: {
          jsonrpc: "2.0",
          id: 999,
          result: "something"
        }
      });

      assert.notStrictEqual(error, undefined);
      assert.match(error?.message || "", /non-pending/);
    });
  });
});
