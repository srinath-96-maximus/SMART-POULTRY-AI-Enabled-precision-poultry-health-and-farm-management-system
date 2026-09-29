# Smart Biosecurity Portal Test Suite

> Tests for the React frontend components and pages.

## Setup

```bash
# Install Vitest (add to devDependencies in frontend/package.json)
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `frontend/vite.config.js`:
```js
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './tests/setup.js',
}
```

## Running Tests

```bash
cd frontend
npm run test
```

## Structure

```
tests/
└── frontend/
    ├── components/   ← Unit tests for reusable UI components
    └── pages/        ← Integration tests for pages/routes
```

## Writing a Test

```jsx
// tests/frontend/components/EmptyState.test.jsx
import { render, screen } from '@testing-library/react'
import EmptyState from '@common/EmptyState'

test('renders title', () => {
  render(<EmptyState title="No data" />)
  expect(screen.getByText('No data')).toBeInTheDocument()
})
```
