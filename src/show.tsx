import { showHUD, showToast, Toast } from "@raycast/api";
import { describeError, execute } from "./api";

/** `app.show` で NoteDeck のウィンドウを前に出す */
export default async function Show() {
  try {
    await execute("app.show");
    await showHUD("NoteDeck shown");
  } catch (e) {
    const { title, message } = describeError(e);
    await showToast({ style: Toast.Style.Failure, title, message });
  }
}
