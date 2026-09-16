export type IconName =
  | 'activity'
  | 'arrow-left'
  | 'arrow-up-right'
  | 'bell'
  | 'building'
  | 'briefcase'
  | 'calendar'
  | 'check'
  | 'check-circle'
  | 'camera'
  | 'chevron-down'
  | 'chevron-right'
  | 'clock'
  | 'file-check'
  | 'file-text'
  | 'git-branch'
  | 'image'
  | 'eye'
  | 'eye-off'
  | 'kanban'
  | 'key'
  | 'lightbulb'
  | 'list-checks'
  | 'mail'
  | 'layout-dashboard'
  | 'log-out'
  | 'menu'
  | 'more-horizontal'
  | 'pause'
  | 'play'
  | 'plus'
  | 'rotate-ccw'
  | 'scan'
  | 'search'
  | 'settings'
  | 'upload'
  | 'user'
  | 'users'
  | 'x';

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function Icon({ name, size = 18, strokeWidth = 1.8, className }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  const paths: Record<IconName, React.ReactNode> = {
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
    'arrow-left': <><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>,
    'arrow-up-right': <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    building: <><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" /><path d="M16 9h2a2 2 0 0 1 2 2v10" /><path d="M8 7h4M8 11h4M8 15h4M2 21h20" /></>,
    briefcase: <><rect width="18" height="13" x="3" y="7" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></>,
    calendar: <><rect width="18" height="17" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    'check-circle': <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    camera: <><path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="3.5" /></>,
    'chevron-down': <><path d="m6 9 6 6 6-6" /></>,
    'chevron-right': <><path d="m9 18 6-6-6-6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    'file-check': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="m8 15 2 2 4-4" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></>,
    'git-branch': <><circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M6 9v1a8 8 0 0 0 8 8h1" /><circle cx="18" cy="6" r="3" /><path d="M18 9v3" /></>,
    image: <><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    eye: <><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.2" /></>,
    'eye-off': <><path d="m3 3 18 18" /><path d="M10.6 6.9A10.5 10.5 0 0 1 12 7c6 0 9.5 5 9.5 5a17.7 17.7 0 0 1-3.2 3.3M6.7 6.7C4 8.4 2.5 12 2.5 12s3.5 5 9.5 5c1.3 0 2.5-.3 3.6-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
    mail: <><rect width="18" height="14" x="3" y="5" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    kanban: <><rect width="18" height="16" x="3" y="4" rx="2" /><path d="M9 4v9M15 4v5" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M15 4h4v4M14 9l2 2" /></>,
    lightbulb: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M8.3 14.5A6 6 0 1 1 16 14.5c-.8.6-1 1.1-1 2.5H9c0-1.4-.2-1.9-.7-2.5Z" /></>,
    'list-checks': <><path d="m3 6 2 2 3-3" /><path d="M11 6h10M11 12h10M11 18h10" /><path d="m3 12 2 2 3-3" /><path d="m3 18 2 2 3-3" /></>,
    'layout-dashboard': <><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></>,
    'log-out': <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 19V5a2 2 0 0 0-2-2h-5" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    'more-horizontal': <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    play: <><path d="m8 5 11 7-11 7V5Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    'rotate-ccw': <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>,
    scan: <><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06A1.7 1.7 0 0 0 16.16 18a1.7 1.7 0 0 0-1 .59 1.7 1.7 0 0 0-.4 1.1V20h-2.4v-.08a1.7 1.7 0 0 0-1.1-1.59 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8 15.84a1.7 1.7 0 0 0-.59-1 1.7 1.7 0 0 0-1.1-.4H6v-2.4h.08a1.7 1.7 0 0 0 1.59-1.1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.7-1.7.06.06A1.7 1.7 0 0 0 10.96 8a1.7 1.7 0 0 0 1-.59 1.7 1.7 0 0 0 .4-1.1V6h2.4v.08a1.7 1.7 0 0 0 1.1 1.59 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 16 10.96a1.7 1.7 0 0 0 .59 1 1.7 1.7 0 0 0 1.1.4H18v2.4h-.08a1.7 1.7 0 0 0-1.59 1.1" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    x: <><path d="M18 6 6 18M6 6l12 12" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}
