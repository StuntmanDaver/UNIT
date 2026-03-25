# Testing Patterns

**Analysis Date:** 2026-03-25

## Test Framework

**Status:** No testing framework currently configured

**Build/Dev Tools:**
- Vite 6.1.0 - Build tool and dev server
- No Jest, Vitest, or other test runner in `package.json`
- TypeScript 5.8.2 available for type checking

**Run Commands (when testing is added):**
```bash
npm run dev              # Start dev server (current)
npm run build            # Build for production
npm run lint             # Run ESLint on code
npm run lint:fix         # Auto-fix linting errors
npm run typecheck        # Type check JS files via TypeScript
npm run preview          # Preview production build
```

## Test Infrastructure Absent

**Current Situation:**
- **No test files found** in `src/` directory
- **No test configuration files** (no `jest.config.js`, `vitest.config.js`, or similar)
- **No testing dependencies** in `devDependencies`
- **No test scripts** in `package.json`

**Code that should be tested:**
- `src/api/base44Client.js` - Base44 SDK client initialization
- `src/lib/utils.js` - Utility functions like `cn()`, `isIframe` check
- `src/lib/app-params.js` - Environment/URL parameter loading and storage
- `src/utils/index.ts` - Page URL creation utility
- All page components in `src/pages/` - Business logic, data fetching, form handling
- All reusable components in `src/components/` - Modal behavior, conditional rendering

## Testing Recommendations

### Immediate Priority: Set Up Testing Infrastructure

**Recommended Framework: Vitest**
- Better ESM/Vite integration than Jest
- Faster test execution
- Modern TypeScript support

**Installation:**
```bash
npm install -D vitest @vitest/ui happy-dom @testing-library/react @testing-library/user-event
```

**Configuration file needed:** `vitest.config.js`
```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/'],
    },
  },
});
```

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### Test File Organization (Recommendation)

**Location:** Co-located with source files

**Pattern:**
```
src/
├── api/
│   ├── base44Client.js
│   └── base44Client.test.js
├── lib/
│   ├── utils.js
│   └── utils.test.js
│   ├── app-params.js
│   └── app-params.test.js
├── utils/
│   ├── index.ts
│   └── index.test.ts
├── components/
│   ├── PostCard.jsx
│   ├── PostCard.test.jsx
│   ├── BottomNav.jsx
│   └── BottomNav.test.jsx
└── pages/
    ├── Community.jsx
    └── Community.test.jsx
```

**Naming Convention:**
- `[ComponentName].test.jsx` or `[module].test.js`
- Keep test file next to source for easier discovery

## Test Structure (Template)

**Basic Test Suite Structure:**

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Component from './Component';

