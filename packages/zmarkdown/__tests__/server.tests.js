const clone = require('clone')
const a = require('axios')
const fs = require('fs')

const u = (path) => `http://localhost:27272${path}`
const epub = u('/epub')
const html = u('/html')
const latex = u('/latex')
const texfile = u('/latex-document')

const texfileOpts = {
  content_type: 'contentType',
  title: 'The Title',
  authors: ['FØØ', 'Bär'],
  license: 'CC-BY-NC-SA',
  license_directory: '/tmp/l',
  smileys_directory: '/tmp/s',
}

const rm = (dir, file) => new Promise((resolve, reject) =>
  fs.unlink(`${dir}/${file}`, (err) => {
    if (err) reject(err)
    fs.rmdir(dir, (err) => {
      if (err) reject(err)
      resolve('ok')
    })
  }))

describe('HTML endpoint', () => {
  test('It should accept POSTed markdown', async () => {
    const response = await a.post(html, {md: '# foo', opts: {}})

    expect(response.status).toBe(200)
    const [string, metadata] = response.data
    expect(string).toMatchSnapshot()
    expect(metadata.disableToc).toBe(false)
  })

  test('It should not disable TOC', async () => {
    const response = await a.post(html, {md: '# foo', opts: {}})

    const [, {disableToc}] = response.data
    expect(disableToc).toBe(false)
  })

  test('It should disable TOC', async () => {
    const response = await a.post(html, {md: '*foo*', opts: {}})

    const [, {disableToc}] = response.data
    expect(disableToc).toBe(true)
  })

  test('It should get ping as metadata', async () => {
    const response = await a.post(html, {md: 'waddup @Clem', opts: {}})

    const [rendered, metadata] = response.data
    expect(rendered).toContain('class="ping"')
    expect(rendered).toContain('href="/membres/voir/Clem/"')
    expect(metadata.ping).toEqual(['Clem'])
  })

  test('It should disable ping', async () => {
    const response = await a.post(html, {md: 'waddup @Clem', opts: {disable_ping: true}})

    const [rendered, metadata] = response.data
    expect(rendered).not.toContain('class="ping"')
    expect(metadata.ping).toBe(undefined)
  })

  test('It only parses inline things', async () => {
    const response = await a.post(html, {
      md: '# foo\n```js\nwindow\n```',
      opts: {inline: true},
    })

    const [rendered] = response.data
    expect(rendered).not.toContain('<h')
  })
})

describe('LaTeX endpoint', () => {
  test('It should accept POSTed markdown', async () => {
    const response = await a.post(latex, {md: '# foo', opts: {}})
    expect(response.status).toBe(200)

    const [string, metadata] = response.data
    expect(string).toMatchSnapshot()
    expect(metadata.disableToc).toBe(false)
  })

  test('It should not disable TOC', async () => {
    const response = await a.post(latex, {md: '# foo', opts: {}})

    const [, {disableToc}] = response.data
    expect(disableToc).toBe(false)
  })

  test('It should disable TOC', async () => {
    const response = await a.post(latex, {md: '*foo*', opts: {}})

    const [, {disableToc}] = response.data
    expect(disableToc).toBe(true)
  })

  test('It should not have pings', async () => {
    const response = await a.post(latex, {md: 'waddup @Clem', opts: {}})

    const [rendered, metadata] = response.data
    expect(rendered).toEqual('waddup @Clem\n\n')
    expect(metadata.ping).toBe(undefined)
  })

  test('It should disable ping', async () => {
    const response = await a.post(latex, {md: 'waddup @Clem', opts: {disable_ping: true}})

    const [rendered, metadata] = response.data
    expect(rendered).not.toContain('class="ping"')
    expect(metadata.ping).toBe(undefined)
  })

  test('It only parses inline things', async () => {
    const response = await a.post(latex, {
      md: '# foo\n```js\nwindow\n```',
      opts: {inline: true},
    })

    const [rendered] = response.data
    expect(rendered).not.toContain('<h')
  })

  test('It downloads images', async () => {
    const destination = process.env.DEST || `${__dirname}/../public/`
    const response = await a.post(latex, {
      md: `![](${u('/static/img.png')})`,
      opts: {inline: true, images_download_dir: destination},
    })


    const [rendered, , messages] = response.data
    expect(messages).toEqual([])

    const regex = /\/([a-zA-Z0-9_-]{7,14})\/([a-zA-Z0-9_-]{7,14})\.(.{1,4})}/
    expect(rendered).toMatch(regex)
    const [, dir, file, ext] = rendered.match(regex)
    return expect(rm(`${destination}/${dir}`, `${file}.${ext}`)).resolves.toBe('ok')
  })
})

