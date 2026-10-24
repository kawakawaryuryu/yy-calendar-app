import { forwardRef, memo, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance } from 'react-native';
import { CALENDARS, DEMO_TODAY, applyChanges, eventsOn, monthDays, monthStart, parseDate, seedMonth, shiftMonth, weatherOn } from '../../shared/calendar';
import type { Changes } from '../../shared/calendar';
import { WeatherIcon } from './Icons';
import { colors as c } from './theme';

type Props = { month: string; selected: string; visible: string[]; region: string; dense: boolean; changes: Changes; dayHeight: number; onSelect: (date: string) => void; onMonth: (date: string) => void };
export type PagerHandle = { move: (delta: number) => void };
const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
const MonthPage = memo(function MonthPage({ month, selected, visible, region, dense, changes, dayHeight, onSelect, width, active }: Omit<Props, 'onMonth'> & { width: number; active: boolean }) {
  const days = useMemo(() => monthDays(month), [month]);
  const entries = useMemo(() => {
    const events = applyChanges([-1, 0, 1].flatMap(offset => seedMonth(shiftMonth(month, offset), dense)), changes);
    const unique = [...new Map(events.map(event => [event.id, event])).values()];
    return days.map(day => ({ day, events: eventsOn(unique, day, visible), weather: weatherOn(day, region) }));
  }, [month, days, dense, changes, visible, region]);
  return <View style={{ width }} pointerEvents={active ? 'auto' : 'none'} accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}>
    <View style={styles.weekdays}>{weekdays.map((day, index) => <Text key={day} style={[styles.weekday, index === 0 && { color: c.sunday }, index === 6 && { color: c.saturday }]}>{day}</Text>)}</View>
    <View style={styles.grid}>{entries.map(({ day, events, weather }, index) => {
      const outside = monthStart(day) !== monthStart(month);
      const picked = day === selected;
      return <Pressable key={day} testID={active ? `day-${day}` : undefined} accessibilityRole="button" accessibilityLabel={`${day.replaceAll('-', '/')} ${events.length}件の予定${weather ? `、${weather.label}` : ''}`} accessibilityState={{ selected: picked }} onPress={() => onSelect(day)} style={[styles.day, { width: width / 7, height: dayHeight }, index % 7 === 6 && { borderRightWidth: 0 }, index >= 35 && { borderBottomWidth: 0 }, outside && { backgroundColor: '#fafaf7' }, picked && styles.selected]}>
        <View style={styles.dayTop}><View style={[styles.numberWrap, day === DEMO_TODAY && { backgroundColor: c.accent }]}><Text style={[styles.number, index % 7 === 0 && { color: c.sunday }, index % 7 === 6 && { color: c.saturday }, outside && { opacity: .4 }, day === DEMO_TODAY && { color: 'white', fontWeight: '600' }]}>{parseDate(day).getDate()}</Text></View>{weather && <WeatherIcon kind={weather.kind} size={18}/>}</View>
        <View style={[styles.dayEvents, outside && { opacity: .6 }]}>{events.slice(0, 2).map(event => {
          const calendar = CALENDARS.find(item => item.id === event.calendarId)!;
          return <View key={event.id} style={[styles.chip, { backgroundColor: calendar.background, borderLeftColor: calendar.color }]}><Text numberOfLines={1} style={[styles.chipText, { color: calendar.color }]}>{event.title}</Text></View>;
        })}{events.length > 2 && <Text numberOfLines={1} style={styles.more}>ほか{events.length - 2}件</Text>}</View>
      </Pressable>;
    })}</View>
  </View>;
});

export const MonthPager = forwardRef<PagerHandle, Props>(function MonthPager(props, ref) {
  const [width, setWidth] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const intent = useRef(false);
  const targetPage = useRef<number | null>(null);
  const dragging = useRef(false);
  const x = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(props);
  latest.current = props;
  function settle() {
    if (!width || !intent.current || dragging.current) return;
    const position = x.current / width;
    const page = Math.round(position);
    if (Math.abs(position - page) > .025 || page < 0 || page > 2) return;
    // A delayed center-reset scroll event can arrive after the next arrow tap.
    // It must not consume that tap before its animated scroll has completed.
    if (targetPage.current !== null && page !== targetPage.current) return;
    intent.current = false;
    targetPage.current = null;
    if (page !== 1) latest.current.onMonth(shiftMonth(latest.current.month, page - 1));
  }
  function schedule() { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(settle, 140); }
  useImperativeHandle(ref, () => ({ move(delta) {
    if (!width) return;
    intent.current = true;
    targetPage.current = 1 + delta;
    scroll.current?.scrollTo({ x: width * (1 + delta), animated: true });
  } }), [width]);
  useLayoutEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    intent.current = false;
    targetPage.current = null;
    dragging.current = false;
    x.current = width;
    scroll.current?.scrollTo({ x: width, animated: false });
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [props.month, width]);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => { x.current = event.nativeEvent.contentOffset.x; schedule(); };
  return <View testID="month-pager" onLayout={event => setWidth(Math.max(0, event.nativeEvent.layout.width - 2))} style={[styles.card, { height: props.dayHeight * 6 + 29 }]}>
    {width > 0 && <ScrollView ref={scroll} horizontal pagingEnabled bounces={false} overScrollMode="never" showsHorizontalScrollIndicator={false} directionalLockEnabled decelerationRate="fast" scrollEventThrottle={16} contentOffset={{ x: width, y: 0 }} onScroll={onScroll} onScrollBeginDrag={() => { dragging.current = true; intent.current = true; targetPage.current = null; if (timer.current) clearTimeout(timer.current); }} onScrollEndDrag={() => { dragging.current = false; schedule(); }} onMomentumScrollEnd={event => { x.current = event.nativeEvent.contentOffset.x; settle(); }}>
      {[-1, 0, 1].map(offset => <MonthPage key={offset} {...props} month={shiftMonth(props.month, offset)} width={width} active={offset === 0}/>)}
    </ScrollView>}
  </View>;
});

const styles = StyleSheet.create({
  card: { borderRadius: 9, backgroundColor: 'white', borderWidth: 1, borderColor: '#e6e7df', overflow: 'hidden' },
  weekdays: { flexDirection: 'row', height: 27, alignItems: 'center', backgroundColor: '#fdfdfb', borderBottomWidth: 1, borderBottomColor: c.line },
  weekday: { flex: 1, fontSize: 9, color: '#969b90', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { borderRightWidth: 1, borderBottomWidth: 1, borderColor: c.line, paddingHorizontal: 2, paddingTop: 3, overflow: 'hidden' },
  selected: { backgroundColor: c.selected, borderWidth: 1, borderColor: c.selectedBorder },
  dayTop: { height: 21, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  numberWrap: { width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  number: { fontSize: 10, color: c.text, fontVariant: ['tabular-nums'] },
  dayEvents: { gap: 2 }, chip: { borderLeftWidth: 2, borderRadius: 2, paddingHorizontal: 2, height: 12, justifyContent: 'center' },
  chipText: { fontSize: 8, lineHeight: 11 }, more: { fontSize: 7, lineHeight: 9, color: '#969b8f', paddingLeft: 3 },
});
