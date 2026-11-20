import { Action, ActionPanel, Icon, List, open, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { type AccountPublic, describeError, execute, listAccounts } from "./api";

/**
 * `notes.searchArchive` の 1 行 (note projection + accountId / serverHost)。
 * CW 付きは本文の代わりに `[CW: …]` が text に入る
 */
interface ArchiveHit {
  id: string;
  userId: string;
  username: string;
  text?: string;
  createdAt: string;
  accountId: string;
  serverHost: string;
}

interface Memo {
  id: string;
  text: string;
  updatedAt: string;
  tags?: string[];
}

/**
 * 自分に関係するものだけを引く (#511 / #925 の線引き): 自分の投稿と自分のメモ。
 * 他人のノートは外部ツールから引けるようにしない。
 */
export default function Search() {
  const [query, setQuery] = useState("");
  const onError = (e: unknown) => {
    showToast({ style: Toast.Style.Failure, ...describeError(e) });
  };
  const accounts = usePromise(async () => (await listAccounts()).filter((a) => a.hasToken), [], { onError });

  const results = usePromise(
    async (q: string, list: AccountPublic[] | undefined) => {
      if (!list) return { notes: [] as Array<ArchiveHit & { account: AccountPublic }>, memos: [] as Memo[] };
      // 片方が権限で弾かれても、もう片方の結果は出す (エラーは 1 件だけ知らせる)
      let failed: unknown;
      const keep = (e: unknown): never[] => {
        failed ??= e;
        return [];
      };
      const [perAccount, memos] = await Promise.all([
        Promise.all(
          list.map(async (account) => {
            const hits = await execute<ArchiveHit[]>("notes.searchArchive", {
              ...(q.trim() ? { query: q.trim() } : {}),
              // 自分の投稿だけ: 索引はそのアカウントの画面に流れてきた全員のノートを持つ
              author: `${account.username}@${account.host}`,
              accountIds: [account.id],
              includePrivate: true,
              limit: 50,
            }).catch(keep);
            return hits.filter((h) => h.userId === account.userId).map((h) => ({ ...h, account }));
          }),
        ),
        execute<Memo[]>("memos.list", { ...(q ? { query: q } : {}), limit: 20 }).catch(keep),
      ]);
      if (failed) onError(failed);
      const notes = perAccount.flat().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return { notes, memos };
    },
    [query, accounts.data],
    { onError },
  );

  return (
    <List
      isLoading={accounts.isLoading || results.isLoading}
      searchBarPlaceholder="Search your notes and memos (empty = recent)…"
      onSearchTextChange={setQuery}
      throttle
    >
      <List.Section title="My Notes" subtitle={String(results.data?.notes.length ?? 0)}>
        {(results.data?.notes ?? []).map((n) => (
          <List.Item
            key={`${n.accountId}:${n.id}`}
            icon={Icon.Message}
            title={oneLine(n.text ?? "")}
            accessories={[{ text: `@${n.account.username}@${n.account.host}` }, { date: new Date(n.createdAt) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Open in NoteDeck"
                  icon={Icon.ArrowRight}
                  onAction={() =>
                    open(
                      `notedeck://${n.account.host}/note/${encodeURIComponent(n.id)}?account=${encodeURIComponent(n.account.userId)}`,
                    )
                  }
                />
                <Action.CopyToClipboard title="Copy Text" content={n.text ?? ""} />
                <Action.CopyToClipboard title="Copy Note ID" content={n.id} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Memos" subtitle={String(results.data?.memos.length ?? 0)}>
        {(results.data?.memos ?? []).map((m) => (
          <List.Item
            key={m.id}
            icon={Icon.Document}
            title={oneLine(m.text)}
            accessories={[...(m.tags ?? []).map((t) => ({ tag: t })), { date: new Date(m.updatedAt) }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Memo" content={m.text} />
                <Action.CopyToClipboard title="Copy Memo ID" content={m.id} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function oneLine(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > 120 ? `${t.slice(0, 119)}…` : t;
}
