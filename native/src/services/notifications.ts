import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Familink',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5B7FFF',
    });
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;

  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  return newStatus === 'granted';
}

export async function scheduleEventReminder(
  id: string,
  title: string,
  date: string,
  time?: string,
): Promise<string | null> {
  try {
    const [year, month, day] = date.split('-').map(Number);
    const [hour = 9, minute = 0] = (time ?? '09:00').split(':').map(Number);

    // Notify 30 min before event
    const triggerDate = new Date(year, month - 1, day, hour, Math.max(minute - 30, 0));
    if (triggerDate <= new Date()) return null;

    const notifId = await Notifications.scheduleNotificationAsync({
      identifier: `event-${id}`,
      content: {
        title: '📅 予定のお知らせ',
        body: `30分後: ${title}`,
        data: { type: 'event', id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return notifId;
  } catch {
    return null;
  }
}

export async function scheduleTaskReminder(
  id: string,
  title: string,
  dueDate: string,
): Promise<string | null> {
  try {
    const [year, month, day] = dueDate.split('-').map(Number);
    const triggerDate = new Date(year, month - 1, day, 9, 0);
    if (triggerDate <= new Date()) return null;

    const notifId = await Notifications.scheduleNotificationAsync({
      identifier: `task-${id}`,
      content: {
        title: '✅ タスクのリマインダー',
        body: title,
        data: { type: 'task', id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return notifId;
  } catch {
    return null;
  }
}

export async function cancelReminder(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // silent
  }
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
