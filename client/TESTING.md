# Testing Guide

This project uses **Vitest** as the testing framework, which is the recommended testing solution for Vite projects. It provides fast execution, excellent TypeScript support, and compatibility with Jest APIs.

## Quick Start

### Running Tests

```bash
# Run tests in watch mode (default)
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test Scripts

- `npm test` - Run tests in watch mode with Vitest
- `npm run test:run` - Run tests once and exit
- `npm run test:ui` - Run tests with the Vitest UI interface
- `npm run test:coverage` - Generate coverage report

## Configuration

### Vitest Configuration

The testing configuration is defined in `vitest.config.js`:

```javascript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,           // Global test functions (describe, it, expect)
    environment: 'jsdom',    // Browser-like environment
    setupFiles: ['./src/test/setup.js'], // Global setup
    css: true,               // Handle CSS imports
    coverage: {
      provider: 'v8',        // Coverage provider
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  }
});
```

### Test Setup

The global test setup is in `src/test/setup.js` and includes:

- Jest DOM matchers (`@testing-library/jest-dom`)
- MSAL mocking for authentication
- Browser API mocks (IndexedDB, localStorage, etc.)
- Crypto API mocks for MSAL
- Console warning suppression

## Writing Tests

### Component Tests

```javascript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    render(<MyComponent />);
    const button = screen.getByRole('button');
    await userEvent.click(button);
    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

### Hook Tests

```javascript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(0);
  });

  it('updates state on action', async () => {
    const { result } = renderHook(() => useMyHook());
    
    await act(async () => {
      await result.current.increment();
    });
    
    expect(result.current.value).toBe(1);
  });
});
```

### API Tests

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiService } from './apiService';

// Mock fetch
global.fetch = vi.fn();

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches data successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const result = await apiService.getData();
    expect(result).toEqual(mockData);
  });
});
```

## Test Utilities

### Custom Render Function

Use the custom render function from `src/test/test-utils.jsx` to include providers:

```javascript
import { render, screen } from '../test/test-utils';
import MyComponent from './MyComponent';

// This automatically includes ThemeProvider and AuthProvider
render(<MyComponent />);
```

### Mock Data

Pre-defined mock data is available in `src/test/test-utils.jsx`:

```javascript
import { mockFiles, mockFolders, mockUser } from '../test/test-utils';

// Use in tests
render(<FileList files={mockFiles} />);
```

### Helper Functions

```javascript
import { 
  waitFor, 
  createMockApiResponse, 
  simulateUserInteraction 
} from '../test/test-utils';

// Wait for async operations
await waitFor(100);

// Create mock API responses
const mockResponse = createMockApiResponse({ data: 'test' }, 200);

// Simulate user interactions
await simulateUserInteraction(button, 'click');
```

## Testing Patterns

### Testing with Context

```javascript
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import MyComponent from './MyComponent';

const renderWithAuth = (ui, options = {}) => {
  return render(
    <AuthProvider {...options}>
      {ui}
    </AuthProvider>
  );
};

it('shows user info when authenticated', () => {
  renderWithAuth(<MyComponent />, { 
    initialAuthState: { isAuthenticated: true, user: mockUser } 
  });
  expect(screen.getByText(mockUser.name)).toBeInTheDocument();
});
```

### Testing Async Operations

```javascript
import { waitFor } from '@testing-library/react';

it('loads data asynchronously', async () => {
  render(<AsyncComponent />);
  
  // Wait for loading to complete
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

### Testing Error States

```javascript
it('shows error message on failure', async () => {
  // Mock API to throw error
  vi.mocked(apiService.getData).mockRejectedValue(new Error('API Error'));
  
  render(<DataComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Error: API Error')).toBeInTheDocument();
  });
});
```

## Coverage

### Coverage Configuration

Coverage is configured with the following thresholds:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Coverage Reports

Coverage reports are generated in multiple formats:

- **Text**: Console output
- **JSON**: Machine-readable format
- **HTML**: Interactive web report
- **LCOV**: CI/CD integration

### Excluded Files

The following files are excluded from coverage:

- `node_modules/`
- `src/test/`
- Configuration files
- Build artifacts
- Test files themselves

## Best Practices

### 1. Test Structure

- Use descriptive test names
- Group related tests with `describe`
- Keep tests focused and atomic
- Use `beforeEach` for setup, `afterEach` for cleanup

### 2. Mocking

- Mock external dependencies (APIs, libraries)
- Use `vi.mock()` for module mocking
- Create realistic mock data
- Reset mocks between tests

### 3. Assertions

- Use specific assertions (`toBeInTheDocument()` vs `toBeTruthy()`)
- Test user behavior, not implementation details
- Use accessibility queries when possible (`getByRole`, `getByLabelText`)

### 4. Performance

- Keep tests fast and focused
- Use `vi.useFakeTimers()` for time-based tests
- Mock heavy operations (file I/O, network requests)

### 5. Maintenance

- Update tests when changing components
- Keep mock data in sync with real data structures
- Use TypeScript for better type safety in tests

## Troubleshooting

### Common Issues

1. **MSAL Errors**: Ensure MSAL is properly mocked in `setup.js`
2. **CSS Import Errors**: Check that `css: true` is set in Vitest config
3. **Async Test Failures**: Use `waitFor` or `act` for async operations
4. **Provider Errors**: Use custom render function for components with context

### Debug Mode

Run tests in debug mode to see more information:

```bash
npm run test:run -- --reporter=verbose
```

### UI Mode

Use the Vitest UI for better debugging:

```bash
npm run test:ui
```

This opens a web interface where you can:
- See test results in real-time
- Debug failing tests
- View coverage reports
- Filter and search tests 