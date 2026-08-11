const assert = require('node:assert/strict')
const test = require('node:test')

const { createAudioPlayer } = require('../utils/audio-player')

test('没有音效地址时使用空播放器', () => {
  const player = createAudioPlayer('')
  assert.doesNotThrow(() => player.play())
  assert.doesNotThrow(() => player.destroy())
})

test('创建音频上下文失败时不阻断流程', () => {
  global.wx = {
    createInnerAudioContext() {
      throw new Error('audio unavailable')
    }
  }

  const player = createAudioPlayer('/assets/audio/dice-shake.mp3')
  assert.doesNotThrow(() => player.play())
  assert.doesNotThrow(() => player.destroy())
  delete global.wx
})

test('播放和销毁音频失败时不向页面抛错', () => {
  global.wx = {
    createInnerAudioContext() {
      return {
        set src(value) {},
        stop() {},
        seek() {},
        play() {
          throw new Error('play failed')
        },
        destroy() {
          throw new Error('destroy failed')
        }
      }
    }
  }

  const player = createAudioPlayer('/assets/audio/dice-shake.mp3')
  assert.doesNotThrow(() => player.play())
  assert.doesNotThrow(() => player.destroy())
  delete global.wx
})
