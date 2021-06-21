/**
 * @module @nodutilus/events
 * EventEmitter с поддержкой асинхронных событий и Promise.
 * Реализует модель событий для использования в асинхронных методах с применением Promise и async/await
 */

/** @typedef {any} Event Имя или уникальный идентификатор события */
/** @typedef {function(...any):void} Listener Слушатель события */
/** @typedef {Map<Event, Set<Listener>>} ListenersMap Перечень всех слушателей события */
/** @type {WeakMap<EventEmitter, ListenersMap>} Хранилище базовых событий для экземпляра EventEmitter */
const privateEventsMap = new WeakMap()
/** @type {WeakMap<PromiseEventEmitter, EventEmitter>} Связь для расширения EventEmitter в PromiseEventEmitter */
const privatePromiseEventEmittersMap = new WeakMap()
/** @type {WeakMap<EventEmitter, any>} Хранилище всех неудачно завершенных событий для PromiseEventEmitter */
const privatePromiseEventEmittersReason = new WeakMap()
/** @type {Object<string, symbol>} Встроенные события для разрешения результата выполнения PromiseEventEmitter */
const pemEvents = {
  /** Событие успешного выполнения всех событий для PromiseEventEmitter */
  resolve: Symbol('PromiseEventEmitter#event:resolve'),
  /** Событие провала выполнения хотя бы одного из событий для PromiseEventEmitter */
  reject: Symbol('PromiseEventEmitter#event:reject')
}

/**
 * Класс событийной модели поведения.
 * Управляет событиями и подписками, в т.ч. асинхронными
 */
class EventEmitter {

  /** Инициализация хранилища для обработчиков событий */
  constructor() {
    privateEventsMap.set(this, new Map())
  }

  /**
   * @returns {number} Количество событий базовых слушателей,
   *  без учета событий для слушателей объявленных как методы класса
   */
  get count() {
    const events = privateEventsMap.get(this)

    return events.size
  }

  /**
   * Количество базовых слушателей определенного события,
   *  без учета событий и слушателей объявленных как методы класса
   *
   * @param {Event} event Имя или уникальный идентификатор события
   * @returns {number} Количество слушателей события
   */
  listenerCount(event) {
    const listeners = privateEventsMap.get(this).get(event)

    if (listeners) {
      return listeners.size
    } else {
      return 0
    }
  }

  /**
   * Вызов слушателя события, объявленного как метод класса
   *
   * @param {EventEmitter} instance Экземпляр класс событийной модели
   * @param {Event} event Имя или уникальный идентификатор события
   * @param  {...any} args Произвольные аргументы события
   * @returns {Promise<void>}
   */
  static async emitForClassMethod(instance, event, ...args) {
    const isMethod = typeof instance[event] === 'function'
    const isNotOwn = !Reflect.has(this.prototype, event)

    if (isMethod && isNotOwn) {
      await instance[event](...args)
    }
  }

  /**
   * Вызов базовых слушателей события, добавленных через методы on/once
   *
   * @param {EventEmitter} instance Экземпляр класс событийной модели
   * @param {Event} event Имя или уникальный идентификатор события
   * @param  {...any} args Произвольные аргументы события
   * @returns {Promise<void>}
   */
  static async emitForBasicListeners(instance, event, ...args) {
    const listeners = privateEventsMap.get(instance).get(event)

    if (listeners) {
      for (const listener of listeners) {
        await listener(...args)
      }
    }
  }

  /**
   * Вызов события
   *
   * @param {Event} event Имя или уникальный идентификатор события
   * @param  {...any} args Произвольные аргументы события
   * @returns {Promise<void>}
   */
  async emit(event, ...args) {
    await EventEmitter.emitForClassMethod(this, event, ...args)
    await EventEmitter.emitForBasicListeners(this, event, ...args)
  }

  /**
   * Проверка наличия подписчика на событие
   *
   * @param {Event} event Имя или уникальный идентификатор события
   * @returns {boolean} true - если подписчик найден
   */
  has(event) {
    return privateEventsMap.get(this).has(event)
  }

