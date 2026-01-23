import { strict as assert } from "node:assert";
import { describe, it } from "mocha";
import {
  coerceParams,
  coerceErrorField,
  coerceId,
  coerceMethod,
  coerceJrcpFields,
  coerceJrcpNotification,
  coerceJrpcMessage
} from "../lib/coerce.ts";

describe("coerceParams", () => {
  it("should accept undefined params", () => {
    const result = coerceParams({ params: undefined });
    assert.equal(result.error, undefined);
    assert.equal(result.params, undefined);
  });

  it("should accept an array params", () => {
    const params = [1, "test", true];
    const result = coerceParams({ params });
    assert.equal(result.error, undefined);
    assert.deepEqual(result.params, params);
  });

  it("should accept an object params", () => {
    const params = { key: "value", num: 42 };
    const result = coerceParams({ params });
    assert.equal(result.error, undefined);
    assert.deepEqual(result.params, params);
  });

  it("should reject null params", () => {
    const result = coerceParams({ params: null });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid params");
    assert.equal(result.params, undefined);
  });

  it("should reject string params", () => {
    const result = coerceParams({ params: "invalid" });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid params");
  });

  it("should reject number params", () => {
    const result = coerceParams({ params: 123 });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid params");
  });

  it("should reject boolean params", () => {
    const result = coerceParams({ params: true });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid params");
  });
});

describe("coerceErrorField", () => {
  it("should accept undefined error", () => {
    const result = coerceErrorField({ error: undefined });
    assert.equal(result.error, undefined);
    assert.equal(result.errorField, undefined);
  });

  it("should accept valid error object", () => {
    const errorObj = { code: -32600, message: "Invalid Request" };
    const result = coerceErrorField({ error: errorObj });
    assert.equal(result.error, undefined);
    assert.deepEqual(result.errorField, {
      ...errorObj,
      data: undefined
    });
  });

  it("should accept error object with data", () => {
    const errorObj = { code: -32600, message: "Invalid Request", data: { extra: "info" } };
    const result = coerceErrorField({ error: errorObj });
    assert.equal(result.error, undefined);
    assert.deepEqual(result.errorField, errorObj);
  });

  it("should reject null error", () => {
    const result = coerceErrorField({ error: null });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid error field");
  });

  it("should reject string error", () => {
    const result = coerceErrorField({ error: "error" });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid error field");
  });

  it("should reject error without code", () => {
    const result = coerceErrorField({ error: { message: "test" } });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid field type for error.code");
  });

  it("should reject error with non-number code", () => {
    const result = coerceErrorField({ error: { code: "123", message: "test" } });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid field type for error.code");
  });

  it("should reject error with non-integer code", () => {
    const result = coerceErrorField({ error: { code: 123.45, message: "test" } });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "error.code is not an integer");
  });

  it("should reject error without message", () => {
    const result = coerceErrorField({ error: { code: -32600 } });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid field type for error.message");
  });

  it("should reject error with non-string message", () => {
    const result = coerceErrorField({ error: { code: -32600, message: 123 } });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid field type for error.message");
  });
});

describe("coerceId", () => {
  it("should accept undefined id", () => {
    const result = coerceId({ id: undefined });
    assert.equal(result.error, undefined);
    assert.equal(result.id, undefined);
  });

  it("should accept null id", () => {
    const result = coerceId({ id: null });
    assert.equal(result.error, undefined);
    assert.equal(result.id, null);
  });

  it("should accept string id", () => {
    const result = coerceId({ id: "test-id" });
    assert.equal(result.error, undefined);
    assert.equal(result.id, "test-id");
  });

  it("should accept number id", () => {
    const result = coerceId({ id: 42 });
    assert.equal(result.error, undefined);
    assert.equal(result.id, 42);
  });

  it("should accept zero as id", () => {
    const result = coerceId({ id: 0 });
    assert.equal(result.error, undefined);
    assert.equal(result.id, 0);
  });

  it("should accept empty string as id", () => {
    const result = coerceId({ id: "" });
    assert.equal(result.error, undefined);
    assert.equal(result.id, "");
  });

  it("should reject boolean id", () => {
    const result = coerceId({ id: true });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid id type");
  });

  it("should reject object id", () => {
    const result = coerceId({ id: {} });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid id type");
  });

  it("should reject array id", () => {
    const result = coerceId({ id: [] });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid id type");
  });
});

