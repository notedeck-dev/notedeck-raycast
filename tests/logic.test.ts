import { describe, expect, it } from "vitest";
import {
  deepLinkUrl,
  errorText,
  executeTimeout,
  isLoopback,
  ownNotes,
  parseParam,
  readErrorBody,
  RUN_TIMEOUT_MS,
} from "../src/logic";

describe("isLoopback", () => {
  it("accepts only this machine", () => {
    expect(isLoopback("http://127.0.0.1:19820")).toBe(true);
    expect(isLoopback("http://localhost:19820")).toBe(true);
    expect(isLoopback("http://[::1]:19820")).toBe(true);
    expect(isLoopback("http://192.168.0.2:19820")).toBe(false);
    expect(isLoopback("http://localhost.example.com")).toBe(false);
    expect(isLoopback("not a url")).toBe(false);
  });
});

describe("readErrorBody", () => {
  it("reads the execute shape { ok: false, code, error }", () => {
    expect(readErrorBody(403, "Forbidden", { ok: false, code: "permission_denied", error: "notes.write" })).toEqual({
      code: "permission_denied",
      message: "notes.write",
    });
  });
  it("reads the route shape { error: CODE, message }", () => {
    expect(readErrorBody(500, "Internal Server Error", { error: "QUERY_FAILED", message: "timed out" })).toEqual({
      code: "query_failed",
      message: "timed out",
    });
    expect(readErrorBody(401, "Unauthorized", { error: "UNAUTHORIZED", message: "Missing token" }).code).toBe(
      "unauthorized",
    );
  });
  it("falls back to the HTTP status", () => {
    expect(readErrorBody(401, "Unauthorized", {})).toEqual({ code: "unauthorized", message: "401 Unauthorized" });
    expect(readErrorBody(502, "Bad Gateway", {})).toEqual({ code: "http_error", message: "502 Bad Gateway" });
  });
});

describe("deepLinkUrl", () => {
  it("drops empty params and encodes the rest", () => {
    expect(deepLinkUrl("compose")).toBe("notedeck://compose");
    expect(deepLinkUrl("compose", { text: "a b&c", cw: undefined, visibility: "" })).toBe(
      "notedeck://compose?text=a+b%26c",
    );
    expect(deepLinkUrl("misskey.io/note/abc", { account: "u1" })).toBe("notedeck://misskey.io/note/abc?account=u1");
  });
});

describe("errorText", () => {
  it("asks for preferences on token problems", () => {
    expect(errorText("no_token", "").preferences).toBe(true);
    expect(errorText("unauthorized", "").preferences).toBe(true);
    expect(errorText("unreachable", "").preferences).toBeUndefined();
  });
  it("has wording for every code NoteDeck returns", () => {
    for (const code of [
      "permission_denied",
      "user_cancelled",
      "unknown_capability",
      "preflight_failed",
      "execute_failed",
      "query_failed",
      "timeout",
    ]) {
      expect(errorText(code, "detail").title).not.toBe(code);
    }
    expect(errorText("preflight_failed", "text is required").message).toContain("text is required");
  });
  it("shows unknown codes as they are", () => {
    expect(errorText("something_new", "detail")).toEqual({ title: "something_new", message: "detail" });
  });
});

describe("parseParam", () => {
  it("parses numbers", () => {
    expect(parseParam({ type: "number" }, "12")).toBe(12);
    expect(parseParam({ type: "number" }, "x")).toBeInstanceOf(Error);
  });
  it("parses arrays as JSON or comma separated", () => {
    expect(parseParam({ type: "array" }, '["a", "b"]')).toEqual(["a", "b"]);
    expect(parseParam({ type: "array" }, "a, b,")).toEqual(["a", "b"]);
    expect(parseParam({ type: "array" }, "[oops")).toBeInstanceOf(Error);
  });
  it("parses objects as JSON", () => {
    expect(parseParam({ type: "object" }, '{"a":1}')).toEqual({ a: 1 });
    expect(parseParam({ type: "object" }, "{")).toBeInstanceOf(Error);
  });
  it("passes strings and booleans through", () => {
    expect(parseParam({ type: "string" }, "hi")).toBe("hi");
    expect(parseParam({ type: "boolean" }, true)).toBe(true);
  });
});

describe("ownNotes", () => {
  const me = { id: "acc-1", userId: "u1" };
  const other = { id: "acc-2", userId: "u9" };
  const hit = (id: string, userId: string, createdAt: string) => ({ id, userId, createdAt });

  it("keeps only the account's own notes, newest first", () => {
    const notes = ownNotes([
      { account: me, hits: [hit("a", "u1", "2026-01-01T00:00:00Z"), hit("b", "u2", "2026-01-03T00:00:00Z")] },
      { account: other, hits: [hit("c", "u9", "2026-01-02T00:00:00Z")] },
    ]);
    expect(notes.map((n) => n.id)).toEqual(["c", "a"]);
    expect(notes[0].account).toBe(other);
  });
});

describe("executeTimeout", () => {
  it("never cuts off a capability that may wait for confirmation", () => {
    expect(executeTimeout({ requiresConfirmation: true }, {})).toBeUndefined();
    // 別アカウントでの実行は宣言が無くても NoteDeck が確認を出す
    expect(executeTimeout({ requiresConfirmation: false }, { accountId: "acc-2" })).toBeUndefined();
  });
  it("limits the rest", () => {
    expect(executeTimeout({ requiresConfirmation: false }, { query: "x" })).toBe(RUN_TIMEOUT_MS);
  });
});
