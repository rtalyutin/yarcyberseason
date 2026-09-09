export function TeamLogo({ team, logo, className = '' }) {
  return <img className={className} src={logo || team?.logo || '/assets/teams/_default.svg'} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/assets/teams/_default.svg'; }} />;
}
