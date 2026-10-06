import { showHUD, showToast, Toast } from "@raycast/api";
import { describeError, execute } from "./api";

/** `app.hide` で NoteDeck のウィンドウを隠す (Boss Key と同じ) */
export default async function Boss() {
  try {
    await execute("app.hide");
    await showHUD("NoteDeck hidden");
  } catch (e) {
    const { title, message } = describeError(e);
    await showToast({ style: Toast.Style.Failure, title, message });
  }
}
