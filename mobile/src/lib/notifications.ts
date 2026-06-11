/**
 * Local notification reminders for upcoming timed events.
 * No server / push needed — uses expo-notifications local scheduling.
 */
import * as Notifications from 'expo-notifications';

import { fromISODate } from '@/lib/utils';
import type { FamilyEvent } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

/**
 * Reschedules reminders for all future timed events: a heads-up 30 minutes
 * before each. Clears previously scheduled ones first to avoid duplicates.
 */
export async function syncEventReminders(events: FamilyEvent[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  const timed = events.filter((e) => !e.allDay && e.start);

  for (const e of timed.slice(0, 60)) {
    const [h, m] = (e.start as string).split(':').map(Number);
    const when = fromISODate(e.date);
    when.setHours(h ?? 0, m ?? 0, 0, 0);
    const fireAt = when.getTime() - 30 * 60 * 1000; // 30 min before
    if (fireAt <= now) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'もうすぐ予定があるよ',
        body: `${e.start} ${e.title}`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fireAt),
      },
    });
  }
}

export async function clearAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
