const assert = require('node:assert/strict')
const test = require('node:test')

const {
  STATUS,
  createDiceGame,
  generateDice
} = require('../utils/dice-game')

test('生成固定 5 颗且点数始终为 1 至 6 的整数', () => {
  for (let index = 0; index < 10000; index += 1) {
    const dice = generateDice()
    assert.equal(dice.length, 5)
    dice.forEach((value) => {
      assert.equal(Number.isInteger(value), true)
      assert.equal(value >= 1 && value <= 6, true)
    })
  }
})

test('随机数边界可映射为 1 和 6', () => {
  assert.deepEqual(generateDice(() => 0), [1, 1, 1, 1, 1])
  assert.deepEqual(generateDice(() => 0.999999), [6, 6, 6, 6, 6])
})

test('初始状态不能开盖', () => {
  const game = createDiceGame()
  assert.equal(game.toggleCover(), false)
  assert.deepEqual(game.getState(), { status: STATUS.INITIAL, dice: [] })
})

test('摇骰期间拒绝重复摇骰和开盖', () => {
  let randomCalls = 0
  const game = createDiceGame(() => {
    randomCalls += 1
    return 0
  })

  assert.equal(game.startRoll(), true)
  const firstResult = game.getState().dice
  assert.equal(game.startRoll(), false)
  assert.equal(game.toggleCover(), false)
  assert.equal(randomCalls, 5)
  assert.deepEqual(game.getState().dice, firstResult)
})

test('摇骰期间可将当前结果补足到至少 3 个 1', () => {
  const game = createDiceGame(() => 0.999999)

  game.startRoll()

  assert.equal(game.ensureMinimumOnes(3), true)
  assert.equal(
    game.getState().dice.filter((value) => value === 1).length >= 3,
    true
  )
})

test('保底 1 的位置由随机源决定而非固定位置', () => {
  const leftValues = [0.999999, 0.999999, 0.999999, 0.999999, 0.999999, 0, 0, 0]
  const rightValues = [
    0.999999,
    0.999999,
    0.999999,
    0.999999,
    0.999999,
    0.999999,
    0.999999,
    0.999999
  ]
  const leftGame = createDiceGame(() => leftValues.shift())
  const rightGame = createDiceGame(() => rightValues.shift())

  leftGame.startRoll()
  leftGame.ensureMinimumOnes(3)
  rightGame.startRoll()
  rightGame.ensureMinimumOnes(3)

  assert.deepEqual(leftGame.getState().dice, [1, 1, 1, 6, 6])
  assert.deepEqual(rightGame.getState().dice, [6, 6, 1, 1, 1])
})

test('完成摇骰后可反复开合且结果不变', () => {
  const game = createDiceGame(() => 0.5)
  game.startRoll()
  game.finishRoll()
  const result = game.getState().dice

  assert.equal(game.getState().status, STATUS.READY)
  assert.equal(game.toggleCover(), true)
  assert.equal(game.getState().status, STATUS.OPEN)
  assert.deepEqual(game.getState().dice, result)
  assert.equal(game.toggleCover(), true)
  assert.equal(game.getState().status, STATUS.READY)
  assert.deepEqual(game.getState().dice, result)
})

test('开盖状态再次摇骰会立即合盖并覆盖结果', () => {
  const values = [0, 0, 0, 0, 0, 0.99, 0.99, 0.99, 0.99, 0.99]
  const game = createDiceGame(() => values.shift())
  game.startRoll()
  game.finishRoll()
  game.toggleCover()

  assert.equal(game.startRoll(), true)
  assert.deepEqual(game.getState(), {
    status: STATUS.ROLLING,
    dice: [6, 6, 6, 6, 6]
  })
})
