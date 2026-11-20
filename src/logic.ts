import type { CapabilityParam } from "./api";

/**
 * `@raycast/api` に触らない純ロジック (vitest から読めるように分けてある)。
 */

/** 人の確認を待たない呼び出しの上限。本体の query bridge は既定 5 秒で諦める */
export const SHORT_TIMEOUT_MS = 10_000;
/** Run Capability で確認待ちにならないもの。ai.chat のように返事が遅いものがあるので長め */
export const RUN_TIMEOUT_MS = 120_000;

export function isLoopback(baseUrl: string): boolean {
  try {
    return ["127.0.0.1", "localhost", "[::1]"].includes(new URL(baseUrl).hostname);
  } catch {
    return false;
  }
}

/** execute は `{ ok: false, code, error }`、それ以外のルートは `{ error: CODE, message }` を返す */
export function readErrorBody(
  status: number,
  statusText: string,
  data: Record<string, unknown>,
): { code: string; message: string } {
  if (typeof data.code !== "string" && typeof data.error === "string" && typeof data.message === "string") {
    return { code: data.error.toLowerCase(), message: data.message };
  }
  const code = typeof data.code === "string" ? data.code : status === 401 ? "unauthorized" : "http_error";
  const message = typeof data.error === "string" ? data.error : `${status} ${statusText}`;
  return { code, message };
}

export function deepLinkUrl(path: string, params?: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== "") qs.set(k, v);
  }
  const q = qs.toString();
  return `notedeck://${path}${q ? `?${q}` : ""}`;
}

/** 人向けのエラー文。`preferences` はトークン / URL の設定で直るもの */
export function errorText(code: string, message: string): { title: string; message?: string; preferences?: true } {
  switch (code) {
    case "unreachable":
      return { title: "NoteDeck is not running", message: "Start NoteDeck, or check the API URL in preferences." };
    case "timeout":
      return { title: "NoteDeck did not respond", message: "Check that the NoteDeck window is open, then try again." };
    case "no_token":
      return {
        title: "API token is not set",
        message: "Issue a token in NoteDeck (Settings → Permissions → API tokens) and paste it into the preferences.",
        preferences: true,
      };
    case "not_loopback":
      return {
        title: "API URL must be on this machine",
        message: `Use 127.0.0.1, localhost or [::1]. The token was not sent to ${message}`,
        preferences: true,
      };
    case "unauthorized":
      return {
        title: "Invalid API token",
        message: "Issue a token in NoteDeck: Settings → Permissions → API tokens.",
        preferences: true,
      };
    case "permission_denied":
      return {
        title: "Not allowed for external tools",
        message: `Allow it under Settings → Permissions → External. ${message}`,
      };
    case "user_cancelled":
      return { title: "Cancelled in NoteDeck" };
    case "unknown_capability":
      return { title: "Unknown capability", message: `This NoteDeck does not have it; update NoteDeck. ${message}` };
    case "preflight_failed":
      return { title: "Invalid parameters", message };
    case "execute_failed":
      return { title: "NoteDeck could not run it", message };
    case "query_failed":
      return { title: "NoteDeck could not answer", message: `Its window may still be starting. ${message}` };
    default:
      return { title: code, message };
  }
}

export function parseParam(p: Pick<CapabilityParam, "type">, raw: string | boolean): unknown | Error {
  if (typeof raw === "boolean") return raw;
  switch (p.type) {
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : new Error("Not a number");
    }
    case "array": {
      const t = raw.trim();
      if (t.startsWith("[")) {
        try {
          return JSON.parse(t);
        } catch {
          return new Error("Invalid JSON array");
        }
      }
      return t
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    case "object": {
      try {
        return JSON.parse(raw);
      } catch {
        return new Error("Invalid JSON object");
      }
    }
    default:
      return raw;
  }
}

/** アカウントごとの検索結果から本人の投稿だけを残し、新しい順に並べる */
export function ownNotes<A extends { userId: string }, H extends { userId: string; createdAt: string }>(
  perAccount: Array<{ account: A; hits: H[] }>,
): Array<H & { account: A }> {
  return perAccount
    .flatMap(({ account, hits }) => hits.filter((h) => h.userId === account.userId).map((h) => ({ ...h, account })))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * Run Capability の timeout。確認ダイアログを待ちうるものは切らない:
 * 宣言が `confirm: true` のものと、別アカウントでの実行 (宣言が無くても本体が確認を出す)。
 */
export function executeTimeout(
  cap: { requiresConfirmation: boolean },
  params: Record<string, unknown>,
): number | undefined {
  return cap.requiresConfirmation || "accountId" in params ? undefined : RUN_TIMEOUT_MS;
}
