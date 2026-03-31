---
name: china-city-weather
description: >
  Fetch 7-day + 8-15-day weather forecasts from weather.com.cn by direct HTML fetch.
  Supports any Chinese city with a known weather.com.cn city code.
  If a city code is not provided, it can auto-resolve city names via weather.com.cn city.js.
  Accepts both Simplified and Traditional Chinese city names by normalizing input before lookup.
  Avoids Playwright/Firefox, which is fragile in restricted or WAF-sensitive environments.
  Parses current `#7d .t.clearfix > li` and `#15d .t.clearfix > li` server-rendered markup.
  Each city is fetched sequentially with retries to reduce temporary blocking.
  Failed requests or empty parses are saved to debug artifacts for inspection.
triggers:
  - "天氣"
  - "天氣預報"
  - "weather china"
  - "城市天氣"
  - "weather.com.cn"
---

# China City Weather Skill

抓取 weather.com.cn 中國城市天氣預報（7天 + 8-15天）。

## 依賴

```bash
node >= 18
```

## 已驗證城市代碼

| 城市 | 代碼 | 狀態 |
|------|------|------|
| 北京 | 101010100 | ✅ |
| 上海 | 101020100 | ✅ |
| 廣州 | 101280101 | ✅ |
| 深圳 | 101280601 | ✅ |
| 南昌 | 101240101 | ✅ |
| 合肥 | 101220101 | ✅ |
| 開封 | 101180801 | ✅ |
| 洛陽 | 101180901 | ✅ |
| 肇慶 | 101280901 | ✅ |
| 烏魯木齊 | 101130101 | ✅ |

其他城市：
- 可直接輸入城市名，腳本會自動查 `city.js`
- 也可直接輸入 9 位城市代碼

## 使用方式

```bash
# 單一城市
node /home/kin/.openclaw/workspace/skills/china-city-weather/scripts/fetch_weather.js [城市名]

# 繁體城市名也可
node /home/kin/.openclaw/workspace/skills/china-city-weather/scripts/fetch_weather.js 肇慶

# 直接使用城市代碼
node /home/kin/.openclaw/workspace/skills/china-city-weather/scripts/fetch_weather.js [9位城市代碼]

# 自訂城市名 + 代碼
node /home/kin/.openclaw/workspace/skills/china-city-weather/scripts/fetch_weather.js [城市名] [9位城市代碼]

# 明確執行預設批量城市
node /home/kin/.openclaw/workspace/skills/china-city-weather/scripts/fetch_weather.js --batch

# 簡短摘要
node /home/kin/.openclaw/workspace/skills/china-city-weather/scripts/fetch_weather.js --summary [城市名]

# 只輸出原始結果（不包 envelope）
node /home/kin/.openclaw/workspace/skills/china-city-weather/scripts/fetch_weather.js --raw [城市名]

# 重新抓 weather.com.cn 城市資料庫
node /home/kin/.openclaw/workspace/skills/china-city-weather/scripts/fetch_weather.js --refresh-city-db [城市名]

# 不帶參數時顯示用法與範例
node /home/kin/.openclaw/workspace/skills/china-city-weather/scripts/fetch_weather.js
```

### 範例輸出

```json
{
  "ok": true,
  "source": "weather.com.cn",
  "fetchedAt": "2026-03-30T06:00:00.000Z",
  "mode": "single",
  "query": {
    "cityName": "合肥",
    "code": "101220101",
    "matchedBy": "preset"
  },
  "result": {
    "cityName": "合肥",
    "code": "101220101",
    "counts": { "days1to7": 7, "days8to15": 8 },
    "days1to7": [
      { "date": "30日（今天）", "weather": "小雨", "temp": "18/8℃", "wind": "北风" }
    ],
    "days8to15": [
      { "date": "周一（6日）", "weather": "多云", "temp": "20℃/11℃", "wind": "东北风转东风" }
    ],
    "summary": "合肥(101220101) | 今天天氣 小雨 18/8℃ | 第8天 周一（6日） 多云 20℃/11℃"
  }
}
```

## 重要規則

1. **不再依賴 Playwright / Firefox**，改用直接抓 HTML
2. **7天解析**：`#7d .t.clearfix > li`
3. **15天解析**：`#15d .t.clearfix > li`
4. **繁簡輸入支援**：城市名會先做繁簡正規化，例如 `肇慶` 可匹配 `肇庆`
5. **城市代碼解析**：優先使用內建常用城市；找不到時自動查 `city.js`
6. **如抓不到**：個別重試；網站偶爾會暫時限速或回空資料
7. **失敗保留證據**：HTML 與 metadata 會寫入 `debug/`
8. **不帶參數不執行抓取**：只顯示 usage samples，避免誤跑 batch
9. **批量模式需明確指定**：使用 `--batch`

## 流程說明

1. 直接請求 7 天頁面 HTML
2. 解析 `#7d` 內的 server-rendered forecast list
3. 直接請求 15 天頁面 HTML
4. 解析 `#15d` 內的 server-rendered forecast list
5. 如輸入是繁體，先做繁簡正規化
6. 如城市名未內建，先查 weather.com.cn `city.js`
7. 返回標準 JSON envelope
8. 若沒有輸入城市，顯示 usage samples
9. 若指定 `--batch`，則順序抓取預設城市清單

## 添加新城市

優先做法：

1. 直接使用城市名，腳本會自動查 `city.js`
2. 可使用簡體或繁體城市名
3. 或直接傳 9 位城市代碼

如要加入內建常用城市，可在 `scripts/fetch_weather.js` 的 `PRESET_CITY_CODES` 物件中加入：
```javascript
'城市名': '城市代碼',
```

## 繁體支援示例

以下輸入都可正常解析：

```bash
node scripts/fetch_weather.js 肇慶
node scripts/fetch_weather.js 烏魯木齊
node scripts/fetch_weather.js 蘇州
node scripts/fetch_weather.js 鄭州
```

## 批量模式

如需抓取預設城市清單，請明確使用：

```bash
node scripts/fetch_weather.js --batch
```

目前預設批量城市清單定義於 `config/default-batch-cities.json`。

例如：

```json
[
  "北京",
  "上海",
  "广州",
  "深圳"
]
```

## Debug 輸出

- 預設 debug 目錄：`/home/kin/.openclaw/workspace/skills/china-city-weather/debug`
- 可自訂：

```bash
node scripts/fetch_weather.js --debug-dir=/tmp/weather-debug 合肥
```

當網站限速、HTML 結構變動、或解析結果為空時，會保存：
- `.html`：當次原始頁面
- `.json`：請求 URL、城市、錯誤原因、儲存時間
