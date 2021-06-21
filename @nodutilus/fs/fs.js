/** @module @nodutilus/fs */

import { isAbsolute, posix } from 'path'
import { promises as fsPromises, constants as fsConstants } from 'fs'

const { dirname, join, relative } = posix
const { COPYFILE_EXCL } = fsConstants
const { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } = fsPromises
/** @type {import('@nodutilus/fs').WalkFunction} */
// @ts-ignore
const walk = __walkCommon


/** @type {import('@nodutilus/fs').WalkFunctionCommon} */
function __walkCommon(path, options = {}, walker = undefined) {
  const prefix = isAbsolute(path) ? '' : './'
  const include = __normalizeSearchingRegExp(options.include)
  const exclude = __normalizeSearchingRegExp(options.exclude)

  walker = (typeof options === 'function' ? options : walker) || options.walker

  // win32 to posix (https://github.com/nodejs/node/issues/12298)
  path = path.replaceAll('\\', '/')

  if (walker) {
    return (async () => {
      const __walker = __walk(path, { prefix, include, exclude })
      let next = await __walker.next()

      while (!next.done && next.value) {
        next = await __walker.next(await walker(...next.value))
      }
    })()
  } else {
    return __walk(path, { prefix, include, exclude })
  }
}


/** @type {import('@nodutilus/fs').NormalizeSearchingRegExp} */
function __normalizeSearchingRegExp(sRegExp) {
  /** @type {import('@nodutilus/fs').InnerSearchingRegExp} */
  let innerSRegExp

  if (sRegExp) {
    if (sRegExp instanceof Array) {
      innerSRegExp = sRegExp.map(item => item instanceof RegExp ? item : new RegExp(item))
    } else if (!(sRegExp instanceof RegExp)) {
      innerSRegExp = new RegExp(sRegExp)
    } else {
      innerSRegExp = sRegExp
    }
  }

  return innerSRegExp
}


/** @type {import('@nodutilus/fs').SearchPathByRegExp} */
function __searchPathByRegExp(sRegExp, path) {
  if (sRegExp instanceof RegExp) {
    return sRegExp.test(path)
  } else {
    for (const sRE of sRegExp) {
      if (sRE.test(path)) {
        return true
      }
    }
  }
}


/** @type {import('@nodutilus/fs').WalkGeneratorFunction} */
async function* __walk(path, options) {
  const { prefix, include, exclude } = options
  const files = await readdir(path, { withFileTypes: true })

  for (const file of files) {
    const isDirectory = file.isDirectory()
    const postfix = isDirectory ? '/' : ''
    const filePath = prefix + join(path, file.name) + postfix
    const isInclude = !include || __searchPathByRegExp(include, filePath)
    const isExclude = exclude ? __searchPathByRegExp(exclude, filePath) : false

    if (isExclude) {
      continue
    }

    if (isDirectory) {
      const nested = isInclude ? yield [filePath, file] : true

      if (nested !== false) {
        yield* __walk(filePath, options)
      }
    } else {
      if (isInclude) {
        yield [filePath, file]
      }
    }
  }
}


/** @type {import('@nodutilus/fs').CopyFunction} */
async function copy(src, dest, options = {}) {
  const { throwIfExists } = options
  const srcStat = await stat(src)

  if (srcStat.isDirectory()) {
    await __copy(src, dest, options)
  } else {
    if (!throwIfExists) {
      await mkdir(dirname(dest), { recursive: true })
    }
    await copyFile(src, dest, throwIfExists ? COPYFILE_EXCL : 0)
  }
}


/** @type {import('@nodutilus/fs').RecursiveCopyFunction} */
async function __copy(src, dest, options) {
  const { throwIfExists, removeNonExists, include, exclude } = options
  const mkdirOptions = { recursive: !throwIfExists }
  const existentPaths = removeNonExists ? [] : false

  await mkdir(dest, mkdirOptions)
  for await (const [path, dirent] of walk(src, { include, exclude })) {
    const destPath = join(dest, relative(src, path))

    if (existentPaths) {
      existentPaths.push(destPath)
    }
    if (dirent.isDirectory()) {
      await mkdir(destPath, mkdirOptions)
    } else {
      await mkdir(dirname(destPath), { recursive: true })
      await copyFile(path, destPath)
    }
  }
  if (existentPaths) {
    const walker = walk(dest)
    let next = await walker.next()

    while (!next.done && next.value) {
      const [path, dirent] = next.value

      if (!existentPaths.includes(path)) {
        await remove(path)
      }

      next = await walker.next(dirent.isDirectory() ? false : null)
    }
  }
}


/** @type {import('@nodutilus/fs').RemoveFunction} */
async function remove(path, options = {}) {
  const { include, exclude } = options

  if (include || exclude) {
    await walk(path, { include, exclude }, async (path, dirent) => {
      await rm(path, { force: true, recursive: true })
      if (dirent.isDirectory()) {
        return false
      }
    })
  } else {
    await rm(path, { force: true, recursive: true })
  }
}


/** @type {import('@nodutilus/fs').ReadJSONFunction} */
async function readJSON(path, defaultValue) {
  const data = await readFile(path, 'utf8').then(JSON.parse).catch(error => {
    if (error.code === 'ENOENT' && typeof defaultValue !== 'undefined') {
      return defaultValue
    }
    throw error
  })

  return data
}


/** @type {import('@nodutilus/fs').ReadTextFunction} */
async function readText(path, defaultValue) {
  const data = await readFile(path, 'utf8').catch(error => {
    if (error.code === 'ENOENT' && typeof defaultValue !== 'undefined') {
      return defaultValue
    }
    throw error
  })

  return data
}


/** @type {import('@nodutilus/fs').WriteJSONFunction} */
async function writeJSON(path, data, { throwIfExists, space } = {}) {
  const jsonData = JSON.stringify(data, null, typeof space === 'undefined' ? 2 : space)

  await writeText(path, jsonData, { throwIfExists })
}


/** @type {import('@nodutilus/fs').WriteTextFunction} */
async function writeText(path, data, { throwIfExists } = {}) {
  const recursive = !throwIfExists

  if (recursive) {
    await mkdir(dirname(path), { recursive })
  }

  await writeFile(path, data, {
    encoding: 'utf8',
    flag: recursive ? 'w' : 'wx'
  })
}


export {
  copy,
  readJSON,
  readText,
  remove,
  walk,
  writeJSON,
  writeText
}
