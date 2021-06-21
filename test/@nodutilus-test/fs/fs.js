import { Test, assert } from '@nodutilus/test'
import { copy, readJSON, readText, remove, walk, writeJSON } from '@nodutilus/fs'
import { isAbsolute, resolve, normalize, relative } from 'path'
import { existsSync, promises as fsPromises } from 'fs'

const { mkdir, rm } = fsPromises


/** Тесты библиотеки @nodutilus/fs */
export default class FsTest extends Test {

  /** Перед запуском очистим временные данные */
  async [Test.before]() {
    await rm('test/example/fs/copy', { force: true, recursive: true })
    await rm('test/example/fs/symlink', { force: true, recursive: true })
    await rm('test/example/fs/remove', { force: true, recursive: true })
    await rm('test/example/fs/write', { force: true, recursive: true })
  }

  /** Удалим временные данные после тестов */
  async [Test.afterEach]() {
    await rm('test/example/fs/copy', { force: true, recursive: true })
    await rm('test/example/fs/symlink', { force: true, recursive: true })
    await rm('test/example/fs/remove', { force: true, recursive: true })
    await rm('test/example/fs/write', { force: true, recursive: true })
  }

  /**
   * для удобства работы с путями до каталогов и папок выполняется их нормализация.
   *  по пути должно быть возможно однозначно определить:
   *    - каталог это или файл
   *    - абсолютный путь или относительный
   *  нормализация от модуля `path` откидывает эти сведения, делая путь максимально кратким,
   *   поэтому `path` реализация расширяется:
   *    - к относительным путям всегда добавляется ./ в начале
   *    - к каталогу всегда добавляется / в конце
   */
  async ['walk - нормализация пути']() {
    await walk('test/example/fs/walk', (path, dirent) => {
      if (dirent.isDirectory()) {
        assert.ok(path.endsWith('/'))
      }
      assert.ok(!isAbsolute(path))
      assert.ok(path.startsWith('./'))
    })
    // к абсолютному пути не добавляем ./
    await walk(resolve('test/example/fs/walk'), (path, dirent) => {
      if (dirent.isDirectory()) {
        assert.ok(path.endsWith('/'))
      }
      assert.ok(isAbsolute(path))
      assert.ok(!path.startsWith('./'))
    })
  }

  /** перебираем сначала папки затем вложенные файлы */
  async ['walk - базовый (walker)']() {
    const files = []
    const expected = [
      './test/example/fs/walk/f1.txt',
      './test/example/fs/walk/p1/',
      './test/example/fs/walk/p1/p1f1.txt',
      './test/example/fs/walk/p1/p1f2.txt',
      './test/example/fs/walk/p2/',
      './test/example/fs/walk/p2/p2f1.txt'
    ]

    await walk('test/example/fs/walk', path => {
      files.push(path)
    })
    files.sort()

    assert.deepEqual(files, expected)
  }

  /** перебираем сначала папки затем вложенные файлы */
  async ['walk - базовый (for await)']() {
    const files = []
    const expected = [
      './test/example/fs/walk/f1.txt',
      './test/example/fs/walk/p1/',
      './test/example/fs/walk/p1/p1f1.txt',
      './test/example/fs/walk/p1/p1f2.txt',
      './test/example/fs/walk/p2/',
      './test/example/fs/walk/p2/p2f1.txt'
    ]

    for await (const [path] of walk('test/example/fs/walk')) {
      files.push(path)
    }
    files.sort()

    assert.deepEqual(files, expected)
  }

  /**
   * если сначала перебираются папки, то можно вернуть false,
   * чтобы не проходить по вложениям папки
   */
  async ['walk - исключение папок']() {
    const files = []
    const expected = [
      './test/example/fs/walk/f1.txt',
      './test/example/fs/walk/p1/',
      './test/example/fs/walk/p2/',
      './test/example/fs/walk/p2/p2f1.txt'
    ]

    await walk('test/example/fs/walk', (path, dirent) => {
      files.push(path)
      if (dirent.isDirectory() && path === './test/example/fs/walk/p1/') {
        return false
      }
    })
    files.sort()

    assert.deepEqual(files, expected)
  }

