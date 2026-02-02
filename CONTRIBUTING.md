# Contributing to @kth/canvas-api

Thank you for your interest in contributing! This document provides guidelines for contributing to the Canvas API client library.

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- A Canvas LMS instance for integration testing (optional)

### Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/kth/canvas-api.git
   cd canvas-api
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:

   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

### Alternative: Using Nix

If you have Nix installed, you can use the provided shell:

```bash
nix-shell
```

## Development Workflow

### Running Tests

- **Unit tests:** `npm run test:unit`
- **Linting:** `npm run test:lint`
- **All tests:** `npm test`
- **Integration tests:** Requires `.env` file with Canvas credentials
  ```bash
  npm run test:integration
  ```

### Code Style

This project uses ESLint and Prettier for code formatting:

```bash
npm run format
```

### Building

```bash
npm run build
```

Output is generated in the `dist/` directory.

## Integration Testing

To run integration tests, create a `.env` file:

```
CANVAS_API_URL=https://your-canvas-instance.com/api/v1
CANVAS_API_TOKEN=your_token_here
```

**Note:** Never commit `.env` files or tokens.

## Pull Request Guidelines

1. **Create a feature branch** from `master`
2. **Write tests** for new functionality
3. **Update documentation** (README, JSDoc, CHANGELOG)
4. **Run all tests** before submitting
5. **Keep PRs focused** - one feature/fix per PR

### Commit Messages

Use clear, descriptive commit messages:

- `fix: resolve rate limiter infinite retry bug`
- `feat: add debug logging support`
- `docs: update README with new examples`

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Code is formatted (`npm run format`)
- [ ] JSDoc added for new public methods
- [ ] CHANGELOG.md updated
- [ ] README updated if needed

## Code Architecture

### Key Files

- `src/canvasApi.ts` - Main API client class
- `src/canvasApiError.ts` - Error class hierarchy
- `src/rateLimiter.ts` - Rate limiting implementation
- `src/extendedGenerator.ts` - Async generator utilities
- `src/index.ts` - Public exports

### Design Principles

1. **Minimal dependencies** - Only undici for HTTP
2. **TypeScript-first** - Full type safety
3. **Memory efficient** - Lazy pagination with generators
4. **Transparent rate limiting** - Automatic, opt-out available

## Reporting Issues

When reporting bugs, please include:

- Node.js version
- Package version
- Minimal reproduction code
- Expected vs actual behavior

## Questions?

Open a GitHub issue for questions or discussions.
