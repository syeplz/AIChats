const chatList = {
  generateId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  },

  add(list, { name, url, icon }) {
    if (!name || !url) throw new Error(_('chatList_errorNameUrlRequired'));
    if (list.some(c => c.url === url)) throw new Error(_('chatList_errorDuplicateUrl'));
    return [...list, { id: chatList.generateId(), name, url, icon: icon || '', enabled: true, inject: true, submitByEnter: true }];
  },

  edit(list, id, { name, url, icon }) {
    if (!name || !url) throw new Error(_('chatList_errorNameUrlRequired'));
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return list;
    if (list.some(c => c.url === url && c.id !== id)) throw new Error(_('chatList_errorDuplicateUrl'));
    const updated = [...list];
    updated[idx] = { ...updated[idx], name, url, icon: icon || updated[idx].icon };
    return updated;
  },

  remove(list, id) {
    return list.filter(c => c.id !== id);
  },

  setEnabled(list, id, enabled) {
    return list.map(c => c.id === id ? { ...c, enabled } : c);
  },

  move(list, id, dir) {
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return list;
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= list.length) return list;
    const updated = [...list];
    [updated[idx], updated[swap]] = [updated[swap], updated[idx]];
    return updated;
  }
};
