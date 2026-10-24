import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DEMO_TODAY, REGIONS, addDays, applyChanges, calendarFor, eventsOn, monthStart, parseDate, seedMonth, shiftMonth, weatherOn } from '../shared/calendar';
import type { CalendarEvent, CalendarId } from '../shared/calendar';
import { Icon, WeatherIcon } from './src/Icons';
import { IconButton, ui } from './src/components';
import { MonthPager } from './src/MonthPager';
import type { PagerHandle } from './src/MonthPager';
import { EventEditor } from './src/EventEditor';
import { Settings } from './src/Settings';
import { MonthPicker } from './src/MonthPicker';
import { commitEvent, createDraft, deleteEvent, isReadOnly } from './src/state';
import { useSavedState } from './src/useSavedState';
import { colors as c } from './src/theme';

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

export default function App() {
  return <SafeAreaProvider><StatusBar style="dark"/><CalendarApp/></SafeAreaProvider>;
}

function CalendarApp() {
  const { saved, setSaved, ready, storageError, reset } = useSavedState();
  const [month, setMonth] = useState(monthStart(DEMO_TODAY));
  const [selected, setSelected] = useState(DEMO_TODAY);
  const [editor, setEditor] = useState<CalendarEvent | null>(null);
  const [settings, setSettings] = useState(false);
  const [monthPicker, setMonthPicker] = useState(false);
  const [toast, setToast] = useState('');
  const [responseMs, setResponseMs] = useState<number | null>(null);
  const pager = useRef<PagerHandle>(null);
  const agenda = useRef<FlatList<CalendarEvent>>(null);
  const tapStart = useRef(0);
  const { height, width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 760 || width > height;
  const compact = !wide && height - insets.top - insets.bottom < 700;
  const dayHeight = Math.round(Math.min(76, Math.max(66, (height - insets.top - insets.bottom) * .081)));
  const rowHeight = Math.max(70, Math.ceil(70 * fontScale));
  const selectedDate = parseDate(selected);
  const displayedMonth = parseDate(month);
  const region = REGIONS.find(item => item.id === saved.region)!;
  const weather = weatherOn(selected, saved.region);
  const allEvents = useMemo(() => {
    const events = applyChanges([-1, 0, 1].flatMap(offset => seedMonth(shiftMonth(month, offset), saved.dense)), saved.changes);
    return [...new Map(events.map(event => [event.id, event])).values()];
  }, [month, saved.changes, saved.dense]);
  const dayEvents = useMemo(() => eventsOn(allEvents, selected, saved.visible), [allEvents, selected, saved.visible]);
  const selectDate = useCallback((date: string) => {
    tapStart.current = performance.now();
    setSelected(date); setMonth(monthStart(date));
  }, []);
  const changeMonth = useCallback((date: string) => {
    setMonth(date); setSelected(date === monthStart(DEMO_TODAY) ? DEMO_TODAY : date);
  }, []);
  useLayoutEffect(() => {
    agenda.current?.scrollToOffset({ offset: 0, animated: false });
    if (!tapStart.current) return;
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => { setResponseMs(Math.round(performance.now() - tapStart.current)); tapStart.current = 0; }); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [selected]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
  function create() {
    const target = saved.visible.find(id => id !== 'archive') as CalendarId | undefined;
    setEditor(createDraft(selected, target || 'family'));
  }
  function save(event: CalendarEvent) {
    if (isReadOnly(event)) return;
    setSaved(previous => ({ ...previous, changes: commitEvent(previous.changes, event), visible: previous.visible.includes(event.calendarId) ? previous.visible : [...previous.visible, event.calendarId] }));
    setEditor(null); selectDate(event.startDate); setToast('予定を端末に保存しました');
  }
  function remove(id: string) {
    if (editor && isReadOnly(editor)) return;
    setSaved(previous => ({ ...previous, changes: deleteEvent(previous.changes, id) }));
    setEditor(null); setToast('予定を削除しました');
  }
  if (!ready) return <SafeAreaView style={styles.loading}><ActivityIndicator color={c.accent}/><Text style={[ui.muted, { marginTop: 12 }]}>カレンダーを開いています</Text></SafeAreaView>;

  const calendar = <View style={styles.calendarSection}>
    <View style={styles.toolbar}><Pressable accessibilityRole="button" accessibilityLabel="年月を選択" onPress={() => setMonthPicker(true)} style={styles.monthTitle}><Text style={styles.year}>{displayedMonth.getFullYear()}年</Text><Text style={styles.monthNumber}>{displayedMonth.getMonth() + 1}<Text style={styles.monthSuffix}>月</Text></Text><Icon name="down" size={14}/></Pressable><View style={[ui.row, { gap: 7 }]}><Pressable accessibilityRole="button" accessibilityLabel="今日" onPress={() => selectDate(DEMO_TODAY)} style={styles.todayButton}><Text style={styles.todayButtonText}>今日</Text></Pressable><IconButton name="left" label="前の月" onPress={() => pager.current?.move(-1)}/><IconButton name="right" label="次の月" onPress={() => pager.current?.move(1)}/></View></View>
    <MonthPager ref={pager} month={month} selected={selected} changes={saved.changes} visible={saved.visible} region={saved.region} dense={saved.dense} dayHeight={dayHeight} onSelect={selectDate} onMonth={changeMonth}/>
    <View style={styles.calendarFootnote}><View style={ui.row}><View style={styles.weatherDot}/><Text style={styles.footnoteText}>今日から7日間の天気を表示</Text></View><Pressable accessibilityRole="button" accessibilityLabel="天気の地域を変更" onPress={() => setSettings(true)} style={[ui.row, { gap: 4, paddingVertical: 7 }]}><Icon name="location" size={12}/><Text style={styles.regionText}>{region.city}</Text><Icon name="down" size={11}/></Pressable></View>
  </View>;

  const agendaPanel = <View style={[styles.agendaSection, wide ? [styles.agendaWide, { width: Math.min(360, Math.max(260, width * .4)) }] : { flex: 1 }]}>
    <View style={styles.agendaHeading}><View style={[ui.row, { gap: 8, flex: 1 }]}><Text accessibilityRole="header" testID="selected-date" style={styles.agendaDate}>{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日<Text style={[styles.weekday, selectedDate.getDay() === 0 && { color: c.sunday }, selectedDate.getDay() === 6 && { color: c.saturday }]}>（{weekdays[selectedDate.getDay()]}）</Text></Text>{selected === DEMO_TODAY && <View style={styles.todayTag}><Text style={styles.todayTagText}>今日</Text></View>}<Text style={styles.eventCount}>{dayEvents.length}件の予定</Text></View><IconButton name="plus" label="選択日に予定を追加" size={19} onPress={create}/></View>
    <View style={styles.dailyWeather}>{weather ? <><WeatherIcon kind={weather.kind} size={25}/><Text style={styles.weatherDescription}>{weather.label}</Text><Text style={styles.high}>{weather.high}°</Text><Text style={styles.temperatureSlash}>/</Text><Text style={styles.low}>{weather.low}°</Text><View style={styles.separator}/><Icon name="rain" size={12} color="#8196a6"/><Text style={styles.rain}>{weather.rain}%</Text></> : <><Icon name="info" size={17}/><Text style={styles.noWeather}>この日の天気予報はありません</Text></>}<Text style={styles.weatherDemo}>仮の天気</Text></View>
    <FlatList ref={agenda} testID="agenda-list" data={dayEvents} keyExtractor={event => event.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5} getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })} removeClippedSubviews={Platform.OS === 'android'} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false} ListEmptyComponent={<View style={styles.empty}><Icon name="calendar" size={28} color="#a2ad96"/><Text style={styles.emptyTitle}>{saved.visible.length ? '予定のない、ゆったりした一日。' : '表示するカレンダーを選んでください'}</Text><Text style={[ui.muted, { marginTop: 6 }]}>{saved.visible.length ? '新しい予定をつくってみませんか。' : '「表示と設定」から切り替えられます。'}</Text><Pressable accessibilityRole="button" onPress={saved.visible.length ? create : () => setSettings(true)} style={{ padding: 13 }}><Text style={{ color: c.accent, fontSize: 12 }}>{saved.visible.length ? '＋ 予定をつくる' : '表示と設定を開く'}</Text></Pressable></View>} renderItem={({ item: event }) => {
      const calendar = calendarFor(event.calendarId);
      return <Pressable testID={`event-${event.id}`} accessibilityRole="button" accessibilityLabel={`${event.title}の詳細`} onPress={() => setEditor(event)} style={({ pressed }) => [styles.event, { height: rowHeight }, pressed && { backgroundColor: '#efefe7' }]}><View style={styles.eventTime}>{event.allDay ? <Text style={styles.allDay}>終日</Text> : <><Text style={styles.startTime}>{event.startDate < selected ? '00:00' : event.startTime}</Text><Text style={styles.endTime}>{event.endDate > selected ? '24:00' : event.endTime}</Text></>}</View><View style={[styles.eventLine, { backgroundColor: calendar.color }]}/><View style={{ flex: 1, minWidth: 0 }}><View style={[ui.row, { gap: 6 }]}><Text numberOfLines={1} style={styles.eventTitle}>{event.title}</Text>{event.recurring && <Icon name="repeat" size={12}/>}</View><View style={[ui.row, { gap: 5, marginTop: 4 }]}><Text numberOfLines={1} style={[styles.eventCalendar, { color: calendar.color }]}>{calendar.name}</Text>{event.location ? <><Text style={styles.subtitleDot}>·</Text><Icon name="location" size={11} color="#a0a597"/><Text numberOfLines={1} style={styles.eventLocation}>{event.location}</Text></> : null}{event.allDay && event.endDate > addDays(event.startDate, 1) && <Text style={styles.multiDay}>{parseDate(event.startDate).getDate()}〜{parseDate(addDays(event.endDate, -1)).getDate()}日</Text>}</View></View><Icon name="right" size={15} color="#c2c5b9"/></Pressable>;
    }}/>
  </View>;

  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}><View style={[ui.row, { gap: 8 }]}><View style={styles.brandIcon}><Icon name="calendar" color="white" size={19}/></View><Text style={styles.brandName}>日々</Text></View><View style={[ui.row, { gap: 8 }]}>{storageError ? <Pressable onPress={() => setSettings(true)} accessibilityRole="button" accessibilityLabel="保存エラーの詳細"><Text style={styles.storageError}>保存エラー</Text></Pressable> : null}<Text style={styles.demoLabel}>NATIVE · デモ</Text><IconButton name="sliders" label="表示と設定" onPress={() => setSettings(true)}/></View></View>
    <View style={[styles.body, wide && styles.bodyWide]}>{wide || compact ? <ScrollView style={wide ? { flex: 1, minWidth: 0 } : { height: Math.max(250, (height - insets.top - insets.bottom - 53) * .62), flexGrow: 0, flexShrink: 0 }} contentContainerStyle={wide ? { paddingRight: 20, paddingBottom: 24 } : undefined} nestedScrollEnabled>{calendar}</ScrollView> : calendar}{agendaPanel}</View>
    <Pressable testID="new-event" accessibilityRole="button" accessibilityLabel="新しい予定を作成" onPress={create} style={({ pressed }) => [styles.fab, { bottom: Math.max(23, insets.bottom + 10) }, pressed && { opacity: .8 }]}><Icon name="plus" size={27} color="white"/></Pressable>
    {saved.showMetrics && <View style={[styles.metrics, { bottom: Math.max(12, insets.bottom + 4) }]}><Text style={styles.metricsText}>タップ描画応答　<Text style={{ color: '#53734b', fontWeight: '600' }}>{responseMs === null ? '—' : `${responseMs} ms`}</Text></Text><Text style={styles.metricsNote}>JS側の参考値 · 表示完了 / FPSではありません</Text></View>}
    {toast ? <View accessibilityLiveRegion="polite" style={[styles.toast, { bottom: Math.max(88, insets.bottom + 70) }]}><Icon name="check" size={17} color="white"/><Text style={styles.toastText}>{toast}</Text></View> : null}
    {editor && <EventEditor key={editor.id} initial={editor} onClose={() => setEditor(null)} onSave={save} onDelete={remove}/>}
    {settings && <Settings saved={saved} storageError={storageError} onChange={patch => setSaved(previous => ({ ...previous, ...patch }))} onClose={() => setSettings(false)} onReset={() => { reset(); selectDate(DEMO_TODAY); setToast('デモを初期状態に戻しました'); }}/>}
    {monthPicker && <MonthPicker month={month} onClose={() => setMonthPicker(false)} onPick={date => { changeMonth(date); setMonthPicker(false); }}/>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.background }, loading: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
  header: { height: 53, paddingHorizontal: 19, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eae9e0' },
  brandIcon: { backgroundColor: c.accent, width: 29, height: 29, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  brandName: { color: c.text, fontFamily: Platform.OS === 'ios' ? 'Hiragino Mincho ProN' : 'serif', fontSize: 22, letterSpacing: 3 },
  demoLabel: { fontSize: 9, color: '#92968b' }, storageError: { fontSize: 9, color: '#b65f50' },
  body: { flex: 1, paddingHorizontal: 13 }, bodyWide: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 8, gap: 10 },
  calendarSection: { flexShrink: 0 }, toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 66, paddingHorizontal: 3 },
  monthTitle: { flexDirection: 'row', gap: 5, alignItems: 'center' }, year: { fontSize: 15, color: c.text }, monthNumber: { fontSize: 28, color: c.text, fontWeight: '500' }, monthSuffix: { fontSize: 16 },
  todayButton: { borderWidth: 1, borderColor: '#dedfd6', borderRadius: 7, paddingVertical: 7, paddingHorizontal: 13, backgroundColor: '#fdfcf9', minHeight: 32, justifyContent: 'center' }, todayButtonText: { color: c.text, fontSize: 10 },
  calendarFootnote: { height: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 3 }, weatherDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#e4b063', marginRight: 5 }, footnoteText: { color: '#a1a399', fontSize: 8 }, regionText: { color: '#8f9488', fontSize: 9 },
  agendaSection: { minHeight: 85, marginHorizontal: 3, borderTopWidth: 1, borderTopColor: '#e6e6de' }, agendaWide: { width: 330, flexShrink: 0, marginTop: 14 },
  agendaHeading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, agendaDate: { color: c.text, fontSize: 16, fontWeight: '600' }, weekday: { color: '#8b9286', fontSize: 11, fontWeight: '400' }, todayTag: { backgroundColor: '#f2e7da', borderRadius: 4, paddingVertical: 3, paddingHorizontal: 6 }, todayTagText: { fontSize: 8, color: '#bc8b60' }, eventCount: { fontSize: 9, color: '#a0a297' },
  dailyWeather: { height: 37, paddingHorizontal: 9, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: c.pale, borderWidth: 1, borderColor: '#e8e8dc', borderRadius: 6, marginBottom: 5 }, weatherDescription: { fontSize: 9, color: '#7e8577' }, high: { color: '#c87a57', fontSize: 13, marginLeft: 5, fontVariant: ['tabular-nums'] }, low: { color: '#7c9bb0', fontSize: 13, fontVariant: ['tabular-nums'] }, temperatureSlash: { color: '#c0c1b5', fontSize: 10 }, separator: { width: 1, height: 12, backgroundColor: '#dadcd0', marginHorizontal: 3 }, rain: { color: '#8196a6', fontSize: 10 }, weatherDemo: { marginLeft: 'auto', color: '#a6aa9c', fontSize: 7 }, noWeather: { color: c.muted, fontSize: 10, flexShrink: 1 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingRight: 5, borderBottomWidth: 1, borderBottomColor: '#e9e9e0' }, eventTime: { width: 43, alignItems: 'center', gap: 3 }, allDay: { fontSize: 10, color: '#7f8779' }, startTime: { fontSize: 11, color: '#686f63', fontVariant: ['tabular-nums'] }, endTime: { fontSize: 9, color: '#a3a79c', fontVariant: ['tabular-nums'] }, eventLine: { width: 3, height: 32, borderRadius: 2, opacity: .8 }, eventTitle: { fontSize: 12, lineHeight: 19, color: c.text, flexShrink: 1 }, eventCalendar: { fontSize: 9 }, eventLocation: { fontSize: 9, color: '#a0a597', flexShrink: 1 }, subtitleDot: { color: '#bdc0b4', fontSize: 9 }, multiDay: { color: '#919c89', fontSize: 8, backgroundColor: '#e9eddf', borderRadius: 3, paddingHorizontal: 4 },
  empty: { paddingVertical: 30, paddingHorizontal: 5, alignItems: 'center' }, emptyTitle: { color: c.text, fontSize: 12, marginTop: 12 },
  fab: { position: 'absolute', right: 20, width: 53, height: 53, borderRadius: 18, backgroundColor: c.accent, justifyContent: 'center', alignItems: 'center', boxShadow: '0 5px 18px #9e5f3d38', elevation: 5 },
  toast: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#46523f', borderRadius: 9, paddingVertical: 12, paddingHorizontal: 16, maxWidth: '92%' }, toastText: { color: 'white', fontSize: 11 },
  metrics: { position: 'absolute', left: 13, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: '#fffffff2', borderWidth: 1, borderColor: '#d9ddce', borderRadius: 8 }, metricsText: { color: '#8b9481', fontSize: 10 }, metricsNote: { color: '#8b9481', fontSize: 8, marginTop: 4 },
});