describe("coerceMethod", () => {
  it("should accept valid method name", () => {
    const result = coerceMethod({ method: "testMethod" });
    assert.equal(result.error, undefined);
    assert.equal(result.method, "testMethod");
  });

  it("should accept method with dots", () => {
    const result = coerceMethod({ method: "namespace.method" });
    assert.equal(result.error, undefined);
    assert.equal(result.method, "namespace.method");
  });

  it("should accept empty string method", () => {
    const result = coerceMethod({ method: "" });
    assert.equal(result.error, undefined);
    assert.equal(result.method, "");
  });

  it("should reject number method", () => {
    const result = coerceMethod({ method: 123 });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid field type for method");
  });

  it("should accept undefined method", () => {
    const result = coerceMethod({ method: undefined });
    assert.equal(result.error, undefined);
    assert.equal(result.method, undefined);
  });

  it("should reject null method", () => {
    const result = coerceMethod({ method: null });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid field type for method");
  });

  it("should reject object method", () => {
    const result = coerceMethod({ method: {} });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid field type for method");
  });
});

describe("coerceJrcpFields", () => {
  // eslint-disable-next-line complexity
  it("should accept valid jrpc fields with all optional fields", () => {
    const jrpcFields = {
      jsonrpc: "2.0",
      id: "test-id",
      method: "testMethod",
      params: [1, 2, 3],
      result: { success: true },
      error: undefined
    };
    const result = coerceJrcpFields({ jrpcFields });
    assert.equal(result.error, undefined);
    assert.equal(result.jrpcFields?.jsonrpc, "2.0");
    assert.equal(result.jrpcFields?.id, "test-id");
    assert.equal(result.jrpcFields?.method, "testMethod");
    assert.deepEqual(result.jrpcFields?.params, [1, 2, 3]);
  });

  it("should accept minimal jrpc fields", () => {
    const jrpcFields = {
      jsonrpc: "2.0",
      id: undefined,
      method: undefined,
      params: undefined,
      result: undefined,
      error: undefined
    };
    const result = coerceJrcpFields({ jrpcFields });
    assert.equal(result.error, undefined);
    assert.equal(result.jrpcFields?.jsonrpc, "2.0");
  });

  it("should reject non-string jsonrpc", () => {
    const jrpcFields = {
      jsonrpc: 2.0,
      id: undefined,
      method: undefined,
      params: undefined,
      result: undefined,
      error: undefined
    };
    const result = coerceJrcpFields({ jrpcFields });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid field type for jsonrpc");
  });

  it("should reject invalid id", () => {
    const jrpcFields = {
      jsonrpc: "2.0",
      id: { invalid: true },
      method: undefined,
      params: undefined,
      result: undefined,
      error: undefined
    };
    const result = coerceJrcpFields({ jrpcFields });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid id type");
  });

  it("should reject invalid params", () => {
    const jrpcFields = {
      jsonrpc: "2.0",
      id: undefined,
      method: undefined,
      params: "invalid",
      result: undefined,
      error: undefined
    };
    const result = coerceJrcpFields({ jrpcFields });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid params");
  });

  it("should reject invalid error field", () => {
    const jrpcFields = {
      jsonrpc: "2.0",
      id: undefined,
      method: undefined,
      params: undefined,
      result: undefined,
      error: { code: "not-a-number", message: "test" }
    };
    const result = coerceJrcpFields({ jrpcFields });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "invalid field type for error.code");
  });
});

