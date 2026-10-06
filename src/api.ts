import { getPreferenceValues } from "@raycast/api";

/**
 * NoteDeck の内蔵 HTTP API (既定 127.0.0.1:19820) の薄いクライアント。
 * 認証は Bearer トークン (NoteDeck の 権限設定 → API トークン で発行)。
 */

export interface Preferences {
  baseUrl?: string;
  token: string;
}

export interface AccountPublic {
  id: string;
  host: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  software: string;
  hasToken: boolean;
}

export interface DeckColumn {
  id: string;
  type: string;
  name: string | null;
  accountId: string | null;
  [key: string]: unknown;
}

export type NoteVisibility = "public" | "home" | "followers" | "specified";

/** `{ ok: false, code, error }` を HTTP status ごと持つエラー */
export class NoteDeckApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "NoteDeckApiError";
  }
}

function prefs(): Required<Preferences> {
  const p = getPreferenceValues<Preferences>();
  const baseUrl = (p.baseUrl?.trim() || "http://127.0.0.1:19820").replace(/\/+$/, "");
  return { baseUrl, token: p.token };
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const { baseUrl, token } = prefs();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // 接続できない = NoteDeck が起動していない (または URL / ポート違い)
    throw new NoteDeckApiError(0, "unreachable", e instanceof Error ? e.message : String(e));
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = typeof data.code === "string" ? data.code : res.status === 401 ? "unauthorized" : "http_error";
    const message = typeof data.error === "string" ? data.error : `${res.status} ${res.statusText}`;
    throw new NoteDeckApiError(res.status, code, message);
  }
  return data as T;
}

/** `POST /api/capabilities/{id}/execute` → `result` */
export async function execute<T>(capabilityId: string, params?: Record<string, unknown>): Promise<T> {
  const data = await request<{ ok: true; result: T }>(
    "POST",
    `/api/capabilities/${encodeURIComponent(capabilityId)}/execute`,
    params ?? {},
  );
  return data.result;
}

export async function listAccounts(): Promise<AccountPublic[]> {
  return execute<AccountPublic[]>("account.list");
}

export async function listColumns(): Promise<DeckColumn[]> {
  return request<DeckColumn[]>("GET", "/api/deck/columns");
}

export function accountLabel(a: AccountPublic): string {
  return `@${a.username}@${a.host}`;
}

/** 人向けのエラー文。NoteDeck 側の権限 / 確認の仕組みに沿って案内する */
export function describeError(e: unknown): { title: string; message?: string } {
  if (!(e instanceof NoteDeckApiError)) {
    return { title: "Failed", message: e instanceof Error ? e.message : String(e) };
  }
  switch (e.code) {
    case "unreachable":
      return { title: "NoteDeck is not running", message: "Start NoteDeck, or check the API URL in preferences." };
    case "unauthorized":
      return { title: "Invalid API token", message: "Issue a token in NoteDeck: Settings → Permissions → API tokens." };
    case "permission_denied":
      return {
        title: "Not allowed for external tools",
        message: "Allow it in NoteDeck: Settings → Permissions → External (API tokens).",
      };
    case "user_cancelled":
      return { title: "Cancelled in NoteDeck" };
    default:
      return { title: e.code, message: e.message };
  }
}
