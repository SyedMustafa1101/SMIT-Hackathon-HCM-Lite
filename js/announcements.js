/* Announcement persistence and role scope. No DOM dependencies. */
(function (root) {
  'use strict';
  function create(storage, requireRole, { clock, makeId }) {
    function list() {
      requireRole();
      const state = storage.state();
      return state.announcements.map(a => ({ ...a, authorName: state.users.find(u => u.id === a.authorId)?.name || `Unavailable author (${a.authorId})` }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
    }
    function post(input = {}) {
      const user = requireRole(['Admin']), errors = {};
      const title = typeof input.title === 'string' ? input.title.trim() : '';
      const body = typeof input.body === 'string' ? input.body.trim() : '';
      if (!title) errors.announcementTitle = 'Enter a nonblank title.';
      if (!body) errors.announcementBody = 'Enter a nonblank message.';
      if (Object.keys(errors).length) throw new root.HCM.ValidationError(errors);
      const time = clock();
      if (!time || !Number.isFinite(time.getTime())) throw new Error('The device clock is invalid. Correct it before posting.');
      const record = { id: makeId(), title, body, authorId: user.id, createdAt: time.toISOString() };
      storage.write({ announcements: [...storage.state().announcements, record] });
      return record;
    }
    return Object.freeze({ list, post });
  }
  root.HCMAnnouncements = Object.freeze({ create });
})(globalThis);
