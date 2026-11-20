import { getPreferenceValues, open, openExtensionPreferences, type Toast } from "@raycast/api";
import { deepLinkUrl, errorText, isLoopback, readErrorBody, SHORT_TIMEOUT_MS } from "./logic";

/**
 * NoteDeck の内蔵 HTTP API (既定 127.0.0.1:19820) の薄いクライアント。
 * 認証は Bearer トークン (NoteDeck の 権限設定 → API トークン で発行)。
 */

export interface Preferences {
  baseUrl?: string;
  token?: string;
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
export const NOTE_VISIBILITIES: NoteVisibility[] = ["public", "home", "followers", "specified"];

/** `GET /api/capabilities` の 1 行 (宣言表の署名) */
export interface CapabilityParam {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  optional?: boolean;
  enum?: string[];
}
export interface CapabilityInfo {
  id: string;
  name: string;
  label: string;
  category: string;
  description: string;
  params: Record<string, CapabilityParam>;
  returns: { type: string; description?: string };
  permissions: string[];
  requiresConfirmation: boolean;
}

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
  return { baseUrl, token: p.token?.trim() ?? "" };
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown, timeoutMs?: number): Promise<T> {
  const { baseUrl, token } = prefs();
  // トークンは手元の NoteDeck にしか送らない (平文 http で外へ出さない)
  if (!isLoopback(baseUrl)) throw new NoteDeckApiError(0, "not_loopback", baseUrl);
  if (!token) throw new NoteDeckApiError(0, "no_token", "API token is not set");
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: timeoutMs !== undefined ? AbortSignal.timeout(timeoutMs) : undefined,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") throw new NoteDeckApiError(0, "timeout", e.message);
    // 接続できない = NoteDeck が起動していない (または URL / ポート違い)
    throw new NoteDeckApiError(0, "unreachable", e instanceof Error ? e.message : String(e));
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const { code, message } = readErrorBody(res.status, res.statusText, data);
    throw new NoteDeckApiError(res.status, code, message);
  }
  return data as T;
}

/**
 * `POST /api/capabilities/{id}/execute` → `result`。
 * `timeoutMs` を省くと待ち続ける: 確認ダイアログは人のペースで答えるもの (本体の上限は 30 分)
 */
export async function execute<T>(
  capabilityId: string,
  params?: Record<string, unknown>,
  timeoutMs?: number,
): Promise<T> {
  const data = await request<{ ok: true; result: T }>(
    "POST",
    `/api/capabilities/${encodeURIComponent(capabilityId)}/execute`,
    params ?? {},
    timeoutMs,
  );
  return data.result;
}

export async function listAccounts(): Promise<AccountPublic[]> {
  return execute<AccountPublic[]>("account.list", undefined, SHORT_TIMEOUT_MS);
}

export async function listColumns(): Promise<DeckColumn[]> {
  return request<DeckColumn[]>("GET", "/api/deck/columns", undefined, SHORT_TIMEOUT_MS);
}

export async function listCapabilities(): Promise<CapabilityInfo[]> {
  return request<CapabilityInfo[]>("GET", "/api/capabilities", undefined, SHORT_TIMEOUT_MS);
}

export function accountLabel(a: AccountPublic): string {
  const handle = `@${a.username}@${a.host}`;
  return a.displayName ? `${a.displayName} (${handle})` : handle;
}

/**
 * `notedeck://` deep link で NoteDeck 側を動かす。トークンも権限も要らない
 * (本人がリンクを踏んだ扱い)。NoteDeck が起動していなければ OS が起動する。
 */
export async function openDeepLink(path: string, params?: Record<string, string | undefined>): Promise<void> {
  await open(deepLinkUrl(path, params));
}

/** 人向けのエラー文。NoteDeck 側の権限 / 確認の仕組みに沿って案内する */
export function describeError(e: unknown): {
  title: string;
  message?: string;
  primaryAction?: Toast.ActionOptions;
} {
  if (!(e instanceof NoteDeckApiError)) {
    return { title: "Failed", message: e instanceof Error ? e.message : String(e) };
  }
  const { title, message, preferences } = errorText(e.code, e.message);
  return {
    title,
    message,
    ...(preferences
      ? { primaryAction: { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() } }
      : {}),
  };
}