describe('Component', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should render with required props', () => {
    render(<Component title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Component onClick={handleClick} />);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

## Mocking Strategy

**Framework:** Vitest's built-in mocking (`vi`)

**Patterns Needed:**

**Mock External Dependencies:**
```javascript
vi.mock('@base44/sdk', () => ({
  createClient: vi.fn(() => ({
    entities: {
      Business: {
        filter: vi.fn(),
        create: vi.fn(),
      },
      Post: {
        filter: vi.fn(),
        create: vi.fn(),
      },
    },
    auth: {
      isAuthenticated: vi.fn(),
      me: vi.fn(),
    },
  })),
}));
```

**Mock React Query:**
```javascript
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: null,
      isLoading: false,
      error: null,
    })),
    useMutation: vi.fn(() => ({
      mutateAsync: vi.fn(),
      isPending: false,
    })),
  };
});
```

**Mock Router:**
```javascript
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ to, children }) => <a href={to}>{children}</a>,
}));
```

**What to Mock:**
- External API calls (Base44 SDK)
- React Router (navigation, location)
- React Query hooks (queries, mutations)
- Window API calls (`localStorage`, `URLSearchParams`)
- Framer Motion (animations can be simplified)

**What NOT to Mock:**
- Core React functionality
- Component children or composition
- DOM utilities (don't mock `render`, `screen`, etc.)
- Date objects unless testing time-dependent logic

## Test Data & Factories

**Fixture Pattern (Recommendation):**

Create `src/__fixtures__/` or `src/test-utils/`:

```javascript
// src/__fixtures__/business.fixture.js
export const mockBusiness = {
  id: '123',
  business_name: 'Test Business',
  unit_number: '101',
  property_id: 'prop-1',
  owner_email: 'owner@example.com',
  logo_url: null,
  category: 'retail',
};

export const mockBusinessList = [mockBusiness];

// src/__fixtures__/post.fixture.js
export const mockPost = {
  id: 'post-1',
  title: 'Test Announcement',
  content: 'This is a test',
  type: 'announcement',
  property_id: 'prop-1',
  business_id: '123',
  created_date: new Date().toISOString(),
  event_date: null,
  event_time: null,
  expiry_date: null,
  image_url: null,
};
```

**Factory Function Pattern:**

```javascript
// src/__fixtures__/factories.js
export function createMockBusiness(overrides = {}) {
  return {
    id: 'biz-' + Math.random(),
    business_name: 'Test Business',
    unit_number: '101',
    property_id: 'prop-1',
    category: 'retail',
    ...overrides,
  };
}

export function createMockPost(overrides = {}) {
  return {
    id: 'post-' + Math.random(),
    type: 'announcement',
    title: 'Test Post',
    created_date: new Date().toISOString(),
    property_id: 'prop-1',
    ...overrides,
  };
}
```

**Usage in Tests:**
```javascript
import { createMockBusiness, createMockPost } from '@/__fixtures__/factories';

it('should display business info', () => {
  const business = createMockBusiness({ business_name: 'Coffee Shop' });
  const post = createMockPost({ business_id: business.id });
  // test logic
});
```

## Coverage Goals

**Current Coverage:** 0%

**Target Coverage (Phased):**
1. **Phase 1 (Utilities):** 90%+ for `src/lib/` and `src/utils/`
2. **Phase 2 (Components):** 70%+ for reusable components in `src/components/`
3. **Phase 3 (Pages):** 60%+ for page components

**Critical paths to test first:**
- `src/lib/app-params.js` - Environment/token management (security-critical)
- `src/api/base44Client.js` - SDK initialization
- `src/utils/index.ts` - URL utilities
- Form components: `CreatePostModal.jsx`, `ExpenseModal.jsx`, `LeaseModal.jsx`
- Data-heavy pages: `Community.jsx`, `Accounting.jsx`, `Profile.jsx`

**View Coverage:**
```bash
npm run test:coverage
# Opens coverage report in html/index.html
```

## Test Types to Implement

**Unit Tests:**
- Pure utility functions in `src/lib/` and `src/utils/`
- Helper functions like `createPageUrl()`, `cn()`
- Configuration loading in `app-params.js`
- **Scope:** Test individual functions in isolation
- **Approach:** Simple input/output assertions

**Component Tests (Integration):**
- Modal components: `CreatePostModal`, `ExpenseModal`, `InvoiceModal`
- Card components: `PostCard`, `RecommendationCard`, `QRCodeCard`
- **Scope:** Test component renders, user interactions, conditional rendering
- **Approach:** Use `@testing-library/react` for user-centric testing

**Page Tests (Integration):**
- Pages with multiple data queries: `Community.jsx`, `Accounting.jsx`
- Auth-dependent pages: `Profile.jsx`, `Register.jsx`
- **Scope:** Test full page data flow, navigation, form submission
- **Approach:** Mock React Query and router, test business logic

**E2E Tests:**
- Not configured; would use Playwright or Cypress if needed
- Current priority is unit/component tests first

## Common Testing Patterns

**Testing async queries:**
```javascript
import { vi } from 'vitest';
import { waitFor } from '@testing-library/react';

it('should load business data', async () => {
  const mockBusiness = { id: '1', business_name: 'Test' };
  vi.mocked(base44.entities.Business.filter).mockResolvedValue([mockBusiness]);

  render(<Profile />);

  await waitFor(() => {
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

**Testing form submission:**
```javascript
it('should submit form data', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<CreatePostModal onSubmit={handleSubmit} isOpen={true} onClose={vi.fn()} />);

  await user.type(screen.getByLabelText('Title'), 'New Post');
  await user.click(screen.getByRole('button', { name: /create/i }));

  expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Post' }));
});
```

**Testing error states:**
```javascript
it('should show error when query fails', async () => {
  vi.mocked(base44.entities.Property.list).mockRejectedValue(new Error('API Error'));

  render(<BrowseProperties />);

  await waitFor(() => {
    // Currently no error UI, but when added:
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

## Gaps & Recommendations

**Critical Testing Gaps:**
1. **No error handling tests** - Current code lacks error boundaries and error handlers
2. **No authentication tests** - Auth flow in pages not tested
3. **No integration tests** - Complex data dependencies between queries untested
4. **No accessibility tests** - No a11y testing setup
5. **No performance tests** - Component re-renders not monitored

**Next Steps (Priority Order):**
1. Add Vitest + Testing Library to `devDependencies`
2. Create test fixtures and factory functions
3. Write unit tests for `src/lib/` utilities (lowest risk, highest value)
4. Write tests for form components (common points of failure)
5. Add error handling tests once error handling is implemented

---

*Testing analysis: 2026-03-25*
