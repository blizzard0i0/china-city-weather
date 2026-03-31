/**
 * weather.com.cn 天氣抓取腳本
 *
 * 目標：
 * - 直接抓取 weather.com.cn HTML，不依賴 Playwright / Firefox
 * - 單城市與批量輸出統一 JSON envelope，方便 OpenClaw 或其他腳本調用
 * - 若城市不在內建列表，會自動查詢 weather.com.cn 的 city.js 取得城市代碼
 * - 失敗時自動保存 debug HTML / metadata，方便排查 selector 或限速問題
 *
 * 用法：
 *   node fetch_weather.js
 *   node fetch_weather.js 合肥
 *   node fetch_weather.js 101220101
 *   node fetch_weather.js 蘇州 101190401
 *   node fetch_weather.js --batch
 *   node fetch_weather.js --summary 合肥
 *   node fetch_weather.js --raw 合肥
 *   node fetch_weather.js --refresh-city-db 蘇州
 */

const fs = require('fs');
const path = require('path');

const PRESET_CITY_CODES = {
  '北京': '101010100',
  '上海': '101020100',
  '广州': '101280101',
  '深圳': '101280601',
  '珠海': '101280701',
  '东莞': '101281601',
  '杭州': '101210101',
  '宁波': '101210401',
  '合肥': '101220101',
  '厦门': '101230201',
  '福州': '101230101',
  '南昌': '101240101',
  '济南': '101120101',
  '青岛': '101120201',
  '郑州': '101180101',
  '洛阳': '101180901',
  '开封': '101180801',
  '武汉': '101200101',
  '长沙': '101250101',
  '南京': '101190101',
  '苏州': '101190401',
  '无锡': '101190201',
  '成都': '101270101',
  '重庆': '101040100',
  '西安': '101110101',
  '昆明': '101290101',
  '南宁': '101300101',
  '海口': '101310101',
  '三亚': '101310201',
  '天津': '101030100',
  '沈阳': '101070101',
  '大连': '101070201',
  '哈尔滨': '101050101',
};

const CITY_DATA_URL = 'https://j.i8tq.com/weather2020/search/city.js';
const SOURCE_NAME = 'weather.com.cn';
const REQUEST_TIMEOUT_MS = 20000;
const CITY_GAP_MS = 1500;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 3000;
const ROOT_DIR = path.join(__dirname, '..');
const CACHE_DIR = path.join(ROOT_DIR, '.cache');
const DEFAULT_DEBUG_DIR = path.join(ROOT_DIR, 'debug');
const CITY_CACHE_PATH = path.join(CACHE_DIR, 'city-data.json');
const DEFAULT_BATCH_CITIES_PATH = path.join(ROOT_DIR, 'config', 'default-batch-cities.json');

const DEFAULT_HEADERS = {
  'accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'cache-control': 'no-cache',
  'pragma': 'no-cache',
  'referer': 'https://www.weather.com.cn/',
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64; rv:136.0) Gecko/20100101 Firefox/136.0',
};

