import { type LaunchProps, showHUD } from "@raycast/api";
import { openDeepLink } from "./api";

/** `notedeck://ai?prompt=` で AI カラムを開き、プロンプトを入力欄に入れる (送信は本人) */
export default async function AskAi(props: LaunchProps<{ arguments: Arguments.AskAi }>) {
  await openDeepLink("ai", { prompt: props.arguments.prompt?.trim() || undefined });
  await showHUD("Opened NoteDeck's AI column");
}