describe("coerceJrcpNotification", () => {
  it("should accept valid notification", () => {
    const jrpcFields = {
      jsonrpc: "2.0" as const,
      id: undefined,
      method: "testNotification",
      params: { key: "value" },
      result: undefined,
      error: undefined
    };
    const result = coerceJrcpNotification({ jrpcFields });
    assert.equal(result.error, undefined);
    assert.equal(result.jrpcNotification?.method, "testNotification");
    assert.deepEqual(result.jrpcNotification?.params, { key: "value" });
  });

  it("should accept notification without params", () => {
    const jrpcFields = {
      jsonrpc: "2.0" as const,
      id: undefined,
      method: "testNotification",
      params: undefined,
      result: undefined,
      error: undefined
    };
    const result = coerceJrcpNotification({ jrpcFields });
    assert.equal(result.error, undefined);
    assert.equal(result.jrpcNotification?.method, "testNotification");
  });

  it("should reject notification with string id", () => {
    const jrpcFields = {
      jsonrpc: "2.0" as const,
      id: "test-id" as string | undefined,
      method: "testNotification",
      params: undefined,
      result: undefined,
      error: undefined
    };
    const result = coerceJrcpNotification({ jrpcFields });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "notification must not have an id");
  });

  it("should reject notification with number id", () => {
    const jrpcFields = {
      jsonrpc: "2.0" as const,
      id: 42 as number | undefined,
      method: "testNotification",
      params: undefined,
      result: undefined,
      error: undefined
    };
    const result = coerceJrcpNotification({ jrpcFields });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "notification must not have an id");
  });

  it("should reject notification with error field", () => {
    const jrpcFields = {
      jsonrpc: "2.0" as const,
      id: undefined,
      method: "testNotification",
      params: undefined,
      result: undefined,
      error: { code: -32600, message: "Invalid Request" }
    };
    const result = coerceJrcpNotification({ jrpcFields });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "notification must not have an error (maybe id is missing and this is not a notification?)");
  });

  it("should reject notification with result field", () => {
    const jrpcFields = {
      jsonrpc: "2.0" as const,
      id: undefined,
      method: "testNotification",
      params: undefined,
      result: { data: "test" },
      error: undefined
    };
    const result = coerceJrcpNotification({ jrpcFields });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "notification must not have a result (maybe id is missing and this is not a notification?)");
  });

  it("should reject notification without method", () => {
    const jrpcFields = {
      jsonrpc: "2.0" as const,
      id: undefined,
      method: undefined,
      params: undefined,
      result: undefined,
      error: undefined
    };
    const result = coerceJrcpNotification({ jrpcFields });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.message, "no method in notification");
  });
});

