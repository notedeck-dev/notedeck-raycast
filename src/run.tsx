import { Action, ActionPanel, Detail, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { type CapabilityInfo, type CapabilityParam, describeError, execute, listCapabilities } from "./api";

/**
 * NoteDeck の capability を一覧から選んで実行する。コマンドパレットで
 * できることは全部ここから (#511 の「capability registry を動的に列挙」)。
 * 権限は NoteDeck 側の external principal の設定で決まり、確認が要るものは
 * NoteDeck の窓に出る。
 */
export default function Run() {
  const { data, isLoading, error } = usePromise(listCapabilities);
  if (error) {
    const { title, message } = describeError(error);
    showToast({ style: Toast.Style.Failure, title, message });
  }

  const byCategory = new Map<string, CapabilityInfo[]>();
  for (const cap of data ?? []) {
    const list = byCategory.get(cap.category) ?? [];
    list.push(cap);
    byCategory.set(cap.category, list);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search capabilities…" isShowingDetail>
      {Array.from(byCategory.entries()).map(([category, caps]) => (
        <List.Section key={category} title={category} subtitle={String(caps.length)}>
          {caps.map((cap) => (
            <List.Item
              key={cap.id}
              icon={cap.requiresConfirmation ? Icon.ExclamationMark : Icon.Bolt}
              title={cap.label}
              subtitle={cap.id}
              keywords={[cap.id, cap.name, ...cap.permissions]}
              detail={<List.Item.Detail markdown={capabilityMarkdown(cap)} />}
              actions={
                <ActionPanel>
                  <Action.Push title="Run" icon={Icon.Play} target={<RunForm cap={cap} />} />
                  <Action.CopyToClipboard title="Copy Capability ID" content={cap.id} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function capabilityMarkdown(cap: CapabilityInfo): string {
  const params = Object.entries(cap.params);
  const lines = [
    `## ${cap.label}`,
    "",
    `\`${cap.id}\``,
    "",
    cap.description || "_no description_",
    "",
    `**Permissions:** ${cap.permissions.length ? cap.permissions.map((p) => `\`${p}\``).join(", ") : "none"}`,
    cap.requiresConfirmation ? "**Confirmed in NoteDeck before running.**" : "",
    "",
    params.length ? "### Parameters" : "_No parameters_",
    ...params.map(
      ([name, p]) =>
        `- \`${name}\` (${p.type}${p.optional ? ", optional" : ""}${p.enum ? `: ${p.enum.join(" | ")}` : ""}) — ${p.description ?? ""}`,
    ),
    "",
    cap.returns?.description ? `**Returns:** ${cap.returns.description}` : "",
  ];
  return lines.join("\n");
}

/** 宣言表の params から Form を組む。array / object は JSON で受ける */
function RunForm({ cap }: { cap: CapabilityInfo }) {
  const { push } = useNavigation();
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const entries = Object.entries(cap.params);

  function set(name: string, v: string | boolean) {
    setValues((s) => ({ ...s, [name]: v }));
    setErrors((s) => ({ ...s, [name]: "" }));
  }

  function buildParams(): Record<string, unknown> | null {
    const out: Record<string, unknown> = {};
    const errs: Record<string, string> = {};
    for (const [name, p] of entries) {
      const raw = values[name];
      const empty = raw === undefined || raw === "";
      if (empty) {
        if (!p.optional && p.type !== "boolean") errs[name] = "Required";
        continue;
      }
      const parsed = parseParam(p, raw);
      if (parsed instanceof Error) errs[name] = parsed.message;
      else out[name] = parsed;
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return null;
    }
    return out;
  }

  async function submit() {
    const params = buildParams();
    if (!params) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: cap.requiresConfirmation ? "Waiting for confirmation in NoteDeck…" : "Running…",
    });
    try {
      const result = await execute<unknown>(cap.id, params);
      toast.hide();
      push(<ResultView cap={cap} result={result} />);
    } catch (e) {
      const { title, message } = describeError(e);
      toast.style = Toast.Style.Failure;
      toast.title = title;
      toast.message = message;
    }
  }

  return (
    <Form
      navigationTitle={cap.label}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" icon={Icon.Play} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title={cap.id} text={cap.description} />
      {entries.map(([name, p]) => {
        const title = `${name}${p.optional ? "" : " *"}`;
        if (p.type === "boolean") {
          return (
            <Form.Checkbox
              key={name}
              id={name}
              title={title}
              label={p.description ?? ""}
              value={values[name] === true}
              onChange={(v) => set(name, v)}
            />
          );
        }
        if (p.enum) {
          return (
            <Form.Dropdown
              key={name}
              id={name}
              title={title}
              info={p.description}
              value={typeof values[name] === "string" ? (values[name] as string) : ""}
              error={errors[name] || undefined}
              onChange={(v) => set(name, v)}
            >
              <Form.Dropdown.Item value="" title={p.optional ? "(omit)" : "(choose)"} />
              {p.enum.map((v) => (
                <Form.Dropdown.Item key={v} value={v} title={v} />
              ))}
            </Form.Dropdown>
          );
        }
        if (p.type === "array" || p.type === "object") {
          return (
            <Form.TextArea
              key={name}
              id={name}
              title={title}
              placeholder={p.type === "array" ? '["a", "b"] or a, b' : "{ ... } JSON"}
              info={p.description}
              value={typeof values[name] === "string" ? (values[name] as string) : ""}
              error={errors[name] || undefined}
              onChange={(v) => set(name, v)}
            />
          );
        }
        return (
          <Form.TextField
            key={name}
            id={name}
            title={title}
            placeholder={p.type === "number" ? "number" : ""}
            info={p.description}
            value={typeof values[name] === "string" ? (values[name] as string) : ""}
            error={errors[name] || undefined}
            onChange={(v) => set(name, v)}
          />
        );
      })}
    </Form>
  );
}

function parseParam(p: CapabilityParam, raw: string | boolean): unknown | Error {
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

function ResultView({ cap, result }: { cap: CapabilityInfo; result: unknown }) {
  const json = JSON.stringify(result ?? null, null, 2);
  const body = json.length > 20_000 ? `${json.slice(0, 20_000)}\n… (truncated, copy for the full result)` : json;
  return (
    <Detail
      navigationTitle={`${cap.label} — result`}
      markdown={`## ${cap.label}\n\n\`\`\`json\n${body}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result JSON" content={json} />
        </ActionPanel>
      }
    />
  );
}
