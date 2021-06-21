import { Test } from '@nodutilus/test'


/**
 *  Проверка обработки ошибки в тесте,
 *    в результате общий процесс выполнения тестов завершается ошибкой
 */
class Example extends Test {

  /** Тест завершается ошибкой */
  failure() {
    throw new Error('Example failure')
  }

}


const test = new Example()

test.parent = new Example()


Test.runOnCI(test)
