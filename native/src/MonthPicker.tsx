import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, IconButton, Sheet, ui } from './components';
import { colors as c } from './theme';

export function MonthPicker({ month, onPick, onClose }: { month: string; onPick: (value: string) => void; onClose: () => void }) {
  const [year, setYear] = useState(month.slice(0, 4));
  const [picked, setPicked] = useState(Number(month.slice(5, 7)));
  const [error, setError] = useState('');
  const validYear = () => /^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= 2100;
  return <Sheet title="年月を選択" testID="month-sheet" onClose={onClose} footer={<><ActionButton secondary onPress={() => onPick('2025-10-01')}>過去の予定を試す</ActionButton><ActionButton onPress={() => { if (validYear()) onPick(`${year}-${String(picked).padStart(2, '0')}-01`); else setError('年は1900〜2100の範囲で入力してください。'); }}>移動する</ActionButton></>}>
    <ScrollView contentContainerStyle={ui.body} keyboardShouldPersistTaps="handled"><View style={styles.yearRow}><IconButton name="left" label="前年" onPress={() => setYear(String(Math.max(1900, (Number(year) || 2026) - 1)))}/><TextInput accessibilityLabel="年" keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} style={styles.year}/><Text style={ui.muted}>年</Text><IconButton name="right" label="翌年" onPress={() => setYear(String(Math.min(2100, (Number(year) || 2026) + 1)))}/></View><View style={styles.months}>{Array.from({ length: 12 }, (_, index) => index + 1).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value}月`} accessibilityState={{ checked: picked === value }} onPress={() => setPicked(value)} style={[styles.month, picked === value && { borderColor: c.selectedBorder, backgroundColor: c.selected }]}><Text style={{ color: picked === value ? c.accent : c.text, fontSize: 15 }}>{value}月</Text></Pressable>)}</View>{error ? <Text style={ui.error}>{error}</Text> : null}<Text style={ui.muted}>2025年以前にはYahooの過去予定を想定したデータがあります。</Text></ScrollView>
  </Sheet>;
}
const styles = StyleSheet.create({ yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }, year: { textAlign: 'center', fontSize: 24, color: c.text, borderBottomWidth: 1, borderColor: '#dfe2d6', paddingVertical: 7, minWidth: 80 }, months: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 24 }, month: { width: '30%', flexGrow: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: c.line, backgroundColor: 'white' } });
