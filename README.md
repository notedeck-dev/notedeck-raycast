# NoteDeck for Raycast

Post, search and jump around [NoteDeck](https://github.com/notedeck-dev/notedeck) (a Misskey client, "Misskey Pro") from Raycast. The extension talks to NoteDeck's built-in HTTP API on `127.0.0.1:19820`, so NoteDeck has to be running on the same machine.

## Commands

| Command | What it does | Needs |
| --- | --- | --- |
| **Post Note** | Write a note (account / CW / visibility) and post it. NoteDeck shows its usual confirmation before sending. ⌘O hands the text to NoteDeck's own post form instead. | token + `notes.write` (⌘O: nothing) |
| **Open Post Form** | Open NoteDeck's post form, optionally with text (`notedeck://compose`). | nothing |
| **Search My Notes** | Search your own notes and local memos in NoteDeck's archive. Empty query = recent. Enter opens the note in NoteDeck. | token + `notes.readArchive`, `memos.read` |
| **Jump to Column** | Pick a deck column and focus it in NoteDeck. | token (`deck.read`, on by default) |
| **Switch Deck Profile** | Switch the deck profile by name (`notedeck://profile/<name>`). | nothing |
| **Ask AI** | Open NoteDeck's AI column with the prompt filled in (`notedeck://ai`). Sending is up to you. | nothing |
| **New Memo** | Create a local memo. NoteDeck confirms before writing. | token + `memos.write` |
| **Hide NoteDeck** / **Show NoteDeck** | Boss Key from Raycast: hide the window, or bring it back to the front (`app.hide` / `app.show`, NoteDeck 1.80+). | token (no permission) |
| **Run Capability** | Browse every NoteDeck capability (what the command palette, plugins and AI can do) and run one with parameters. Results are shown as JSON. | token + whatever the capability needs |

Commands marked "nothing" use `notedeck://` deep links: no token, no permission, no confirmation dialog, because you are the one clicking. They just need NoteDeck installed (it is launched if not running).

## Setup

1. In NoteDeck open **Settings → Permissions → API tokens** and issue a token. Paste it into the extension's preferences.
2. External tools get a read-only permission set by default. In the same Permissions window, under the **External** principal, allow what you want to use:
   - `notes.write` for **Post Note**
   - `notes.readArchive` for **Search My Notes** (notes), `memos.read` for memos
   - `memos.write` for **New Memo**
   - `account.read` and `deck.read` are needed for the account picker and the column list (on by default)
3. Writes (post / memo) are always confirmed inside the NoteDeck window. The Raycast toast waits until you answer there.

If you changed the HTTP API port, set **NoteDeck API URL** in preferences.

## Development

```sh
npm install
npm run dev      # ray develop (needs Raycast on macOS or Windows)
npm run build    # ray build
npm run lint
npm run typecheck
```

The extension only uses NoteDeck's local endpoints: `GET /api/capabilities`, `GET /api/deck/columns`, `POST /api/capabilities/{id}/execute`, plus `notedeck://` deep links. Nothing is sent anywhere else. `ray lint` / `ray build` run on Linux (WSL) too; only `ray develop` needs the Raycast app.

## License

MIT. NoteDeck itself is AGPL-3.0; this extension is a separate client of its public API.
