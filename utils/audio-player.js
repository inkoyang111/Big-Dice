function createAudioPlayer(source) {
  if (!source || typeof wx === 'undefined' || !wx.createInnerAudioContext) {
    return createSilentPlayer()
  }

  let audio
  try {
    audio = wx.createInnerAudioContext()
    audio.src = source
  } catch (error) {
    return createSilentPlayer()
  }

  return {
    play() {
      try {
        audio.stop()
        audio.seek(0)
        audio.play()
      } catch (error) {
        // 音效失败不能阻断摇骰流程。
      }
    },
    destroy() {
      try {
        audio.destroy()
      } catch (error) {
        // 销毁音频失败不影响页面退出。
      }
    }
  }
}

function createSilentPlayer() {
  return {
    play() {},
    destroy() {}
  }
}

module.exports = {
  createAudioPlayer
}
