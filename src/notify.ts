import { environment } from "@raycast/api";
import { constants } from "node:fs";
import { access, chmod } from "node:fs/promises";
import { join } from "node:path";
import { NotificationCenter, WindowsToaster } from "node-notifier";

const isWindows = process.platform === "win32";

const notifierPath = isWindows
  ? join(environment.assetsPath, "prebuilds", "snoreToast", "snoretoast-x64.exe")
  : join(
      environment.assetsPath,
      "prebuilds",
      "mac.noindex",
      "terminal-notifier.app",
      "Contents",
      "MacOS",
      "terminal-notifier",
    );

export const notify = async (title: string, message: string) => {
  await access(notifierPath, constants.X_OK).catch(() => chmod(notifierPath, 0o755));
  const notifier = isWindows
    ? new WindowsToaster({ customPath: notifierPath })
    : new NotificationCenter({ customPath: notifierPath });
  notifier.notify({ title, message });
};
