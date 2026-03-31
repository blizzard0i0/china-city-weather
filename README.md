# china-city-weather

Fetch 7-day and 8-15-day forecasts for Chinese cities from `weather.com.cn`.

從 `weather.com.cn` 抓取中國城市 7 天與 8 至 15 天天氣預報。

[中文說明](#中文說明) | [English](#english)

## English

`china-city-weather` is a small Node.js skill/script for fetching Chinese city forecasts from `weather.com.cn` without Playwright or a browser.

This skill:

- fetches server-rendered HTML directly
- supports both Simplified and Traditional Chinese city names
- auto-resolves city codes via `weather.com.cn` `city.js`
- supports explicit batch mode via `--batch`
- saves debug artifacts when parsing fails

### Requirements

- Node.js 18+

### Quick Examples

```bash
node scripts/fetch_weather.js 合肥
node scripts/fetch_weather.js 肇慶
node scripts/fetch_weather.js 乌鲁木齐
node scripts/fetch_weather.js 101220101
node scripts/fetch_weather.js 蘇州 101190401
node scripts/fetch_weather.js --summary 洛陽
node scripts/fetch_weather.js --batch
```

### What It Does

- single city lookup by city name or city code
- Traditional and Simplified Chinese city-name normalization
- auto city-code lookup using `weather.com.cn` `city.js`
- explicit batch mode with cities defined in `config/default-batch-cities.json`
- JSON envelope output for easier tool / agent integration
- optional summary output via `--summary`
- debug artifact output when parsing fails

### Batch Cities

Default batch cities are configured in:

`config/default-batch-cities.json`

### Files

- `SKILL.md`: skill documentation
- `scripts/fetch_weather.js`: main script
- `config/default-batch-cities.json`: default batch city list

## 中文說明

`china-city-weather` 是一個用 Node.js 撰寫的小型 skill / script，用來直接從 `weather.com.cn` 抓取中國城市天氣預報，不依賴 Playwright 或瀏覽器。

這個 skill：

- 直接抓取 server-rendered HTML
- 支援簡體與繁體中文城市名稱
- 可透過 `weather.com.cn` 的 `city.js` 自動解析城市代碼
- 支援 `--batch` 批量模式
- 解析失敗時會保存 debug artifacts 方便排查

### 需求

- Node.js 18+

### 用法範例

```bash
node scripts/fetch_weather.js 合肥
node scripts/fetch_weather.js 肇慶
node scripts/fetch_weather.js 乌鲁木齐
node scripts/fetch_weather.js 101220101
node scripts/fetch_weather.js 蘇州 101190401
node scripts/fetch_weather.js --summary 洛陽
node scripts/fetch_weather.js --batch
```

### 功能重點

- 可用城市名或城市代碼查詢單一城市
- 支援繁簡城市名正規化
- 可透過 `city.js` 自動查找城市代碼
- `--batch` 會讀取 `config/default-batch-cities.json`
- 輸出為 JSON envelope，方便其他工具或 agent 接入
- `--summary` 可輸出精簡摘要
- 解析失敗時會保留 debug 輸出

### 批量城市清單

預設批量城市清單定義於：

`config/default-batch-cities.json`

### Debug 輸出

- 預設目錄：`debug/`
- 如 HTML 結構變動、網站暫時限速、或解析為空，會保存 `.html` 與 `.json` debug artifact

### 檔案結構

- `SKILL.md`：skill 說明文件
- `scripts/fetch_weather.js`：主腳本
- `config/default-batch-cities.json`：預設批量城市清單
