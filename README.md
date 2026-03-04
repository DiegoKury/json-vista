# json-vista

A framework-agnostic JSON tree viewer Web Component with interactive search, filtering, and distinct value analysis.

## Features

- **Interactive tree** — expand/collapse objects and arrays
- **Advanced search** — string/numeric matching, key search, case sensitivity, exact or partial match
- **Compound filtering** — stack multiple criteria with "and also" logic
- **Distinct value analysis** — see all unique values and their counts across array items, with CSV export
- **Property management** — hide/show individual properties or by pattern
- **Sorting** — alphabetically sort all keys
- **Zero dependencies** — works in any framework or vanilla HTML

## Installation

```bash
npm install json-vista
```

## Usage

### HTML (vanilla)

```html
<json-vista id="viewer"></json-vista>

<script type="module">
  import 'json-vista'

  const el = document.getElementById('viewer')

  el.source = { name: 'My API', url: 'https://api.example.com/data' }
  el.data = { users: [{ id: 1, name: 'Alice' }] }
</script>
```

### React

```jsx
import 'json-vista'

export default function App() {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.data = { hello: 'world' }
    }
  }, [])

  return <json-vista ref={ref} />
}
```

### Vue

```vue
<template>
  <json-vista ref="viewer" />
</template>

<script setup>
import 'json-vista'
import { onMounted, ref } from 'vue'

const viewer = ref(null)

onMounted(() => {
  viewer.value.data = { hello: 'world' }
})
</script>
```

## API

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | `JsonValue` | The JSON data to display |
| `source` | `Source \| null` | Optional data source info (name and/or URL) |

```ts
el.data = { any: 'json value' }

el.source = {
  name: 'My API Response',
  url: 'https://api.example.com/data'
}
```

## Theming

The component uses Shadow DOM and exposes CSS custom properties for theming:

```css
json-vista {
  --jv-font-family: system-ui, sans-serif;
  --jv-font-size: 14px;

  /* Colors */
  --jv-color: #1e293b;
  --jv-bg: white;
  --jv-surface: #f8fafc;
  --jv-border-color: #e2e8f0;

  /* Value type colors */
  --jv-string-color: #be185d;
  --jv-number-color: #15803d;
  --jv-boolean-color: #1d4ed8;
  --jv-null-color: #64748b;

  /* Highlights */
  --jv-match-bg: #bbdefb;
  --jv-key-match-bg: #fde68a;

  /* Tree */
  --jv-indent: 20px;
  --jv-row-even-bg: #fff5f5;
  --jv-row-odd-bg: white;
}
```

## Types

```ts
type JsonPrimitive = string | number | boolean | null
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]
type JsonValue = JsonPrimitive | JsonObject | JsonArray

interface Source {
  name?: string
  url?: string
}
```

## Browser Support

Works in any browser with support for [Web Components](https://caniuse.com/custom-elementsv1) (all modern browsers).

## License

MIT
