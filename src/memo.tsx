import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { describeError, execute } from "./api";

interface MemoForm {
  text: string;
  tags: string;
}

/** `memos.create` で NoteDeck のローカルメモを 1 件作る (NoteDeck 側で確認が出る) */
export default function Memo() {
  const { handleSubmit, itemProps } = useForm<MemoForm>({
    validation: { text: (v) => (v?.trim() ? undefined : "Memo text is required") },
    async onSubmit(values) {
      const tags = values.tags
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Waiting for confirmation in NoteDeck…" });
      try {
        await execute("memos.create", { text: values.text, ...(tags.length ? { tags } : {}) });
        toast.style = Toast.Style.Success;
        toast.title = "Memo created";
        await popToRoot();
      } catch (e) {
        const { title, message } = describeError(e);
        toast.style = Toast.Style.Failure;
        toast.title = title;
        toast.message = message;
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Memo" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Memo" placeholder="Markdown is fine" {...itemProps.text} />
      <Form.TextField title="Tags" placeholder="comma or space separated (optional)" {...itemProps.tags} />
      <Form.Description text="NoteDeck shows a confirmation before writing. Needs the 'memos.write' permission for external tools." />
    </Form>
  );
}
