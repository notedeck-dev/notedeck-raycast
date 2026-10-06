import { Action, ActionPanel, Icon, List, open, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { type AccountPublic, describeError, execute, listAccounts } from "./api";

/** `notes.searchArchive` の 1 行 (note projection + accountId / serverHost) */
interface ArchiveHit {
  id: string;
  text: string | null;
  cw: string | null;
  createdAt: string;
  visibility?: string;
  user: { id: string; username: string; host: string | null; name: string | null };
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
  const accounts = usePromise(async () => (await listAccounts()).filter((a) => a.hasToken));

  const results = usePromise(
    async (q: string, list: AccountPublic[] | undefined) => {
      if (!list || !q.trim())
        return { notes: [] as Array<ArchiveHit & { account: AccountPublic }>, memos: [] as Memo[] };
      const [perAccount, memos] = await Promise.all([
        Promise.all(
          list.map(async (account) => {
            const hits = await execute<ArchiveHit[]>("notes.searchArchive", {
              query: q.trim(),
              accountIds: [account.id],
              includePrivate: true,
              limit: 50,
            }).catch(() => [] as ArchiveHit[]);
            // 自分の投稿だけ: 索引はそのアカウントの画面に流れてきた全員のノートを持つ
            return hits.filter((h) => h.user?.id === account.userId).map((h) => ({ ...h, account }));
          }),
        ),
        execute<Memo[]>("memos.list", { query: q.trim(), limit: 20 }).catch(() => [] as Memo[]),
      ]);
      return { notes: perAccount.flat(), memos };
    },
    [query, accounts.data],
  );

  const error = accounts.error ?? results.error;
  if (error) {
    const { title, message } = describeError(error);
    showToast({ style: Toast.Style.Failure, title, message });
  }

  return (
    <List
      isLoading={accounts.isLoading || results.isLoading}
      searchBarPlaceholder="Search your notes and memos…"
      onSearchTextChange={setQuery}
      throttle
    >
      <List.Section title="My notes" subtitle={String(results.data?.notes.length ?? 0)}>
        {(results.data?.notes ?? []).map((n) => (
          <List.Item
            key={`${n.accountId}:${n.id}`}
            icon={Icon.Message}
            title={oneLine(n.cw ? `[CW] ${n.cw}` : (n.text ?? ""))}
            subtitle={n.cw ? oneLine(n.text ?? "") : undefined}
            accessories={[{ text: `@${n.account.username}@${n.account.host}` }, { date: new Date(n.createdAt) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Open in NoteDeck"
                  icon={Icon.ArrowRight}
                  onAction={() => open(`notedeck://${n.account.host}/note/${encodeURIComponent(n.id)}`)}
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
