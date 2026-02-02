# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Export `CanvasApiTimeoutError` and `CanvasApiPaginationError` error classes
- Export `ExtendedGenerator` type for better TypeScript support
- Export `CanvasApiResponse`, `QueryParams`, and `RequestOptions` types
- JSDoc documentation for all public methods
- Debug logging support via `CANVAS_API_DEBUG` environment variable
- Maximum retry limit for rate-limited requests

### Fixed

- Security: URL encode query parameters to prevent injection attacks
- Bug: Rate limiter now correctly passes error object on rejection
- Bug: Link header parsing now handles array-type headers
- Bug: Rate limiter no longer retries infinitely

### Changed

- Improved error messages for rate limit failures

### Deprecated

- `body` property on `CanvasApiResponse` (use `json` or `text` instead)

## [5.1.1] - 2024-XX-XX

### Added

- User-Agent header for API requests

## [5.1.0] - 2024-XX-XX

### Added

- Rate limiting support with FIFO queue
- `disableThrottling` option for instances needing parallel requests

## [5.0.0] - 2024-XX-XX

### Changed

- Migrated to TypeScript
- Replaced node-fetch with undici
- New error class hierarchy

### Added

- `ExtendedGenerator` with utility methods (filter, map, take, toArray)
- `listPages()` and `listItems()` for pagination
- Timeout support via `RequestOptions`

[Unreleased]: https://github.com/kth/canvas-api/compare/v5.1.1...HEAD
[5.1.1]: https://github.com/kth/canvas-api/compare/v5.1.0...v5.1.1
[5.1.0]: https://github.com/kth/canvas-api/compare/v5.0.0...v5.1.0
[5.0.0]: https://github.com/kth/canvas-api/releases/tag/v5.0.0
