const store = {
  async get(key) {
    const result = await chrome.storage.sync.get(key);
    return result[key];
  },
  async set(key, value) {
    await chrome.storage.sync.set({ [key]: value });
  },
  subscribe(key, fn) {
    const handler = changes => {
      if (key in changes) fn(changes[key].newValue);
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }
};
