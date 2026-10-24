import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_STATE, STORAGE_KEY, decodeState } from './state';
import type { SavedState } from './state';

export function useSavedState() {
  const [saved, setSaved] = useState<SavedState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const writes = useRef(Promise.resolve());
  const mounted = useRef(true);
  const canSave = useRef(true);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (!cancelled) setSaved(decodeState(value));
    }).catch(() => {
      if (!cancelled) {
        canSave.current = false;
        setStorageError('保存済みデータを読み込めませんでした。元データは上書きせず、今回は一時的に動作します。');
      }
    }).finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!ready || !canSave.current) return;
    const snapshot = JSON.stringify(saved);
    // Serialize async writes: a slower old write must never overwrite a new one.
    writes.current = writes.current.then(() => AsyncStorage.setItem(STORAGE_KEY, snapshot)).then(() => {
      if (mounted.current) setStorageError('');
    }).catch(() => { if (mounted.current) setStorageError('端末への保存に失敗しました。現在の変更は一時的です。'); });
  }, [saved, ready]);
  function reset() { canSave.current = true; setStorageError(''); setSaved({ ...DEFAULT_STATE, changes: { created: [], updated: {}, removed: [] } }); }
  return { saved, setSaved, ready, storageError, reset };
}
