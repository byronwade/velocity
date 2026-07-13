// Arc-style browser sidebar — in Browse mode the left panel becomes the
// browser's tab/bookmark rail. Bookmarks and quick links live here (not a
// cramped in-page bar); clicking one drives the browser pane via the same
// navigate event the agent uses.

import { useSyncExternalStore } from 'react';
import { useServices } from '../services/container';
import { BROWSER_HOME } from '../services/browser';
import { Icon } from '../lib/icons';

function go(url: string) {
	window.dispatchEvent(new CustomEvent('velocity:navigate', { detail: { url } }));
}

export function BrowserSidebar() {
	const { browser } = useServices();
	useSyncExternalStore(browser.subscribe, browser.getSnapshot);
	const bookmarks = browser.getBookmarks();

	return (
		<div className="bside">
			<button className="bside-new" onClick={() => go(BROWSER_HOME)}><Icon.plus />New tab</button>

			<div className="bside-group">Quick links</div>
			<button className="bside-row" onClick={() => go('http://localhost:3000')}>
				<span className="bside-fav live" /><span>Local app · localhost:3000</span>
			</button>

			<div className="bside-group">Bookmarks<span className="bside-n">{bookmarks.length}</span></div>
			{bookmarks.length === 0 && <div className="bside-empty">Star a page to pin it here.</div>}
			{bookmarks.map((b) => (
				<div className="bside-item" key={b.url}>
					<button className="bside-row" title={b.url} onClick={() => go(b.url)}>
						<span className="bside-fav"><Icon.browser /></span>
						<span className="bside-title">{b.title}</span>
					</button>
					<button className="bside-x" title="Remove bookmark" aria-label="Remove bookmark" onClick={() => browser.toggleBookmark(b.url)}><Icon.close /></button>
				</div>
			))}
		</div>
	);
}
