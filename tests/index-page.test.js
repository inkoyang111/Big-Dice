const assert = require('node:assert/strict')
const test = require('node:test')

const { STATUS } = require('../utils/dice-game')

function createPageHarness() {
  const originalPage = global.Page
  const originalWx = global.wx
  const originalSetTimeout = global.setTimeout
  const originalClearTimeout = global.clearTimeout
  const originalDateNow = Date.now
  const timers = []
  const toasts = []
  let now = 1000
  let definition

  global.Page = (value) => {
    definition = value
  }
  global.wx = {
    createInnerAudioContext() {
      return {
        set src(value) {},
        stop() {},
        seek() {},
        play() {},
        destroy() {}
      }
    },
    showToast(options) {
      toasts.push(options)
    }
  }
  global.setTimeout = (callback, delay) => {
    const timer = { callback, delay, cleared: false }
    timers.push(timer)
    return timer
  }
  global.clearTimeout = (timer) => {
    timer.cleared = true
  }
  Date.now = () => now

  const modulePath = require.resolve('../pages/index/index')
  delete require.cache[modulePath]
  require(modulePath)

  const page = {
    ...definition,
    data: { ...definition.data },
    setData(nextData) {
      Object.assign(this.data, nextData)
    }
  }
  page.onLoad()

  function restore() {
    page.onUnload()
    global.Page = originalPage
    global.wx = originalWx
    global.setTimeout = originalSetTimeout
    global.clearTimeout = originalClearTimeout
    Date.now = originalDateNow
    delete require.cache[modulePath]
  }

  return {
    page,
    timers,
    toasts,
    setNow(value) {
      now = value
    },
    restore
  }
}

test('摇骰固定计时 1.5 秒，结束后进入 READY 并显示确认文案', (t) => {
  const harness = createPageHarness()
  t.after(harness.restore)

  harness.page.handleRoll()
  assert.equal(harness.page.data.status, STATUS.ROLLING)
  assert.equal(harness.timers.length, 1)
  assert.equal(harness.timers[0].delay, 1500)

  harness.timers[0].callback()
  assert.equal(harness.page.data.status, STATUS.READY)
  assert.equal(harness.page.data.hintText, '点击骰盅开盖查看')
})

test('恰好间隔 300ms 的双击只摇一轮且结果至少包含 3 个 1', (t) => {
  const harness = createPageHarness()
  t.after(harness.restore)
  let playCalls = 0
  harness.page.audioPlayer.play = () => {
    playCalls += 1
  }

  harness.page.handleRoll()
  harness.setNow(1300)
  harness.page.handleRoll()

  const result = harness.page.game.getState().dice
  assert.equal(result.filter((value) => value === 1).length >= 3, true)
  assert.equal(harness.timers.length, 1)
  assert.equal(playCalls, 1)
})

test('超过 300ms 的重复点击不改变本轮结果', (t) => {
  const harness = createPageHarness()
  t.after(harness.restore)

  harness.page.handleRoll()
  const result = harness.page.game.getState().dice
  harness.setNow(1301)
  harness.page.handleRoll()

  assert.deepEqual(harness.page.game.getState().dice, result)
  assert.equal(harness.timers.length, 1)
})

test('三次快速点击不重复改变结果、动画或音效', (t) => {
  const harness = createPageHarness()
  t.after(harness.restore)
  let playCalls = 0
  harness.page.audioPlayer.play = () => {
    playCalls += 1
  }

  harness.page.handleRoll()
  harness.setNow(1100)
  harness.page.handleRoll()
  const result = harness.page.game.getState().dice
  harness.setNow(1200)
  harness.page.handleRoll()

  assert.deepEqual(harness.page.game.getState().dice, result)
  assert.equal(harness.timers.length, 1)
  assert.equal(playCalls, 1)
})

test('再摇一次状态同样支持 300ms 双击', (t) => {
  const harness = createPageHarness()
  t.after(harness.restore)

  harness.page.handleRoll()
  harness.timers[0].callback()
  harness.setNow(2000)
  harness.page.handleRoll()
  harness.setNow(2300)
  harness.page.handleRoll()

  const result = harness.page.game.getState().dice
  assert.equal(result.filter((value) => value === 1).length >= 3, true)
  assert.equal(harness.timers.length, 2)
})

test('开盖或重新摇骰时提示消失，合盖后重新显示', (t) => {
  const harness = createPageHarness()
  t.after(harness.restore)

  harness.page.handleRoll()
  harness.timers[0].callback()
  harness.page.handleCoverTap()
  assert.equal(harness.page.data.status, STATUS.OPEN)
  assert.notEqual(harness.page.data.hintText, '点击骰盅开盖查看')

  harness.page.handleCoverTap()
  assert.equal(harness.page.data.status, STATUS.READY)
  assert.equal(harness.page.data.hintText, '点击骰盅开盖查看')

  harness.page.handleRoll()
  assert.equal(harness.page.data.status, STATUS.ROLLING)
  assert.notEqual(harness.page.data.hintText, '点击骰盅开盖查看')
})

test('初始状态连续点击骰盅，2 秒内 Toast 最多展示一次且时长约 1.5 秒', (t) => {
  const harness = createPageHarness()
  t.after(harness.restore)

  harness.page.handleCoverTap()
  harness.page.handleCoverTap()
  harness.page.handleCoverTap()

  assert.equal(harness.toasts.length, 1)
  assert.equal(harness.toasts[0].title, '请先摇骰')
  assert.equal(harness.toasts[0].duration, 1500)
})

test('OPEN 切入后台立即自动合盖并保留同一组结果', (t) => {
  const harness = createPageHarness()
  t.after(harness.restore)

  harness.page.handleRoll()
  harness.timers[0].callback()
  harness.page.handleCoverTap()
  const result = harness.page.game.getState().dice

  assert.equal(typeof harness.page.onHide, 'function')
  harness.page.onHide()
  assert.equal(harness.page.game.getState().status, STATUS.READY)
  assert.deepEqual(harness.page.game.getState().dice, result)
  assert.equal(harness.page.data.diceVisible, false)
})

test('ROLLING 返回前台不得重新生成结果或重播音效', (t) => {
  const harness = createPageHarness()
  t.after(harness.restore)
  let playCalls = 0
  harness.page.audioPlayer.play = () => {
    playCalls += 1
  }

  harness.page.handleRoll()
  const result = harness.page.game.getState().dice
  assert.equal(typeof harness.page.onHide, 'function')
  assert.equal(typeof harness.page.onShow, 'function')
  harness.page.onHide()
  harness.page.onShow()

  assert.deepEqual(harness.page.game.getState().dice, result)
  assert.equal(playCalls, 1)
})
