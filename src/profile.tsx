import { type LaunchProps, showHUD } from "@raycast/api";
import { openDeepLink } from "./api";

/** `notedeck://profile/<name>` でデッキプロファイルを切り替える (表示名か id) */
export default async function Profile(props: LaunchProps<{ arguments: Arguments.Profile }>) {
  const name = props.arguments.name.trim();
  await openDeepLink(`profile/${encodeURIComponent(name)}`);
  await showHUD(`Switching NoteDeck profile to “${name}”`);
}
