import type { CSSProperties } from 'react';
import type { WeatherKind } from '../shared/calendar';

export function Icon({ name, size = 20, className = '' }: { name: string; size?: number; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01"/></>,
    chevronLeft: <path d="m14 6-6 6 6 6"/>, chevronRight: <path d="m10 6 6 6-6 6"/>,
    chevronDown: <path d="m7 10 5 5 5-5"/>, plus: <path d="M12 5v14M5 12h14"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>, check: <path d="m5 12 4 4L19 6"/>,
    location: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    settings: <><path d="M9 4h6l1 3 3 1 1 5-2 2v4l-5 2-3-2-4 1-3-4 1-4-1-3 4-3Z"/><circle cx="12" cy="12" r="3"/></>,
    sliders: <><path d="M4 6h7m4 0h5M4 12h2m4 0h10M4 18h9m4 0h3"/><circle cx="13" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="15" cy="18" r="2"/></>,
    arrowUpRight: <path d="M6 18 18 6M7 6h11v11"/>,
    repeat: <><path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/></>,
    note: <><path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10Z"/><path d="M14 3v7h7M7 14h10M7 17h7"/></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v6m4-6v6"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.01"/></>,
    wifiOff: <><path d="m3 3 18 18M2 8.5a17 17 0 0 1 5-2m3-1a17 17 0 0 1 12 3M5 12a12 12 0 0 1 6-2m4 1a12 12 0 0 1 4 1M8.5 15.5a6 6 0 0 1 7 0M12 19h.01"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.calendar}</svg>;
}

export function WeatherIcon({ kind, size = 28, style }: { kind: WeatherKind; size?: number; style?: CSSProperties }) {
  return <svg style={style} className={`weather-icon weather-${kind}`} width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    {(kind === 'sun' || kind === 'partly') && <g stroke="#e7a248" strokeWidth="1.7" strokeLinecap="round"><circle cx={kind === 'sun' ? 20 : 15} cy={kind === 'sun' ? 20 : 15} r="7" fill="#f7c56a"/>{(kind === 'sun' ? [[20,5,20,8],[20,32,20,35],[5,20,8,20],[32,20,35,20],[9.4,9.4,11.7,11.7],[28.3,28.3,30.6,30.6],[9.4,30.6,11.7,28.3],[28.3,11.7,30.6,9.4]] : [[15,2,15,5],[2,15,5,15],[5.8,5.8,8,8],[24,6,22,8]]).map((p, i) => <path key={i} d={`M${p[0]} ${p[1]}L${p[2]} ${p[3]}`}/>)}</g>}
    {kind !== 'sun' && <path d="M11 30a6 6 0 0 1-1-11.9 8.5 8.5 0 0 1 16-2.2A7 7 0 1 1 29 30Z" fill={kind === 'rain' ? '#a9b8c8' : '#dce2e6'} stroke={kind === 'rain' ? '#8499ad' : '#b4c0c9'} strokeWidth="1.2"/>}
    {kind === 'rain' && <g stroke="#79a8cf" strokeWidth="2" strokeLinecap="round"><path d="m14 34-1 3m8-3-1 3m8-3-1 3"/></g>}
  </svg>;
}