describe('Texfile endpoint', () => {
  test('It should accept POSTed markdown', async () => {
    const response = await a.post(texfile, {md: '# foo', opts: texfileOpts})
    expect(response.status).toBe(200)

    const [string, metadata] = response.data
    expect(string).toMatchSnapshot()
    expect(string).toContain(
      '\\licence[/tmp/l/by-nc-sa.svg]{CC-BY-NC-SA}' +
      '{https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode}')
    expect(metadata).toEqual({})
  })

  test('It should not return metadata', async () => {
    const response = await a.post(texfile, {md: '# foo', opts: texfileOpts})

    const [, metadata] = response.data
    expect(metadata).toEqual({})
  })

  test('It should not have pings', async () => {
    const response = await a.post(texfile, {md: 'waddup @Clem', opts: texfileOpts})

    const [rendered, metadata] = response.data
    expect(rendered).toContain('waddup @Clem\n\n')
    expect(metadata.ping).toBe(undefined)
  })

  test('It only parses inline things', async () => {
    const response = await a.post(texfile, {
      md: '# foo\n```js\nwindow\n```',
      opts: texfileOpts,
    })

    const [rendered] = response.data
    expect(rendered).not.toContain('<h')
  })

  test('It downloads images', async () => {
    const destination = process.env.DEST || `${__dirname}/../public/`
    const opts = clone(texfileOpts)
    opts.images_download_dir = destination
    const response = await a.post(texfile, {
      md: `![](${u('/static/img.png')})`,
      opts: opts,
    })

    const [rendered, , messages] = response.data
    expect(messages).toEqual([])

    const regex = /\/([a-zA-Z0-9_-]{7,14})\/([a-zA-Z0-9_-]{7,14})\.(.{1,4})}/
    expect(rendered).toMatch(regex)
    const [, dir, file, ext] = rendered.match(regex)
    return expect(rm(`${destination}/${dir}`, `${file}.${ext}`)).resolves.toBe('ok')
  })
})


describe('EPUB endpoint', () => {
  test('It downloads images', async () => {
    const destination = process.env.DEST || `${__dirname}/../public/`
    const opts = clone(texfileOpts)
    opts.images_download_dir = destination
    const response = await a.post(epub, {
      md: `![](${u('/static/img.png')})`,
      opts: opts,
    })

    const [rendered, , messages] = response.data
    expect(messages).toEqual([])

    const regex = /\/([a-zA-Z0-9_-]{7,14})\/([a-zA-Z0-9_-]{7,14})\.(.{1,4})"/
    expect(rendered).toMatch(regex)
    const [, dir, file, ext] = rendered.match(regex)
    return expect(rm(`${destination}/${dir}`, `${file}.${ext}`)).resolves.toBe('ok')
  })

  test('It copies local images', async () => {
    const destination = process.env.DEST || `${__dirname}/../public/`
    const opts = clone(texfileOpts)
    opts.images_download_dir = destination
    opts.local_url_to_local_path = [
      '/foobar',
      `${__dirname.replace('__tests__', 'server/static')}`,
    ]
    const response = await a.post(epub, {
      md: `![](file://tmp/passwd)`,
      opts: opts,
    })

    const [rendered, , messages] = response.data
    expect(messages[0].message).toMatch("Protocol 'file:' not allowed.")

    expect(rendered).toBe('<p><img src="file://tmp/passwd"></p>')
  })
})
