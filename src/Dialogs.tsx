import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { CALENDARS, REGIONS, DEMO_TODAY, addDays, validateEvent } from '../shared/calendar';
import type { CalendarEvent, CalendarId } from '../shared/calendar';
import { Icon } from './Icons';

export function Modal({ title, onClose, children, className = '' }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  return <dialog className={`dialog ${className}`} ref={ref} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}>
    <header className="dialog-header"><h2>{title}</h2><button className="icon-button" type="button" aria-label="閉じる" onClick={onClose}><Icon name="close"/></button></header>{children}
  </dialog>;
}

export function EventEditor({ initial, onClose, onSave, onDelete }: { initial: CalendarEvent; onClose: () => void; onSave: (event: CalendarEvent) => void; onDelete: (id: string) => void }) {
  const [event, setEvent] = useState(initial);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isNew = initial.id.startsWith('draft-');
  const readonly = Boolean(initial.readOnly || initial.recurring || initial.calendarId === 'archive');
  const set = <K extends keyof CalendarEvent>(key: K, value: CalendarEvent[K]) => setEvent(previous => ({ ...previous, [key]: value }));
  function submit(e: FormEvent) {
    e.preventDefault();
    if (readonly) return;
    const problem = validateEvent(event);
    if (problem) { setError(problem); return; }
    onSave({ ...event, title: event.title.trim() });
  }
  function close() {
    if (JSON.stringify(event) !== JSON.stringify(initial) && !window.confirm('保存していない変更を破棄しますか？')) return;
    onClose();
  }
  return <Modal title={readonly ? '予定の詳細' : isNew ? '新しい予定' : '予定を編集'} onClose={close} className="event-dialog">
    <form onSubmit={submit}>
      <div className="dialog-body">
        {readonly && <div className="readonly-note"><Icon name="info" size={18}/><span>{event.recurring ? '繰り返し予定は表示のみのモックです。' : '過去の予定は読み取り専用です。'}</span></div>}
        <label className="field"><span>タイトル</span><input autoFocus={!readonly} name="title" placeholder="予定のタイトル" maxLength={120} value={event.title} readOnly={readonly} onChange={e => set('title', e.target.value)}/></label>
        <label className="field"><span>カレンダー</span><select aria-label="カレンダー" value={event.calendarId} disabled={readonly} onChange={e => set('calendarId', e.target.value as CalendarId)}>{CALENDARS.filter(calendar => readonly || calendar.id !== 'archive').map(calendar => <option value={calendar.id} key={calendar.id}>{calendar.name}</option>)}</select></label>
        <label className="switch-line"><span><Icon name="calendar" size={18}/>終日の予定</span><input type="checkbox" role="switch" checked={event.allDay} disabled={readonly} onChange={e => setEvent(previous => ({ ...previous, allDay: e.target.checked, startTime: previous.startTime || '10:00', endTime: previous.endTime || '11:00', endDate: previous.endDate ? addDays(previous.endDate, e.target.checked ? 1 : -1) : previous.startDate }))}/></label>
        <div className="field-row"><label className="field"><span>開始日</span><input type="date" value={event.startDate} required readOnly={readonly} onChange={e => set('startDate', e.target.value)}/></label>{!event.allDay && <label className="field time-field"><span>開始時刻</span><input type="time" required value={event.startTime} readOnly={readonly} onChange={e => set('startTime', e.target.value)}/></label>}</div>
        <div className="field-row"><label className="field"><span>終了日</span><input type="date" value={event.allDay && event.endDate ? addDays(event.endDate, -1) : event.endDate} required readOnly={readonly} onChange={e => set('endDate', e.target.value && event.allDay ? addDays(e.target.value, 1) : e.target.value)}/></label>{!event.allDay && <label className="field time-field"><span>終了時刻</span><input type="time" required value={event.endTime} readOnly={readonly} onChange={e => set('endTime', e.target.value)}/></label>}</div>
        <label className="field"><span><Icon name="location" size={15}/>場所</span><input placeholder="場所を追加" value={event.location} maxLength={200} readOnly={readonly} onChange={e => set('location', e.target.value)}/></label>
        <label className="field"><span><Icon name="note" size={15}/>メモ</span><textarea placeholder="メモを追加" value={event.notes} maxLength={2000} readOnly={readonly} onChange={e => set('notes', e.target.value)} rows={3}/></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {confirmDelete && <div className="delete-confirm"><span>この予定を削除しますか？</span><div><button type="button" className="text-button" onClick={() => setConfirmDelete(false)}>戻る</button><button type="button" className="danger-button" onClick={() => onDelete(event.id)}>削除する</button></div></div>}
      </div>
      <footer className="dialog-footer">{!readonly && !isNew && <button type="button" className="icon-button delete-button" aria-label="予定を削除" onClick={() => setConfirmDelete(true)}><Icon name="trash"/></button>}<span className="footer-spacer"/><button type="button" className="secondary-button" onClick={close}>{readonly ? '閉じる' : 'キャンセル'}</button>{!readonly && <button type="submit" className="primary-button">保存する</button>}</footer>
    </form>
  </Modal>;
}

