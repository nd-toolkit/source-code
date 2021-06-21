import { Test, assert } from '@nodutilus/test'

const { ok, equal, deepEqual, throws, doesNotThrow } = assert

/* eslint-disable jsdoc/require-jsdoc */


class MyTestName extends Test {

  baseTest() { }

  static notTest1() { }

  get notTest2() {
    return () => { }
  }

  get notTest3() {
    return new class Mtest extends Test { }()
  }

}


class MyTestFailure extends Test {

  baseTest() { throw new Error('Test Error') }

}


class MyTestConstructor extends Test {

  constructor() {
    super()
    this.myTest = () => { }
    this.NotTest = MyTestName
    this.mySubTest = new MyTestName()
    this.sizeBeforeRedefined = this.tests.size
    this.muOpt = 123
  }

  NotTest() { }

}


MyTestConstructor.muOpt = MyTestName


class MyTestConstructorFailure extends Test {

  constructor() {
    super()
    this.myTest = () => { }
    this.mySubTest = new MyTestFailure()
  }

}


class MyTestNameInclude extends Test { }


MyTestNameInclude.Include = MyTestName
MyTestNameInclude.notTest = new MyTestName()


class MyTestNameIncludeFailure extends MyTestNameInclude { }


MyTestNameIncludeFailure.Include = MyTestFailure


class MyTestNameIncludeExtends extends MyTestNameIncludeFailure { }


MyTestNameIncludeExtends.includeExt = MyTestName


class MyTestNameIncludeRedefine extends Test {

  include() { }

}


MyTestNameIncludeRedefine.include = MyTestFailure


class MyTestNameIncludeRedefineExt0 extends Test {

  includeExt() { throw new Error('Test Error') }

}


MyTestNameIncludeRedefineExt0.include = MyTestFailure


class MyTestNameIncludeRedefineExt extends MyTestNameIncludeRedefineExt0 {

  include() { }

}


MyTestNameIncludeRedefineExt.includeExt = MyTestName


class MyTestNameExt extends MyTestName {

  baseTestExt() { }

}


class MyTestConstructorExt extends MyTestConstructor {

  constructor() {
    super()
    this.myTest2 = () => { }
  }

}


class MyTestNameIncludeExt extends MyTestNameInclude { }


MyTestNameIncludeExt.IncludeExt = MyTestName


class MyTestReturnTest extends Test {

  async myTest1() {
    const result = await Test.run(new MyTestName())

    return result
  }

  myTest2() {
    return Test.run(new MyTestName())
  }

}


class TestEvents extends Test {

  constructor() {
    super()
    this.testNested3 = new Test()
  }

  baseTest1() { }

  baseTest2() {
    equal(this.beforeEach, true)
  }

}


class TestDeepEvents0 extends Test {

  baseTest4() { }

}


class TestDeepEvents1 extends Test {

  baseTest8() { }

}


class TestDeepEvents extends Test {

  constructor() {
    super()
    this.testNested5 = new Test()
    this.testNested5.baseTest6 = () => { }
    this.testNested5.baseTest7 = new TestDeepEvents1()
  }

  baseTest1() { }

  baseTest2() { }

}


TestDeepEvents.testNested3 = TestDeepEvents0


class TestClassEvents0 extends Test {

  baseTest2() { }

}


class TestClassEvents extends Test {

  async [Test.before]() {
    await new Promise(resolve => setTimeout(resolve, 1))
    this.before = true
    this.own = new Map()
    this.nested = new Map()
    this.all = new Map()
  }

  [Test.beforeEach]({ name }) {
    this.own.set(name, {})
  }

  [Test.beforeEachNested]({ name }) {
    this.nested.set(name, {})
  }

  [Test.beforeEachDeep]({ name }) {
    this.all.set(name, {})
  }

  baseTest1() { }

  [Test.afterEach]({ name, result }) {
    this.own.get(name).success = result.success
  }

  [Test.afterEachNested]({ name, result }) {
    this.nested.get(name).success = result.success
  }

  [Test.afterEachDeep]({ name, result }) {
    this.all.get(name).success = result.success
  }

  [Test.after]() {
    equal(this.before === true, true)
    this.before = false
  }

}


TestClassEvents.nestedEvents = TestClassEvents0


class TestClassEventsNotFuction extends Test {

