import { Volume } from 'memfs'
import * as path from 'path'

import fsa from '../../lib/utils/fsa'
import { Builder } from '../../lib/services/interface'

export default t => {
  t.test('build', async t => {
    const resolve = (...names) => path.resolve(__dirname, 'build', ...names)

    const files = await fsa.readdir(resolve())

    const inputRe = /^(.+)\.input\.js$/

    for (const file of files) {
      const match = inputRe.exec(file)

      if (!match) continue

      const name = match[1]

      t.test(name, async t => {
        const { default: spec } = await import(resolve(file))

        const vol = Volume.fromJSON(spec.files)

        const build = Builder(
          {
            ...spec.options,
            fsa: fsa.from(vol),
          },
          true
        )

        const actual = await build(true)

        const expectedFilename = resolve(`${name}.expected.js`)
        const hasExpected = await fsa.exists(expectedFilename)

        if (!hasExpected) {
          await fsa.writeFile(expectedFilename, actual, 'utf8')
        }

        // fail if expected file was not present
        t.test(`${name}.expected.js exists`, t => {
          t.ok(hasExpected)
        })

        const expected = await fsa.readFile(expectedFilename, 'utf8')

        t.test('content is as expected', t => {
          t.equal(actual, expected)
        })
      })
    }
  })
}
