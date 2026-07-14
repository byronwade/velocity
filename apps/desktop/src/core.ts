// Velocity app core — Model, Msg, update in the app-core subset, compiled
// to native Zig at build time. The view (src/app.native) binds these field
// names verbatim; exported single-model helpers (categories) become
// bindings too, and `for each="categories"` iterates the returned slice.

import { asciiBytes } from "@native-sdk/core";

export type CategoryId = "general" | "editor" | "ai" | "appearance" | "about";
export type StartupMode = "restore" | "welcome" | "empty";
export type DataSharing = "none" | "errors" | "usage";

export interface Category {
  readonly id: CategoryId;
  readonly label: Uint8Array;
}

// A rodata table (folds at compile time; shared for free at commit).
const CATEGORIES: readonly Category[] = [
  { id: "general", label: asciiBytes("General") },
  { id: "editor", label: asciiBytes("Editor") },
  { id: "ai", label: asciiBytes("AI") },
  { id: "appearance", label: asciiBytes("Appearance") },
  { id: "about", label: asciiBytes("About") },
];

export interface Model {
  readonly category: CategoryId;
  readonly loggedIn: boolean;
  readonly showTips: boolean;
  readonly startupMode: StartupMode;
  readonly notifyUpdates: boolean;
  readonly notifySounds: boolean;
  readonly dataSharing: DataSharing;
}

export function initialModel(): Model {
  return {
    category: "general",
    loggedIn: true,
    showTips: true,
    startupMode: "restore",
    notifyUpdates: true,
    notifySounds: false,
    dataSharing: "errors",
  };
}

// The sidebar iterable: `for each="categories" as="c"` reads this.
export function categories(_model: Model): readonly Category[] {
  return CATEGORIES;
}

export type Msg =
  | { readonly kind: "select_category"; readonly category: CategoryId }
  | { readonly kind: "toggle_tips" }
  | { readonly kind: "set_startup_restore" }
  | { readonly kind: "set_startup_welcome" }
  | { readonly kind: "set_startup_empty" }
  | { readonly kind: "toggle_notify_updates" }
  | { readonly kind: "toggle_notify_sounds" }
  | { readonly kind: "set_sharing_none" }
  | { readonly kind: "set_sharing_errors" }
  | { readonly kind: "set_sharing_usage" }
  | { readonly kind: "log_out" };

export function update(model: Model, msg: Msg): Model {
  switch (msg.kind) {
    case "select_category":
      return { ...model, category: msg.category };
    case "toggle_tips":
      return { ...model, showTips: !model.showTips };
    case "set_startup_restore":
      return { ...model, startupMode: "restore" };
    case "set_startup_welcome":
      return { ...model, startupMode: "welcome" };
    case "set_startup_empty":
      return { ...model, startupMode: "empty" };
    case "toggle_notify_updates":
      return { ...model, notifyUpdates: !model.notifyUpdates };
    case "toggle_notify_sounds":
      return { ...model, notifySounds: !model.notifySounds };
    case "set_sharing_none":
      return { ...model, dataSharing: "none" };
    case "set_sharing_errors":
      return { ...model, dataSharing: "errors" };
    case "set_sharing_usage":
      return { ...model, dataSharing: "usage" };
    case "log_out":
      return { ...model, loggedIn: false };
  }
}
