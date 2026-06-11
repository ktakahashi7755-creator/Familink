import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeContext';
import { AppText, Button } from './ui';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { colors, radius } = useTheme();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    haptic.warning();
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={!!opts} transparent animationType="fade" onRequestClose={() => close(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderRadius: radius.lg }]}>
            <AppText variant="title3" style={{ textAlign: 'center' }}>
              {opts?.title}
            </AppText>
            {opts?.message && (
              <AppText variant="callout" muted style={{ textAlign: 'center' }}>
                {opts.message}
              </AppText>
            )}
            <View style={{ gap: 8, marginTop: 4 }}>
              <Button
                title={opts?.confirmLabel ?? 'OK'}
                variant={opts?.destructive ? 'danger' : 'primary'}
                onPress={() => close(true)}
              />
              <Button title={opts?.cancelLabel ?? 'キャンセル'} variant="ghost" onPress={() => close(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: { width: '100%', maxWidth: 360, padding: 24, gap: 12 },
});
