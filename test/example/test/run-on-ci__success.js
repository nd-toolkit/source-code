import { Test } from '@nodutilus/test'


/**
 *  Успешный тест,
 *    в результате общий процесс выполнения тестов завершается успешно
 */
class Example extends Test {

  /** Успешный тест */
  success() { }

}


const test = new Example()

test.parent = new Example()


Test.runOnCI(test)
