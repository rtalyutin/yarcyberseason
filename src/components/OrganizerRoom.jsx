import { useEffect, useId, useRef, useState } from "react";
import { Heart, Trophy, X } from "@phosphor-icons/react";
import "./organizer-room.css";

export function OrganizerRoom() {
  const [turns, setTurns] = useState(0);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState("working");
  const dialog = useRef(null);
  const trigger = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const panel = dialog.current;
    panel.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      panel.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "celebrating") return;
    const timer = window.setTimeout(() => setPhase("returned"), 6500);
    return () => window.clearTimeout(timer);
  }, [open, phase]);

  function close() {
    setOpen(false);
    setTurns(0);
    setPhase("working");
    trigger.current?.focus();
  }

  function unscrew() {
    const next = Math.min(turns + 1, 3);
    setTurns(next);
    if (next === 3) setOpen(true);
  }

  return <div className="org-hatch">
    <button ref={trigger} type="button" className="org-screw" onClick={unscrew}
      style={{ "--screw-turn": `${turns * -120}deg`, "--screw-lift": `${turns * -3}px` }}
      aria-label={turns ? `Выкрутить винтик: ${turns} из 3` : "Выкрутить винтик"}
      aria-haspopup="dialog" aria-expanded={open}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M7 12h10M12 7v10" /></svg>
    </button>
    <span className="org-sr-only" role="status">{turns > 0 && turns < 3 ? `Винтик поддался. Ещё ${3 - turns}.` : ""}</span>
    {open && <dialog ref={dialog} className={`org-room org-room--${phase}`}
      aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="org-panel">
        <header className="org-heading">
          <span>ЯрКиберСезон / за кулисами</span>
          <button type="button" className="org-close" onClick={close} aria-label="Закрыть комнатку" autoFocus><X size={22} aria-hidden="true" /></button>
        </header>
        <div className="org-scene">
          <div className="org-art" role="img" aria-label={phase === "celebrating" ? "Счастливый пиксельный медведь снял гарнитуру. Рядом золотой кубок." : "Пиксельный медведь в гарнитуре проводит турнир за тремя мониторами. Рядом остывший чай."} />
          <div className="org-chat" aria-hidden="true" key={phase}>
            {phase === "celebrating" ? "♥" : "а мы когда играем?"}
          </div>
          {phase === "celebrating" && <Trophy className="org-trophy" size={76} weight="fill" aria-hidden="true" />}
          {phase === "returned" && <Trophy className="org-keepsake" size={32} weight="fill" aria-hidden="true" />}
          <span className="org-scene-label">ОРГАНИЗАТОРСКАЯ · −1 ЭТАЖ</span>
        </div>
        <div className="org-copy" aria-live="polite" aria-atomic="true">
          <h2 id={titleId}>{phase === "working" ? "Так вот кто здесь всё держит." : "MVP поддержки."}</h2>
          <p id={descriptionId}>{phase === "working" ? "Сетка сама себя не соберёт. И чай опять остыл." : phase === "celebrating" ? "Хоть кто-то спросил, как там организатор." : "Кубок — рядом. Гарнитура — на месте. И снова: «а мы когда играем?»"}</p>
        </div>
        <button type="button" className="org-pet" disabled={phase === "celebrating"} onClick={() => setPhase("celebrating")}>
          <Heart size={20} weight={phase === "celebrating" ? "fill" : "regular"} aria-hidden="true" />
          {phase === "celebrating" ? "Орг оттаивает…" : phase === "returned" ? "Погладить ещё раз" : "Погладить орга"}
        </button>
      </div>
    </dialog>}
  </div>;
}
