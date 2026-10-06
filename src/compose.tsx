import { type LaunchProps, showHUD } from "@raycast/api";
import { openDeepLink } from "./api";

/** `notedeck://compose?text=` で NoteDeck の投稿フォームを開くだけ (権限不要、送信は本人) */
export default async function Compose(props: LaunchProps<{ arguments: Arguments.Compose }>) {
  await openDeepLink("compose", { text: props.arguments.text?.trim() || undefined });
  await showHUD("Opened NoteDeck's post form");
}
