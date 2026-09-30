import { tournaments } from './tournaments/index.js';
import registry from './teams.json';
import rosters from './rosters.js';
import { buildCommunityModel } from '../lib/community.js';

export let community = buildCommunityModel(tournaments, registry, rosters);

export function rebuildCommunity() {
  community = buildCommunityModel(tournaments, registry, rosters);
}
