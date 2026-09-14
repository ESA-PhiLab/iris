# React Migration Guide for IRIS

## Overview

This guide documents the incremental migration of IRIS from Flask templates and legacy JavaScript to TypeScript React components with Zustand state management.

## Architecture

- **Backend**: Flask serves as API backend
- **Frontend**: React SPAs (admin, segmentation) with TypeScript
- **State Management**: Zustand store replacing global `vars` object
- **Build**: Vite builds React components into static assets
- **Serving**: Flask serves built React assets

## Development Workflow

### 1. Setup Development Environment

```bash
# Install Node.js dependencies
npm install

# Start Vite dev server (for hot reload during development)
npm run dev

# In another terminal, start Flask
uv run iris demo
```

### 2. Build for Production

```bash
# Build React components
./build-react.sh

# Or manually:
npm run build
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- MaskTools.test.tsx

# Watch mode
npm run test:watch
```

## File Structure

```
iris/
├── src/                          # React source files
│   ├── admin-app.tsx            # Admin SPA entry point
│   ├── segmentation-app.tsx     # Segmentation SPA entry point
│   ├── stores/                  # Zustand state management
│   │   └── segmentationStore.ts # Replaces global vars object
│   ├── components/              # Reusable React components
│   │   ├── segmentation/        # Segmentation-specific components
│   │   └── preferences/         # Preferences modal components
│   ├── pages/                   # Page-specific React components
│   └── types/                   # TypeScript type definitions
├── iris/static/
│   ├── dist/                    # Built React assets (generated)
│   └── javascripts/             # Legacy JS (being migrated)
├── package.json                 # Node.js dependencies
├── vite.config.js              # Vite build configuration
└── build-react.sh              # Build script
```

## Migration Patterns

### Pattern 1: Flask Template → React SPA

#### Before (Flask Template)
```python
@admin_app.route('/users')
def users():
    users = User.query.all()
    return render_template('admin/users.html', users=users)
```

#### After (React + API)
```python
@admin_app.route('/users')
def users():
    return render_template('admin/users-react.html')

@admin_app.route('/api/users')
def api_users():
    users = User.query.all()
    return jsonify({'users': [u.to_json() for u in users]})
```

### Pattern 2: Global vars → Zustand Store

#### Before (Legacy JavaScript)
```javascript
// Global state
var vars = {
    show_mask: true,
    current_class: 0,
    // ...
};

function show_mask(visible) {
    vars.show_mask = visible;
    // Update DOM...
}
```

#### After (React + Zustand)
```typescript
// src/stores/segmentationStore.ts
import { create } from 'zustand';

interface SegmentationState {
  showMask: boolean;
  setShowMask: (visible: boolean) => void;
  toggleMask: () => void;
}

export const useSegmentationStore = create<SegmentationState>((set) => ({
  showMask: true,
  setShowMask: (visible) => set({ showMask: visible }),
  toggleMask: () => set((state) => ({ showMask: !state.showMask })),
}));

// Bridge for legacy JS during migration
if (typeof window !== 'undefined') {
  (window as any).segmentationStore = useSegmentationStore;
}
```

```typescript
// React component
import { useSegmentationStore } from '../stores/segmentationStore';

const MaskTools: React.FC = () => {
  const { showMask, toggleMask } = useSegmentationStore();
  
  return (
    <ToolButton
      checked={showMask}
      onClick={toggleMask}
    />
  );
};
```

```javascript
// Legacy JS bridge (temporary during migration)
function show_mask(visible) {
    // Use React store if available
    if (window.segmentationStore) {
        window.segmentationStore.getState().setShowMask(visible);
        return;
    }
    
    // Fallback to legacy behavior
    vars.show_mask = visible;
    // Update DOM...
}
```

## vars Migration Strategy

### Step-by-Step Process

1. **Analyze Dependencies**
   - Map all functions/components using the field
   - Document read/write patterns
   - Identify migration cluster

2. **Create Store Slice**
   - Add field to Zustand store
   - Create actions (setters, toggles, etc.)
   - Add TypeScript types

3. **Update React Components**
   - Replace `window.vars` with store hooks
   - Add tests for new behavior

4. **Bridge Legacy JS**
   - Update legacy functions to check store first
   - Maintain backwards compatibility
   - Add store sync effect in React

5. **Test Thoroughly**
   - Unit tests for React components
   - Integration tests for legacy JS bridge
   - Manual testing in browser

6. **Remove Legacy Code** (after all dependencies migrated)
   - Remove field from `vars` object
   - Remove bridge code
   - Clean up legacy functions

### Priority Order

**Easy Wins** (Start here):
1. `vars.show_mask` ✅ COMPLETE - See MIGRATION_COMPLETE_show_mask.md
2. `vars.show_dialogue_before_next_image` ✅ COMPLETE - See MIGRATION_COMPLETE_show_dialogue_before_next_image.md
3. `vars.current_class` - Simple number
4. `vars.tool.size` - Simple number
5. `vars.mask_type` - String enum

**Medium Complexity**:
5. `vars.config` - Large object, mostly read-only
6. `vars.user` - User object
7. `vars.tool` - Tool object

**Complex** (Later):
8. `vars.vm` - ViewManager (needs full rewrite)
9. `vars.mask` / `vars.user_mask` - Large arrays
10. `vars.hidden_mask` - Canvas element

## Testing Guidelines

### React Component Tests
```typescript
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useSegmentationStore } from '../stores/segmentationStore';

describe('MaskTools', () => {
  it('toggles mask when clicked', () => {
    render(<MaskTools />);
    const button = document.getElementById('tb_toggle_mask')!;
    
    fireEvent.click(button);
    expect(useSegmentationStore.getState().showMask).toBe(false);
  });
});
```

### Store Tests
```typescript
describe('segmentationStore', () => {
  it('toggles showMask', () => {
    const { toggleMask, showMask } = useSegmentationStore.getState();
    expect(showMask).toBe(true);
    
    toggleMask();
    expect(useSegmentationStore.getState().showMask).toBe(false);
  });
});
```