  /** асинхронный walker */
  async ['walk - асинхронный walker']() {
    const files = []
    const expected = [
      './test/example/fs/walk/f1.txt',
      './test/example/fs/walk/p1/',
      './test/example/fs/walk/p1/p1f1.txt',
      './test/example/fs/walk/p1/p1f2.txt',
      './test/example/fs/walk/p2/',
      './test/example/fs/walk/p2/p2f1.txt'
    ]

    await walk('test/example/fs/walk', async path => {
      await new Promise(resolve => setTimeout(resolve, 1))
      files.push(path)
    })
    files.sort()

    assert.deepEqual(files, expected)
  }

  /**
   * проверяем что нормализованный путь для win отработает корректно.
   *    такие пути заменяются внутри walk на posix вариант, для корректной работы поиска по маске
   */
  async ['walk - формат path.win32']() {
    const files = []
    const expected = [
      './test/example/fs/walk/f1.txt',
      './test/example/fs/walk/p1/',
      './test/example/fs/walk/p2/',
      './test/example/fs/walk/p2/p2f1.txt'
    ]

    await walk(normalize('test/example/fs/walk'), (path, dirent) => {
      files.push(path)
      if (dirent.isDirectory() && path === './test/example/fs/walk/p1/') {
        return false
      }
    })
    files.sort()

    assert.deepEqual(files, expected)
  }

  /**
   * строки при поиске превращаются в "жадный" RegExp,
   *    включающий любое совпадение части пути с переданным выражением
   */
  async ['walk - include, string']() {
    const files = []
    const expected = [
      './test/example/fs/walk/p1/p1f1.txt',
      './test/example/fs/walk/p1/p1f2.txt'
    ]

    for await (const [path] of walk('test/example/fs/walk', { include: 'p1/p1f' })) {
      files.push(path)
    }
    files.sort()

    assert.deepEqual(files, expected)
  }

  /**
   * при включении в выражении каталога вернется всё его содержимое,
   *    включая сам каталог
   */
  async ['walk - include, dir']() {
    const files = []
    const expected = [
      './test/example/fs/walk/p1/',
      './test/example/fs/walk/p1/p1f1.txt',
      './test/example/fs/walk/p1/p1f2.txt'
    ]

    for await (const [path] of walk('test/example/fs/walk', { include: 'test/example/fs/walk/p1/' })) {
      files.push(path)
    }
    files.sort()

    assert.deepEqual(files, expected)
  }

  /** если к каталогу в include добавить /, то сам каталог не вернется */
  async ['walk - include, dir + /']() {
    const files = []
    const expected = [
      './test/example/fs/walk/p1/',
      './test/example/fs/walk/p1/p1f1.txt',
      './test/example/fs/walk/p1/p1f2.txt'
    ]

    for await (const [path] of walk('test/example/fs/walk', { include: 'test/example/fs/walk/p1/' })) {
      files.push(path)
    }
    files.sort()

    assert.deepEqual(files, expected)
  }

  /** строки также поддерживают и синтаксис RegExp */
  async ['walk - include, String.raw`RegExp-style`']() {
    const files = []
    const expected = [
      './test/example/fs/walk/p1/p1f1.txt',
      './test/example/fs/walk/p1/p1f2.txt',
      './test/example/fs/walk/p2/p2f1.txt'
    ]

    for await (const [path] of walk('test/example/fs/walk', { include: String.raw`p\d/p\df\d` })) {
      files.push(path)
    }
    files.sort()

    assert.deepEqual(files, expected)
  }

  /**
   * можно передать напрямую RegExp,
   *    а также собрать выражение учитывающее весь путь файла
   */
  async ['walk - include, RegExp + FullPath']() {
    const files = []
    const expected = [
      './test/example/fs/walk/p1/p1f1.txt'
    ]

    for await (const [path] of walk('test/example/fs/walk', { include: /^.\/test\/.*p1f1.txt$/ })) {
      files.push(path)
    }

    assert.deepEqual(files, expected)
  }

