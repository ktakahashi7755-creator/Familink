import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors, Typography, Radius } from '../../constants/theme';

interface AvatarProps {
  name?: string;
  color?: string;
  uri?: string;
  size?: number;
  fontSize?: number;
}

export function Avatar({ name = '?', color = Colors.primary, uri, size = 36, fontSize }: AvatarProps) {
  const initials = name.slice(0, 2);
  const fSize = fontSize ?? Math.round(size * 0.38);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + '22' }]}>
      <Text style={[styles.initials, { fontSize: fSize, color }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: Typography.bold,
  },
});