const TRADITIONAL_TO_SIMPLIFIED_MAP = new Map(
  [
    ['臺', '台'],
    ['萬', '万'],
    ['與', '与'],
    ['東', '东'],
    ['絲', '丝'],
    ['丟', '丢'],
    ['兩', '两'],
    ['嚴', '严'],
    ['喪', '丧'],
    ['豐', '丰'],
    ['臨', '临'],
    ['為', '为'],
    ['麗', '丽'],
    ['舉', '举'],
    ['麼', '么'],
    ['義', '义'],
    ['烏', '乌'],
    ['樂', '乐'],
    ['喬', '乔'],
    ['習', '习'],
    ['鄉', '乡'],
    ['書', '书'],
    ['買', '买'],
    ['亂', '乱'],
    ['爭', '争'],
    ['於', '于'],
    ['虧', '亏'],
    ['雲', '云'],
    ['亞', '亚'],
    ['產', '产'],
    ['畝', '亩'],
    ['親', '亲'],
    ['億', '亿'],
    ['僅', '仅'],
    ['從', '从'],
    ['侖', '仑'],
    ['倉', '仓'],
    ['儀', '仪'],
    ['們', '们'],
    ['價', '价'],
    ['眾', '众'],
    ['優', '优'],
    ['會', '会'],
    ['傘', '伞'],
    ['偉', '伟'],
    ['傳', '传'],
    ['傷', '伤'],
    ['倫', '伦'],
    ['偽', '伪'],
    ['佇', '伫'],
    ['體', '体'],
    ['餘', '余'],
    ['佛', '佛'],
    ['來', '来'],
    ['俠', '侠'],
    ['侶', '侣'],
    ['偵', '侦'],
    ['側', '侧'],
    ['僑', '侨'],
    ['儂', '侬'],
    ['儉', '俭'],
    ['償', '偿'],
    ['傾', '倾'],
    ['僞', '伪'],
    ['儲', '储'],
    ['兒', '儿'],
    ['黨', '党'],
    ['兗', '兖'],
    ['蘭', '兰'],
    ['關', '关'],
    ['興', '兴'],
    ['茲', '兹'],
    ['養', '养'],
    ['獸', '兽'],
    ['岡', '冈'],
    ['冊', '册'],
    ['寫', '写'],
    ['軍', '军'],
    ['農', '农'],
    ['馮', '冯'],
    ['冰', '冰'],
    ['沖', '冲'],
    ['決', '决'],
    ['況', '况'],
    ['凍', '冻'],
    ['淨', '净'],
    ['涼', '凉'],
    ['減', '减'],
    ['湊', '凑'],
    ['鳳', '凤'],
    ['憑', '凭'],
    ['凱', '凯'],
    ['劃', '划'],
    ['劉', '刘'],
    ['則', '则'],
    ['剛', '刚'],
    ['創', '创'],
    ['刪', '删'],
    ['別', '别'],
    ['剎', '刹'],
    ['劑', '剂'],
    ['勁', '劲'],
    ['動', '动'],
    ['務', '务'],
    ['勵', '励'],
    ['勸', '劝'],
    ['匯', '汇'],
    ['區', '区'],
    ['醫', '医'],
    ['華', '华'],
    ['協', '协'],
    ['單', '单'],
    ['賣', '卖'],
    ['盧', '卢'],
    ['衛', '卫'],
    ['卻', '却'],
    ['廠', '厂'],
    ['廳', '厅'],
    ['歷', '历'],
    ['厲', '厉'],
    ['壓', '压'],
    ['廈', '厦'],
    ['縣', '县'],
    ['參', '参'],
    ['雙', '双'],
    ['發', '发'],
    ['變', '变'],
    ['疊', '叠'],
    ['葉', '叶'],
    ['號', '号'],
    ['嘆', '叹'],
    ['臺', '台'],
    ['吳', '吴'],
    ['嚇', '吓'],
    ['呂', '吕'],
    ['嗎', '吗'],
    ['員', '员'],
    ['聽', '听'],
    ['啟', '启'],
    ['吶', '呐'],
    ['唄', '呗'],
    ['噸', '吨'],
    ['響', '响'],
    ['噴', '喷'],
    ['嚐', '尝'],
    ['團', '团'],
    ['園', '园'],
    ['圍', '围'],
    ['國', '国'],
    ['圖', '图'],
    ['圓', '圆'],
    ['聖', '圣'],
    ['場', '场'],
    ['阪', '坂'],
    ['壞', '坏'],
    ['塊', '块'],
    ['堅', '坚'],
    ['壇', '坛'],
    ['壢', '坜'],
    ['壩', '坝'],
    ['塢', '坞'],
    ['墳', '坟'],
    ['墜', '坠'],
    ['壘', '垒'],
    ['夢', '梦'],
    ['夠', '够'],
    ['頭', '头'],
    ['誇', '夸'],
    ['奪', '夺'],
    ['奮', '奋'],
    ['奧', '奥'],
    ['婦', '妇'],
    ['媽', '妈'],
    ['姊', '姐'],
    ['姍', '姗'],
    ['娛', '娱'],
    ['婁', '娄'],
    ['孫', '孙'],
    ['學', '学'],
    ['寧', '宁'],
    ['寶', '宝'],
    ['實', '实'],
    ['審', '审'],
    ['寫', '写'],
    ['寬', '宽'],
    ['對', '对'],
    ['尋', '寻'],
    ['導', '导'],
    ['將', '将'],
    ['專', '专'],
    ['尋', '寻'],
    ['爾', '尔'],
    ['塵', '尘'],
    ['嘗', '尝'],
    ['屆', '届'],
    ['層', '层'],
    ['屬', '属'],
    ['岡', '冈'],
    ['島', '岛'],
    ['峽', '峡'],
    ['峯', '峰'],
    ['崗', '岗'],
    ['崑', '昆'],
    ['崙', '仑'],
    ['嶺', '岭'],
    ['巖', '岩'],
    ['巢', '巢'],
    ['幣', '币'],
    ['帥', '帅'],
    ['師', '师'],
    ['帳', '帐'],
    ['帶', '带'],
    ['幫', '帮'],
    ['幹', '干'],
    ['廣', '广'],
    ['慶', '庆'],
    ['廬', '庐'],
    ['廢', '废'],
    ['開', '开'],
    ['異', '异'],
    ['棄', '弃'],
    ['張', '张'],
    ['彌', '弥'],
    ['彎', '弯'],
    ['彈', '弹'],
    ['強', '强'],
    ['歸', '归'],
    ['當', '当'],
    ['錄', '录'],
    ['徵', '征'],
    ['德', '德'],
    ['復', '复'],
    ['恆', '恒'],
    ['愛', '爱'],
    ['惡', '恶'],
    ['悅', '悦'],
    ['懸', '悬'],
    ['驚', '惊'],
    ['慘', '惨'],
    ['慣', '惯'],
    ['憲', '宪'],
    ['憂', '忧'],
    ['憑', '凭'],
    ['懶', '懒'],
    ['應', '应'],
    ['懷', '怀'],
    ['態', '态'],
    ['總', '总'],
    ['戀', '恋'],
    ['恆', '恒'],
    ['戰', '战'],
    ['戲', '戏'],
    ['戶', '户']
  ]
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function timestampCompact() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function decodeHtml(text) {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(text) {
  return decodeHtml(String(text || '').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFirst(source, pattern) {
  const match = source.match(pattern);
  return match ? match[1] : '';
}

function sanitizeFilePart(value) {
  return String(value || 'unknown').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 80);
}

function normalizeChineseName(value) {
  return Array.from(String(value || '').trim())
    .map(char => TRADITIONAL_TO_SIMPLIFIED_MAP.get(char) || char)
    .join('');
}

function extractListItems(sectionHtml) {
  const listHtml = extractFirst(
    sectionHtml,
    /<ul[^>]*class="t clearfix"[^>]*>([\s\S]*?)<\/ul>/i
  );

  if (!listHtml) return [];

  return Array.from(listHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)).map(
    match => match[1]
  );
}

function parse7Day(html) {
  const section = extractFirst(
    html,
    /<div id="7d" class="c7d">([\s\S]*?)<\/div>\s*<div id="biggt"/i
  );
  const items = extractListItems(section);

  return items.map(itemHtml => {
    const date = stripTags(extractFirst(itemHtml, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
    const weather = stripTags(
      extractFirst(itemHtml, /<p[^>]*class="wea"[^>]*>([\s\S]*?)<\/p>/i)
    );
    const high = stripTags(
      extractFirst(itemHtml, /<p[^>]*class="tem"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i)
    );
    const low = stripTags(
      extractFirst(itemHtml, /<p[^>]*class="tem"[^>]*>[\s\S]*?<i[^>]*>([\s\S]*?)<\/i>/i)
    );
    const windTitles = Array.from(
      itemHtml.matchAll(/<span[^>]*title="([^"]+)"[^>]*>/gi)
    ).map(match => stripTags(match[1]));

    const temp = [high, low].filter(Boolean).join('/');
    let wind = '';
    if (windTitles.length > 1) {
      wind = windTitles[0] === windTitles[1]
        ? windTitles[0]
        : `${windTitles[0]}转${windTitles[1]}`;
    } else {
      wind = windTitles[0] || '';
    }

    return { date, weather, temp, wind };
  }).filter(day => day.date || day.weather || day.temp || day.wind);
}

function parse15Day(html) {
  const section = extractFirst(
    html,
    /<div id="15d" class="c15d">([\s\S]*?)<div class="left-div">/i
  );
  const items = extractListItems(section);

  return items.map(itemHtml => ({
    date: stripTags(
      extractFirst(itemHtml, /<span[^>]*class="time"[^>]*>([\s\S]*?)<\/span>/i)
    ),
    weather: stripTags(
      extractFirst(itemHtml, /<span[^>]*class="wea"[^>]*>([\s\S]*?)<\/span>/i)
    ),
    temp: stripTags(
      extractFirst(itemHtml, /<span[^>]*class="tem"[^>]*>([\s\S]*?)<\/span>/i)
    ).replace(/\s+/g, ''),
    wind: stripTags(
      extractFirst(itemHtml, /<span[^>]*class="wind"[^>]*>([\s\S]*?)<\/span>/i)
    ),
  })).filter(day => day.date || day.weather || day.temp || day.wind);
}

function parsePageMeta(html) {
  return {
    title: stripTags(extractFirst(html, /<title>([\s\S]*?)<\/title>/i)),
    updateTime: stripTags(extractFirst(html, /<input[^>]*id="update_time"[^>]*value="([^"]*)"/i)),
    internalUpdateTime: stripTags(
      extractFirst(html, /<input[^>]*id="(?:fc_24h_internal_update_time|fc_15d_24h_internal_update_time)"[^>]*value="([^"]*)"/i)
    ),
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} @ ${url}`);
  }

  return response.text();
}

async function saveDebugArtifact({
  debugDir,
  cityName,
  code,
  label,
  url,
  attempt,
  reason,
  error,
  html,
}) {
  ensureDir(debugDir);

  const baseName = [
    timestampCompact(),
    sanitizeFilePart(cityName),
    sanitizeFilePart(code),
    sanitizeFilePart(label),
    `attempt${attempt}`,
  ].join('__');

  const metaPath = path.join(debugDir, `${baseName}.json`);
  const htmlPath = path.join(debugDir, `${baseName}.html`);

  const payload = {
    source: SOURCE_NAME,
    savedAt: new Date().toISOString(),
    cityName,
    code,
    label,
    url,
    attempt,
    reason,
    error: error ? error.message : null,
    htmlPath: html ? htmlPath : null,
  };

  fs.writeFileSync(metaPath, JSON.stringify(payload, null, 2));
  if (html) {
    fs.writeFileSync(htmlPath, html);
  }
}

async function fetchAndParsePage({ cityName, code, label, url, parser, debugDir }) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
    if (attempt > 1) {
      const waitMs = RETRY_BASE_MS * (attempt - 1);
      process.stderr.write(`  [${label}] 重試 ${attempt - 1}/${MAX_RETRIES}，等待 ${waitMs}ms\n`);
      await sleep(waitMs);
    }

    let html = '';

    try {
      html = await fetchText(url);
      const days = parser(html);

      if (days.length > 0) {
        return {
          url,
          days,
          meta: parsePageMeta(html),
        };
      }

      lastError = new Error(`抓取成功但未解析出資料: ${url}`);
      process.stderr.write(`  [${label}] 第${attempt}次抓到 0 筆，重試...\n`);
      await saveDebugArtifact({
        debugDir,
        cityName,
        code,
        label,
        url,
        attempt,
        reason: 'empty_parse',
        error: lastError,
        html,
      });
    } catch (error) {
      lastError = error;
      process.stderr.write(`  [${label}] 第${attempt}次錯誤: ${error.message}\n`);
      await saveDebugArtifact({
        debugDir,
        cityName,
        code,
        label,
        url,
        attempt,
        reason: 'request_or_parse_error',
        error,
        html,
      });
    }
  }

  throw lastError || new Error(`抓取失敗: ${url}`);
}

async function loadCityDatabase({ refresh = false } = {}) {
  ensureDir(CACHE_DIR);

  if (!refresh && fs.existsSync(CITY_CACHE_PATH)) {
    return JSON.parse(fs.readFileSync(CITY_CACHE_PATH, 'utf8'));
  }

  const script = await fetchText(CITY_DATA_URL);
  const match = script.match(/var\s+city_data\s*=\s*([\s\S]*);?\s*$/);
  if (!match) {
    throw new Error(`無法解析城市資料來源: ${CITY_DATA_URL}`);
  }

  const cityData = JSON.parse(match[1]);
  fs.writeFileSync(CITY_CACHE_PATH, JSON.stringify(cityData, null, 2));
  return cityData;
}

function flattenCityData(cityData) {
  const entries = [];

  for (const [provinceName, provinceData] of Object.entries(cityData)) {
    for (const [cityGroupName, cityGroupData] of Object.entries(provinceData)) {
      for (const [districtName, districtData] of Object.entries(cityGroupData)) {
        if (!districtData || typeof districtData !== 'object') continue;
        if (!districtData.AREAID) continue;

        entries.push({
          provinceName,
          cityGroupName,
          districtName,
          code: districtData.AREAID,
          displayName: districtData.NAMECN || districtName,
        });
      }
    }
  }

  return entries;
}

function pickBestCityMatch(query, entries) {
  const normalizedQuery = normalizeChineseName(query);
  const exact = entries
    .map(entry => {
      const normalizedDisplayName = normalizeChineseName(entry.displayName);
      const normalizedDistrictName = normalizeChineseName(entry.districtName);
      const normalizedCityGroupName = normalizeChineseName(entry.cityGroupName);
      const normalizedProvinceName = normalizeChineseName(entry.provinceName);
      let score = 0;
      if (normalizedDisplayName === normalizedQuery) score += 5;
      if (normalizedDistrictName === normalizedQuery) score += 4;
      if (normalizedCityGroupName === normalizedQuery) score += 3;
      if (normalizedProvinceName === normalizedQuery) score += 1;
      if (normalizedDisplayName === normalizedQuery && normalizedCityGroupName === normalizedQuery) score += 3;
      if (normalizedCityGroupName === normalizedQuery && normalizedDistrictName === normalizedQuery) score += 2;
      return { entry, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

    if (exact.length === 0) {
      return null;
    }

    const bestScore = exact[0].score;
    const bestMatches = exact.filter(item => item.score === bestScore);

    if (bestMatches.length === 1) {
      return { type: 'match', entry: bestMatches[0].entry };
    }

    return {
      type: 'ambiguous',
      matches: bestMatches.slice(0, 10).map(item => item.entry),
    };
}

async function resolveCityByName(name, options) {
  if (PRESET_CITY_CODES[name]) {
    return { cityName: name, code: PRESET_CITY_CODES[name], matchedBy: 'preset' };
  }

  const normalizedName = normalizeChineseName(name);
  const presetMatch = Object.entries(PRESET_CITY_CODES).find(([presetName]) => (
    normalizeChineseName(presetName) === normalizedName
  ));
  if (presetMatch) {
    return { cityName: name, code: presetMatch[1], matchedBy: 'preset_normalized' };
  }

  const cityData = await loadCityDatabase({ refresh: options.refreshCityDb });
  const entries = flattenCityData(cityData);
  const match = pickBestCityMatch(name, entries);

  if (!match) {
    throw new Error(`找不到城市：${name}。請直接提供 9 位城市代碼。`);
  }

  if (match.type === 'ambiguous') {
    const lines = match.matches.map(
      item => `${item.displayName} (${item.provinceName}/${item.cityGroupName}) -> ${item.code}`
    );
    throw new Error(`城市名稱不夠明確：${name}\n可用候選：\n- ${lines.join('\n- ')}`);
  }

  return {
    cityName: match.entry.displayName,
    code: match.entry.code,
    matchedBy: 'city.js',
    provinceName: match.entry.provinceName,
    cityGroupName: match.entry.cityGroupName,
    districtName: match.entry.districtName,
  };
}

function parseArgs(argv) {
  const options = {
    raw: false,
    summary: false,
    batch: false,
    refreshCityDb: false,
    debugDir: DEFAULT_DEBUG_DIR,
  };
  const positional = [];

  for (const arg of argv) {
    if (arg === '--raw') {
      options.raw = true;
      continue;
    }
    if (arg === '--summary') {
      options.summary = true;
      continue;
    }
    if (arg === '--batch') {
      options.batch = true;
      continue;
    }
    if (arg === '--refresh-city-db') {
      options.refreshCityDb = true;
      continue;
    }
    if (arg.startsWith('--debug-dir=')) {
      options.debugDir = path.resolve(arg.slice('--debug-dir='.length));
      continue;
    }
    positional.push(arg);
  }

  return { options, positional };
}

function loadDefaultBatchCities() {
  if (!fs.existsSync(DEFAULT_BATCH_CITIES_PATH)) {
    throw new Error(`找不到預設批量城市設定檔：${DEFAULT_BATCH_CITIES_PATH}`);
  }

  const parsed = JSON.parse(fs.readFileSync(DEFAULT_BATCH_CITIES_PATH, 'utf8'));
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`預設批量城市設定無效：${DEFAULT_BATCH_CITIES_PATH}`);
  }

  return parsed.map(item => String(item).trim()).filter(Boolean);
}

async function resolveTarget(positional, options) {
  if (options.batch) {
    if (positional.length > 0) {
      throw new Error('--batch 不接受城市參數。請直接使用：node fetch_weather.js --batch');
    }
    return null;
  }

  if (positional.length === 0) return null;

  if (positional.length === 1) {
    const value = positional[0].trim();

    if (/^\d{9}$/.test(value)) {
      return { cityName: value, code: value, matchedBy: 'direct_code' };
    }

    return resolveCityByName(value, options);
  }

  if (positional.length === 2 && /^\d{9}$/.test(positional[1])) {
    return { cityName: positional[0], code: positional[1], matchedBy: 'manual_name_and_code' };
  }

  throw new Error(
    '用法：node fetch_weather.js [城市名] 或 [城市名 城市代碼] 或 [9位城市代碼] ' +
    '[--summary] [--raw] [--refresh-city-db] [--debug-dir=/path]'
  );
}

function buildUsageText() {
  const defaultBatchCities = loadDefaultBatchCities();
  return [
    'China City Weather',
    '',
    '用法：',
    '  node scripts/fetch_weather.js [城市名]',
    '  node scripts/fetch_weather.js [9位城市代碼]',
    '  node scripts/fetch_weather.js [城市名] [9位城市代碼]',
    '  node scripts/fetch_weather.js --batch',
    '  node scripts/fetch_weather.js --summary [城市名]',
    '  node scripts/fetch_weather.js --raw [城市名]',
    '  node scripts/fetch_weather.js --refresh-city-db [城市名]',
    '',
    '範例：',
    '  node scripts/fetch_weather.js 合肥',
    '  node scripts/fetch_weather.js 肇慶',
    '  node scripts/fetch_weather.js 乌鲁木齐',
    '  node scripts/fetch_weather.js 101220101',
    '  node scripts/fetch_weather.js 蘇州 101190401',
    '  node scripts/fetch_weather.js --batch',
    '  node scripts/fetch_weather.js --summary 洛陽',
    '',
    '說明：',
    '  - 支援繁體與簡體城市名',
    '  - 不帶參數時只顯示此說明，不會自動批量抓取',
    `  - --batch 會抓取設定檔中的城市清單: ${DEFAULT_BATCH_CITIES_PATH}`,
    `  - 目前 batch 清單: ${defaultBatchCities.join('、')}`,
  ].join('\n');
}

function buildSummary(result) {
  const today = result.days1to7[0];
  const day8 = result.days8to15[0];
  const parts = [`${result.cityName}(${result.code})`];

  if (today) {
    parts.push(`今天天氣 ${today.weather || '未知'} ${today.temp || ''}`.trim());
  }
  if (day8) {
    parts.push(`第8天 ${day8.date} ${day8.weather || '未知'} ${day8.temp || ''}`.trim());
  }

  return parts.join(' | ');
}

function buildSingleEnvelope(target, result) {
  return {
    ok: true,
    source: SOURCE_NAME,
    fetchedAt: new Date().toISOString(),
    mode: 'single',
    query: {
      cityName: target.cityName,
      code: target.code,
      matchedBy: target.matchedBy,
    },
    result: {
      ...result,
      summary: buildSummary(result),
    },
  };
}

function buildBatchEnvelope(results, errors) {
  return {
    ok: errors.length === 0,
    source: SOURCE_NAME,
    fetchedAt: new Date().toISOString(),
    mode: 'batch',
    total: results.length,
    successCount: results.filter(item => !item.error).length,
    errorCount: errors.length,
    results,
    errors,
  };
}

async function fetchCity(target, options) {
  const page7 = await fetchAndParsePage({
    cityName: target.cityName,
    code: target.code,
    label: `${target.cityName} 7天`,
    url: `https://www.weather.com.cn/weather/${target.code}.shtml`,
    parser: parse7Day,
    debugDir: options.debugDir,
  });

  const page15 = await fetchAndParsePage({
    cityName: target.cityName,
    code: target.code,
    label: `${target.cityName} 15天`,
    url: `https://www.weather.com.cn/weather15d/${target.code}.shtml`,
    parser: parse15Day,
    debugDir: options.debugDir,
  });

  return {
    cityName: target.cityName,
    code: target.code,
    matchedBy: target.matchedBy,
    location: {
      provinceName: target.provinceName || null,
      cityGroupName: target.cityGroupName || null,
      districtName: target.districtName || null,
    },
    counts: {
      days1to7: page7.days.length,
      days8to15: page15.days.length,
    },
    pageMeta: {
      days1to7: page7.meta,
      days8to15: page15.meta,
    },
    sourceUrls: {
      days1to7: page7.url,
      days8to15: page15.url,
    },
    days1to7: page7.days,
    days8to15: page15.days,
  };
}

