# Changelog

## [2026-01-17] - Client Snapshot & Hotfixes (Completed)

### Added
- **Client Snapshot Mode**: Added a snapshot feature allowing users to select specific tasks to be visible to clients. A camera icon button in the Navbar activates this mode. In this mode, selected tasks are highlighted with a red border.
- **Client Share View**: Created a dedicated view logic (`ClientShareView.tsx`) and enhanced `App.tsx` to filter tasks based on the `client_visible_tasks` field when necessary.
- **ErrorBoundary**: Added a global `ErrorBoundary` component in `index.tsx` to catch runtime errors and display meaningful error messages instead of a white screen.

### Changed
- **Navbar UI**: Reordered the action buttons (Share -> Snapshot -> List -> Profile) and unified their visual styles for consistency.
- **Navbar Logic**: Updated `Navbar.tsx` to accept snapshot-related props and improved responsiveness.
- **ProjectList UI**: Minor adjustments to `ProjectList.tsx` for stability.

### Fixed
- **White Screen Crash (Critical)**: Fixed a runtime error (`Cannot read properties of undefined (reading 'userId')`) that occurred during the login transition. This was resolved by assigning default values to the `user` prop in both `Navbar` and `ProjectList` components to handle the brief period before the user object is fully initialized.
- **Layout & Syntax**: Resolved JSX syntax errors in `Navbar.tsx` that were causing build failures.
