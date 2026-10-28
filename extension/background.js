chrome.action.onClicked.addListener((tab) => {
    if (!tab.id || !tab.url) return;
    try {
        const url = new URL(tab.url);
        if (url.host === 'www.dndbeyond.com') {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js'],
            });
        }
    } catch {
        // do nothing
    }
});