  get [Test.beforeEach]() {
    return (() => {
      throw new Error('test')
    })()
  }

}


class TestOrder1 extends Test {

  constructor() {
    super()
    this.test5 = new Test()
  }

  test1() { }

}


TestOrder1.test3 = MyTestName


class TestOrder2 extends TestOrder1 {

  constructor() {
    super()
    this.test6 = new Test()
    this.test7 = () => { }
  }

  test2() { }

}


TestOrder2.test4 = MyTestName


class AllTests {

  ['Test => getClassMethods']() {
    const mt = new MyTestName()
    const { tests } = mt

    deepEqual(Array.from(tests), ['baseTest'])
    doesNotThrow(mt.baseTest)
    doesNotThrow(MyTestName.notTest1)
    doesNotThrow(mt.notTest2)
    ok(mt.notTest3 instanceof Test)
  }

  ['Test => getClassMethods extends']() {
    const mt = new MyTestNameExt()
    const { tests } = mt

    deepEqual(Array.from(tests), ['baseTest', 'baseTestExt'])
    doesNotThrow(mt.baseTestExt)
  }

  ['Test => getInstanceTests']() {
    const mt = new MyTestConstructor()
    const { tests } = mt

    deepEqual(Array.from(tests), ['myTest', 'mySubTest'])
    doesNotThrow(mt.myTest)
    ok(mt.mySubTest instanceof Test)
    doesNotThrow(() => ok(new mt.NotTest() instanceof Test))
    doesNotThrow(Reflect.getPrototypeOf(mt).NotTest)
    equal(mt.sizeBeforeRedefined, 3)
    equal(tests.size, 2)
  }

  ['Test => getInstanceTests extends']() {
    const mt = new MyTestConstructorExt()
    const { tests } = mt

    deepEqual(Array.from(tests), ['myTest', 'mySubTest', 'myTest2'])
    doesNotThrow(mt.myTest)
    doesNotThrow(mt.myTest2)
    ok(mt.mySubTest instanceof Test)
    doesNotThrow(() => ok(new mt.NotTest() instanceof Test))
  }

  ['Test => getNestedStaticTests']() {
    const mt = new MyTestNameInclude()
    const { tests } = mt

    deepEqual(Array.from(tests), ['Include'])
    doesNotThrow(() => ok(new MyTestNameInclude.Include() instanceof Test))
    ok(MyTestNameInclude.notTest instanceof Test)
  }

  ['Test => getNestedStaticTests extends']() {
    const mt = new MyTestNameIncludeExt()
    const { tests } = mt

    deepEqual(Array.from(tests), ['Include', 'IncludeExt'])
    doesNotThrow(() => ok(new MyTestNameIncludeExt.IncludeExt() instanceof Test))
    doesNotThrow(() => ok(new MyTestNameIncludeExt.Include() instanceof Test))
    ok(MyTestNameIncludeExt.notTest instanceof Test)
  }

  async ['Test => run ClassMethods']() {
    const mt = new MyTestName()
    const result = await Test.run(mt)
    const baseTest = result.tests.get('baseTest')

    equal(result.success, true)
    equal(baseTest.success, true)
  }

  async ['Test => run ClassMethods failure']() {
    const mt = new MyTestFailure()
    const result = await Test.run(mt)
    const baseTest = result.tests.get('baseTest')

    equal(result.success, false)
    equal(baseTest.success, false)
    equal(baseTest.error.message, 'Test Error')
  }

  async ['Test => run getInstanceTests']() {
    const mt = new MyTestConstructor()
    const result = await Test.run(mt)
    const myTest = result.tests.get('myTest')
    const mySubTest = result.tests.get('mySubTest')
    const baseTest = mySubTest.tests.get('baseTest')

    equal(result.success, true)
    equal(result.tests.size, 2)
    equal(myTest.success, true)
    equal(mySubTest.success, true)
    equal(baseTest.success, true)
  }

  async ['Test => run getInstanceTests failure']() {
    const mt = new MyTestConstructorFailure()
    const result = await Test.run(mt)
    const myTest = result.tests.get('myTest')
    const mySubTest = result.tests.get('mySubTest')
    const baseTest = mySubTest.tests.get('baseTest')

    equal(result.success, false)
    equal(result.tests.size, 2)
    equal(myTest.success, true)
    equal(mySubTest.success, false)
    equal(baseTest.success, false)
    equal(baseTest.error.message, 'Test Error')
  }

