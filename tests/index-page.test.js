const assert = require('node:assert/strict')
const test = require('node:test')

const { STATUS } = require('../utils/dice-game')

function createPageHarness() {
  const originalPage = global.Page
  const originalWx = global.wx
  const originalSetTimeout = global.setTimeout
  const originalClearTimeout = global.clearTimeout
  const timers = []
  const toasts = []
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
    delete require.cache[modulePath]
  }

  return { page, timers, toasts, restore }
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