export function Settings({ region, dense, visible, showMetrics, storageError, onRegion, onDense, onVisible, onMetrics, onReset, onClose }: { region: string; dense: boolean; visible: string[]; showMetrics: boolean; storageError: boolean; onRegion: (value: string) => void; onDense: (value: boolean) => void; onVisible: (value: string[]) => void; onMetrics: (value: boolean) => void; onReset: () => void; onClose: () => void }) {
  return <Modal title="表示と設定" onClose={onClose} className="settings-dialog"><div className="dialog-body">
    <section className="settings-section"><h3>天気の地域</h3><label className="field"><span className="sr-only">天気の地域</span><select aria-label="天気の地域" value={region} onChange={event => onRegion(event.target.value)}>{REGIONS.map(item => <option value={item.id} key={item.id}>{item.name}・{item.city}</option>)}</select></label><p className="muted small">天気・気温は操作比較用の仮データです。</p></section>
    <section className="settings-section"><h3>表示するカレンダー</h3>{CALENDARS.map(calendar => <label className="calendar-option" key={calendar.id}><input type="checkbox" checked={visible.includes(calendar.id)} onChange={() => onVisible(visible.includes(calendar.id) ? visible.filter(id => id !== calendar.id) : [...visible, calendar.id])} style={{ accentColor: calendar.color }}/><span>{calendar.name}</span><i style={{ background: calendar.color }}/></label>)}</section>
    <section className="settings-section"><h3>操作比較</h3><label className="switch-line"><span>予定を多くする<small>1日24件を追加</small></span><input type="checkbox" role="switch" checked={dense} onChange={event => onDense(event.target.checked)}/></label><label className="switch-line"><span>タップの描画応答を表示</span><input type="checkbox" role="switch" checked={showMetrics} onChange={event => onMetrics(event.target.checked)}/></label><p className="muted small">比較日：{DEMO_TODAY.replaceAll('-', '/')}<br/>React Native版でも同じ日付と仮データを使用します。描画応答はタップから次の描画を挟んだフレームまでの参考値で、INPやFPSではありません。</p></section>
    <section className="settings-section"><h3>端末内のデータ</h3><p className="muted small">追加・編集した予定と設定はこのブラウザーに保存されます。Google・Yahooへの接続は行いません。</p>{storageError && <p className="form-error">端末への保存に失敗しました。変更はこの画面を閉じるまでの間だけ有効です。</p>}<button type="button" className="reset-button" onClick={onReset}>デモを初期状態に戻す</button></section>
    <div className="install-guide"><Icon name="download"/><div><strong>ホーム画面から使う</strong><p>iPhone：Safariの共有 →「ホーム画面に追加」<br/>Android：Chromeのメニュー →「ホーム画面に追加」<br/>インストールとオフライン起動にはHTTPS配信が必要です（localhostを除く）。</p></div></div>
  </div><footer className="dialog-footer"><button type="button" className="primary-button" onClick={onClose}>完了</button></footer></Modal>;
}
