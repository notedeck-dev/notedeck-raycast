import { Action, ActionPanel, Icon, List, open, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { type AccountPublic, type DeckColumn, describeError, listAccounts, listColumns } from "./api";
import { EmptyView } from "./empty";

/** カラム一覧 → 選ぶと `notedeck://column/<id>` で NoteDeck 側をフォーカスする */
export default function Columns() {
  const { data, isLoading, error, revalidate } = usePromise(
    async () => {
      const [columns, accounts] = await Promise.all([listColumns(), listAccounts().catch(() => [] as AccountPublic[])]);
      const byId = new Map(accounts.map((a) => [a.id, a]));
      return columns.map((c) => ({ column: c, account: c.accountId ? byId.get(c.accountId) : undefined }));
    },
    [],
    {
      onError: (e) => {
        showToast({ style: Toast.Style.Failure, ...describeError(e) });
      },
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter columns…">
      <EmptyView error={error} isLoading={isLoading} title="No columns" />
      {(data ?? []).map(({ column, account }) => (
        <List.Item
          key={column.id}
          icon={Icon.AppWindowList}
          title={columnTitle(column)}
          subtitle={column.type}
          accessories={account ? [{ text: `@${account.username}@${account.host}` }] : [{ text: "all accounts" }]}
          keywords={[column.type, account?.host ?? ""]}
          actions={
            <ActionPanel>
              <Action
                title="Focus in NoteDeck"
                icon={Icon.ArrowRight}
                onAction={() => focusColumn(column, revalidate)}
              />
              <Action.CopyToClipboard title="Copy Column ID" content={column.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function columnTitle(c: DeckColumn): string {
  if (c.name) return c.name;
  const tl = typeof c.tl === "string" ? ` (${c.tl})` : "";
  return `${c.type}${tl}`;
}

async function focusColumn(c: DeckColumn, revalidate: () => void) {
  // 本体は無い id の deep link を黙って無視するので、今もあるかを先に確かめる。
  // 一覧が取れないとき (NoteDeck を閉じた等) はそのまま開く — deep link が起動する
  const columns = await listColumns().catch(() => undefined);
  if (columns && !columns.some((x) => x.id === c.id)) {
    await showToast({ style: Toast.Style.Failure, title: "Column no longer exists" });
    revalidate();
    return;
  }
  await open(`notedeck://column/${encodeURIComponent(c.id)}`);
}
