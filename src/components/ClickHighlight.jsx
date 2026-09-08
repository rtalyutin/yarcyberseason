import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowCounterClockwise, Crosshair, Cursor, X } from "@phosphor-icons/react";
import { getClickPoint, getImageAnchor, scheduleHighlight } from "../lib/click-highlight.js";
import "./click-highlight.css";

export function ClickHighlight({ imageRef }) {
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const pointerTypeRef = useRef("mouse");
  const titleId = useId();
  const [anchor, setAnchor] = useState(null);
  const [shot, setShot] = useState(null);
  const [phase, setPhase] = useState("freeze");
  const [discovered, setDiscovered] = useState(false);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const update = () => {
      const box = image.getBoundingClientRect();
      const parent = image.parentElement.getBoundingClientRect();
      const objectPosition = getComputedStyle(image).objectPosition;
      const [px, py] = objectPosition.split(" ").map((value) => parseFloat(value) / 100);
      const point = getImageAnchor(box, { width: image.naturalWidth, height: image.naturalHeight }, { x: px, y: py });
      if (!point) return;
      setAnchor({ x: box.left - parent.left + point.x, y: box.top - parent.top + point.y });
    };
    update();
    image.addEventListener("load", update);
    window.addEventListener("resize", update);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(image);
    observer?.observe(image.parentElement);
    return () => {
      image.removeEventListener("load", update);
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [imageRef]);

  const close = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    setShot(null);
  }, []);

  useEffect(() => {
    if (!shot) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    const run = scheduleHighlight((next) => {
      if (next === "done") close();
      else setPhase(next);
    }, { reducedMotion: shot.reducedMotion });
    cancelRef.current = run;
    // A crop captured at the click should never outlive a viewport/route change.
    window.addEventListener("resize", close);
    window.addEventListener("popstate", close);
    window.addEventListener("pagehide", close);
    return () => {
      run();
      window.removeEventListener("resize", close);
      window.removeEventListener("popstate", close);
      window.removeEventListener("pagehide", close);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true });
    };
  }, [shot, close]);

  function start(event) {
    if (shot || !imageRef.current) return;
    const image = imageRef.current;
    const box = image.getBoundingClientRect();
    const point = getClickPoint({ detail: event.detail, clientX: event.clientX, clientY: event.clientY,
      pointerType: event.nativeEvent.pointerType || pointerTypeRef.current }, event.currentTarget.getBoundingClientRect());
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase(reducedMotion ? "interview" : "freeze");
    setDiscovered(true);
    setShot({
      ...point,
      reducedMotion,
      src: image.currentSrc || image.src,
      image: { left: box.left, top: box.top, width: box.width, height: box.height, objectPosition: getComputedStyle(image).objectPosition },
    });
  }

  return <>
    <div className="click-highlight-anchor" style={anchor ? { left: anchor.x, top: anchor.y } : { visibility: "hidden" }}>
      <button ref={triggerRef} type="button" className={`click-highlight-trigger${discovered ? " is-discovered" : ""}`}
        onClick={start} onPointerDown={(event) => { pointerTypeRef.current = event.pointerType; }}
        aria-label={discovered ? "Повторить хайлайт клика" : "Нажать на прицел"}
        aria-haspopup="dialog" aria-expanded={Boolean(shot)}>
        <Crosshair size={40} weight="bold" aria-hidden="true" />
        {discovered && <span className="click-highlight-keepsake">Здесь был хайлайт <ArrowCounterClockwise size={12} aria-hidden="true" /></span>}
      </button>
    </div>
    {shot && createPortal(<dialog ref={dialogRef}
      className={`click-highlight-film click-highlight-film--${phase}${shot.reducedMotion ? " is-reduced-motion" : ""}`}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); close(); }}
      style={{ "--shot-x": `${shot.x}px`, "--shot-y": `${shot.y}px` }}>
      <div className="click-highlight-camera" aria-hidden="true">
        <img className="click-highlight-image" src={shot.src} alt="" style={shot.image} />
        <div className="click-highlight-reticle"><Crosshair size={48} weight="bold" /></div>
        <div className={`click-highlight-pointer${shot.touch ? " is-touch" : ""}`}>
          {shot.touch ? <span /> : <Cursor size={82} weight="fill" />}
        </div>
      </div>
      <div className="click-highlight-shockwave" aria-hidden="true" />
      <div className="click-highlight-chrome">
        <header className="click-highlight-header">
          <span>YAR CYBER SEASON</span>
          <span className="click-highlight-replay-label">{phase === "freeze" ? "СТОП-КАДР" : "ПОВТОР МОМЕНТА"}</span>
          <button type="button" onClick={close} className="click-highlight-close" aria-label="Закрыть хайлайт" autoFocus><X size={22} aria-hidden="true" /></button>
        </header>
        <h2 id={titleId} className="click-highlight-sr-only">Хайлайт твоего клика</h2>
        <div className="click-highlight-copy" aria-live="polite" aria-atomic="true">
          {phase === "freeze" && <div className="click-highlight-beat">
            <span className="click-highlight-eyebrow">ВНИМАНИЕ НА ЭКРАН</span>
            <p className="click-highlight-headline">СТОП.</p>
            <p className="click-highlight-subtitle">ВЫ ЭТО ВИДЕЛИ?</p>
          </div>}
          {phase === "replay" && <div className="click-highlight-replay-copy">
            <span className="click-highlight-eyebrow">РЕШАЮЩИЙ КЛИК</span>
            <p>СМОТРИМ ПОВТОР.</p>
            <span className="click-highlight-slowmo">SLOW MOTION</span>
          </div>}
          {phase === "impact" && <div className="click-highlight-beat click-highlight-victory">
            <span className="click-highlight-eyebrow">МОМЕНТ РЕШАЕТ ВСЁ</span>
            <p className="click-highlight-headline">ОН <span>ПОПАЛ.</span></p>
            <p className="click-highlight-subtitle">С ПЕРВОГО РАЗА.</p>
          </div>}
          {phase === "interview" && <div className="click-highlight-interview">
            <div className="click-highlight-player" aria-hidden="true">{shot.touch ? <Crosshair size={90} weight="bold" /> : <Cursor size={90} weight="fill" />}</div>
            <div>
              <span className="click-highlight-eyebrow">{shot.reducedMotion ? "ОН ПОПАЛ. С ПЕРВОГО РАЗА." : "ПОСЛЕМАТЧЕВОЕ ИНТЕРВЬЮ"}</span>
              <p className="click-highlight-question">— Как вам это удалось?</p>
              <p className="click-highlight-answer">Я просто<br />нажал.</p>
            </div>
          </div>}
        </div>
        <footer className="click-highlight-footer"><span>ХАЙЛАЙТ ТВОЕГО КЛИКА</span><span>ЯрКиберСезон</span></footer>
        <div className="click-highlight-progress" aria-hidden="true"><span /></div>
      </div>
    </dialog>, document.body)}
  </>;
}
