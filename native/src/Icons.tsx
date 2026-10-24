import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import type { WeatherKind } from '../../shared/calendar';

export function Icon({ name, size = 20, color = '#858c80' }: { name: string; size?: number; color?: string }) {
  const paths: Record<string, React.ReactNode> = {
    calendar: <><Rect x={3} y={5} width={18} height={16} rx={3}/><Path d="M7 3v4m10-4v4M3 11h18m-13 4h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01"/></>,
    left: <Path d="m14 6-6 6 6 6"/>, right: <Path d="m10 6 6 6-6 6"/>, down: <Path d="m7 10 5 5 5-5"/>,
    plus: <Path d="M12 5v14M5 12h14"/>, close: <Path d="m6 6 12 12M6 18 18 6"/>, check: <Path d="m5 12 4 4L19 6"/>,
    location: <><Path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><Circle cx={12} cy={10} r={2.5}/></>,
    sliders: <><Path d="M4 6h7m4 0h5M4 12h2m4 0h10M4 18h9m4 0h3"/><Circle cx={13} cy={6} r={2}/><Circle cx={8} cy={12} r={2}/><Circle cx={15} cy={18} r={2}/></>,
    repeat: <><Path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/></>,
    note: <><Path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10Z"/><Path d="M14 3v7h7M7 14h10M7 17h7"/></>,
    trash: <Path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v6m4-6v6"/>,
    info: <><Circle cx={12} cy={12} r={9}/><Path d="M12 11v6m0-10v.01"/></>,
    rain: <Path d="M12 2S5 12 5 15a7 7 0 0 0 14 0C19 12 12 2 12 2Z"/>,
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" accessible={false}>{paths[name] ?? paths.calendar}</Svg>;
}

export function WeatherIcon({ kind, size = 28 }: { kind: WeatherKind; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" fill="none" accessible={false}>
    {(kind === 'sun' || kind === 'partly') && <G stroke="#e7a248" strokeWidth={1.7} strokeLinecap="round"><Circle cx={kind === 'sun' ? 20 : 15} cy={kind === 'sun' ? 20 : 15} r={7} fill="#f7c56a"/>{(kind === 'sun' ? [[20,5,20,8],[20,32,20,35],[5,20,8,20],[32,20,35,20],[9.4,9.4,11.7,11.7],[28.3,28.3,30.6,30.6],[9.4,30.6,11.7,28.3],[28.3,11.7,30.6,9.4]] : [[15,2,15,5],[2,15,5,15],[5.8,5.8,8,8],[24,6,22,8]]).map((p, index) => <Path key={index} d={`M${p[0]} ${p[1]}L${p[2]} ${p[3]}`}/>)}</G>}
    {kind !== 'sun' && <Path d="M11 30a6 6 0 0 1-1-11.9 8.5 8.5 0 0 1 16-2.2A7 7 0 1 1 29 30Z" fill={kind === 'rain' ? '#a9b8c8' : '#dce2e6'} stroke={kind === 'rain' ? '#8499ad' : '#b4c0c9'} strokeWidth={1.2}/>}
    {kind === 'rain' && <G stroke="#79a8cf" strokeWidth={2} strokeLinecap="round"><Path d="m14 34-1 3m8-3-1 3m8-3-1 3"/></G>}
  </Svg>;
}
