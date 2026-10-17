// Fondo ilustrado de los Andes que se ve detrás de los paneles de vidrio.

const CLOUD = (
  <svg viewBox="0 0 120 50" aria-hidden="true">
    <g fill="#fff" opacity="0.9">
      <ellipse cx="38" cy="32" rx="30" ry="16" />
      <ellipse cx="66" cy="24" rx="28" ry="20" />
      <ellipse cx="92" cy="34" rx="24" ry="13" />
      <rect x="14" y="30" width="96" height="16" rx="8" />
    </g>
  </svg>
)

export default function Paisaje({ className = '' }) {
  return (
    <div className={`paisaje ${className}`} aria-hidden="true">
      <svg className="paisaje__svg" viewBox="0 0 393 852" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="pz-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F1CDB4" />
            <stop offset="0.42" stopColor="#FAF0E4" />
            <stop offset="1" stopColor="#F3EBDD" />
          </linearGradient>
          <linearGradient id="pz-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E6C3AA" />
            <stop offset="1" stopColor="#F2E3D3" />
          </linearGradient>
          <linearGradient id="pz-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D4A982" />
            <stop offset="1" stopColor="#E9D4BA" />
          </linearGradient>
          <linearGradient id="pz-green" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6E9D8C" />
            <stop offset="1" stopColor="#BBD4C8" />
          </linearGradient>
          <linearGradient id="pz-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#C67A55" />
            <stop offset="1" stopColor="#EBC1A6" />
          </linearGradient>
        </defs>
        <rect width="393" height="852" fill="url(#pz-sky)" />
        <g className="paisaje__sol">
          <circle cx="296" cy="190" r="104" fill="#F4C3A0" opacity="0.32" />
          <circle cx="296" cy="190" r="70" fill="#F0AE86" opacity="0.5" />
          <circle cx="296" cy="190" r="46" fill="#EC9B6E" opacity="0.85" />
        </g>
        {/* Illimani con nieve */}
        <path d="M-20 470 L58 362 L94 394 L150 296 L190 344 L232 268 L282 350 L322 316 L413 430 L413 540 L-20 540 Z" fill="url(#pz-far)" />
        <path d="M150 296 L134 320 L146 316 L152 328 L161 314 L168 322 Z M232 268 L212 298 L225 293 L234 307 L243 291 L254 300 Z M58 362 L45 381 L56 376 L63 386 L71 377 Z M322 316 L310 332 L320 329 L327 338 L334 330 Z" fill="#fff" opacity="0.92" />
        <path d="M-20 568 C 40 504, 92 522, 140 486 S 238 470, 290 512 S 372 470, 413 500 L413 650 L-20 650 Z" fill="url(#pz-mid)" />
        {/* Yungas */}
        <path d="M-20 650 C 52 596, 120 626, 182 604 S 300 574, 413 612 L413 770 L-20 770 Z" fill="url(#pz-green)" />
        <path d="M20 612 l10 -26 l10 26 Z M48 606 l8 -22 l8 22 Z M232 588 l10 -28 l10 28 Z M262 584 l8 -22 l8 22 Z M340 596 l10 -26 l10 26 Z M364 600 l8 -20 l8 20 Z" fill="#2E6B5B" opacity="0.55" />
        <path d="M-20 742 C 80 700, 160 730, 240 708 S 360 688, 413 706 L413 852 L-20 852 Z" fill="url(#pz-near)" opacity="0.8" />
        <path d="M-20 770 C 90 740, 170 766, 250 748 S 360 732, 413 744 M-20 800 C 90 772, 170 798, 250 780 S 360 764, 413 776 M-20 830 C 90 804, 170 830, 250 812 S 360 796, 413 808" fill="none" stroke="#FAF6EF" strokeWidth="3" opacity="0.4" />
        <g className="paisaje__aves">
          <path d="M78 236 q6 -6 12 0 q6 -6 12 0 M120 268 q5 -5 10 0 q5 -5 10 0" fill="none" stroke="#2A211C" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        </g>
      </svg>
      <span className="nube nube--1">{CLOUD}</span>
      <span className="nube nube--2">{CLOUD}</span>
      <span className="nube nube--3">{CLOUD}</span>
    </div>
  )
}

/** Cinta de líneas onduladas de la marca (terracota, verde, beige y blanco). */
export function Onda({ className = '', ancho = false }) {
  if (ancho) {
    return (
      <svg className={`onda ${className}`} viewBox="0 0 1440 260" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-20 140 C 220 20, 470 230, 750 120 S 1250 30, 1460 130" stroke="#D6C3A3" strokeWidth="18" strokeLinecap="round" fill="none" />
        <path d="M-20 160 C 220 40, 470 250, 750 140 S 1250 50, 1460 150" stroke="#C2603A" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M-20 182 C 220 62, 470 272, 750 162 S 1250 72, 1460 172" stroke="#2E6B5B" strokeWidth="10" strokeLinecap="round" fill="none" />
        <path d="M-20 118 C 240 0, 440 210, 750 98 S 1230 14, 1460 108" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
      </svg>
    )
  }
  return (
    <svg className={`onda ${className}`} viewBox="0 0 393 96" preserveAspectRatio="none" aria-hidden="true">
      <path d="M-10 58 C 60 8, 130 98, 205 50 S 340 14, 405 54" stroke="#D6C3A3" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M-10 66 C 60 16, 130 106, 205 58 S 340 22, 405 62" stroke="#C2603A" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M-10 76 C 60 26, 130 116, 205 68 S 340 32, 405 72" stroke="#2E6B5B" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M-10 48 C 70 0, 120 88, 205 40 S 330 8, 405 44" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}