  /**
   * Подписка на событие
   *
   * @param {Event} event Имя или уникальный идентификатор события
   * @param  {Listener} listener Слушатель события
   * @returns {EventEmitter} Собственный инстанс класса для чейнинг паттерна
   */
  on(event, listener) {
    const events = privateEventsMap.get(this)

    if (!events.has(event)) {
      events.set(event, new Set())
    }

    events.get(event).add(listener)

    return this
  }

  /**
   * Отписка от события
   *
   * @param {Event} event Имя или уникальный идентификатор события
   * @param  {Listener} [listener] Слушатель события, если не передан, отпишет всех кроме методов класса
   * @returns {EventEmitter} Собственный инстанс класса для чейнинг паттерна
   */
  off(event, listener) {
    const events = privateEventsMap.get(this)
    const listeners = events.get(event)

    if (listeners) {
      listeners.delete(listener)
      if (!listeners.size) {
        events.delete(event)
      }
    }

    return this
  }

  /**
   * Однократная подписка на событие.
   * Внутри создается временный обработчик, который автоматически отписывается после вызова события,
   *  а из вызова once в основной поток выполнения возвращаются аргументы вызовы события.
   *
   * @param {Event} event Имя или уникальный идентификатор события
   * @returns {Promise<Array<any>>} Произвольные аргументы события
   */
  once(event) {
    const events = privateEventsMap.get(this)

    if (!events.has(event)) {
      events.set(event, new Set())
    }

    return new Promise(resolve => {
      const listeners = events.get(event)
      const listener = (...args) => {
        resolve(args)
        listeners.delete(listener)
        if (!listeners.size) {
          events.delete(event)
        }
      }

      listeners.add(listener)
    })
  }

}

/**
 * Класс событийной модели поведения с наследованием поведения <Promise>.
 * Включает все возможности EventEmitter,
 *  расширяя модель возможностью использования её в качестве экземпляра <Promise>
 */
class PromiseEventEmitter extends Promise {

  /**
   * @callback AsyncExecutor Обработчик выполнения PromiseEventEmitter.
   *  Используется по аналогии с Promise для поддержки совместимости
   * @param {PromiseEventEmitter} emitter Экземпляр класса для работы с событиями
   * @returns {void|Promise<void>}
   */
  /**
   * @param {AsyncExecutor} [asyncExecutor] Функция-исполнитель для <Promise>
   */
  constructor(asyncExecutor) {
    const executorIsFunction = typeof asyncExecutor === 'function'

    if (executorIsFunction && asyncExecutor.length === 2) {
      super(asyncExecutor)
    } else {
      const emitter = new EventEmitter()
      const promiseExecutor = (resolve, reject) => {
        emitter
          .on(pemEvents.resolve, value => {
            resolve(value)
          })
          .on(pemEvents.reject, reason => {
            if (!privatePromiseEventEmittersReason.has(emitter)) {
              privatePromiseEventEmittersReason.set(emitter, reason)
              reject(reason)
            }
          })
      }

      super(promiseExecutor)

      privatePromiseEventEmittersMap.set(this, emitter)

      if (executorIsFunction) {
        (async () => {
          await asyncExecutor(this)
        })().catch(reason => {
          emitter.emit(pemEvents.reject, reason)
        })
      }
    }
  }

  /**
   * @callback onFulfilledFunction Обработчик успешного выполнения <Promise>
   * @param {any} value Возвращаемое из <Promise> значение
   * @returns {void|Promise<any>} Экземпляр нового <Promise> для чейнинг паттерна
   */
  /**
   * @callback onRejectedFunction Обработчик провала выполнения <Promise>
   * @param {any} reason Сообщение об ошибке выполнения
   * @returns {void|Promise<any>} Экземпляр нового <Promise> для чейнинг паттерна
   */
  /**
   * Переопределяет Promise#then для возвращения экземпляра Promise вместо PromiseEventEmitter,
   *  для предотвращения наследования событийной модели в чейнинг паттерне.
   * Зачем? - События не передается новому экземпляру,
   *  поэтому модель событий не должна наследоваться в новый Promise, чтобы не замедлять работу.
   *
   * @param {onFulfilledFunction} [onFulfilled] Обработчик успешного выполнения <Promise>
   * @param {onRejectedFunction} [onRejected] Обработчик провала выполнения <Promise>
   * @returns {Promise<any>} Экземпляр нового <Promise> для чейнинг паттерна
   */
  ['then'](onFulfilled, onRejected) {
    return new Promise((resolve, reject) => {
      super.then(
        value => {
          if (typeof onFulfilled === 'function') {
            try {
              resolve(onFulfilled(value))
            } catch (error) {
              reject(error)
            }
          } else {
            resolve(value)
          }
        },
        reason => {
          if (typeof onRejected === 'function') {
            try {
              resolve(onRejected(reason))
            } catch (error) {
              reject(error)
            }
          } else {
            reject(reason)
          }
        })
    })
  }

