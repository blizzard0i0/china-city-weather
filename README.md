# china-city-weather

Fetch 7-day and 8-15-day forecasts for Chinese cities from `weather.com.cn`.

This skill:

- fetches server-rendered HTML directly
- supports both Simplified and Traditional Chinese city names
- auto-resolves city codes via `weather.com.cn` `city.js`
- supports explicit batch mode via `--batch`
- saves debug artifacts when parsing fails

## Requirements

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

## Batch Cities

Default batch cities are configured in:

`config/default-batch-cities.json`

## Files

- `SKILL.md`: skill documentation
- `scripts/fetch_weather.js`: main script
- `config/default-batch-cities.json`: default batch city list
