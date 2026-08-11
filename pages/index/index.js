const { STATUS, createDiceGame } = require('../../utils/dice-game')
const { createAudioPlayer } = require('../../utils/audio-player')

const ROLL_DURATION_MS = 1500
const TOAST_COOLDOWN_MS = 2000
const SHAKE_AUDIO_SOURCE = '/assets/audio/dice-shake.mp3'

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
    this.clearRollTimer()
    this.audioPlayer.destroy()
  },

  onHide() {
    const state = this.game.getState()

    if (state.status === STATUS.OPEN) {
      this.game.toggleCover()
      this.syncView()
      return
    }

    if (state.status === STATUS.ROLLING) {
      this.clearRollTimer()
    }
  },

  onShow() {
    if (!this.game || this.game.getState().status !== STATUS.ROLLING) {
      return
    }

    const elapsed = Date.now() - this.rollStartedAt
    const remaining = ROLL_DURATION_MS - elapsed

    if (remaining <= 0) {
      this.finishRoll()
      return
    }

    this.scheduleRollCompletion(remaining)
  },

  handleRoll() {
    if (!this.game.startRoll()) {
      return
    }

    this.rollStartedAt = Date.now()
    this.syncView()
    this.audioPlayer.play()
    this.scheduleRollCompletion(ROLL_DURATION_MS)
  },

  handleCoverTap() {
    if (!this.game.toggleCover()) {
      if (this.game.getState().status === STATUS.INITIAL) {
        this.showInitialToast()
      }
      return
    }

    this.syncView()
  },

  showInitialToast() {
    const now = Date.now()
    if (
      this.lastInitialToastAt !== undefined &&
      now - this.lastInitialToastAt < TOAST_COOLDOWN_MS
    ) {
      return
    }

    this.lastInitialToastAt = now
    wx.showToast({ title: '请先摇骰', icon: 'none', duration: 1500 })
  },

  scheduleRollCompletion(delay) {
    this.clearRollTimer()
    this.rollTimer = setTimeout(() => this.finishRoll(), delay)
  },

  clearRollTimer() {
    if (!this.rollTimer) {
      return
    }

    clearTimeout(this.rollTimer)
    this.rollTimer = null
  },

  finishRoll() {
    if (!this.game.finishRoll()) {
      return
    }

    this.rollTimer = null
    this.rollStartedAt = null
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
