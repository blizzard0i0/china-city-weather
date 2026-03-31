# china-city-weather

Fetch 7-day and 8-15-day forecasts for Chinese cities from `weather.com.cn`.

從 `weather.com.cn` 抓取中國城市 7 天與 8 至 15 天天氣預報。

This skill:

- fetches server-rendered HTML directly
- supports both Simplified and Traditional Chinese city names
- auto-resolves city codes via `weather.com.cn` `city.js`
- supports explicit batch mode via `--batch`
- saves debug artifacts when parsing fails

這個 skill：

- 直接抓取 server-rendered HTML，不依賴 Playwright
- 支援簡體與繁體中文城市名稱
- 可透過 `weather.com.cn` 的 `city.js` 自動解析城市代碼
- 支援 `--batch` 批量模式
- 解析失敗時會保存 debug artifacts 方便排查

## Requirements

- Node.js 18+

## 需求

- Node.js 18+

## Usage

```bash
node scripts/fetch_weather.js 合肥
node scripts/fetch_weather.js 肇慶
node scripts/fetch_weather.js 乌鲁木齐
node scripts/fetch_weather.js 101220101
node scripts/fetch_weather.js 蘇州 101190401
node scripts/fetch_weather.js --summary 洛陽
node scripts/fetch_weather.js --batch
```

## 用法

```bash
node scripts/fetch_weather.js 合肥
node scripts/fetch_weather.js 肇慶
node scripts/fetch_weather.js 乌鲁木齐
node scripts/fetch_weather.js 101220101
node scripts/fetch_weather.js 蘇州 101190401
node scripts/fetch_weather.js --summary 洛陽
node scripts/fetch_weather.js --batch
```

## Batch Cities

Default batch cities are configured in:

`config/default-batch-cities.json`

## 批量城市清單

預設批量城市清單定義於：

`config/default-batch-cities.json`

## Files

- `SKILL.md`: skill documentation
- `scripts/fetch_weather.js`: main script
- `config/default-batch-cities.json`: default batch city list

## 檔案結構

- `SKILL.md`：skill 說明文件
- `scripts/fetch_weather.js`：主腳本
- `config/default-batch-cities.json`：預設批量城市清單