  async ['Test => run getNestedStaticTests']() {
    const mt = new MyTestNameInclude()
    const result = await Test.run(mt)
    const include = result.tests.get('Include')
    const baseTest = include.tests.get('baseTest')

    equal(result.success, true)
    equal(result.tests.size, 1)
    equal(include.success, true)
    equal(baseTest.success, true)
  }

  async ['Test => run getNestedStaticTests failure']() {
    const mt = new MyTestNameIncludeFailure()
    const result = await Test.run(mt)
    const include = result.tests.get('Include')
    const baseTest = include.tests.get('baseTest')

    equal(result.success, false)
    equal(result.tests.size, 1)
    equal(include.success, false)
    equal(include.tests.size, 1)
    equal(baseTest.success, false)
    equal(baseTest.error.message, 'Test Error')
  }

  async ['Test => run getNestedStaticTests extends']() {
    const mt = new MyTestNameIncludeExtends()
    const result = await Test.run(mt)
    const include = result.tests.get('Include')
    const baseTest = include.tests.get('baseTest')
    const includeExt = result.tests.get('includeExt')
    const baseTestExt = includeExt.tests.get('baseTest')

    equal(result.success, false)
    equal(result.tests.size, 2)
    equal(include.success, false)
    equal(include.tests.size, 1)
    equal(baseTest.success, false)
    equal(baseTest.error.message, 'Test Error')
    equal(includeExt.success, true)
    equal(includeExt.tests.size, 1)
    equal(baseTestExt.success, true)
  }

  async ['Test => run getNestedStaticTests redefine']() {
    const mt = new MyTestNameIncludeRedefine()
    const result = await Test.run(mt)
    const include = result.tests.get('include')

    equal(Object.isPrototypeOf.call(Test, MyTestNameIncludeRedefine.include), true)
    equal(typeof mt.include, 'function')
    equal(result.success, true)
    equal(result.tests.size, 1)
    equal(include.success, true)
  }

  async ['Test => run getNestedStaticTests redefine with extends']() {
    const mt = new MyTestNameIncludeRedefineExt()
    const result = await Test.run(mt)
    const include = result.tests.get('include')
    const includeExt = result.tests.get('includeExt')

    equal(Object.isPrototypeOf.call(Test, MyTestNameIncludeRedefineExt.include), true)
    equal(typeof mt.include, 'function')
    equal(mt.includeExt instanceof Test, true)
    equal(result.success, true)
    equal(result.tests.size, 2)
    equal(include.success, true)
    equal(includeExt.success, true)
    equal(includeExt.tests.size, 1)
    throws(Reflect.getPrototypeOf(mt).includeExt, { message: 'Test Error' })
  }

  async ['Test => return TestResult']() {
    const mt = new MyTestReturnTest()
    const result = await Test.run(mt)
    const myTest1 = result.tests.get('myTest1')
    const myTest2 = result.tests.get('myTest2')
    const baseTest1 = myTest1.tests.get('baseTest')
    const baseTest2 = myTest2.tests.get('baseTest')

    equal(result.success, true)
    equal(myTest1.success, true)
    equal(myTest2.success, true)
    equal(baseTest1.success, true)
    equal(baseTest2.success, true)
  }

  async ['Test => dynamic test from Test']() {
    const dtm = new Test()

    dtm.myTest = () => { }

    const { tests } = dtm
    const result = await Test.run(dtm)
    const myTest = result.tests.get('myTest')

    deepEqual(Array.from(tests), ['myTest'])
    equal(result.success, true)
    equal(result.tests.size, 1)
    equal(myTest.success, true)
  }

