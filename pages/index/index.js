const { STATUS, createDiceGame } = require('../../utils/dice-game')
const { createAudioPlayer } = require('../../utils/audio-player')

const ROLL_DURATION_MS = 1500
const SHAKE_AUDIO_SOURCE = ''

Page({
  data: {
    status: STATUS.INITIAL,
    dice: [],
    diceVisible: false,
    isRolling: false,
    actionText: '摇一摇',
    hintText: '点击按钮开始摇骰'
  },

  onLoad() {
    this.game = createDiceGame()
    this.audioPlayer = createAudioPlayer(SHAKE_AUDIO_SOURCE)
    this.syncView()
  },

  onUnload() {
    if (this.rollTimer) {
      clearTimeout(this.rollTimer)
    }
    this.audioPlayer.destroy()
  },

  handleRoll() {
    if (!this.game.startRoll()) {
      return
    }

    this.syncView()
    this.audioPlayer.play()
    this.rollTimer = setTimeout(() => {
      this.game.finishRoll()
      this.rollTimer = null
      this.syncView()
    }, ROLL_DURATION_MS)
  },

  handleCoverTap() {
    if (!this.game.toggleCover()) {
      if (this.game.getState().status === STATUS.INITIAL) {
        wx.showToast({ title: '请先摇骰', icon: 'none' })
      }
      return
    }

    this.syncView()
  },

  syncView() {
    const state = this.game.getState()
    const hasResult = state.dice.length > 0
    const isOpen = state.status === STATUS.OPEN

    this.setData({
      status: state.status,
      dice: isOpen ? state.dice : [],
      diceVisible: isOpen,
      isRolling: state.status === STATUS.ROLLING,
      actionText: hasResult ? '再摇一次' : '摇一摇',
      hintText: this.getHintText(state.status)
    })
  },

  getHintText(status) {
    const hints = {
      [STATUS.INITIAL]: '点击按钮开始摇骰',
      [STATUS.ROLLING]: '正在摇骰…',
      [STATUS.READY]: '点击骰盅开盖查看',
      [STATUS.OPEN]: '点击骰盅合上'
    }
    return hints[status]
  }
})
