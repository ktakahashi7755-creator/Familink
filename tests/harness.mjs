// 実コード抽出ハーネス：app-source/familink.html から純粋ロジック関数の「実体」を
// 取り出し、最小スタブのサンドボックスで eval して返す。テストは複製ではなく本物を検証する。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(__dirname, '..', 'app-source', 'familink.html'), 'utf8');

// 名前付き関数 `function NAME(...) { ... }` を波括弧の対応をとって抽出
function extractFunction(name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\(', 'g');
  const m = re.exec(SRC);
  if (!m) throw new Error('function not found: ' + name);
  let i = SRC.indexOf('{', m.index);
  if (i < 0) throw new Error('no body: ' + name);
  let depth = 0, end = -1;
  for (let j = i; j < SRC.length; j++) {
    const c = SRC[j];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end < 0) throw new Error('unbalanced: ' + name);
  return SRC.slice(m.index, end + 1);
}

// `const NAME = ...;` または `const NAME = ( ... );` を行/式単位で抽出（アロー・オブジェクト対応）
function extractConst(name) {
  const re = new RegExp('const\\s+' + name + '\\s*=', 'g');
  const m = re.exec(SRC);
  if (!m) throw new Error('const not found: ' + name);
  // 式末尾の ; を波括弧/丸括弧の対応をとって探す
  let i = SRC.indexOf('=', m.index) + 1;
  let depthC = 0, depthP = 0, depthB = 0, end = -1;
  for (let j = i; j < SRC.length; j++) {
    const c = SRC[j];
    if (c === '{') depthC++; else if (c === '}') depthC--;
    else if (c === '(') depthP++; else if (c === ')') depthP--;
    else if (c === '[') depthB++; else if (c === ']') depthB--;
    else if (c === ';' && depthC === 0 && depthP === 0 && depthB === 0) { end = j; break; }
  }
  if (end < 0) throw new Error('const end not found: ' + name);
  return SRC.slice(m.index, end + 1);
}

// サンドボックスを構築：可変な state を差し込めるようにする
export function buildSandbox(overrides = {}) {
  const sandbox = {
    // テストから差し替え可能なグローバル state
    S: overrides.S || {},
    MEMBERS: overrides.MEMBERS || [],
    console,
    Math, Date, JSON, String, Number, Array, Object, RegExp, parseInt, parseFloat, isNaN, isFinite,
  };
  // 依存ヘルパー（実体を抽出して同じ context に注入）
  const pieces = [
    extractFunction('localDateStr'),
    'const todayStr = () => localDateStr(new Date());',
    'const addDays = (s,n) => { const d = new Date(s+"T00:00:00"); d.setDate(d.getDate()+n); return localDateStr(d); };',
    extractFunction('_ocrZen2Han'),
    extractFunction('_ocrNormTime'),
    extractFunction('_ocrNormDate'),
    extractFunction('_ocrDateIsReal'),
    extractFunction('_occursOn'),
    extractFunction('_validateUploadFile'),
    extractConst('PREMIUM_FEATURES'),
    extractConst('PREMIUM_LIMITS'),
    extractConst('FAMILY_SHARED_KEYS'),
    extractFunction('isPremium'),
    'function _ocrFreeMonthly(){ return PREMIUM_FEATURES.ocr.free; }',
    'function _ocrPremiumMonthly(){ return PREMIUM_FEATURES.ocr.premium; }',
    extractFunction('_ocrMonthlyLimit'),
    extractFunction('checkPremiumLimit'),
    extractFunction('_generateFamilyId'),
    // 招待コード形式バリデーション（doSupaInviteSubmit 内の正規表現を関数化して検証）
    'function isValidInviteCode(raw){ return /^FAMI-[A-Z0-9]{4}(-[A-Z0-9]{4})*$/.test(String(raw||"").trim().toUpperCase()); }',
    // crypto スタブ（_generateFamilyId のフォールバック分岐を使う）
  ];
  // crypto を最小スタブ（getRandomValues）
  sandbox.crypto = { getRandomValues: (buf) => { for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 0xffffffff); return buf; } };
  const code = pieces.join('\n;\n') + '\n;\n' +
    'globalThis.__exports = { localDateStr, todayStr, addDays, _ocrZen2Han, _ocrNormTime, _ocrNormDate, _ocrDateIsReal, _occursOn, _validateUploadFile, isPremium, _ocrMonthlyLimit, checkPremiumLimit, _generateFamilyId, isValidInviteCode, PREMIUM_FEATURES, PREMIUM_LIMITS, FAMILY_SHARED_KEYS };';
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return { exports: sandbox.__exports, sandbox };
}
