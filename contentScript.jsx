import React from 'react'
import ReactDOM from 'react-dom'
import JsonView from './src/json-view.jsx'
import { JsonTreeProvider } from './src/lib/context/json-tree-context.jsx'
import './styles/json-view-renderer.css'
import './styles/other-component-css.css'

async function bootstrap() {
  console.log('🚀 JSON Explorer: Content script starting...')
  console.log('📍 Current URL:', window.location.href)
  
  document.head.innerHTML = ''
  document.body.innerHTML = '<div id="json-viewer-root" style="margin:0;padding:0"></div>'

  let data = {}
  try {
    console.log('📡 Fetching JSON data...')
    const resp = await fetch(window.location.href)
    data = await resp.json()
    console.log('✅ JSON data loaded successfully:', data)
  } catch (e) {
    console.error('❌ Failed to load JSON:', e)
    document.body.textContent = '❌ Failed to load JSON: ' + e
    return
  }

  console.log('🎨 Rendering React components...')
  ReactDOM.render(
    <JsonTreeProvider>
      <JsonView
        data={data}
        cacheEntry={{ url: window.location.href, name: document.title }}
      />
    </JsonTreeProvider>,
    document.getElementById('json-viewer-root')
  )
  console.log('✅ JSON Explorer: Setup complete!')
}

console.log('📋 JSON Explorer: Content script loaded')
bootstrap()
