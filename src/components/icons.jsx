const Svg = ({ children, size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
);

export const ArrowLeft = (p) => <Svg {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></Svg>;
export const ArrowRight = (p) => <Svg {...p}><path d="M5 12h14M12 5l7 7-7 7" /></Svg>;
export const Shuffle = (p) => <Svg {...p}><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></Svg>;
export const Pencil = (p) => <Svg {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg>;
export const Trash = (p) => <Svg {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></Svg>;
export const Plus = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const X = (p) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>;
export const Home = (p) => <Svg {...p}><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3Z" /></Svg>;
export const Folder = (p) => <Svg {...p}><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></Svg>;
export const Cards = (p) => <Svg {...p}><rect x="3" y="6" width="14" height="14" rx="2" /><path d="M7 2h12a2 2 0 0 1 2 2v12" /></Svg>;
export const Upload = (p) => <Svg {...p}><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></Svg>;
export const Search = (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>;
export const Send = (p) => <Svg {...p}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></Svg>;
export const Rotate = (p) => <Svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></Svg>;
export const File = (p) => <Svg {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6" /></Svg>;

export const Star = ({ filled, ...p }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}>
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z" />
  </Svg>
);

// Brand AI mark: three four-point sparkles in palette colors.
const sparklePath = (cx, cy, r) => {
  const k = r * 0.14;
  return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}` +
    `Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
};

export const Sparkle = ({ size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="18 28 214 214" aria-hidden="true" {...rest}>
    <path d={sparklePath(92, 142, 68)} fill="#52b1b6" />
    <path d={sparklePath(180, 65, 34)} fill="#de713e" />
    <path d={sparklePath(180, 217, 22)} fill="#d85f9a" />
  </svg>
);

export const Gear = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Svg>
);

export const ChevronDown = (p) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const Check = (p) => <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>;
export const Target = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></Svg>;
export const Chat = (p) => <Svg {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></Svg>;
export const Clipboard = (p) => <Svg {...p}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 12l2 2 4-4" /></Svg>;
export const Book = (p) => <Svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></Svg>;
export const Gamepad = (p) => <Svg {...p}><rect x="2" y="7" width="20" height="11" rx="5" /><path d="M7 11v3M5.5 12.5h3M15 12h.01M18 13.5h.01" /></Svg>;
