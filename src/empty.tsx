import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { describeError } from "./api";

/** 一覧が空のときの表示。失敗 (トークン / 未起動 / 権限) と 0 件を分ける */
export function EmptyView(props: { error: unknown; isLoading: boolean; title: string }) {
  if (props.error) {
    const { title, message, primaryAction } = describeError(props.error);
    return (
      <List.EmptyView
        icon={Icon.Warning}
        title={title}
        description={message}
        actions={
          primaryAction && (
            <ActionPanel>
              <Action title={primaryAction.title} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          )
        }
      />
    );
  }
  if (props.isLoading) return null;
  return <List.EmptyView icon={Icon.MagnifyingGlass} title={props.title} />;
}
