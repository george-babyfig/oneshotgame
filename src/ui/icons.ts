// Custom UI icon set: chunky two-tone SVGs that match the game's rounded style.
const ICONS: Record<string, string> = {
  map: `<path d="M6 9l10-4 12 4 10-4v28l-10 4-12-4-10 4z" fill="#5ec8ff"/><path d="M16 5v28M28 9v28" stroke="#1d5f9e" stroke-width="3"/><path d="M9 19c4-3 8 3 12 0s7 2 11-1" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="1 5"/><circle cx="31" cy="16" r="4" fill="#ff6a7a"/>`,
  book: `<path d="M22 10c-5-4-11-4-16-2v26c5-2 11-2 16 2z" fill="#5ef2b0"/><path d="M22 10c5-4 11-4 16-2v26c-5-2-11-2-16 2z" fill="#3fc48f"/><path d="M22 10v26" stroke="#0e6e52" stroke-width="3"/><circle cx="13" cy="19" r="3.5" fill="#fff"/><circle cx="31" cy="21" r="3" fill="#fff"/>`,
  up: `<rect x="7" y="7" width="30" height="30" rx="9" fill="#ffd76a"/><path d="M22 30V15M15 21l7-7 7 7" stroke="#8a5a00" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  bag: `<path d="M9 16h26l-2 20H11z" fill="#ff8fc8"/><path d="M16 17v-4a6 6 0 0 1 12 0v4" stroke="#b8467e" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M18 26l3 3 6-6" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  scroll: `<rect x="10" y="7" width="24" height="30" rx="5" fill="#ffe7a8"/><rect x="8" y="5" width="28" height="7" rx="3.5" fill="#e0b050"/><rect x="8" y="32" width="28" height="7" rx="3.5" fill="#e0b050"/><path d="M15 18h14M15 24h10" stroke="#a0743a" stroke-width="3" stroke-linecap="round"/>`,
  road: `<path d="M17 38l3-32h4l3 32z" fill="#9aa3c8"/><path d="M22 10v4M22 20v5M22 31v5" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M10 12l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#ffd24a"/><path d="M34 22l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#ffd24a"/>`,
  medal: `<path d="M14 5h6l4 12h-6zM30 5h-6l-4 12h6z" fill="#6e8cff"/><circle cx="22" cy="27" r="11" fill="#ffc94a"/><circle cx="22" cy="27" r="7" fill="#ffe08a"/><path d="M22 22l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#e89a1a"/>`,
  pad: `<path d="M8 17c0-4 3-6 7-6h14c4 0 7 2 7 6l2 12c1 5-5 8-8 3l-2-3H16l-2 3c-3 5-9 2-8-3z" fill="#b58cff"/><path d="M15 17v7M11.5 20.5h7" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="29" cy="18" r="2.4" fill="#ff8fc8"/><circle cx="33" cy="22" r="2.4" fill="#5ef2b0"/>`,
  pig: `<ellipse cx="22" cy="24" rx="15" ry="12" fill="#ffb3cf"/><path d="M13 14l2-6 5 5z" fill="#ff8fb8"/><ellipse cx="33" cy="25" rx="5" ry="4" fill="#ff8fb8"/><circle cx="32" cy="25" r="1" fill="#b8467e"/><circle cx="34.5" cy="25" r="1" fill="#b8467e"/><circle cx="25" cy="20" r="1.8" fill="#3a1f3a"/><rect x="17" y="11" width="9" height="3" rx="1.5" fill="#b8467e"/><path d="M12 34v4M28 34v4" stroke="#ff8fb8" stroke-width="4" stroke-linecap="round"/>`,
  gear: `<circle cx="22" cy="22" r="11" fill="none" stroke="#c9c2ff" stroke-width="7" stroke-dasharray="4.3 3"/><circle cx="22" cy="22" r="8" fill="#c9c2ff"/><circle cx="22" cy="22" r="3.5" fill="#2a2560"/>`,
  back: `<path d="M26 10L14 22l12 12" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  pause: `<rect x="13" y="11" width="6" height="22" rx="2" fill="#fff"/><rect x="25" y="11" width="6" height="22" rx="2" fill="#fff"/>`,
};

export type IconName = keyof typeof ICONS;

export function icon(name: string, size = 26): SVGSVGElement | string {
  const body = ICONS[name];
  if (!body) return name; // fall back to text (emoji)
  const wrap = document.createElement('span');
  wrap.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 44 44" aria-hidden="true">${body}</svg>`;
  return wrap.firstElementChild as SVGSVGElement;
}
