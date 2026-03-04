import React from 'react'
import ReactDOM from 'react-dom'
import { JsonView, JsonTreeProvider } from './src/index'

async function bootstrap() {
  document.head.innerHTML = ''
  document.body.innerHTML = '<div id="json-viewer-root" style="margin:0;padding:0"></div>'

  let data = {}
  try {
    const resp = await fetch(window.location.href)
    data = await resp.json()
  } catch (e) {
    document.body.textContent = 'Failed to load JSON: ' + e
    return
  }

  ReactDOM.render(
    <JsonTreeProvider>
      <JsonView
        data={data}
        cacheEntry={{ url: window.location.href, name: document.title }}
      />
    </JsonTreeProvider>,
    document.getElementById('json-viewer-root')
  )
}

bootstrap()
