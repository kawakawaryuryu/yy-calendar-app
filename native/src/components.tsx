import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icons';
import { colors as c } from './theme';

export function ActionButton({ children, onPress, secondary = false, danger = false, disabled = false, label, style }: { children: ReactNode; onPress: () => void; secondary?: boolean; danger?: boolean; disabled?: boolean; label?: string; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [ui.button, secondary ? ui.secondaryButton : danger ? ui.dangerButton : ui.primaryButton, pressed && { opacity: .72 }, disabled && { opacity: .4 }, style]}><Text style={[ui.buttonText, secondary && { color: c.text }]}>{children}</Text></Pressable>;
}
export function IconButton({ name, label, onPress, size = 20, color = '#858c80' }: { name: string; label: string; onPress: () => void; size?: number; color?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={5} style={({ pressed }) => [ui.iconButton, pressed && { backgroundColor: '#ecece4' }]}><Icon name={name} size={size} color={color}/></Pressable>;
}
export function Sheet({ title, onClose, children, footer, testID }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  return <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent presentationStyle="overFullScreen">
    <KeyboardAvoidingView style={ui.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="背景をタップして閉じる"/>
      <View testID={testID} accessibilityViewIsModal style={[ui.sheet, { maxHeight: height - insets.top - 16, width: Math.min(width - 16, 500), paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={ui.sheetHeader}><Text accessibilityRole="header" style={ui.sheetTitle}>{title}</Text><IconButton name="close" label="閉じる" onPress={onClose}/></View>
        {children}
        {footer && <View style={ui.sheetFooter}>{footer}</View>}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
export function ChoiceRow({ label, selected, onPress, color = c.accent, radio = false, hint }: { label: string; selected: boolean; onPress: () => void; color?: string; radio?: boolean; hint?: string }) {
  return <Pressable accessibilityRole={radio ? 'radio' : 'checkbox'} accessibilityLabel={label} accessibilityState={{ checked: selected }} onPress={onPress} style={ui.choiceRow}><View style={[ui.choiceIndicator, { borderColor: selected ? color : '#cfd4c7', backgroundColor: selected ? color : 'transparent', borderRadius: radio ? 10 : 4 }]}>{selected && <Icon name="check" color="white" size={12}/>}</View><Text style={ui.choiceLabel}>{label}</Text>{hint && <Text style={ui.choiceHint}>{hint}</Text>}</Pressable>;
}
export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  muted: { color: c.muted, fontSize: 11, lineHeight: 19 },
  sectionTitle: { color: c.text, fontSize: 13, fontWeight: '600', marginBottom: 14 },
  section: { paddingBottom: 20, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: c.line },
  button: { borderRadius: 9, paddingVertical: 13, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  primaryButton: { backgroundColor: c.accent }, secondaryButton: { backgroundColor: '#fffefa', borderColor: '#dfe0d6', borderWidth: 1 }, dangerButton: { backgroundColor: '#b96656' },
  buttonText: { color: 'white', fontSize: 13, fontWeight: '600' },
  iconButton: { height: 36, width: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalRoot: { flex: 1, backgroundColor: '#25312666', alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fcfbf8', borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden', flexShrink: 1 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: c.line },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: c.text },
  sheetFooter: { paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: c.line },
  body: { padding: 20 },
  field: { marginBottom: 18 },
  fieldLabel: { color: '#7c8474', fontSize: 11, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#dfe2d6', backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minHeight: 46, color: '#48503f', fontSize: 16 },
  readonlyInput: { backgroundColor: '#f0f1e9', color: '#828977' },
  choiceRow: { flexDirection: 'row', alignItems: 'center', minHeight: 43, gap: 11 },
  choiceIndicator: { width: 18, height: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  choiceLabel: { color: c.text, fontSize: 12, flex: 1 }, choiceHint: { fontSize: 9, color: c.muted },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 46, gap: 8 },
  switchText: { fontSize: 12, color: c.text, flexShrink: 1 },
  error: { color: '#b65f50', fontSize: 12, lineHeight: 19 },
  confirm: { backgroundColor: '#f8ebe5', borderRadius: 9, padding: 14, marginVertical: 8 },
});