  /** можно передать комбинированный массив выражений */
  async ['walk - include, Array [RegExp, string]']() {
    const files = []
    const expected = [
      './test/example/fs/walk/p1/p1f1.txt',
      './test/example/fs/walk/p1/p1f2.txt'
    ]

    for await (const [path] of walk('test/example/fs/walk', {
      include: [
        /^.\/test\/.*p1f1.txt$/,
        '^./test/.*/p1f2.txt$'
      ]
    })) {
      files.push(path)
    }
    files.sort()

    assert.deepEqual(files, expected)
  }

  /**
   * exclude исключает из обхода и результата все совпадения,
   *    при этом если каталог исключается, то walk не будет заходить внутрь каталога
   */
  async ['walk - exclude']() {
    const files = []
    const expected = [
      './test/example/fs/walk/f1.txt',
      './test/example/fs/walk/p2/',
      './test/example/fs/walk/p2/p2f1.txt'
    ]

    for await (const [path] of walk('test/example/fs/walk', { exclude: '/p1/' })) {
      files.push(path)
    }
    files.sort()

    assert.deepEqual(files, expected)
  }

  /**
   * если к каталогу в exclude добавить /, то сам каталог вернется, а все его содержимое проигнорируется,
   *    таким образом можно исключить конкретные вложенные каталоги и файлы, сам каталог при этом в результат вернется
   */
  async ['walk - exclude + dir-end-/']() {
    const files = []
    const expected = [
      './test/example/fs/walk/f1.txt',
      './test/example/fs/walk/p1/'
    ]

    for await (const [path] of walk('test/example/fs/walk', { exclude: [/\/p2\//, '/p1/.*.txt'] })) {
      files.push(path)
    }
    files.sort()

    assert.deepEqual(files, expected)
  }

  /**
   * через исключающий RegExp в exclude можно исключить обход всех подкаталогов кроме указанных в exclude.
   *    это создает инверсию исключения, и включает в только указанные каталоги.
   *    этот вариант более оптимален т.к. можно исключить тяжелый каталог из обхода на одном уровне с искомым.
   */
  async ['walk - exclude, all except']() {
    const files = []
    const expected = [
      './test/example/fs/walk/p1/',
      './test/example/fs/walk/p1/p1f1.txt',
      './test/example/fs/walk/p1/p1f2.txt'
    ]

    for await (const [path] of walk('test/example/fs/walk', { exclude: '/walk/(?!p1)' })) {
      files.push(path)
    }
    files.sort()

    assert.deepEqual(files, expected)
  }

  /**
   * добавив "жадное" условие поиска, можно через exclude исключить часть выборки,
   *    в т.ч. и файлы которые могут совпадать с include внутри исключенного каталога
   */
  async ['walk - include + exclude']() {
    const files = []
    const expected = [
      './test/example/fs/walk/p1/p1f1.txt',
      './test/example/fs/walk/p1/p1f2.txt'
    ]

    for await (const [path] of walk('test/example/fs/walk', {
      include: String.raw`p\d/p\df\d`,
      exclude: 'walk/p2'
    })) {
      files.push(path)
    }
    files.sort()

    assert.deepEqual(files, expected)
  }

  /**
   * можно комбинировать инверсию exclude и include, перебрав все каталоги соответствующие exclude,
   *    при этом отфильтровав их содержимое с помощью include
   */
  async ['walk - exclude-all-except + include']() {
    const files = []
    const expected = [
      './test/example/fs/walk/p1/p1f1.txt',
      './test/example/fs/walk/p1/p1f2.txt',
      './test/example/fs/walk/p2/p2f1.txt'
    ]

    for await (const [path] of walk('test/example/fs/walk', {
      include: '.txt',
      exclude: '/walk/(?!p1|p2)'
    })) {
      files.push(path)
    }
    files.sort()

    assert.deepEqual(files, expected)
  }

  /** купируем в несуществующую папку */
  async ['copy - базовый']() {
    const filesA = []
    const filesB = []

    await copy('test/example/fs/walk', 'test/example/fs/copy')
    await walk('test/example/fs/walk', path => { filesA.push(relative('test/example/fs/walk', path)) })
    await walk('test/example/fs/copy', path => { filesB.push(relative('test/example/fs/copy', path)) })

    assert.deepEqual(filesB, filesA)
  }

  /** купируем в существующую папку с заменой файлов */
  async ['copy - с заменой']() {
    const filesA = []
    const filesB = []

    await copy('test/example/fs/walk', 'test/example/fs/copy')
    await copy('test/example/fs/walk', 'test/example/fs/copy')
    await walk('test/example/fs/walk', path => { filesA.push(relative('test/example/fs/walk', path)) })
    await walk('test/example/fs/copy', path => { filesB.push(relative('test/example/fs/copy', path)) })

    assert.deepEqual(filesB, filesA)
  }

  /** купируем в существующую папку с ошибкой на папке */
  async ['copy - с ошибкой на папке']() {
    await copy('test/example/fs/walk/p2', 'test/example/fs/copy/p2')

    const error = await copy('test/example/fs/walk', 'test/example/fs/copy', { throwIfExists: true })
      .catch(error => error)

    assert.equal(error.syscall, 'mkdir')
    assert.equal(error.code, 'EEXIST')
    assert.equal(relative('.', error.path), normalize('test/example/fs/copy'))
  }

  /** купируем в существующую папку с ошибкой на файле */
  async ['copy - с ошибкой на файле']() {
    await copy('test/example/fs/walk/f1.txt', 'test/example/fs/copy/f1.txt')

    const error = await copy('test/example/fs/walk/f1.txt', 'test/example/fs/copy/f1.txt', { throwIfExists: true })
      .catch(error => error)

    assert.equal(error.syscall, 'copyfile')
    assert.equal(error.code, 'EEXIST')
    assert.equal(relative('.', error.path), normalize('test/example/fs/walk/f1.txt'))
    assert.equal(relative('.', error.dest), normalize('test/example/fs/copy/f1.txt'))
  }

  /** копируем файл */
  async ['copy - файл']() {
    const files = []

    await mkdir('test/example/fs/copy')
    await copy('test/example/fs/walk/f1.txt', 'test/example/fs/copy/f1.txt')
    await walk('test/example/fs/copy', path => { files.push(path) })

    assert.deepEqual(files, ['./test/example/fs/copy/f1.txt'])
  }

  /** копируем файл, если каталог назначения не создан */
  async ['copy - файл (без каталога)']() {
    const files = []

    await copy('test/example/fs/walk/f1.txt', 'test/example/fs/copy/f1.txt')
    await walk('test/example/fs/copy', path => { files.push(path) })

    assert.deepEqual(files, ['./test/example/fs/copy/f1.txt'])
  }

  /**
   * при копировании удаляем существующие файлы и папки в целевом каталоге,
   *  которых нет в исходном каталоге
   */
  async ['copy - удаление несуществующих']() {
    await copy('test/example/fs/walk/p1', 'test/example/fs/copy/p1_new')
    await copy('test/example/fs/walk/f1.txt', 'test/example/fs/copy/f_new.txt')
    await copy('test/example/fs/walk', 'test/example/fs/copy')

    assert(existsSync('test/example/fs/copy/p1_new'))
    assert(existsSync('test/example/fs/copy/f_new.txt'))

    await copy('test/example/fs/walk', 'test/example/fs/copy', { removeNonExists: true })

    assert(!existsSync('test/example/fs/copy/p1_new'))
    assert(!existsSync('test/example/fs/copy/f_new.txt'))
  }

  /** для копирования можно использовать опции include/exclude для walk */
  async ['copy - фильтрация через include/exclude']() {
    const files = []
    const expected = [
      './test/example/fs/copy/p1/',
      './test/example/fs/copy/p1/p1f1.txt',
      './test/example/fs/copy/p1/p1f2.txt'
    ]

    await copy('test/example/fs/walk', 'test/example/fs/copy', {
      include: '.txt',
      exclude: '/walk/(?!p1/)'
    })
    await walk('test/example/fs/copy', path => { files.push(path) })
    files.sort()

    assert.deepEqual(files, expected)
  }

  /** удаление пустой папки */
  async ['remove - пустая папка']() {
    await mkdir('test/example/fs/remove')
    assert(existsSync('test/example/fs/remove'))

    await remove('test/example/fs/remove')
    assert(!existsSync('test/example/fs/remove'))
  }

  /** удаление непустой папки */
  async ['remove - непустая папка']() {
    await copy('test/example/fs/walk/f1.txt', 'test/example/fs/remove/f1.txt')
    assert(existsSync('test/example/fs/remove/f1.txt'))

    await remove('test/example/fs/remove')
    assert(!existsSync('test/example/fs/remove'))
  }

  /** удаление файла */
  async ['remove - файл']() {
    await copy('test/example/fs/walk/f1.txt', 'test/example/fs/remove/f1.txt')
    assert(existsSync('test/example/fs/remove/f1.txt'))

    await remove('test/example/fs/remove/f1.txt')
    assert(existsSync('test/example/fs/remove'))
    assert(!existsSync('test/example/fs/remove/f1.txt'))
  }

  /**
   * для удаления можно использовать опции include/exclude для walk.
   *  при этом при удалении каталога, если он попала под условия, она удаляется сразу со всем содержимым
   */
  async ['remove - фильтрация через include/exclude']() {
    const files1 = []
    const expected1 = [
      './test/example/fs/remove/p1/',
      './test/example/fs/remove/p1/p1f1.txt',
      './test/example/fs/remove/p1/p1f2.txt',
      './test/example/fs/remove/p2/'
    ]
    const files2 = []
    const expected2 = [
      './test/example/fs/remove/p2/'
    ]

    await copy('test/example/fs/walk', 'test/example/fs/remove')
    await remove('test/example/fs/remove', {
      include: '.txt',
      exclude: '/remove/p1/'
    })
    await walk('test/example/fs/remove', path => { files1.push(path) })
    files1.sort()

    assert.deepEqual(files1, expected1)

    await remove('test/example/fs/remove', {
      include: '/remove/p1/'
    })
    await walk('test/example/fs/remove', path => { files2.push(path) })
    files2.sort()

    assert.deepEqual(files2, expected2)
  }

  /** удалить все подкаталоги кроме указанного include при помощи инверсии */
  async ['remove - инверсия include']() {
    const files = []
    const expected = [
      './test/example/fs/remove/p1/',
      './test/example/fs/remove/p1/p1f1.txt',
      './test/example/fs/remove/p1/p1f2.txt'
    ]

    await copy('test/example/fs/walk', 'test/example/fs/remove')
    await remove('test/example/fs/remove', {
      include: '/remove/(?!p1/)'
    })
    await walk('test/example/fs/remove', path => { files.push(path) })
    files.sort()

    assert.deepEqual(files, expected)
  }

  /**
   * удаление выполняется с "жадным" поиском, и если не исключить родительский каталог,
   *    попытка исключения через  exclude подкаталога будет проигнорирована,
   *    т.к. родительский каталог не попадает под исключение и удаляется.
   *  чтобы удаление проигнорировало родителя, необходимо включить и его,
   *    либо использовать include, как в примере выше
   */
  async ['remove - промах по exclude (подкаталог)']() {
    const files1 = []
    const expected1 = []

    await copy('test/example/fs/walk', 'test/example/fs/remove')
    await copy('test/example/fs/walk', 'test/example/fs/remove/p1')
    await remove('test/example/fs/remove', {
      exclude: '/remove/p1/p1'
    })
    await walk('test/example/fs/remove', path => { files1.push(path) })
    files1.sort()

    assert.deepEqual(files1, expected1)
  }

  /** чтение существующего файла */
  async ['readJSON - файл существует']() {
    const data = await readJSON('test/example/fs/read/test.json')

    assert.deepEqual(data, { test: true })
  }

  /** чтение несуществующего файла с генерацией ошибки */
  async ['readJSON - файл не существует']() {
    const error = await readJSON('test/example/fs/read/nonexistent')
      .catch(error => error)

    assert.equal(error.code, 'ENOENT')
  }

  /** чтение несуществующего файла с установкой значения по умолчанию */
  async ['readJSON - значение по умолчанию']() {
    const data = await readJSON('test/example/fs/read/nonexistent', { defaultValue: true })

    assert.deepEqual(data, { defaultValue: true })
  }

  /** чтение существующего файла */
  async ['readText - файл существует']() {
    const data = await readText('test/example/fs/read/text')

    assert.equal(data, 'test read')
  }

  /** чтение несуществующего файла с генерацией ошибки */
  async ['readText - файл не существует']() {
    const error = await readText('test/example/fs/read/nonexistent')
      .catch(error => error)

    assert.equal(error.code, 'ENOENT')
  }

  /** чтение несуществующего файла с установкой значения по умолчанию */
  async ['readText - значение по умолчанию']() {
    const data = await readText('test/example/fs/read/nonexistent', 'defaultValue')

    assert.equal(data, 'defaultValue')
  }

  /** запись нового файла с созданием каталога */
  async ['write[Text/JSON] - нет файла и папки']() {
    await writeJSON('test/example/fs/write/test.json', { test: true })

    const data = await readText('test/example/fs/write/test.json')

    assert.equal(data, '{\n  "test": true\n}')
  }

  /** запись нового файла в созданном каталоге */
  async ['write[Text/JSON] - нет файла']() {
    await mkdir('test/example/fs/write')
    await writeJSON('test/example/fs/write/test.json', { test: 1 })

    const data = await readText('test/example/fs/write/test.json')

    assert.equal(data, '{\n  "test": 1\n}')
  }

  /** перезапись существующего файла по умолчанию */
  async ['write[Text/JSON] - перезапись файла']() {
    await writeJSON('test/example/fs/write/test.json', { test: 2 })

    const data = await readText('test/example/fs/write/test.json')

    assert.equal(data, '{\n  "test": 2\n}')

    await writeJSON('test/example/fs/write/test.json', { test: 3 })

    const data3 = await readText('test/example/fs/write/test.json')

    assert.equal(data3, '{\n  "test": 3\n}')
  }

  /** не даем перезаписывать, если передали флаг WRITE_EXCL */
  async ['write[Text/JSON] - ошибка при перезаписи файла']() {
    await writeJSON('test/example/fs/write/test.json', { test: 2 })

    const data = await readText('test/example/fs/write/test.json')

    assert.equal(data, '{\n  "test": 2\n}')

    const error = await writeJSON('test/example/fs/write/test.json', { test: 3 }, { throwIfExists: true })
      .catch(error => error)

    assert.equal(error.code, 'EEXIST')
    assert.equal(relative('.', error.path), normalize('test/example/fs/write/test.json'))
  }

  /** не даем создавать новый каталог, если передали флаг WRITE_EXCL */
  async ['write[Text/JSON] - ошибка - нет папки']() {
    const error = await writeJSON('test/example/fs/write/test.json', { test: true }, { throwIfExists: true })
      .catch(error => error)

    assert.equal(error.code, 'ENOENT')
    assert.equal(relative('.', error.path), normalize('test/example/fs/write/test.json'))
  }

  /** изменение форматирования для записи в JOSN (опция space) */
  async ['writeJSON - space: null,\\t']() {
    await writeJSON('test/example/fs/write/test.json', { test: 2 }, { space: null })

    let data = await readText('test/example/fs/write/test.json')

    assert.equal(data, '{"test":2}')

    await writeJSON('test/example/fs/write/test.json', { test: 2 }, { space: '\t' })

    data = await readText('test/example/fs/write/test.json')

    assert.equal(data, '{\n\t"test": 2\n}')
  }

}
