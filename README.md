# NoteDeck for Raycast

Post, search and jump around [NoteDeck](https://github.com/notedeck-dev/notedeck) (a Misskey client, "Misskey Pro") from Raycast. The extension talks to NoteDeck's built-in HTTP API on `127.0.0.1:19820`, so NoteDeck has to be running on the same machine.

## Commands

| Command | What it does |
| --- | --- |
| **Post Note** | Write a note (account / CW / visibility) and post it. NoteDeck shows its usual confirmation before sending. |
| **Search My Notes** | Search your own notes and local memos in NoteDeck's archive. Enter opens the note in NoteDeck. |
| **Jump to Column** | Pick a deck column and focus it in NoteDeck. |
| **New Memo** | Create a local memo. NoteDeck confirms before writing. |

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

The extension only uses public endpoints of NoteDeck: `GET /api/deck/columns` and `POST /api/capabilities/{id}/execute`, plus `notedeck://` deep links to focus the app. Nothing is sent anywhere else.

## License

MIT. NoteDeck itself is AGPL-3.0; this extension is a separate client of its public API.
