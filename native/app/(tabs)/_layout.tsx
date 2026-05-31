import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, TAB_BAR_HEIGHT } from '../../src/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabIconProps = {
  focused: boolean;
  color: string;
  size: number;
  name: keyof typeof Ionicons.glyphMap;
  focusedName: keyof typeof Ionicons.glyphMap;
};

function TabIcon({ focused, color, size, name, focusedName }: TabIconProps) {
  return (
    <Ionicons
      name={focused ? focusedName : name}
      size={size}
      color={color}
    />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 0.5,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon focused={focused} color={color as string} size={size}
              name="home-outline" focusedName="home" />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'カレンダー',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon focused={focused} color={color as string} size={size}
              name="calendar-outline" focusedName="calendar" />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'タスク',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon focused={focused} color={color as string} size={size}
              name="checkmark-circle-outline" focusedName="checkmark-circle" />
          ),
        }}
      />
      <Tabs.Screen
        name="memo"
        options={{
          title: 'メモ',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon focused={focused} color={color as string} size={size}
              name="document-text-outline" focusedName="document-text" />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'その他',
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon focused={focused} color={color as string} size={size}
              name="grid-outline" focusedName="grid" />
          ),
        }}
      />
    </Tabs>
  );
}
