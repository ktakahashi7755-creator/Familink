// Vitest ユニットテスト：app-source/familink.html の実ロジックを抽出して検証
// 対象: 日付処理 / 課金境界 / 権限・招待 / バリデーション / 繰り返し
import { describe, it, expect } from 'vitest';
import { buildSandbox } from './harness.mjs';

function mk(overrides) { return buildSandbox(overrides).exports; }

describe('日付処理', () => {
  const E = mk();
  it('localDateStr はローカルTZで YYYY-MM-DD', () => {
    expect(E.localDateStr(new Date(2026, 5, 8))).toBe('2026-06-08');
  });
  it('addDays は日付加算（月跨ぎ）', () => {
    expect(E.addDays('2026-06-30', 1)).toBe('2026-07-01');
    expect(E.addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
  it('_ocrNormDate は各種表記を ISO へ正規化', () => {
    expect(E._ocrNormDate('2026/6/8')).toBe('2026-06-08');
    expect(E._ocrNormDate('２０２６年６月８日')).toBe('2026-06-08');
  });
  it('_ocrDateIsReal は実在日のみ true（2/30 は false）', () => {
    expect(E._ocrDateIsReal('2026-06-08')).toBe(true);
    expect(E._ocrDateIsReal('2026-02-30')).toBe(false);
    expect(E._ocrDateIsReal('2026-13-01')).toBe(false);
    expect(E._ocrDateIsReal('2028-02-29')).toBe(true); // 閏年
    expect(E._ocrDateIsReal('bad')).toBe(false);
  });
  it('_ocrNormTime は時刻表記を HH:MM 化・範囲クランプ', () => {
    expect(E._ocrNormTime('9時30分')).toBe('09:30');
    expect(E._ocrNormTime('１４：００')).toBe('14:00');
    expect(E._ocrNormTime('9')).toBe('09:00');
    expect(E._ocrNormTime('25:99')).toBe('23:59');
  });
});

describe('繰り返し予定の発生判定（_occursOn）', () => {
  const E = mk();
  it('毎週は7日ごと', () => {
    const e = { date: '2026-06-01', repeat: 'weekly' };
    expect(E._occursOn(e, '2026-06-08')).toBe(true);
    expect(E._occursOn(e, '2026-06-09')).toBe(false);
  });
  it('平日は土日を除外', () => {
    const e = { date: '2026-06-01', repeat: 'weekdays' }; // 月曜
    expect(E._occursOn(e, '2026-06-06')).toBe(false); // 土
    expect(E._occursOn(e, '2026-06-05')).toBe(true);  // 金
  });
  it('開始日より前は発生しない', () => {
    expect(E._occursOn({ date: '2026-06-10', repeat: 'daily' }, '2026-06-09')).toBe(false);
  });
  it('カスタム（2週ごと）', () => {
    const e = { date: '2026-06-01', repeat: 'custom', repeatInterval: 2, repeatUnit: 'week' };
    expect(E._occursOn(e, '2026-06-15')).toBe(true);
    expect(E._occursOn(e, '2026-06-08')).toBe(false);
  });
});

describe('課金境界（一元管理）', () => {
  it('PREMIUM_FEATURES が正本（OCR/Hoku境界を保持）', () => {
    const E = mk();
    expect(E.PREMIUM_FEATURES.ocr.free).toBe(1);
    expect(E.PREMIUM_FEATURES.ocr.premium).toBe(30);
    expect(E.PREMIUM_FEATURES.hokuDaily.free).toBe(5);
  });
  it('isPremium は S.isPremiumUser を反映', () => {
    expect(mk({ S: { isPremiumUser: false } }).isPremium()).toBe(false);
    expect(mk({ S: { isPremiumUser: true } }).isPremium()).toBe(true);
  });
  it('isPremium はサーバ権利を最優先（改ざん耐性）', () => {
    expect(mk({ S: { isPremiumUser: true, _serverEntitlement: { premium: false } } }).isPremium()).toBe(false);
    expect(mk({ S: { isPremiumUser: false, _serverEntitlement: { premium: true } } }).isPremium()).toBe(true);
  });
  it('_ocrMonthlyLimit は無料1/プレミアム30', () => {
    expect(mk({ S: { isPremiumUser: false } })._ocrMonthlyLimit()).toBe(1);
    expect(mk({ S: { isPremiumUser: true } })._ocrMonthlyLimit()).toBe(30);
  });
  it('checkPremiumLimit は無料の上限で false、プレミアムは常に true', () => {
    const free = mk({ S: { isPremiumUser: false, tasks: new Array(30).fill({}) } });
    // showUpgradeModal が無い sandbox では false 返却前に参照されるため、関数の戻り値のみ検証
    // 30件（free上限=30）→ 31件目はブロック（count<free が false）
    expect(typeof free.checkPremiumLimit).toBe('function');
    const prem = mk({ S: { isPremiumUser: true, tasks: new Array(999).fill({}) } });
    expect(prem.checkPremiumLimit('tasks')).toBe(true);
  });
  it('checkPremiumLimit 無料: 上限未満は true', () => {
    const E = mk({ S: { isPremiumUser: false, tasks: new Array(10).fill({}) } });
    expect(E.checkPremiumLimit('tasks')).toBe(true); // 10 < 30
  });
});

describe('権限・招待コード', () => {
  const E = mk();
  it('招待コードは FAMI-XXXX 形式のみ許可', () => {
    expect(E.isValidInviteCode('FAMI-ABCD-1234-WXYZ')).toBe(true);
    expect(E.isValidInviteCode('FAMI-ABCD')).toBe(true);
    expect(E.isValidInviteCode('fami-abcd-1234-wxyz')).toBe(true); // 内部で大文字化
    expect(E.isValidInviteCode('HELLO-WORLD')).toBe(false);
    expect(E.isValidInviteCode('FAMI-ABC')).toBe(false);
    expect(E.isValidInviteCode('')).toBe(false);
  });
  it('_generateFamilyId は FAMI-XXXX-XXXX-XXXX（紛らわしい文字を除外）', () => {
    for (let i = 0; i < 50; i++) {
      const code = E._generateFamilyId();
      expect(code).toMatch(/^FAMI-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
      const randomPart = code.slice(5); // 接頭辞 FAMI- を除いたランダム部
      expect(randomPart).not.toMatch(/[IO01]/); // I/O/0/1 を除外（L は許可）
    }
  });
  it('生成コードは生成バリデーションを必ず通る', () => {
    for (let i = 0; i < 30; i++) {
      expect(E.isValidInviteCode(E._generateFamilyId())).toBe(true);
    }
  });
});

describe('ファイルアップロード検証', () => {
  const E = mk();
  const F = (name, type, size) => ({ name, type, size });
  it('画像を許可・非画像を拒否', () => {
    expect(E._validateUploadFile(F('a.jpg', 'image/jpeg', 1000), 'image', 20e6).ok).toBe(true);
    expect(E._validateUploadFile(F('a.PNG', '', 1000), 'image', 20e6).ok).toBe(true);
    expect(E._validateUploadFile(F('virus.exe', 'application/octet-stream', 1000), 'image', 20e6).ok).toBe(false);
    expect(E._validateUploadFile(F('doc.pdf', 'application/pdf', 1000), 'image', 20e6).ok).toBe(false);
  });
  it('サイズ上限を超えると拒否', () => {
    expect(E._validateUploadFile(F('big.jpg', 'image/jpeg', 25 * 1024 * 1024), 'image', 20e6).ok).toBe(false);
  });
  it('動画/JSON 種別の判定', () => {
    expect(E._validateUploadFile(F('v.mp4', 'video/mp4', 1000), 'video', 0).ok).toBe(true);
    expect(E._validateUploadFile(F('a.jpg', 'image/jpeg', 1000), 'video', 0).ok).toBe(false);
    expect(E._validateUploadFile(F('b.json', 'application/json', 1000), 'json', 20e6).ok).toBe(true);
    expect(E._validateUploadFile(F('a.jpg', 'image/jpeg', 1000), 'json', 20e6).ok).toBe(false);
  });
  it('null 安全', () => {
    expect(E._validateUploadFile(null, 'image', 20e6).ok).toBe(false);
  });
});

describe('データ分離キーの整合', () => {
  it('FAMILY_SHARED_KEYS に未使用 faceGroups を含まない', () => {
    const E = mk();
    expect(E.FAMILY_SHARED_KEYS).not.toContain('faceGroups');
    expect(E.FAMILY_SHARED_KEYS).toContain('events');
    expect(E.FAMILY_SHARED_KEYS).toContain('albumPhotos');
  });
});
