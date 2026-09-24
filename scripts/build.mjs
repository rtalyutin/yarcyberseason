import { execFileSync } from 'node:child_process';
import { build } from 'vite';

// Share one timestamp between the client bundle and server rendering.
process.env.YCS_BUILD_GENERATED_AT = new Date().toISOString();

await build();
for (const script of ['scripts/community-build.mjs', 'scripts/prerender.mjs', 'scripts/prepare-sites-build.mjs']) {
  execFileSync(process.execPath, [script], { stdio: 'inherit', env: process.env });
}
