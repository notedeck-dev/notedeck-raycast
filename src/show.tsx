import { showHUD, showToast, Toast } from "@raycast/api";
import { describeError, execute } from "./api";
import { SHORT_TIMEOUT_MS } from "./logic";

/** `app.show` で NoteDeck のウィンドウを前に出す */
export default async function Show() {
  try {
    await execute("app.show", undefined, SHORT_TIMEOUT_MS);
    await showHUD("NoteDeck shown");
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, ...describeError(e) });
  }
}
