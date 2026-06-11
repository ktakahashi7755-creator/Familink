/**
 * First-run demo seed. Mirrors the web MVP's `demoSeeded` behavior:
 * gives a new family a few members + sample events/tasks/shopping so the
 * app doesn't feel empty. Runs once; cleared from Settings.
 */
import { memberColors } from '@/theme/tokens';
import { useFamilyStore } from '@/store/useFamilyStore';
import { todayISO, toISODate } from '@/lib/utils';

export function seedDemoData() {
  const store = useFamilyStore.getState();

  // Members
  const names = ['ママ', 'パパ', '星斗', '星愛'];
  names.forEach((name, i) => store.addMember({ name, color: memberColors[i % memberColors.length] }));
  const members = useFamilyStore.getState().members;
  const mama = members[0]?.id;
  const hoshito = members[2]?.id;

  // Events (today + upcoming)
  const today = todayISO();
  const plus = (d: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    return toISODate(dt);
  };
  store.addEvent({ title: '保育園 お迎え', date: today, start: '16:30', memberId: mama, color: memberColors[0] });
  store.addEvent({ title: 'サッカー教室', date: today, start: '18:00', memberId: hoshito, color: memberColors[2] });
  store.addEvent({ title: '小児科 予防接種', date: plus(2), start: '10:00', memberId: hoshito, color: memberColors[2] });
  store.addEvent({ title: '家族でおでかけ', date: plus(5), allDay: true, color: memberColors[1] });

  // Tasks
  store.addTask({ title: '保育園の連絡帳を書く' });
  store.addTask({ title: '習い事の月謝を振り込む' });

  // Shopping
  ['牛乳', 'おむつ', '卵', 'パン'].forEach((n) => store.addShopping(n));

  // Board
  store.addPost({ text: '今週末は祖父母が遊びに来ます。日曜のお昼みんなで集合！', pinned: true });
}
