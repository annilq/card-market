import { connect } from '/Users/annilq/Documents/develop/card-market/.scratch/mobile-audit/lib/cdp.mjs'
const cdp = await connect(9340)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await cdp.setViewport({ width: 1920, height: 1000, mobile: false, deviceScaleFactor: 1 })
for (const [name, path] of [['home', '/'], ['ann', '/announcements/1'], ['info', '/info/terms'], ['shops', '/shops']]) {
  await cdp.goto('http://localhost:3100' + path, { settle: 1500 })
  await cdp.evaluate(`localStorage.setItem('theme','light')`)
  await cdp.goto('http://localhost:3100' + path, { settle: 1200 })
  await sleep(400)
  await cdp.screenshot(new URL(`./shots/after-${name}-1920.png`, import.meta.url).pathname)
  console.log(name)
}
process.exit(0)
