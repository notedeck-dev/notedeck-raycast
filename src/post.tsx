import { Action, ActionPanel, Form, Icon, Keyboard, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import {
  accountLabel,
  describeError,
  execute,
  listAccounts,
  NOTE_VISIBILITIES,
  type NoteVisibility,
  openDeepLink,
} from "./api";

interface PostForm {
  accountId: string;
  text: string;
  cw: string;
  visibility: string;
}

/**
 * 2 経路ある:
 * - Post: `notes.create` を API で実行。NoteDeck 側の確認ダイアログを経る
 *   (外部ツールからの書込は NoteDeck が必ず確認する)。`notes.write` の許可が要る
 * - Open in NoteDeck: `notedeck://compose` で NoteDeck の投稿フォームをプリセット
 *   して開くだけ。権限も確認も要らず、送信はフォームで本人が押す
 */
export default function Post() {
  const accounts = usePromise(async () => (await listAccounts()).filter((a) => a.hasToken));

  const { handleSubmit, itemProps, values } = useForm<PostForm>({
    initialValues: { visibility: "public", cw: "" },
    validation: {
      text: (v) => (v?.trim() ? undefined : "Note text is required"),
      accountId: (v) => (v ? undefined : "Choose an account"),
    },
    async onSubmit(v) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Waiting for confirmation in NoteDeck…" });
      try {
        await execute("notes.create", {
          accountId: v.accountId,
          text: v.text,
          visibility: v.visibility as NoteVisibility,
          ...(v.cw.trim() ? { cw: v.cw.trim() } : {}),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Posted";
        await popToRoot();
      } catch (e) {
        const { title, message } = describeError(e);
        toast.style = Toast.Style.Failure;
        toast.title = title;
        toast.message = message;
      }
    },
  });

  async function openInNoteDeck() {
    await openDeepLink("compose", {
      text: values.text,
      cw: values.cw.trim() || undefined,
      visibility: NOTE_VISIBILITIES.includes(values.visibility as NoteVisibility) ? values.visibility : undefined,
    });
    await showHUD("Opened NoteDeck's post form");
  }

  if (accounts.error) {
    const { title, message } = describeError(accounts.error);
    showToast({ style: Toast.Style.Failure, title, message });
  }

  return (
    <Form
      isLoading={accounts.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Post" icon={Icon.Airplane} onSubmit={handleSubmit} />
          <Action
            title="Open in NoteDeck's Post Form"
            icon={Icon.AppWindow}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={openInNoteDeck}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Account" storeValue {...itemProps.accountId}>
        {(accounts.data ?? []).map((a) => (
          <Form.Dropdown.Item key={a.id} value={a.id} title={accountLabel(a)} icon={a.avatarUrl ?? Icon.Person} />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Note" placeholder="What's on your mind?" enableMarkdown={false} {...itemProps.text} />
      <Form.TextField title="CW" placeholder="Content warning (optional)" {...itemProps.cw} />
      <Form.Dropdown title="Visibility" storeValue {...itemProps.visibility}>
        <Form.Dropdown.Item value="public" title="Public" icon={Icon.Globe} />
        <Form.Dropdown.Item value="home" title="Home" icon={Icon.House} />
        <Form.Dropdown.Item value="followers" title="Followers" icon={Icon.Lock} />
        <Form.Dropdown.Item value="specified" title="Direct" icon={Icon.Envelope} />
      </Form.Dropdown>
      <Form.Description text="Post: sent through the API after you confirm in the NoteDeck window (needs the 'notes.write' permission for external tools). ⌘O: open NoteDeck's own post form with this text instead — no permission needed." />
    </Form>
  );
}
