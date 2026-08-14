/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Forge API Token (v2) - Forge API v1 is retired, so this needs a new v2 token. Create one at forge.laravel.com/profile/api — see the README for the scopes to tick. */
  "laravel_forge_api_token": string,
  /** Laravel Forge SSH User - Change the SSH user to login with */
  "laravel_forge_ssh_user": string,
  /** Forge API Token 2 (optional) - Optionally add a second account. */
  "laravel_forge_api_token_two"?: string,
  /** Laravel Forge SSH User 2 (optional) - Change the SSH user to login with on the second account */
  "laravel_forge_ssh_user_two": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
  /** Preferences accessible in the `check-deploy-status` command */
  export type CheckDeployStatus = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {
  /** Server */
  "server": string
}
  /** Arguments passed to the `check-deploy-status` command */
  export type CheckDeployStatus = {}
}

