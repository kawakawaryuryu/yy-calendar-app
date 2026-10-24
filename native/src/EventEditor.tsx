import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CALENDARS, DEMO_TODAY, addDays, dateKey, parseDate } from '../../shared/calendar';
import type { CalendarEvent } from '../../shared/calendar';
import { ActionButton, ChoiceRow, IconButton, Sheet, ui } from './components';
import { Icon } from './Icons';
import { colors as c } from './theme';
import { isReadOnly, validateDraft } from './state';

type DateFieldKey = 'startDate' | 'endDate' | 'startTime' | 'endTime';
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(parseDate(value)) === value; }

export function EventEditor({ initial, onClose, onSave, onDelete }: { initial: CalendarEvent; onClose: () => void; onSave: (event: CalendarEvent) => void; onDelete: (id: string) => void }) {
  const [event, setEvent] = useState(initial);
  const [error, setError] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [picker, setPicker] = useState<DateFieldKey | null>(null);
  const [confirmation, setConfirmation] = useState<'discard' | 'delete' | null>(null);
  const readonly = isReadOnly(initial);
  const isNew = initial.id.startsWith('draft-');
  const update = <K extends keyof CalendarEvent>(key: K, value: CalendarEvent[K]) => setEvent(previous => ({ ...previous, [key]: value }));
  const displayedEnd = event.allDay && validDate(event.endDate) ? addDays(event.endDate, -1) : event.endDate;
  function close() {
    if (!readonly && JSON.stringify(event) !== JSON.stringify(initial)) { setConfirmation('discard'); return; }
    onClose();
  }
  function save() {
    if (readonly) return;
    const problem = validateDraft(event);
    if (problem) { setError(problem); return; }
    onSave(event);
  }
  function pickValue() {
    const dateString = picker === 'endDate' ? displayedEnd : picker === 'endTime' ? event.endDate : event.startDate;
    const date = parseDate(validDate(dateString) ? dateString : DEMO_TODAY);
    if (picker?.includes('Time')) {
      const [hours, minutes] = (event[picker] || '10:00').split(':').map(Number);
      date.setHours(hours, minutes);
    }
    return date;
  }
  function changeDate(field: DateFieldKey, value: string) {
    if (field === 'endDate') update('endDate', event.allDay && validDate(value) ? addDays(value, 1) : value);
    else update(field, value);
  }
  function renderDateField(label: string, field: DateFieldKey, value: string) {
    return <View style={[ui.field, { flex: field.includes('Time') ? .7 : 1 }]}><Text style={ui.fieldLabel}>{label}</Text>
      {Platform.OS === 'web' ? <TextInput accessibilityLabel={label} style={[ui.input, readonly && ui.readonlyInput]} value={value} onChangeText={text => changeDate(field, text)} editable={!readonly} placeholder={field.includes('Time') ? '10:00' : '2026-10-21'} autoCapitalize="none"/> : <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${value}`} onPress={() => setPicker(field)} disabled={readonly} style={[ui.input, styles.dateButton, readonly && ui.readonlyInput]}><Text style={styles.dateText}>{value.replaceAll('-', '/')}</Text><Icon name={field.includes('Time') ? 'down' : 'calendar'} size={16}/></Pressable>}
    </View>;
  }
  return <Sheet testID="event-sheet" title={readonly ? '予定の詳細' : isNew ? '新しい予定' : '予定を編集'} onClose={close} footer={confirmation ? <View style={{ flex: 1 }}><Text style={styles.confirmText}>{confirmation === 'delete' ? 'この予定を削除しますか？' : '保存していない変更を破棄しますか？'}</Text><View style={[ui.row, { justifyContent: 'flex-end', gap: 8, marginTop: 12 }]}><ActionButton secondary onPress={() => setConfirmation(null)}>戻る</ActionButton><ActionButton danger onPress={confirmation === 'delete' ? () => onDelete(event.id) : onClose}>{confirmation === 'delete' ? '削除する' : '破棄する'}</ActionButton></View></View> : <>{!readonly && !isNew && <IconButton name="trash" label="予定を削除" color="#b37a6e" onPress={() => setConfirmation('delete')}/>}<View style={{ flex: 1 }}/><ActionButton secondary onPress={close}>{readonly ? '閉じる' : 'キャンセル'}</ActionButton>{!readonly && <ActionButton onPress={save}>保存する</ActionButton>}</>}>
    {error ? <Text accessibilityRole="alert" style={[ui.error, { paddingHorizontal: 20, paddingTop: 12 }]}>{error}</Text> : null}
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.body}>
      {readonly && <View style={styles.readonlyNotice}><Icon name="info" size={17}/><Text style={ui.muted}>{initial.recurring ? '繰り返し予定は表示のみのモックです。' : '過去の予定は読み取り専用です。'}</Text></View>}
      <View style={ui.field}><Text style={ui.fieldLabel}>タイトル</Text><TextInput accessibilityLabel="タイトル" autoFocus={!readonly} value={event.title} onChangeText={value => update('title', value)} editable={!readonly} placeholder="予定のタイトル" maxLength={120} style={[ui.input, readonly && ui.readonlyInput]} returnKeyType="done"/></View>
      <View style={ui.field}><Text style={ui.fieldLabel}>カレンダー</Text><Pressable accessibilityRole="button" accessibilityLabel="カレンダーを選択" disabled={readonly} style={[ui.input, styles.dateButton, readonly && ui.readonlyInput]} onPress={() => setCalendarOpen(value => !value)}><View style={ui.row}><View style={[styles.calendarDot, { backgroundColor: CALENDARS.find(item => item.id === event.calendarId)!.color }]}/><Text style={styles.dateText}>{CALENDARS.find(item => item.id === event.calendarId)!.name}</Text></View><Icon name="down" size={16}/></Pressable>{calendarOpen && <View style={styles.calendarChoices}>{CALENDARS.filter(calendar => calendar.id !== 'archive').map(calendar => <ChoiceRow key={calendar.id} label={calendar.name} selected={event.calendarId === calendar.id} color={calendar.color} radio onPress={() => { update('calendarId', calendar.id); setCalendarOpen(false); }}/>)}</View>}</View>
      <View style={[ui.switchRow, { marginBottom: 18 }]}><Text style={ui.switchText}>終日の予定</Text><Switch accessibilityLabel="終日の予定" value={event.allDay} disabled={readonly} trackColor={{ false: '#d8dbd0', true: '#c38c68' }} onValueChange={value => setEvent(previous => ({ ...previous, allDay: value, startTime: previous.startTime || '10:00', endTime: previous.endTime || '11:00', endDate: validDate(previous.endDate) ? addDays(previous.endDate, value ? 1 : -1) : previous.startDate }))}/></View>
      <View style={styles.dateRow}>{renderDateField('開始日', 'startDate', event.startDate)}{!event.allDay && renderDateField('開始時刻', 'startTime', event.startTime)}</View>
      <View style={styles.dateRow}>{renderDateField('終了日', 'endDate', displayedEnd)}{!event.allDay && renderDateField('終了時刻', 'endTime', event.endTime)}</View>
      {picker && Platform.OS !== 'web' && <View style={styles.picker}><DateTimePicker value={pickValue()} mode={picker.includes('Time') ? 'time' : 'date'} display={Platform.OS === 'ios' ? 'spinner' : 'default'} is24Hour locale="ja-JP" onChange={(result, value) => {
        const field = picker;
        if (Platform.OS === 'android') setPicker(null);
        if (result.type !== 'set' || !value || !field) return;
        changeDate(field, field.includes('Time') ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}` : dateKey(value));
      }}/>{Platform.OS === 'ios' && <ActionButton secondary onPress={() => setPicker(null)}>選択を完了</ActionButton>}</View>}
      <View style={ui.field}><Text style={ui.fieldLabel}>場所</Text><TextInput accessibilityLabel="場所" placeholder="場所を追加" maxLength={200} value={event.location} editable={!readonly} onChangeText={value => update('location', value)} style={[ui.input, readonly && ui.readonlyInput]}/></View>
      <View style={ui.field}><Text style={ui.fieldLabel}>メモ</Text><TextInput accessibilityLabel="メモ" placeholder="メモを追加" maxLength={2000} multiline textAlignVertical="top" value={event.notes} editable={!readonly} onChangeText={value => update('notes', value)} style={[ui.input, { minHeight: 100 }, readonly && ui.readonlyInput]}/></View>
    </ScrollView>
  </Sheet>;
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', gap: 10 }, dateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  dateText: { color: '#48503f', fontSize: 14, flexShrink: 1 },
  calendarDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  calendarChoices: { paddingHorizontal: 13, borderWidth: 1, borderColor: c.line, marginTop: 4, borderRadius: 8 },
  readonlyNotice: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#efeee6', padding: 12, borderRadius: 8, marginBottom: 18 },
  picker: { marginBottom: 20, borderRadius: 8, overflow: 'hidden' }, confirmText: { color: '#8f6757', fontSize: 12, lineHeight: 20 },
});
