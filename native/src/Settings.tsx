import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { CALENDARS, DEMO_TODAY, REGIONS } from '../../shared/calendar';
import type { SavedState } from './state';
import { ActionButton, ChoiceRow, Sheet, ui } from './components';

export function Settings({ saved, storageError, onChange, onClose, onReset }: { saved: SavedState; storageError: string; onChange: (patch: Partial<SavedState>) => void; onClose: () => void; onReset: () => void }) {
  const [confirmReset, setConfirmReset] = useState(false);
  return <Sheet title="表示と設定" testID="settings-sheet" onClose={onClose} footer={<ActionButton onPress={onClose}>完了</ActionButton>}>
    <ScrollView contentContainerStyle={ui.body} keyboardShouldPersistTaps="handled">
      <View style={ui.section}><Text style={ui.sectionTitle}>天気の地域</Text>{REGIONS.map(region => <ChoiceRow key={region.id} label={`${region.name}・${region.city}`} selected={saved.region === region.id} radio onPress={() => onChange({ region: region.id })}/>)}<Text style={[ui.muted, { marginTop: 8 }]}>天気・気温は操作比較用の仮データです。</Text></View>
      <View style={ui.section}><Text style={ui.sectionTitle}>表示するカレンダー</Text>{CALENDARS.map(calendar => <ChoiceRow key={calendar.id} label={calendar.name} color={calendar.color} selected={saved.visible.includes(calendar.id)} hint={calendar.id === 'archive' ? '閲覧のみ' : undefined} onPress={() => onChange({ visible: saved.visible.includes(calendar.id) ? saved.visible.filter(id => id !== calendar.id) : [...saved.visible, calendar.id] })}/>)}</View>
      <View style={ui.section}><Text style={ui.sectionTitle}>操作比較</Text><View style={ui.switchRow}><View style={{ flex: 1 }}><Text style={ui.switchText}>予定を多くする</Text><Text style={ui.muted}>1日24件を追加</Text></View><Switch accessibilityLabel="予定を多くする" value={saved.dense} trackColor={{ false: '#d8dbd0', true: '#c38c68' }} onValueChange={dense => onChange({ dense })}/></View><View style={ui.switchRow}><Text style={ui.switchText}>タップの描画応答を表示</Text><Switch accessibilityLabel="タップの描画応答を表示" value={saved.showMetrics} trackColor={{ false: '#d8dbd0', true: '#c38c68' }} onValueChange={showMetrics => onChange({ showMetrics })}/></View><Text style={[ui.muted, { marginTop: 10 }]}>比較日：{DEMO_TODAY.replaceAll('-', '/')}。PWA版と同じシナリオです。描画応答はJS側の描画タイミングの参考値で、画面への表示完了やFPSを測るものではありません。</Text></View>
      <View style={ui.section}><Text style={ui.sectionTitle}>端末内のデータ</Text><Text style={[ui.muted, { marginBottom: 12 }]}>変更した予定と設定はこのアプリ内に保存します。PWA版の保存データとは別です。Google・Yahooには接続しません。</Text>{storageError ? <Text accessibilityRole="alert" style={[ui.error, { marginBottom: 12 }]}>{storageError}</Text> : null}<ActionButton secondary onPress={() => setConfirmReset(true)}>デモを初期状態に戻す</ActionButton>{confirmReset && <View style={ui.confirm}><Text style={ui.switchText}>追加・編集した予定と設定をリセットしますか？</Text><View style={[ui.row, { justifyContent: 'flex-end', gap: 8, marginTop: 12 }]}><ActionButton secondary onPress={() => setConfirmReset(false)}>戻る</ActionButton><ActionButton danger onPress={() => { onReset(); setConfirmReset(false); }}>リセットする</ActionButton></View></View>}</View>
      <Text style={ui.muted}>日々 Native / React Native＋Expo モック{`\n`}ウィジェット・通知・実サービスとの同期は含まれていません。</Text>
    </ScrollView>
  </Sheet>;
}
