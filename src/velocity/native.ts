// ---------------------------------------------------------------------------
// Native bridge — the thin seam between the web app and the Tauri shell.
//
// Every function is a safe no-op in the browser preview: the Tauri modules
// are imported dynamically only when the webview is actually Tauri, so the
// Vite bundle carries no hard native dependency.
// ---------------------------------------------------------------------------

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Native desktop banner (installed-app identity + OS-managed delivery).
 *  Returns false when unavailable so the caller can fall back to the web
 *  Notification API. */
export async function nativeNotify(title: string, body: string): Promise<boolean> {
	if (!isTauri) return false;
	try {
		const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
		let granted = await isPermissionGranted();
		if (!granted) granted = (await requestPermission()) === 'granted';
		if (!granted) return false;
		sendNotification({ title, body });
		return true;
	} catch { return false; }
}

let lastCount = -1;

/** Reflect the cross-project inbox count in the system tray tooltip. */
export function setTrayAttention(count: number): void {
	if (!isTauri || count === lastCount) return;
	lastCount = count;
	void import('@tauri-apps/api/core')
		.then(({ invoke }) => invoke('set_attention_count', { count }))
		.catch(() => { /* tray unavailable — nothing to do */ });
}
