import { useEffect, useRef, useState } from 'react';
import './techies/egg.css';

export function TechiesEgg() {
  const [Game, setGame] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const trigger = useRef(null), active = useRef(true);
  const wasOpen = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { if (wasOpen.current && !open) trigger.current?.focus(); wasOpen.current = open; }, [open]);
  const launch = async () => {
    if (loading) return;
    setError(false);
    if (Game) { setOpen(true); return; }
    setLoading(true);
    try {
      const module = await import('./techies/TechiesGame.jsx');
      if (active.current) { setGame(() => module.default); setOpen(true); }
    } catch { if (active.current) setError(true); }
    finally { if (active.current) setLoading(false); }
  };
  const close = () => setOpen(false);
  return <>
    <div className="techies-egg">
      <button type="button" ref={trigger} className="techies-egg-trigger" onClick={launch} aria-label="Подозрительная бомба Течиса — открыть сапёр" aria-haspopup="dialog" aria-expanded={open} aria-busy={loading} title="Это ещё что здесь?">
        <img src="/assets/techies/bomb-icon.webp" alt="" width="64" height="64" />
        <span>{loading ? 'Открываем…' : error ? 'Не загрузилось. Ещё раз?' : 'Не трогать'}</span>
      </button>
      {error && <span className="techies-egg-error" role="status">Не удалось открыть игру. Попробуй ещё раз.</span>}
    </div>
    {open && Game && <Game onClose={close} />}
  </>;
}