  /**
   * @returns {number} Количество событий базовых слушателей,
   *  без учета событий для слушателей объявленных как методы класса
   */
  get count() {
    const emitter = privatePromiseEventEmittersMap.get(this)

    return emitter.count
  }

  /**
   * Количество базовых слушателей определенного события,
   *  без учета событий и слушателей объявленных как методы класса
   *
   * @param {Event} event Имя или уникальный идентификатор события
   * @returns {number} Количество слушателей события
   */
  listenerCount(event) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    return emitter.listenerCount(event)
  }

  /**
   * Вызов события
   *
   * @param {Event} event Имя или уникальный идентификатор события
   * @param  {...any} args Произвольные аргументы события
   * @returns {Promise<void>}
   */
  emit(event, ...args) {
    const self = this

    return new Promise((resolve, reject) => {
      process.nextTick(() => {
        const emitter = privatePromiseEventEmittersMap.get(this)

        if (privatePromiseEventEmittersReason.has(emitter)) {
          reject(privatePromiseEventEmittersReason.get(emitter))
        } else {
          (async () => {
            await EventEmitter.emitForClassMethod.apply(PromiseEventEmitter, [self, event, ...args])
            await EventEmitter.emitForBasicListeners(emitter, event, ...args)
          })().then(resolve, reject)
        }
      })
    })
  }

  /**
   * Проверка наличия подписчика на событие
   *
   * @param {Event} event Имя или уникальный идентификатор события
   * @returns {boolean} true - если подписчик найден
   */
  has(event) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    return emitter.has(event)
  }

  /**
   * Подписка на событие
   *
   * @param {Event} event Имя или уникальный идентификатор события
   * @param  {Listener} listener Слушатель события
   * @returns {PromiseEventEmitter} Собственный инстанс класса для чейнинг паттерна
   */
  on(event, listener) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    emitter.on(event, listener)

    return this
  }

  /**
   * Отписка от события
   *
   * @param {Event} event Имя или уникальный идентификатор события
   * @param  {Listener} [listener] Слушатель события, если не передан, отпишет всех кроме методов класса
   * @returns {PromiseEventEmitter} Собственный инстанс класса для чейнинг паттерна
   */
  off(event, listener) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    emitter.off(event, listener)

    return this
  }


  /**
   * Однократная подписка на событие.
   * Внутри создается временный обработчик, который автоматически отписывается после вызова события,
   *  а из вызова once в основной поток выполнения возвращаются аргументы вызовы события.
   *
   * @param {Event} event Имя или уникальный идентификатор события
   * @returns {Promise<Array<any>>} Произвольные аргументы события
   */
  once(event) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    return new Promise((resolve, reject) => {
      if (privatePromiseEventEmittersReason.has(emitter)) {
        reject(privatePromiseEventEmittersReason.get(emitter))
      } else {
        emitter.once(pemEvents.reject).then(([reason]) => {
          reject(reason)
        })
        emitter.once(event).then(value => {
          resolve(value)
        })
      }
    })
  }

  /**
   * Отправляет событие о успешном выполнении <Promise>.
   * PromiseEventEmitter разрешиться в успех
   *
   * @param {any} value Возвращаемое из <Promise> значение
   */
  resolve(value) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    emitter.emit(pemEvents.resolve, value)
  }

  /**
   * Отправляет событие о провале выполнении <Promise>.
   * PromiseEventEmitter разрешиться ошибкой
   *
   * @param {any} reason Сообщение об ошибке выполнения
   */
  reject(reason) {
    const emitter = privatePromiseEventEmittersMap.get(this)

    emitter.emit(pemEvents.reject, reason)
  }

}


export {
  EventEmitter,
  PromiseEventEmitter
}
