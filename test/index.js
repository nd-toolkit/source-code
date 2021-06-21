import { Test } from '@nodutilus/test'
import { preparation } from './preparation.js'
import events from '@nodutilus-test/events'
import fs from '@nodutilus-test/fs'
import test from '@nodutilus-test/test'

/**
 * Общий класс для тестов пакетов @nodutilus
 */
class AllTests extends Test {

  static ['@nodutilus/events'] = events
  static ['@nodutilus/fs'] = fs
  static ['@nodutilus/test'] = test

  /**
   * Первоначальная проверка работы событий.
   * Необходимо перенести в @nodutilus-test/events.
   */
  async preparation() {
    await preparation()
  }

}


Test.runOnCI(new AllTests())
