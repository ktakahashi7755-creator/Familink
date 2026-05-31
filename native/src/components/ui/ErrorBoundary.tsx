import React, { Component, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Familink]', error.message, info.componentStack);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>🌸</Text>
          <Text style={styles.title}>少し問題が発生しました</Text>
          <Text style={styles.desc}>申し訳ありません。もう一度お試しください</Text>
          <TouchableOpacity style={styles.btn} onPress={this.reset}>
            <Text style={styles.btnText}>再試行</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, paddingHorizontal: Spacing.xxl, gap: Spacing.base,
  },
  emoji: { fontSize: 52 },
  title: { fontSize: Typography.lg, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  desc: { fontSize: Typography.base, color: Colors.textMuted, textAlign: 'center', lineHeight: Typography.base * 1.5 },
  btn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    ...Shadows.sm,
  },
  btnText: { fontSize: Typography.base, fontWeight: '700', color: '#fff' },
});
