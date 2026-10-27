import { useEffect, useRef } from 'react';

// Presentation only: no timers, routing, focus moves, or data changes.
export const THEME_MOTION = Object.freeze({
  cs2: { duration: 200, easing: 'steps(3, end)', frames: [{ opacity: .45, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }] },
  dota2: { duration: 300, easing: 'cubic-bezier(.22,.68,.25,1)', frames: [{ opacity: .5, transform: 'scale(.992)' }, { opacity: 1, transform: 'none' }] },
  corporate: { duration: 200, easing: 'cubic-bezier(.2,.65,.3,1)', frames: [{ opacity: .6, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }] },
});

export function useThemeMotion(rootRef, theme, revision) {
  const animation = useRef(null);
  const previousTheme = useRef(theme);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    const cancel = () => { cancelAnimationFrame(frame); animation.current?.cancel(); };
    const animatePanel = (panel) => {
      cancel();
      if (media.matches || !panel?.animate) return;
      const motion = THEME_MOTION[theme] || THEME_MOTION.cs2;
      animation.current = panel.animate(motion.frames, { duration: motion.duration, easing: motion.easing });
    };
    const activate = (event) => {
      const control = event.target.closest?.('.tn-section-link, .tn-filters button, [role="tab"], .ycs-theme-switcher button');
      if (!control || !root.contains(control) || control.disabled) return;
      frame = requestAnimationFrame(() => {
        const id = control.getAttribute('aria-controls');
        const panel = (id && document.getElementById(id)) || root.querySelector('.tn-content') || root.querySelector('.site-page-content') || root.querySelector('main');
        if (panel && root.contains(panel)) animatePanel(panel);
      });
    };
    root.addEventListener('click', activate);
    media.addEventListener('change', cancel);
    return () => { cancel(); root.removeEventListener('click', activate); media.removeEventListener('change', cancel); };
  }, [rootRef, theme, revision]);
  useEffect(() => {
    if (previousTheme.current === theme) return;
    previousTheme.current = theme;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const panel = rootRef.current?.querySelector('.site-page-content, main');
    if (!panel?.animate) return;
    const motion = THEME_MOTION[theme] || THEME_MOTION.cs2;
    animation.current = panel.animate(motion.frames, { duration: motion.duration, easing: motion.easing });
    return () => animation.current?.cancel();
  }, [rootRef, theme]);
}