describe("coerceJrpcMessage", () => {
  describe("valid notifications", () => {
    it("should accept valid notification", () => {
      const message = {
        jsonrpc: "2.0",
        method: "testNotification",
        params: [1, 2, 3]
      };
      const result = coerceJrpcMessage({ message });
      assert.equal(result.error, undefined);
      assert.equal(result.jrpcMessage?.jsonrpc, "2.0");
      assert.equal(result.jrpcMessage?.method, "testNotification");
      assert.deepEqual(result.jrpcMessage?.params, [1, 2, 3]);
    });

    it("should accept notification without params", () => {
      const message = {
        jsonrpc: "2.0",
        method: "testNotification"
      };
      const result = coerceJrpcMessage({ message });
      assert.equal(result.error, undefined);
      assert.equal(result.jrpcMessage?.method, "testNotification");
    });
  });

  describe("valid requests", () => {
    it("should accept valid request with string id", () => {
      const message = {
        jsonrpc: "2.0",
        id: "req-123",
        method: "testMethod",
        params: { key: "value" }
      };
      const result = coerceJrpcMessage({ message });
      assert.equal(result.error, undefined);
      assert.equal(result.jrpcMessage?.jsonrpc, "2.0");
      assert.equal(result.jrpcMessage?.id, "req-123");
      assert.equal(result.jrpcMessage?.method, "testMethod");
    });

    it("should accept valid request with number id", () => {
      const message = {
        jsonrpc: "2.0",
        id: 42,
        method: "testMethod"
      };
      const result = coerceJrpcMessage({ message });
      assert.equal(result.error, undefined);
      assert.equal(result.jrpcMessage?.id, 42);
      assert.equal(result.jrpcMessage?.method, "testMethod");
    });

    it("should accept request without params", () => {
      const message = {
        jsonrpc: "2.0",
        id: 1,
        method: "testMethod"
      };
      const result = coerceJrpcMessage({ message });
      assert.equal(result.error, undefined);
      assert.equal(result.jrpcMessage?.method, "testMethod");
    });
  });

  describe("valid responses", () => {
    it("should accept success response", () => {
      const message = {
        jsonrpc: "2.0",
        id: "resp-123",
        result: { success: true, data: "test" }
      };
      const result = coerceJrpcMessage({ message });
      assert.equal(result.error, undefined);
      assert.equal(result.jrpcMessage.jsonrpc, "2.0");
      assert.equal(result.jrpcMessage.id, "resp-123");
      assert.deepEqual(result.jrpcMessage.result, { success: true, data: "test" });
    });

    it("should accept error response", () => {
      const message = {
        jsonrpc: "2.0",
        id: 42,
        error: { code: -32600, message: "Invalid Request" }
      };
      const result = coerceJrpcMessage({ message });
      assert.equal(result.error, undefined);
      assert.equal(result.jrpcMessage?.id, 42);
      assert.deepEqual(result.jrpcMessage.error, { code: -32600, message: "Invalid Request", data: undefined });
    });

    it("should reject error response with null id", () => {
      const message = {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" }
      };
      const result = coerceJrpcMessage({ message });
      assert.ok(result.error instanceof Error);
      assert.equal(result.error.message, "response must have an id");
    });

    it("should accept success response with null result", () => {
      const message = {
        jsonrpc: "2.0",
        id: 1,
        result: null
      };
      const result = coerceJrpcMessage({ message });
      assert.equal(result.error, undefined);
      assert.equal(result.jrpcMessage.result, null);
    });
  });

  describe("invalid messages", () => {
    it("should reject non-object message", () => {
      const result = coerceJrpcMessage({ message: "invalid" });
      assert.ok(result.error instanceof Error);
      assert.equal(result.error.message, "invalid message");
    });

    it("should reject null message", () => {
      const result = coerceJrpcMessage({ message: null });
      assert.ok(result.error instanceof Error);
      assert.equal(result.error.message, "invalid message");
    });

    it("should reject message with wrong jsonrpc version", () => {
      const message = {
        jsonrpc: "1.0",
        method: "test"
      };
      const result = coerceJrpcMessage({ message });
      assert.ok(result.error instanceof Error);
      assert.equal(result.error.message, "invalid jsonrpc version");
    });

    it("should reject message with extra fields", () => {
      const message = {
        jsonrpc: "2.0",
        method: "test",
        extra: "field"
      };
      const result = coerceJrpcMessage({ message });
      assert.ok(result.error instanceof Error);
      assert.ok(result.error.message.includes("unexpected field"));
    });

    it("should reject response with both result and error", () => {
      const message = {
        jsonrpc: "2.0",
        id: 1,
        result: "success",
        error: { code: -32600, message: "Invalid" }
      };
      const result = coerceJrpcMessage({ message });
      assert.ok(result.error instanceof Error);
      assert.equal(result.error.message, "both result and error in response");
    });

    it("should reject response without result or error", () => {
      const message = {
        jsonrpc: "2.0",
        id: 1
      };
      const result = coerceJrpcMessage({ message });
      assert.ok(result.error instanceof Error);
      assert.equal(result.error.message, "no result in response");
    });

    it("should reject request without method", () => {
      const message = {
        jsonrpc: "2.0",
        id: 1
      };
      const result = coerceJrpcMessage({ message });
      assert.ok(result.error instanceof Error);
    });

    it("should reject message with invalid params type", () => {
      const message = {
        jsonrpc: "2.0",
        method: "test",
        params: "invalid"
      };
      const result = coerceJrpcMessage({ message });
      assert.ok(result.error instanceof Error);
      assert.equal(result.error.message, "invalid params");
    });

    it("should reject message with invalid id type", () => {
      const message = {
        jsonrpc: "2.0",
        id: { object: "id" },
        method: "test"
      };
      const result = coerceJrpcMessage({ message });
      assert.ok(result.error instanceof Error);
      assert.equal(result.error.message, "invalid id type");
    });

    it("should reject notification with id", () => {
      const message = {
        jsonrpc: "2.0",
        id: 1,
        method: "test",
        result: "something"
      };
      const result = coerceJrpcMessage({ message });
      assert.ok(result.error instanceof Error);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string method", () => {
      const message = {
        jsonrpc: "2.0",
        method: ""
      };
      const result = coerceJrpcMessage({ message });
      assert.equal(result.error, undefined);
      assert.equal(result.jrpcMessage?.method, "");
    });

    it("should handle zero as id", () => {
      const message = {
        jsonrpc: "2.0",
        id: 0,
        method: "test"
      };
      const result = coerceJrpcMessage({ message });
      assert.equal(result.error, undefined);
      assert.equal(result.jrpcMessage?.id, 0);
    });

    it("should handle empty array params", () => {
      const message = {
        jsonrpc: "2.0",
        method: "test",
        params: []
      };
      const result = coerceJrpcMessage({ message });
      assert.equal(result.error, undefined);
      assert.deepEqual(result.jrpcMessage?.params, []);
    });

    it("should handle empty object params", () => {
      const message = {
        jsonrpc: "2.0",
        method: "test",
        params: {}
      };
      const result = coerceJrpcMessage({ message });
      assert.equal(result.error, undefined);
      assert.deepEqual(result.jrpcMessage?.params, {});
    });

    it("should handle error with data field", () => {
      const message = {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32600,
          message: "Invalid Request",
          data: { details: "extra info" }
        }
      };
      const result = coerceJrpcMessage({ message });
      assert.equal(result.error, undefined);
      assert.deepEqual(result.jrpcMessage.error, {
        code: -32600,
        message: "Invalid Request",
        data: { details: "extra info" }
      });
    });
  });
});
