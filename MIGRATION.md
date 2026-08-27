# Migration guide

## Upgrading to v13 (dual CJS/ESM build)

Starting in this version, the build switched from `tsc` (one compiled
file per source module) to `tsup` (a single bundled entry point per
format). As a result, the package's `exports` map now only defines
the root `"."` export — every `contentful-batch-libs/dist/*` deep
import that used to work by accident is no longer resolvable.

### If you import from `contentful-batch-libs/dist/*`

Replace the deep import with the equivalent named import from the
package root. Everything previously reachable under `dist/` is
exported from the top-level barrel:

```diff
- import { logEmitter, displayErrorLog, setupLogging, writeErrorLogFile } from 'contentful-batch-libs/dist/logging'
+ import { logEmitter, displayErrorLog, setupLogging, writeErrorLogFile } from 'contentful-batch-libs'

- import { proxyStringToObject, agentFromProxy } from 'contentful-batch-libs/dist/proxy'
+ import { proxyStringToObject, agentFromProxy } from 'contentful-batch-libs'

- import { wrapTask } from 'contentful-batch-libs/dist/listr'
+ import { wrapTask } from 'contentful-batch-libs'

- import addSequenceHeader from 'contentful-batch-libs/dist/add-sequence-header'
+ import { addSequenceHeader } from 'contentful-batch-libs'

- import getEntityName from 'contentful-batch-libs/dist/get-entity-name'
+ import { getEntityName } from 'contentful-batch-libs'
```

Note that `addSequenceHeader` and `getEntityName` move from a default
import to a named import — the package has never had a default
export; the old default import only worked through TypeScript's
CJS/ESM interop against the per-file `tsc` output.

### If you `jest.mock('contentful-batch-libs/dist/logging', ...)`

Mock the package root instead, and make sure the factory still
provides every export that file uses from the package (not just the
ones you're overriding), since the mock now applies to every import
of `contentful-batch-libs` in that test file:

```diff
- jest.mock('contentful-batch-libs/dist/logging', () => ({
-   logEmitter: { emit: jest.fn() }
- }))
+ jest.mock('contentful-batch-libs', () => ({
+   ...jest.requireActual('contentful-batch-libs'),
+   logEmitter: { emit: jest.fn() }
+ }))
```

### If you import `contentful-batch-libs/test/mocks/`

This path is still supported, but drop the trailing slash — the
`exports` map entry is `./test/mocks`, not `./test/mocks/`:

```diff
- import { cloneMock } from 'contentful-batch-libs/test/mocks/'
+ import { cloneMock } from 'contentful-batch-libs/test/mocks'
```

### Everything else

`require('contentful-batch-libs')` and `import 'contentful-batch-libs'`
against the package root are unaffected and continue to work exactly
as before.
