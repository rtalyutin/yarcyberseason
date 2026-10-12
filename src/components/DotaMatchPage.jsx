import { useDotaMvp } from '../lib/dota-mvp-client.js';
import { MatchCenterPage } from './MatchCenterPage.jsx';

export function DotaMatchPage({ tournament, match }) {
  const state = useDotaMvp(tournament);
  return <MatchCenterPage key={`${tournament.id}:${match.id}`} tournament={tournament} match={match} dotaState={state} />;
}