function outputResult(payload, options) {
  if (options.summary) {
    if (payload.mode === 'single') {
      console.log(payload.result.summary);
      return;
    }

    const lines = payload.results.map(item => {
      if (item.error) {
        return `${item.cityName}(${item.code}) | 失敗 | ${item.error}`;
      }
      return buildSummary(item);
    });
    console.log(lines.join('\n'));
    return;
  }

  if (options.raw) {
    if (payload.mode === 'single') {
      console.log(JSON.stringify(payload.result, null, 2));
      return;
    }
    console.log(JSON.stringify(payload.results, null, 2));
    return;
  }

  console.log(JSON.stringify(payload, null, 2));
}

async function main() {
  const { options, positional } = parseArgs(process.argv.slice(2));
  ensureDir(options.debugDir);

  const target = await resolveTarget(positional, options);

  if (!target && !options.batch) {
    console.log(buildUsageText());
    return;
  }

  if (options.batch) {
    const defaultBatchCities = loadDefaultBatchCities();
    const results = [];
    const errors = [];

    for (let index = 0; index < defaultBatchCities.length; index += 1) {
      const cityName = defaultBatchCities[index];
      const targetCity = await resolveCityByName(cityName, options);
      process.stderr.write(`[${targetCity.cityName}] 抓取中 (${targetCity.code})...\n`);

      try {
        const result = await fetchCity(targetCity, options);
        process.stderr.write(
          `  → ${result.cityName}: 7天=${result.counts.days1to7} 筆, 15天=${result.counts.days8to15} 筆\n`
        );
        results.push(result);
      } catch (error) {
        process.stderr.write(`  ✗ ${targetCity.cityName} 錯誤: ${error.message}\n`);
        const failed = {
          cityName: targetCity.cityName,
          code: targetCity.code,
          matchedBy: targetCity.matchedBy,
          error: error.message,
        };
        results.push(failed);
        errors.push(failed);
      }

      if (index < defaultBatchCities.length - 1) {
        await sleep(CITY_GAP_MS);
      }
    }

    outputResult(buildBatchEnvelope(results, errors), options);
    return;
  }

  process.stderr.write(`[${target.cityName}] 抓取中 (${target.code})...\n`);
  const result = await fetchCity(target, options);
  outputResult(buildSingleEnvelope(target, result), options);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
