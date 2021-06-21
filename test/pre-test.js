import { mkdirSync, symlinkSync, existsSync } from 'fs'

mkdirSync('@nodutilus/node_modules', { recursive: true })
if (!existsSync('@nodutilus/node_modules/@nodutilus')) {
  symlinkSync('../../@nodutilus', '@nodutilus/node_modules/@nodutilus', 'dir')
}
mkdirSync('test/node_modules', { recursive: true })
if (!existsSync('test/node_modules/@nodutilus')) {
  symlinkSync('../../@nodutilus', 'test/node_modules/@nodutilus', 'dir')
}
if (!existsSync('test/node_modules/@nodutilus-test')) {
  symlinkSync('../@nodutilus-test', 'test/node_modules/@nodutilus-test', 'dir')
}
