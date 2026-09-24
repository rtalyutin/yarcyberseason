import archive from './team-rosters.json' with { type: 'json' };
import autumn2026 from './team-rosters-autumn-2026.json' with { type: 'json' };

// Keep the historical archive immutable when a current tournament supplies new rosters.
export const rosters = {
  schemaVersion: 1,
  sources: [...archive.sources, ...autumn2026.sources],
  records: [...archive.records, ...autumn2026.records],
};

export default rosters;
