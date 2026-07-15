// ---------------------------------------------------------------------------
// Ambient notifications — a soft chime + a desktop notification when a
// coworker finishes something worth reviewing.
//
// Web-standard on purpose: WebAudio for the chime (no asset, no dependency)
// and the Notification API for the desktop banner — both work in the Vite
// browser preview AND the Tauri webview. The Settings → Notifications
// "Checkpoint ready" toggle (vs.pref.nCheckpoint) gates all of it.
// ---------------------------------------------------------------------------

function pref(key: string, def: boolean): boolean {
	try {
		const raw = localStorage.getItem(`vs.pref.${key}`);
		return raw == null ? def : (JSON.parse(raw) as boolean);
	} catch { return def; }
}

let audio: AudioContext | null = null;
let lastChime = 0;

/** A quiet two-note rising chime (A5 → E6). Rate-limited so several projects
 *  landing work in the same window never stack into noise. */
export function chime(): void {
	const now = Date.now();
	if (now - lastChime < 30_000) return;
	try {
		audio ??= new AudioContext();
		if (audio.state === 'suspended') void audio.resume();
		const t = audio.currentTime;
		for (const [freq, at] of [[880, 0], [1318.5, 0.12]] as const) {
			const osc = audio.createOscillator();
			const gain = audio.createGain();
			osc.type = 'sine';
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0.0001, t + at);
			gain.gain.exponentialRampToValueAtTime(0.05, t + at + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.5);
			osc.connect(gain).connect(audio.destination);
			osc.start(t + at);
			osc.stop(t + at + 0.55);
		}
		lastChime = now;
	} catch { /* no audio available — fine */ }
}

import { nativeNotify } from './native';

function webNotify(title: string, body: string): void {
	try {
		if (typeof Notification === 'undefined') return;
		if (Notification.permission === 'granted') {
			new Notification(title, { body, silent: true });
		} else if (Notification.permission === 'default') {
			void Notification.requestPermission().then((p) => {
				if (p === 'granted') new Notification(title, { body, silent: true });
			});
		}
	} catch { /* notifications unsupported — the inbox still has it */ }
}

/** Chime, and when the window is in the background also raise a desktop
 *  notification — native (Tauri) first for installed-app identity, the web
 *  Notification API otherwise. In focus the toast + inbox carry the news. */
export function notifyCheckpoint(title: string, body: string): void {
	if (!pref('nCheckpoint', true)) return;
	chime();
	if (typeof document !== 'undefined' && !document.hidden) return;
	void nativeNotify(title, body).then((sent) => { if (!sent) webNotify(title, body); });
}
