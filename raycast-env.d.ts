/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** NoteDeck API URL - Base URL of the built-in HTTP API. Leave the default unless you changed the port. */
  "baseUrl": string,
  /** API Token - Persistent API token issued in NoteDeck: Settings → Permissions → API tokens. */
  "token": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `post` command */
  export type Post = ExtensionPreferences & {}
  /** Preferences accessible in the `compose` command */
  export type Compose = ExtensionPreferences & {}
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {}
  /** Preferences accessible in the `columns` command */
  export type Columns = ExtensionPreferences & {}
  /** Preferences accessible in the `profile` command */
  export type Profile = ExtensionPreferences & {}
  /** Preferences accessible in the `ask-ai` command */
  export type AskAi = ExtensionPreferences & {}
  /** Preferences accessible in the `memo` command */
  export type Memo = ExtensionPreferences & {}
  /** Preferences accessible in the `run` command */
  export type Run = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `post` command */
  export type Post = {}
  /** Arguments passed to the `compose` command */
  export type Compose = {
  /** Text */
  "text": string
}
  /** Arguments passed to the `search` command */
  export type Search = {}
  /** Arguments passed to the `columns` command */
  export type Columns = {}
  /** Arguments passed to the `profile` command */
  export type Profile = {
  /** Profile name */
  "name": string
}
  /** Arguments passed to the `ask-ai` command */
  export type AskAi = {
  /** Prompt */
  "prompt": string
}
  /** Arguments passed to the `memo` command */
  export type Memo = {}
  /** Arguments passed to the `run` command */
  export type Run = {}
}

