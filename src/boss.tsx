import { showHUD, showToast, Toast } from "@raycast/api";
import { describeError, execute } from "./api";
import { SHORT_TIMEOUT_MS } from "./logic";

/** `app.hide` で NoteDeck のウィンドウを隠す (Boss Key と同じ) */
export default async function Boss() {
  try {
    await execute("app.hide", undefined, SHORT_TIMEOUT_MS);
    await showHUD("NoteDeck hidden");
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, ...describeError(e) });
  }
}
