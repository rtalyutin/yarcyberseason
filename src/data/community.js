import { tournaments } from './tournaments/index.js';
import registry from './teams.json';
import { buildCommunityModel } from '../lib/community.js';

export const community = buildCommunityModel(tournaments, registry);
