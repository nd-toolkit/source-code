import cluster from 'cluster'

let initMem = null

/* eslint-disable jsdoc/require-jsdoc */

function executeMemTest() {
  if (cluster.isMaster) {
    cluster.setupMaster({ execArgv: ['--expose-gc'] })
    cluster.fork()
    cluster.on('message', (worker, message) => {
      if (!initMem) {
        initMem = message.mem
      }
      logDiffMem(message.mem)
    })
  } else {
    simulationActivity().then(() => {
      setInterval(() => {
        global.gc()
        process.send({ mem: process.memoryUsage() })
      }, 1000)
      loopActivity()
    })
  }
}


function logDiffMem(mem) {
  const diffMem = []

  for (const prop in mem) {
    let val = ((((mem[prop] - initMem[prop]) / initMem[prop] * 1000) ^ 0) / 1000) + ''

    val = val.split('.')
    val[0] = ('   ' + (val[0] || '')).slice(-3)
    val[1] = ((val[1] || '') + '000').slice(0, 3)
    diffMem.push(prop + ':' + val.join('.'))
  }

  console.log('mem-test:', diffMem.join(',  '))
}


function loopActivity() {
  simulationActivity().then(() => {
    setTimeout(loopActivity)
  })
}


async function simulationActivity() {
  // Один метод, одна проверка, что бы искать утечки выборочно
  await testEventEmitter()
  await testPromiseEventEmitter()
  // И запуск всех имеющихся тестов
  await testAllTests()
}


async function testEventEmitter() {
  const { EventEmitter } = await import('@nodutilus/events')

  for (let i = 0; i < 1000; i++) {
    const em = new EventEmitter()
    const prm = em.once('testtesttesttesttesttesttesttesttesttesttest')

    em.on('testtesttesttesttesttesttesttesttesttesttest', () => { em.emit('test2') })
    await em.emit('testtesttesttesttesttesttesttesttesttesttest')
    await prm
  }
}


async function testPromiseEventEmitter() {
  const { PromiseEventEmitter } = await import('@nodutilus/events')


  for (let i = 0; i < 1000; i++) {
    const pem = new PromiseEventEmitter()

    pem.once('testtesttesttesttesttesttesttesttesttesttest').then(() => { pem.resolve() })
    pem.on('testtesttesttesttesttesttesttesttesttesttest', () => { pem.emit('test2') })
    await pem.emit('testtesttesttesttesttesttesttesttesttesttest')
    await pem.then(() => { }, () => { })

    const pem2 = new PromiseEventEmitter()

    pem2.reject(new Error('test'))
    await pem2.catch(() => { }).then(() => { })
  }
}


async function testAllTests() {
  const { Test } = await import('@nodutilus/test')

  for (let i = 0; i < 10; i++) {
    const { AllTests } = await import('./all-tests.js')

    // Не будем жечь диск для тестов на память
    AllTests['@nodutilus/fs'] = null
    // Не будем логировать вывод тестов
    AllTests.prototype[Test.afterEachDeep] = null

    await Test.run(new AllTests())
  }
}


executeMemTest()