  async ['Test => TestEvents']() {
    const mt = new TestEvents()
    const tests = []

    equal(TestEvents.events in mt, false)

    mt.event.on(Test.before, async ({ instance }) => {
      await new Promise(resolve => setTimeout(resolve, 1))
      instance.beforeEach = true
    })
    mt.event
      .on(Test.beforeEach, ({ name }) => { tests.push(name) })
      .on(Test.afterEach, ({ name }) => { tests.push(name) })
      .on(Test.beforeEachNested, ({ name }) => { tests.push(name) })
      .on(Test.afterEachNested, ({ name }) => { tests.push(name) })
      .on(Test.after, ({ instance }) => { instance.beforeEach = false })
      .on(Test.after, ({ instance }) => { equal(instance.beforeEach, false) })

    equal(TestEvents.events in mt, true)
    equal(mt.beforeEach, undefined)

    const result = await Test.run(mt)

    equal(mt.beforeEach, false)
    equal(result.success, true)
    deepEqual(tests, ['baseTest1', 'baseTest1', 'baseTest2', 'baseTest2', 'testNested3', 'testNested3'])
  }

  async ['Test => TestDeepEvents']() {
    const mt = new TestDeepEvents()
    const beforeTests = []
    const afterests = []

    mt.event
      .on(Test.beforeEachDeep, ({ path, name }) => { beforeTests.push([...path, name].join(',')) })
      .on(Test.afterEachDeep, ({ path, name }) => { afterests.push([...path, name].join(',')) })

    const result = await Test.run(mt)

    equal(result.success, true)
    deepEqual(beforeTests, [
      'baseTest1',
      'baseTest2',
      'testNested3,baseTest4',
      'testNested5,baseTest6',
      'testNested5,baseTest7,baseTest8'
    ])
    deepEqual(afterests, beforeTests)
  }

  async ['Test => TestEventsResult']() {
    const mt = new TestDeepEvents()
    const testResult = {}
    const testNames = []
    const testNamesDeep = []
    let result

    mt.event.on(Test.after, data => {
      ({ result } = data)
    })
    mt.event
      .on(Test.afterEach, data => {
        testResult[data.name] = data.result
        testNames.push(data.name)
      })
      .on(Test.afterEachNested, data => {
        testResult[data.name] = data.result
        testNames.push(data.name)
      })
      .on(Test.afterEachDeep, data => {
        if (!testNames.includes(data.name)) {
          testNamesDeep.push(data.name)
        }
        equal(data.result.success, true, `Неверный результат теста "${data.name}"`)
      })

    const aResult = await Test.run(mt)

    equal(result === aResult, true)
    for (const name in testResult) {
      const result = testResult[name]
      const aTestResult = aResult.tests.get(name)

      equal(result === aTestResult, true, `Неверный результат теста "${name}"`)
    }
    deepEqual(testNames, [
      'baseTest1',
      'baseTest2',
      'testNested3',
      'testNested5'
    ])
    deepEqual(testNamesDeep, [
      'baseTest4',
      'baseTest6',
      'baseTest8'
    ])
  }

  async ['Test => TestClassEvents']() {
    const mt = new TestClassEvents()

    equal(mt.before === undefined, true)

    await Test.run(mt)

    equal(mt.before === false, true)

    deepEqual(mt.own, new Map([
      ['baseTest1', { success: true }]
    ]))
    deepEqual(mt.nested, new Map([
      ['nestedEvents', { success: true }]
    ]))
    deepEqual(mt.all, new Map([
      ['baseTest1', { success: true }],
      ['baseTest2', { success: true }]
    ]))
  }

  async ['Test => TestClassEventsNotFuction']() {
    const mt = new TestClassEventsNotFuction()
    const result = await Test.run(mt)

    equal(result.success, true)
    equal(Test.beforeEach in mt, true)
    equal(mt.event.has(Test.beforeEach), false)
    throws(() => mt[Test.beforeEach], { message: 'test' })
  }

  async ['Test => TestOrder1']() {
    const mt = new TestOrder1()
    const { tests } = mt
    const result = await Test.run(mt)

    deepEqual(Array.from(tests), ['test1', 'test3', 'test5'])
    equal(result.success, true)
  }

  async ['Test => TestOrder2']() {
    const mt = new TestOrder2()
    const { tests } = mt
    const result = await Test.run(mt)

    deepEqual(Array.from(tests), ['test1', 'test2', 'test3', 'test4', 'test5', 'test6', 'test7'])
    equal(result.success, true)
  }

}


export async function preparation() {
  const tests = new AllTests()
  const testNames = Object.getOwnPropertyNames(Reflect.getPrototypeOf(tests))
    .filter(item => item !== 'constructor')

  for (const testName of testNames) {
    await tests[testName]()
  }
}
