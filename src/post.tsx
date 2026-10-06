import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { accountLabel, describeError, execute, listAccounts, type NoteVisibility } from "./api";

interface PostForm {
  accountId: string;
  text: string;
  cw: string;
  visibility: string;
}

/**
 * `notes.create` で投稿する。送信は NoteDeck 側の確認ダイアログを経る
 * (外部ツールからの書込は NoteDeck が必ず確認する)。
 */
export default function Post() {
  const accounts = usePromise(async () => (await listAccounts()).filter((a) => a.hasToken));

  const { handleSubmit, itemProps } = useForm<PostForm>({
    initialValues: { visibility: "public", cw: "" },
    validation: {
      text: (v) => (v?.trim() ? undefined : "Note text is required"),
      accountId: (v) => (v ? undefined : "Choose an account"),
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Waiting for confirmation in NoteDeck…" });
      try {
        await execute("notes.create", {
          accountId: values.accountId,
          text: values.text,
          visibility: values.visibility as NoteVisibility,
          ...(values.cw.trim() ? { cw: values.cw.trim() } : {}),
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

  if (accounts.error) {
    const { title, message } = describeError(accounts.error);
    showToast({ style: Toast.Style.Failure, title, message });
  }

  return (
    <Form
      isLoading={accounts.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Post" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Account" {...itemProps.accountId}>
        {(accounts.data ?? []).map((a) => (
          <Form.Dropdown.Item key={a.id} value={a.id} title={accountLabel(a)} icon={a.avatarUrl ?? undefined} />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Note" placeholder="What's on your mind?" enableMarkdown={false} {...itemProps.text} />
      <Form.TextField title="CW" placeholder="Content warning (optional)" {...itemProps.cw} />
      <Form.Dropdown title="Visibility" {...itemProps.visibility}>
        <Form.Dropdown.Item value="public" title="Public" />
        <Form.Dropdown.Item value="home" title="Home" />
        <Form.Dropdown.Item value="followers" title="Followers" />
        <Form.Dropdown.Item value="specified" title="Direct" />
      </Form.Dropdown>
      <Form.Description text="NoteDeck shows a confirmation before posting. Needs the 'notes.write' permission for external tools." />
    </Form>
  );
}
