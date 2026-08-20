const STATUS = Object.freeze({
  INITIAL: 'initial',
  ROLLING: 'rolling',
  READY: 'ready',
  OPEN: 'open'
})

const DICE_COUNT = 5
const MIN_DIE_VALUE = 1
const MAX_DIE_VALUE = 6

function generateDice(random = Math.random) {
  return Array.from(
    { length: DICE_COUNT },
    () => Math.floor(random() * MAX_DIE_VALUE) + MIN_DIE_VALUE
  )
}

function createDiceGame(random = Math.random) {
  let state = {
    status: STATUS.INITIAL,
    dice: []
  }

  function getState() {
    return {
      status: state.status,
      dice: state.dice.slice()
    }
  }

  function startRoll() {
    if (state.status === STATUS.ROLLING) {
      return false
    }

    state = {
      status: STATUS.ROLLING,
      dice: generateDice(random)
    }
    return true
  }

  function finishRoll() {
    if (state.status !== STATUS.ROLLING) {
      return false
    }

    state = {
      status: STATUS.READY,
      dice: state.dice
    }
    return true
  }

  function ensureMinimumOnes(minimum) {
    if (state.status !== STATUS.ROLLING) {
      return false
    }

    const dice = state.dice.slice()
    let onesCount = dice.filter((value) => value === MIN_DIE_VALUE).length
    const candidates = dice
      .map((value, index) => ({ value, index }))
      .filter(({ value }) => value !== MIN_DIE_VALUE)

    while (onesCount < minimum) {
      const candidateIndex = Math.floor(random() * candidates.length)
      const [{ index }] = candidates.splice(candidateIndex, 1)
      dice[index] = MIN_DIE_VALUE
      onesCount += 1
    }

    state = {
      status: state.status,
      dice
    }
    return true
  }

  function toggleCover() {
    if (state.status === STATUS.READY) {
      state = {
        status: STATUS.OPEN,
        dice: state.dice
      }
      return true
    }

    if (state.status === STATUS.OPEN) {
      state = {
        status: STATUS.READY,
        dice: state.dice
      }
      return true
    }

    return false
  }

  return {
    getState,
    startRoll,
    ensureMinimumOnes,
    finishRoll,
    toggleCover
  }
}

module.exports = {
  DICE_COUNT,
  MAX_DIE_VALUE,
  MIN_DIE_VALUE,
  STATUS,
  createDiceGame,
  generateDice
}
