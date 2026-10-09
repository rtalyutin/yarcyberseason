import { writeFile } from 'node:fs/promises';

// This prepares a public configuration only; it does not deploy or log tokens.
const target = new URL(process.env.YCS_CAPTAIN_SERVICE_URL || 'about:blank');
if (target.protocol !== 'https:' || target.username || target.password || target.search ||
    target.hash || target.pathname !== '/api/captain') {
  throw new Error('YCS_CAPTAIN_SERVICE_URL must be an HTTPS /api/captain URL without credentials or query.');
}
await writeFile(new URL('../serverless/tgcloud/lib/config.js', import.meta.url),
  `// Public service address, generated for the selected release.\nexport const captainServiceUrl = ${JSON.stringify(target.href)};\n`);
console.log('Captain Serverless service address prepared; nothing deployed.');
