import { Test } from '@nodutilus/test'


/**
 *  Проверка обработки ошибки в событиях тестов,
 *    в результате общий процесс выполнения тестов завершается ошибкой
 */
class Example extends Test {

  /** Завершаем событие ошибкой */
  [Test.afterEach]() {
    throw new Error('afterEach')
  }

  /** Сам тест выполняется без ошибок */
  success() { }

}


Test.runOnCI(new Example())
