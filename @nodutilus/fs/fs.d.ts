declare module '@nodutilus/fs' {

  import { Dirent } from 'fs'

  /**
   * Выполняет обработку подкаталогов и файлов, найденных в результате обхода указанного каталога.
   * Если для подкаталога возвращается false, его содержимое проигнорируется
   */
  interface Walker {
    (
      /**
       * Путь до найденного подкаталога или файла,
       * включая каталог (path) переданный в вызов функции walk в формате posix
       */
      path: string,
      /** Представление записи подкаталога или файла */
      dirent: Dirent
    ): void | boolean | Promise<void | boolean>
  }

  /**
   * Регулярное выражение или набор выражений, используемое для поиска совпадений в пути до каталога или файла.
   * Переданные сроки будут преобразованы через конструктор new RegExp(<string>).
   * В качестве разделителя пути необходимо использовать '/'
   * @example
   * // Варианты для поиска файлов расширением `.log` c числовым именем в каталоге `home`
   * ['/home/.+\\d+.log$', String.raw`/home/.+\d+.log$`, /\/home\/.+\d+.log$/]
   */
  type SearchingRegExp = Array<RegExp | string> | RegExp | string
  /** @see SearchingRegExp */
  type InnerSearchingRegExp = Array<RegExp> | RegExp

  /** Базовые опции поиска в каталоге */
  interface SearchingOptions {
    /**
     * Регулярное выражение (или набор выражений) для поиска совпадений пути при обходе.
     * Позволит вернуть в выдачу результатов только соответствующие условиям каталоги и файлы.
     * При этом обход дерева все равно выполняется для всех подкаталогов и файлов, но возвращаются только соответствующие условиям поиска.
     * Для проверки используется путь от каталога (path), переданного в вызов функции walk, до конечного каталога или файла в формате posix.
     */
    include?: SearchingRegExp
    /**
     * Регулярное выражение (или набор выражений) для исключения из обхода совпадающего пути.
     * Позволит исключить из обхода дерева и выдачи результатов каталоги и файлы соответствующие условиям.
     * Если часть пути совпадает с условиями, то все вложенные каталоги и файлы будут проигнорированы при обходе дерева.
     * Для проверки используется путь от каталога (path), переданного в вызов функции walk, до конечного каталога или файла в формате posix.
     */
    exclude?: SearchingRegExp
  }

  /** Опции управления обходом дерева каталога */
  interface WalkOptions extends SearchingOptions {
    /** Обработчик результатов обхода дерева каталога */
    walker?: Walker
  }

  interface InnerWalkOptions extends WalkOptions {
    include?: InnerSearchingRegExp
    exclude?: InnerSearchingRegExp
    /** Префикс для унификации относительного пути (всегда начинается с ./) к файлу или каталогу */
    prefix: string
  }

  /** Нормализует регулярное выражение или набор выражений */
  interface NormalizeSearchingRegExp {
    (
      /** Исходное регулярное выражение или набор выражений */
      sRegExp: SearchingRegExp
    ): InnerSearchingRegExp
  }

  /**
   * Проверяет путь до каталога или файла на соответствие выражению для поиска.
   * Вернет true - если хотя бы одно из выражений поиска совпадает с путем
   */
  interface SearchPathByRegExp {
    (
      /** Регулярное выражение или набор выражений для сопоставления */
      sRegExp: InnerSearchingRegExp,
      /** Путь до каталога или файла для проверки соответствия условиям отбора */
      path: string
    ): boolean
  }

  type WalkGenerator = AsyncGenerator<[string, Dirent], [string, Dirent] | void, boolean | void>

  interface WalkGeneratorFunction {
    (
      /** Текущий каталог для обхода */
      path: string,
      /** Внутренние опции для обхода дерева каталога */
      options: InnerWalkOptions
    ): WalkGenerator
  }

  interface WalkFunctionCommon {
    (path: string, options?: WalkOptions, walker?: Walker): Promise<void> | WalkGenerator
  }

  interface WalkFunction extends WalkFunctionCommon {
    /**
     * Рекурсивно обходит дерево каталога и возвращает найденные подкаталоги и файлы в функцию Walker
     */
    (
      /** Каталог для обхода */
      path: string,
      /** Опции управления обходом дерева каталога */
      options: WalkOptions,
      /** Обработчик результатов обхода дерева каталога */
      walker: Walker
    ): Promise<void>
    /**
     * Рекурсивно обходит дерево каталога и возвращает найденные подкаталоги и файлы в функцию Walker
     */
    (
      /** Каталог для обхода */
      path: string,
      /** Обработчик результатов обхода дерева каталога */
      walker: Walker
    ): Promise<void>
    /**
     * Возвращает итератор для рекурсивного обхода подкаталогов и файлов
     */
    (
      /** Каталог для обхода */
      path: string,
      /** Опции управления обходом дерева каталога */
      options: WalkOptions
    ): WalkGenerator
    /**
     * Возвращает итератор для рекурсивного обхода подкаталогов и файлов
     */
    (
      /** Каталог для обхода */
      path: string
    ): WalkGenerator
  }

  /** Опции управления копированием файлов и каталогов */
  interface CopyOptions extends SearchingOptions {
    /**
     * Завершать копирование ошибкой если файл или каталог уже существует
     * @default false
     */
    throwIfExists?: boolean
    /**
     * При копировании со слиянием каталогов удалять найденные в целевом каталоге,
     * но несуществующие в источнике каталоги и файлы
     * @default false
     */
    removeNonExists?: boolean
  }

  interface CopyFunction {
    /**
     * Копирует файл или каталог со всем содержимым.
     * По умолчанию осуществляет слияние каталогов и перезапись файлов (управляется флагами).
     */
    (
      /** Каталог или файл источник */
      src: string,
      /** Целевой каталог или файл */
      dest: string,
      /** Опции управления копированием файлов и каталогов */
      options?: CopyOptions
    ): Promise<void>
  }


  interface RecursiveCopyFunction {
    /**
     * Вспомогательная функция для рекурсивного обхода дерева каталогов при копировании
     */
    (
      /** Каталог источник */
      src: string,
      /** Целевой каталог */
      dest: string,
      /** Опции управления копированием файлов и каталогов */
      options?: CopyOptions
    ): Promise<void>
  }

  interface RemoveFunction {
    /** Удаляет файл или каталог со всем содержимым */
    (
      /** Каталог или файл */
      path: string,
      /** Опции управления удалением файлов и каталогов */
      options?: SearchingOptions
    ): Promise<void>
  }

  interface ReadJSONFunction {
    /** Читает файл в формате JSON и возвращает полученный объект */
    (
      /** Путь до файла */
      path: string,
      /** Значение по умолчанию, если файл не найден */
      defaultValue?: object
    ): Promise<object>
  }

  interface ReadTextFunction {
    /** Читает файл в текстовом формате */
    (
      /** Путь до файла */
      path: string,
      /** Значение по умолчанию, если файл не найден */
      defaultValue?: string
    ): Promise<string>
  }

  /** Опции управления записью текстового файла */
  interface WriteOptions {
    /**
     * Завершать запись файла ошибкой, если файл существует
     * @default false
     */
    throwIfExists?: boolean
  }

  /** Опции управления записью JSON файла */
  interface WriteJSONOptions extends WriteOptions {
    /**
     * Количество пробелов для форматирования JSON
     * @default 2
     */
    space?: number | null
  }

  interface WriteJSONFunction {
    /** Записывает файл в формате JSON */
    (
      /** Путь до файла */
      path: string,
      /** JSON объект */
      data: object,
      /** Опции управления записью JSON файла */
      options?: WriteJSONOptions
    ): Promise<void>
  }

  interface WriteTextFunction {
    /** Записывает файл в текстовом формате */
    (
      /** Путь до файла */
      path: string,
      /** Текст */
      data: string,
      /** Опции управления записью текстового файла */
      options?: WriteOptions
    ): Promise<void>
  }

  /**
   * Рекурсивно обходит дерево каталога и возвращает найденные подкаталоги и файлы в функцию Walker.
   * Если не передан Walker, то возвращает итератор для рекурсивного обхода подкаталогов и файлов
   */
  export const walk: WalkFunction
  /**
   * Копирует файл или каталог со всем содержимым.
   * По умолчанию осуществляет слияние каталогов и перезапись файлов (управляется флагами).
   */
  export const copy: CopyFunction
  /**
   * Удаляет файл или каталог со всем содержимым
   */
  export const remove: RemoveFunction
  /**
   * Читает файл в формате JSON и возвращает полученный объект
   */
  export const readJSON: ReadJSONFunction
  /**
   * Читает файл в текстовом формате
   */
  export const readText: ReadTextFunction
  /**
   * Записывает файл в формате JSON
   */
  export const writeJSON: WriteJSONFunction
  /**
   * Записывает файл в текстовом формате
   */
  export const writeText: WriteTextFunction
}
