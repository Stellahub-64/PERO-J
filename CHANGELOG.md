# Changelog

All notable changes to PERO-J are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Bug Fixes

- [#818](../../issues/818) make database connection pool size configurable via DATABASE_POOL_SIZE ([`91ac58f`](../../commit/91ac58f14f1b1efa80b82caafc2992d092690d45))

- [#747](../../issues/747) `get_events()` must cap `limit` to prevent CPU exhaustion ([`58139bf`](../../commit/58139bfb29c0e0cddc1af6f34af9566a4ccb5a11))

Closes [#747](../../issues/747)


- [#746](../../issues/746) `submit_event()` must accept allowlisted hot-wallet indexers ([`144af0c`](../../commit/144af0c87f56dcc80e291836e80d99d55fa9dade))

Closes [#746](../../issues/746)


- [#745](../../issues/745) `init()` must be permanently irreversible after first call ([`2a64bb5`](../../commit/2a64bb5288d1b1f8dbf392bfa0e7d2915f991a28))

Closes [#745](../../issues/745)


- Add isMissingFunctionError helper to validateSep41.js ([`e0a4cda`](../../commit/e0a4cda6aed51532e91db95396a9ef85ab2dab92))

- isMissingFunctionError(err) is defined and exported, detecting
    fn_not_found, function not found, no such function, and invalid
    function error patterns.
  - validateSep41 correctly returns true for present functions.
  - Remove duplicate export of mapWithConcurrency that caused a
    SyntaxError (Duplicate export).
  - Fix duplicate import and unclosed describe/it blocks in
    validateSep41.test.js caused by a bad merge.

  Closes [#819](../../issues/819)


- Address explorer issues 748-751 ([`50aa764`](../../commit/50aa7648b300f7f8fba5fa42f6bd1b1704d04bdc))

- Address indexer issue checks ([`51a9735`](../../commit/51a9735f6018e370f7b8440eebe22e83b0c8f758))

- Address issues 756-759 ([`77f3094`](../../commit/77f309477c5ff8fe9579c06e3a4e9b9806a7908e))

- Refresh EventSeq TTL on submissions ([`6830264`](../../commit/68302648c121eccb97244ce9a129ebbe64dfebf7))

- Add paginated wallet events endpoint ([`d6bfa5d`](../../commit/d6bfa5d135494cda54e16c0044ca5463a2fd9d16))

- Ensure sac_asset column exists ([`355c698`](../../commit/355c698e5db8e17a3162627291835d7ce9e4c0ee))

- Use GIN index for wallet event queries ([`df010b2`](../../commit/df010b2a97a13e7f6053c8bd84d13fa06e972398))

- Resolve false instead of leaving holes in mapWithConcurrency ([`29d7bb6`](../../commit/29d7bb639d5d3c6270c691c9f658a4a1f4696b7c))

A throwing mapper left its slot in the results array empty, creating a hole.
  Array.prototype.every skips holes entirely, so a mapper failure was silently
  reported as compliance.

  - mapWithConcurrency now catches mapper errors and resolves results[i] = false
  - validateSep41 consumes the returned values instead of mutating a closure,
    so the error path is actually exercised and results is always dense
  - tests: throwing mapper yields all-false, no holes, and a failing check
    forces { compliant: false }


- [#865](../../issues/865) Add `WalletPage` document title update on address change ([`8081bc4`](../../commit/8081bc4f11fb84836f91a90d00076c0322885aae))

Closes [#865](../../issues/865)


- [#864](../../issues/864) Add `EventPage` with full decoded event detail view ([`cd157e4`](../../commit/cd157e46a1ba2e6130cdb08fa0ded1cd14297c53))

Closes [#864](../../issues/864)


- [#863](../../issues/863) Implement `GET /api/events` full-text search with `q` paramete ([`494189c`](../../commit/494189c376665b99ad79c78d25f2c429edc1bd17))

Closes [#863](../../issues/863)


- [#862](../../issues/862) Add `fuzz` targets for Rust contract input validation ([`24a333b`](../../commit/24a333bc35a0b2b7d3ba984f773125a367dc712c))

Closes [#862](../../issues/862)


- [#853](../../issues/853) Fix `transfer` description to read amount from event data, not ([`a76eb7e`](../../commit/a76eb7e0b47eca0aee194ef01427f033e6af9529))

Closes [#853](../../issues/853)


- [#852](../../issues/852) Add `extractAddresses` to collect wallet addresses from events ([`28bb226`](../../commit/28bb2260a33ab87604cb7db7e1145f09d6c47310))

Closes [#852](../../issues/852)


- [#851](../../issues/851) Add `isValidStellarAddress` guard to `GET /api/wallet/:address ([`1a795f4`](../../commit/1a795f423dfc4267f1a0126cca27503941ab1a45))

Closes [#851](../../issues/851)


- [#850](../../issues/850) Implement `transfer_admin` requiring both parties to sign ([`eba71ae`](../../commit/eba71ae853474c2618ee3ea99df6e24128e55845))

Closes [#850](../../issues/850)


- [#849](../../issues/849) Add `stellar.toml` SEP-1 compliant network info file ([`5a6063c`](../../commit/5a6063c8d9d039e44b34990614b011efd5ef250e))

Closes [#849](../../issues/849)


- [#848](../../issues/848) Add `GET /api/contracts/:id/events` paginated event history fo ([`40970be`](../../commit/40970be98f70be1e7bd0d322579f05edcc55cf93))

Closes [#848](../../issues/848)


- [#847](../../issues/847) Add automated PostgreSQL backup strategy with `pg_dump` ([`10a6843`](../../commit/10a684329b50fa66277fab268b550e050270b3cf))

Closes [#847](../../issues/847)


- [#846](../../issues/846) Add CI workflow for React frontend build and tests ([`7241d26`](../../commit/7241d266484372215a436d63011bf92226971ef6))

Closes [#846](../../issues/846)


- [#869](../../issues/869) Wrap all async Express handlers with asyncHandler ([`4e5f039`](../../commit/4e5f0393a934bbb58657225c0076a03ba0ec16de))

Closes [#869](../../issues/869)


- [#868](../../issues/868) Rename Update button to Update metadata with confirmation dial ([`968c0de`](../../commit/968c0de1e2017be7cf424e7befaee1ce5da49ac6))

Closes [#868](../../issues/868)


- [#867](../../issues/867) Add centralised Express error-handling middleware ([`1cd8ede`](../../commit/1cd8edef94c2fd66543fe927b51db67b50bce687))

Closes [#867](../../issues/867)


- [#866](../../issues/866) Add `mobile-responsive` CSS for frontend at Tranche 3 launch ([`a29f31e`](../../commit/a29f31e3987a2fb343a14d7e4491661758f5be82))

Closes [#866](../../issues/866)


- [#845](../../issues/845) Add CI workflow for Node.js indexer tests ([`d5c3841`](../../commit/d5c384184e7774ea16546858add803e58dc2f0e2))

Closes [#845](../../issues/845)


- [#844](../../issues/844) Add CI workflow for Rust contract tests ([`eeacd4f`](../../commit/eeacd4f311aede56c7b58a5c1891f78d9341cad6))

Closes [#844](../../issues/844)


- [#843](../../issues/843) Implement `LRU cache eviction` on `update` event from indexer ([`2c0541c`](../../commit/2c0541cfcb609c0378e9f15aef7557d3fd9afff8))

Closes [#843](../../issues/843)


- [#842](../../issues/842) Add developer documentation for ABI registration ([`dd315cf`](../../commit/dd315cfaa3542a16c3c470975ef1da0b90c45f61))

Closes [#842](../../issues/842)


- [#841](../../issues/841) Add `CONTRIBUTING.md` with PR and issue guidelines ([`ca8891f`](../../commit/ca8891f386adb68d30b9b04822a9af90b8f66254))

Closes [#841](../../issues/841)


- [#840](../../issues/840) Add Kubernetes deployment manifests ([`0ee0d54`](../../commit/0ee0d5425c2d8c45235c6605a5f7771423041c58))

Closes [#840](../../issues/840)


- [#839](../../issues/839) Add `docker-compose.yml` for local development ([`1f200c0`](../../commit/1f200c0659d7008100a1d8b614c34bec057d1f80))

Closes [#839](../../issues/839)


- [#838](../../issues/838) Add `ContractsPage` to list all registered contracts ([`e3e401b`](../../commit/e3e401b11d35d85a6ed67976aa964aa8826caf34))

Closes [#838](../../issues/838)


- [#861](../../issues/861) Add `eslint.config.js` and `.prettierrc` to indexer for code c ([`4991adb`](../../commit/4991adb4ac23b82a4c418951937c522b939aa1a1))

Closes [#861](../../issues/861)


- [#860](../../issues/860) Add `ContractList` to track all registered contract IDs on-cha ([`b4aa8b8`](../../commit/b4aa8b83d0a8382590a1c7a1a41ea765ecade7b7))

Closes [#860](../../issues/860)


- [#859](../../issues/859) Add `SECURITY.md` with admin transfer and emergency recovery p ([`4ba4fb7`](../../commit/4ba4fb7128ca1265d563c9d293799897af213d2a))

Closes [#859](../../issues/859)


- [#858](../../issues/858) Add `migrate` target to `Makefile` ([`b1ac0fd`](../../commit/b1ac0fdb37bf6e16cf0c5ef50f5ec7b9d7ede288))

Closes [#858](../../issues/858)


- [#837](../../issues/837) Add `GET /api/stats` endpoint for aggregate counts ([`ce54a0e`](../../commit/ce54a0ed5cce84648c13ddbd4640b9d29743dfa2))

Closes [#837](../../issues/837)


- [#836](../../issues/836) Add advisory lock to `db.init()` migrations to prevent concurr ([`ed89c74`](../../commit/ed89c7450f72b47589cc8e211c000e9d31d774cb))

Closes [#836](../../issues/836)


- [#835](../../issues/835) Remove duplicate `export function startApi` declaration from ` ([`713d2bd`](../../commit/713d2bdfdceda49bc82a6a4f3a456444a9c3419e))

Closes [#835](../../issues/835)


- [#834](../../issues/834) `validateContractPayload` must be defined in `api.js` ([`029d6c3`](../../commit/029d6c3fad47712dd9be3aa707a57b2aad880dca))

Closes [#834](../../issues/834)


- [#857](../../issues/857) Add `LAG_ALERT_THRESHOLD_S` env var to override health alert t ([`65f7274`](../../commit/65f7274fa0526d8b16ce92df954231e695d8bf59))

Closes [#857](../../issues/857)


- [#856](../../issues/856) Add `EventTable` empty state with custom message and subtitle ([`bf8b9bb`](../../commit/bf8b9bbe13c14cc2b66f0878a842e00f7bb98237))

Closes [#856](../../issues/856)


- [#855](../../issues/855) Add `NOT_REGISTERED_TTL_MS` short-cache for negative ABI looku ([`a8c99e1`](../../commit/a8c99e146ff5bc04b1f63faabbe80b1e3db234f3))

Closes [#855](../../issues/855)


- [#854](../../issues/854) Cap `getEvents` limit at `MAX_PAGE (200)` in the database laye ([`1d6d32f`](../../commit/1d6d32f3cadb22a2a02ffe6ddb3c2eb5a8eb8597))

Closes [#854](../../issues/854)


- [#833](../../issues/833) Register StellarSwap, Blend, and Phoenix ABI fixtures on start ([`e0ff17e`](../../commit/e0ff17e96b7457fae0c2abcba1c4217f87c6916c))

Closes [#833](../../issues/833)


- [#832](../../issues/832) Add `swap` case to `buildDescription()` ([`aaeee9a`](../../commit/aaeee9a67d50a44b6a0b869bf1adc241424c1f3f))

Closes [#832](../../issues/832)


- [#831](../../issues/831) Add `stake` and `unstake` cases to `buildDescription()` ([`3112846`](../../commit/3112846cb96f20ee3e588d2c9383ee4409de49b2))

Closes [#831](../../issues/831)


- [#830](../../issues/830) Add `approve` case to `buildDescription()` ([`9de8a62`](../../commit/9de8a628f7b9782057c4902a0ff96e9bb79e099e))

Closes [#830](../../issues/830)


- Use npm install instead of npm ci for frontend ([`d861fa5`](../../commit/d861fa5e74f0747a510b5bafaa4f363296cfac61))

vitest@4.1.11 bundles its own vite which requires esbuild ^0.27.0||^0.28.0,
  while the outer vite@5.3.1 requires esbuild ^0.21.3. These ranges don't
  overlap so Linux npm resolves them into separate nested installs, producing
  platform-specific lock file entries that a macOS-generated lock file omits.

  Switching to npm install lets the resolver handle this correctly on each
  platform without requiring a Linux-generated lock file in the repo


- Regenerate frontend package-lock.json and pin node-version to 20.x ([`3f5f440`](../../commit/3f5f440429f26c8f972d1b2eb56d6e475af5c264))

The frontend CI was failing with 'npm ci can only install packages when
  package.json and package-lock.json are in sync' because package-lock.json
  was missing esbuild@0.28.2 and all its platform-specific packages.

  Regenerate package-lock.json by running npm install fresh. Also add npm
  cache configuration (cache: 'npm') and pin node-version to '20.x' (string
  form) so setup-node resolves the latest Node 20 patch rather than the
  bare integer which can be ambiguous on newer runners


- Resolve issues [#784](../../issues/784), [#785](../../issues/785), [#786](../../issues/786), [#787](../../issues/787) ([`5ac5e5a`](../../commit/5ac5e5a6dd9dfa83ea6d4bf7d2d5e243502a6a22))

[#787](../../issues/787) — db.getContracts() LIMIT/OFFSET parameter indexing
  - Replace fragile $${params.length+1}/+2 arithmetic with explicit push
    into selectParams so $N indices are always correct regardless of how
    many WHERE conditions precede LIMIT/OFFSET.
  - Add regression test in db.test.js asserting $1/$2/$3 positions when
    q, page, and limit are all provided.
  - Add route-level regression test in api.contracts.test.js confirming
    GET /api/contracts?q=swap&page=2&limit=10 forwards all three opts.

  [#786](../../issues/786) — Full-text search index on events.description
  - Migration 5 (already present) adds description_tsv TSVECTOR GENERATED
    ALWAYS AS (to_tsvector('english', description)) STORED and GIN index
    idx_events_description_tsv.
  - getEvents() now branches on isWordSafe (/^[\w\s]+$/) to use
    description_tsv @@ plainto_tsquery('english', $N) for plain-word
    queries (index scan) and falls back to ILIKE for special-char queries.
  - Fixes the four pre-existing failing tests in db.test.js ([#321](../../issues/321) block).

  [#785](../../issues/785) — Validate POST /api/contracts payload before upsert
  - Define and export validateContractPayload() in api.js: id required
    non-empty string, name required non-empty string, functions optional
    but must be array when present. Returns null for valid payloads.
  - Add api.contracts.post.test.js with 13 unit tests for the helper and
    9 HTTP integration tests covering all acceptance criteria (400 for
    missing id/name, 400 for non-array functions, 201 for valid payload).

  [#784](../../issues/784) — sourceAccountNotFound retry in sep41Metadata simulation
  - Add SourceAccountNotFoundError sentinel class; simulateCall throws it
    instead of recursing when seq=0 and the RPC reports account missing.
  - fetchTokenMetadata calls name sequentially first; on catch retries
    name with seq=1 and returns partial defaults for symbol/decimals
    (exactly 2 simulate calls, no cascading retries).
  - OPERATIONAL_ACCOUNT env var overrides dummy source; warning already
    logged on non-testnet fallback.
  - Fix IDS pool exhaustion in sep41Metadata.test.js (6 → 16 entries).

  Additional CI fixes (pre-existing failures):
  - decoder.js: add buildDescription handlers for supply, borrow, repay,
    liquidate, deposit, withdraw.
  - decoder.test.js: declare C14–C20; move approve to C19 and
    transfer_from to C20 to eliminate LRU cache collisions.
  - api.js: implement GET /api/events/:seq/raw route (was tested but
    missing); registered before /:seq to prevent route shadowing.


- Address issues 768, 770, 771, 772 ([`4e054d0`](../../commit/4e054d036c69101d9d019fed8d93c7f11d46ffc2))

- Harden SAC parsing and signed SCVal decoding ([`ee19d80`](../../commit/ee19d806125d9177d51541bcc721dcefb8c56cc5))

- React keys, search query, and debounce in EventTable and Home ([`b3be6a2`](../../commit/b3be6a2cc8b51288676a183ef53944eafffeea16))

- EventTable.tsx ([#303](../../issues/303)): wrap each event pair in <React.Fragment key={ev.seq}>
    so React uses a stable identity; remove inline key props from individual <tr>
    elements that caused the key to be placed on the wrong node
  - Home.tsx ([#302](../../issues/302)): introduce debouncedSearchQuery (useEffect + 300 ms setTimeout)
    and use it in the useQuery key and api.events() call; debounce clears on unmount
  - Home.tsx ([#301](../../issues/301)): use debouncedSearchQuery in queryKey and pass it as the q
    param to api.events() so description search actually filters results
  - Home.tsx: fix undefined references useCustom → customFn and activeFn → effectiveFn

  Closes [#301](../../issues/301), [#302](../../issues/302), [#303](../../issues/303)


- Add stake/unstake cases to buildDescription() ([#306](../../issues/306)) ([`7f5d0c3`](../../commit/7f5d0c3b80fd696d59ecb73b8f136681391a2ae8))

- Add case 'stake': produces 'Address <addr> staked <amount> <token> on <contract>'
  - Add case 'unstake': produces 'Address <addr> unstaked <amount> <token> on <contract>'
  - Extend test constants from C13 to C17 (C14–C16 were referenced but undeclared)
  - Fix C13 ID collision: approve test keeps C13; stake test reassigned to C17

  blend-abi.json already contained stake/unstake entries — no fixture change needed.
  ContractPage.tsx already had !metaLoading in the events query enabled condition
  ([#305](../../issues/305)) — no frontend change needed.

  Closes [#305](../../issues/305)
  Closes [#306](../../issues/306)


- Validate POST /api/contracts payload before upsert ([`cf7909a`](../../commit/cf7909a22aa84fc64dd6b2dced6998f9ad7e6b3e))

Return a clean 400 for missing/invalid id, name, or functions instead
  of letting malformed input hit the database and surface an obscure
  PostgreSQL error. Also fixes a duplicate `startApi` declaration that
  broke module import.

  Fixes [#311](../../issues/311)


- Add Go to Home link and catch-all route for 404 page ([`1ea01b8`](../../commit/1ea01b81ba36c070f63221bb64949d0e25e0e907))

- Add path="*" route to render NotFound component
  - Update NotFound page with Go to Home link
  - Add text suggesting user check the URL
  - Ensure page has h1 heading

  Closes [#338](../../issues/338)
  Closes [#339](../../issues/339)


- Replace fragile LIKE '{%' JSON heuristic in get24hVolume ([`e5a35d7`](../../commit/e5a35d75aea2f5f8c7a3995bb32487c4757eff79))

The LIKE pattern rejected valid JSON objects with leading whitespace
  and didn't reliably exclude non-object JSON (arrays, strings) before
  the ::jsonb cast. Match on the first non-whitespace character instead.

  Fixes [#308](../../issues/308)


- Make mapper errors resolve instead of leaving holes ([`a2d03d2`](../../commit/a2d03d2065bd064f13df0b1b764fcf501aa867cc))

In mapWithConcurrency, an unhandled error thrown by the mapper could leave a
  worker's slot in results undefined, so the caller's
  Object.values(results).every(Boolean) check could report an inconsistent
  compliance result. Catch mapper errors and treat the item as non-compliant
  (false) so every slot always resolves to a boolean.

  Closes [#391](../../issues/391), [#390](../../issues/390), [#387](../../issues/387), [#385](../../issues/385)


- Re-check contracts registered after negative cache ([`31fe674`](../../commit/31fe674a99901be8dda56190f249d588a1d96138))

The contract-metadata LRU cache stored a null ("not registered") result for
  the full 60s ABI TTL. If a contract was registered in the DB during that
  window, subsequent events kept using generic descriptions instead of the newly
  registered ABI.

  Distinguish "not registered" from "not yet checked": a null lookup is cached
  with a short, dedicated TTL so a contract registered mid-window is re-discovered
  promptly, while registered ABIs keep the full 60s cache.

  Closes [#355](../../issues/355), [#348](../../issues/348), [#334](../../issues/334), [#330](../../issues/330)


- Reset ErrorBoundary on route navigation ([`a950381`](../../commit/a950381345badb992911fc28f8b912865c81a356))

- Accept resetKey prop in ErrorBoundary and reset error state when resetKey changes
  - Pass location.pathname as resetKey from App.tsx via useLocation
  - Add tests covering reset on navigation and error state persistence on the same route

  Closes [#335](../../issues/335)


- Resolve issues [#312](../../issues/312), [#314](../../issues/314), [#320](../../issues/320), [#321](../../issues/321) ([`0f0e927`](../../commit/0f0e92749399663e75781297d2efb08cceb78ff2))

[#312](../../issues/312) — GET /api/contracts + db.getContracts()
  - db.getContracts({ q, page, limit }) was already implemented; add route-
    level tests for GET /api/contracts confirming pagination shape, page/
    limit/q forwarding, and response fields
  - Fix duplicate 'export function startApi' in api.js: rename the app-
    builder to createApp() (already expected by existing tests), and make
    startApi() call createApp() then listen — eliminates the dead second
    declaration and the missing createApp reference
  - Remove unused LRUCache import from api.js

  [#314](../../issues/314) — Rust: canonical event_seq + validate_meta
  - lib.rs already carries exactly one event_seq (panics NotInitialized)
    and one validate_meta; both have clear doc-comments explaining their
    panic semantics — no code change needed, confirmed by grep

  [#320](../../issues/320) — sac.js: log invalid SAC_ASSETS JSON
  - Replace the silent catch comment with:
      console.error('[sac] SAC_ASSETS is not valid JSON:', err.message)
    so operators see a diagnostic in production logs instead of silent
    asset-decoding failures
  - Add two new tests in sac.test.js verifying the error is logged and
    that err.message is appended

  [#321](../../issues/321) — full-text search on events.description
  - Add migration id 5: ALTER TABLE events ADD COLUMN description_tsv
    TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', description))
    STORED + GIN index idx_events_description_tsv
  - Update getEvents() to use plainto_tsquery('english', q) @@ description_tsv
    when the query contains only word-safe characters; fall back to ILIKE
    for queries with special characters (e.g. &, /, +) that to_tsquery
    cannot parse — keeps O(log n) search in the common case
  - Add four tests confirming tsquery path, ILIKE fallback, and correct
    param shapes

  Closes [#312](../../issues/312), [#314](../../issues/314), [#320](../../issues/320), [#321](../../issues/321)


- Align pagination, add metaLoading guard, and add stake/unstake/deposit/withdraw decoders ([`2815a0d`](../../commit/2815a0df16de3df606d05d93f59c37d00b94c7ff))

- fix([#304](../../issues/304)): remove events.length < limit guard from WalletPage Next
    button; use page * limit >= total only, consistent with Home.tsx.
    Prevents premature disabling when the last page is exactly full
    (total % limit === 0).

  - fix([#305](../../issues/305)): add !metaLoading to ContractPage events query enabled
    condition (!!id && !metaLoading && !!meta). Prevents a dangling
    request firing during the loading window before meta settles to null
    for an unregistered contract ID.

  - fix([#306](../../issues/306)): add case 'stake' and case 'unstake' to buildDescription()
    in decoder.js. Staking events on Blend and similar DeFi protocols now
    produce human-readable output instead of falling through to
    genericDescription(). Unit tests added.

  - fix([#307](../../issues/307)): add case 'deposit' and case 'withdraw' to buildDescription()
    in decoder.js. Deposit/withdraw events on Blend and Phoenix now produce
    sentences like 'Address GA… deposited 1000 USDC into Blend'. Unit
    tests added. blend-abi.json fixture updated with stake, unstake, and
    deposit function entries.

  Closes [#304](../../issues/304), [#305](../../issues/305), [#306](../../issues/306), [#307](../../issues/307)


- Migration lock never released on ROLLBACK; remove latestLedger duplicate from /health ([`afd8560`](../../commit/afd856048533bd6479ff41af3dfea45fd80f8669))

- db.js: wrap pg_advisory_unlock in its own try/catch so a connection
    drop during ROLLBACK does not prevent the unlock attempt. A failed
    unlock is logged with console.error rather than propagating an
    exception, preserving normal startup behaviour.

  - api.js: remove the legacy latestLedger field from all /health response
    bodies (error, degraded, ok) and from /ready. last_ledger is the
    documented canonical field; the duplicate was causing consumer
    confusion and risked silent breakage if the field were ever removed.
    Also removed a stray duplicate export function startApi stub that
    referenced a non-existent createApp helper and was causing a syntax
    error that blocked api.test.js from loading.

  Closes [#325](../../issues/325)
  Closes [#324](../../issues/324)


- Add address type guard to fmt() in decoder.js ([`7fe831b`](../../commit/7fe831b7a8c24cf4b10d849eb6c69e421d882f60))

- Restore function filter select dropdown in Home.tsx ([#350](../../issues/350)) ([`70382ae`](../../commit/70382aea6c5b22f67c9e5618317b07a234f62645))

- Add accessible aria-label prop to CopyButton ([`e8e173e`](../../commit/e8e173ea7e7021dfa3324c4caf92b32858014b27))

- Validate seq param in EventPage to prevent NaN API request ([`4a0f8cd`](../../commit/4a0f8cd5fd5ea8dcd5fa779af300356654bd5913))

If a user navigates to /event/abc, Number('abc') evaluates to NaN, which
  was being forwarded directly to GET /api/events/NaN causing a 400 error
  and a generic 'Event not found.' message with no explanation.


- Remove redundant ALTER TABLE sac_asset from migration [#1](../../issues/1) ([`6f8e502`](../../commit/6f8e50223ef5b1573d7ba79cbc40b63f20ac775d))

- Handle NULL event_addresses in getWalletEvents and backfill legacy rows ([`f1389a9`](../../commit/f1389a9360922f9b294e33e487c6895e50bdf0ce))

Closes [#340](../../issues/340)


- Read transfer amount from event data, not topic ([`cca26f5`](../../commit/cca26f51cf750174e537a9b33ad38b388b0d27a0))

- Cap getEvents limit at MAX_PAGE (200) ([`d7b664f`](../../commit/d7b664f97f3dcb00b9fafa2df239b54b05ac2008))

- Resolve issues [#368](../../issues/368), [#369](../../issues/369), [#370](../../issues/370), [#371](../../issues/371) ([`5bb3d82`](../../commit/5bb3d8232709de57da619097919841607a53fe28))

- [#368](../../issues/368): sanitiseArg now bypasses truncation for valid strkeys,
    raises MAX_ARG_DISPLAY_LEN to 128, and checks strkeys before
    isSensitive to avoid incorrect redaction.
  - [#369](../../issues/369): add GET /api/leaderboard?limit= endpoint with db.getLeaderboard,
    Cache-Control max-age=60, and db.test coverage.
  - [#370](../../issues/370): add init() warning and pool.query threading-model comments.
  - [#371](../../issues/371): add dark mode toggle to Nav.tsx, persist to localStorage,
    respect prefers-color-scheme, and add [data-theme="dark"] overrides


- Resolve issues 360-363 ([`902bfea`](../../commit/902bfea55fe526fea2f8ea77f9f6d5ddcda2af29))

[#360](../../issues/360): Fix getCursor to use parseInt with NaN guard and warning log for corrupted cursor values
  [#361](../../issues/361): Add DELETE /api/contracts/:id endpoint with API_ADMIN_KEY auth and db.deleteContractMeta
  [#362](../../issues/362): Log stack trace with method/path in error handler; export for testing
  [#363](../../issues/363): Add VITE_COMMIT_SHA/VITE_APP_VERSION footer for version traceability

  Closes [#360](../../issues/360)
  Closes [#361](../../issues/361)
  Closes [#362](../../issues/362)
  Closes [#363](../../issues/363)


- Resolve issues [#364](../../issues/364) [#365](../../issues/365) [#366](../../issues/366) [#367](../../issues/367) ([`f08630f`](../../commit/f08630ff089bbe57b8a63bab9f7d884dd732c46c))

- [#364](../../issues/364): Replace hardcoded localhost URLs in e2e tests with env vars
    (INDEXER_URL, FRONTEND_URL) and document in README
  - [#365](../../issues/365): Add dump file size validation to backup.sh (>512 bytes)
    and document in docs/backup.md
  - [#366](../../issues/366): Add NETWORK_PASSPHRASE validation on indexer startup
    against RPC network, with tests and README documentation
  - [#367](../../issues/367): Rename button to 'Update metadata', add confirmation
    dialog, and fix success message in ContractPage.tsx


- Recreate RPC client after 3 consecutive errors ([`aa37cb7`](../../commit/aa37cb7c1518a19fc9b7aa5dd02cdeea1e86f0fe))

Add error counting to the indexer main loop. After 3 consecutive RPC
  failures (threshold: RPC_ERROR_THRESHOLD), the SorobanRpc.Server instance
  is recreated to recover from potentially corrupted internal state. The
  error counter resets on both success and recreation.

  Closes [#421](../../issues/421)


- Resolve issues 356 through 359 ([`dd43d38`](../../commit/dd43d382db7ab4fb9f10d1575482f930a2f39487))

- Support card and table variants in Skeleton component to reduce CLS ([`051ab0d`](../../commit/051ab0d7ef7118c94d3d78f1c8fa595a561fbc8d))

Closes [#342](../../issues/342)


- Exclude /health and /ready probe endpoints from rate limiting ([`687dd6a`](../../commit/687dd6a315d091028dedf7a0e8e46ae79b6911d9))

- Show total event count and active filter summary in Home.tsx ([`c51eec8`](../../commit/c51eec80cb137918bcaf489fd16ed34f77acff6c))

- Make database connection pool size configurable via DATABASE_POOL_SIZE ([`a1cdc78`](../../commit/a1cdc7817ef370e85dc2eadcf3e5b687576eef1d))

- Enforce 1000ms minimum for POLL_MS ([`f3db06e`](../../commit/f3db06e2a4202a04756c668f14cb0437744f7a0b))

- Drop glob from node --test and add libudev-dev for soroban-cli ([`a2aa267`](../../commit/a2aa267698ef173a08117616ea65aabfcb1e868f))

- Fix indexer test glob, soroban-cli install, description limit guard, and update snapshots ([`590bf53`](../../commit/590bf5392a776f264f34bece7cab03fdbea26339))

- indexer/package.json: use single-quoted glob 'test/*.test.js' so node --test
    works on CI (the unquoted glob was shell-expanded before node saw it)
  - .github/workflows/ci.yml: install libdbus-1-dev and pkg-config before
    cargo install soroban-cli (required system deps on ubuntu-latest)
  - contracts/explorer/src/lib.rs: add MAX_DESCRIPTION_LEN guard in
    submit_event and fix two test helpers to use the setup!() macro
  - contracts/explorer/test_snapshots: regenerate all affected snapshots
    after the lib.rs changes (Admin key moved to persistent ledger entries)


- Use npm test in indexer job and add missing isMissingFunctionError ([`41fa9d6`](../../commit/41fa9d6786af3408d76621187d1631b08be35f3b))

Two related issues prevented the indexer CI job from passing:

  1. .github/workflows/ci.yml used `node --test test/` which fails because
     Node.js cannot load a directory as a module. The indexer package.json
     'test' script already has the correct invocation
     (`node --test test/**/*.test.js`), so the fix is to call `npm test`.

  2. indexer/src/validateSep41.js called `isMissingFunctionError()` on line 121
     but the function was never defined in the file. The missing function caused
     a ReferenceError that was silently swallowed by the catch block in
     validateSep41(), making every SEP-41 function check return false and
     causing the 'execution errors treated as present' test to fail.
     Fix: add the isMissingFunctionError() definition between isExecutionError()
     and isRateLimitError().

  After both fixes: 85 tests, 27 suites, 0 failures


- Add wasm-opt step to make build ([`29c1f1f`](../../commit/29c1f1f33bd31355110994aad385a8a0a8909858))

Add WASM size optimization using wasm-opt -Oz to the build target in Makefile.

  closes [#20](../../issues/20)


- Reorder submit_event publish-before-write and add auth tests ([`cf0a281`](../../commit/cf0a28156f84d8a642d3b6dc9266a67961744188))

Issue 1 (auth tests): Add three tests that call env.set_auths(&[]) to
  strip all authorisations and assert that transfer_admin, submit_event,
  and add_indexer all panic. Previously mock_all_auths() masked every
  require_auth() call, leaving auth logic completely untested.

  Issue 2 (publish order): Move env.events().publish() in submit_event to
  run before the persistent storage write. If the publish call ever fails,
  the transaction rolls back before the EventLog entry is written, keeping
  on-chain storage and the event stream in sync


- Add ParamKind enum and bump event log TTL on write/read ([`e812137`](../../commit/e812137adc06d285ded4c07db9ad6e9d1565f800))

Issue 1: Replace kind: Symbol with kind: ParamKind enum (Address, I128,
  U32, Symbol, Bytes, Bool, String) in ParamDef. Unknown ABI param kinds
  are now rejected at XDR deserialization before reaching contract logic.
  Add validate_meta and event_seq helpers (were referenced but undefined).
  Add missing Error::NotInitialized variant (referenced in get_admin).

  Issue 2: Call env.storage().persistent().extend_ttl() on EventLog entries
  in both submit_event (write) and get_event (read) using EVENT_TTL_MIN
  (30 days) and EVENT_TTL_MAX (365 days) to prevent silent eviction


- Pin soroban-sdk to exact version 21.7.7 for reproducible builds ([`5865047`](../../commit/5865047d0c3b4088db2b72dd3e882696311c6242))

- Pin soroban-sdk to =21.7.7 in contracts/explorer/Cargo.toml
  - Update workspace Cargo.toml to match
  - Regenerate Cargo.lock to resolve ed25519-dalek compatibility
  - Use #[contracterror] for Error enum (required by soroban-sdk v21.7.7)
  - Remove unused imports Map and log

  Closes [#19](../../issues/19)


- Bound description length in submit_event ([`1a9f566`](../../commit/1a9f5668d79eb5695af7ef6ccf6106e997d5db15))

An admin or a compromised allowlisted indexer key could submit an
  arbitrarily large description string (e.g. 64 KB) per event, inflating
  the persistent-storage rent every user pays. Cap it at
  MAX_DESCRIPTION_LEN (512 bytes) and panic with Error::InvalidInput when
  exceeded, mirroring the existing raw_data size guard


- Pin soroban-sdk to exact version 21.7.7 for reproducible builds ([`3e1e59d`](../../commit/3e1e59d5dc06771e0820eabce39f03bdc08921b8))

- Harden init, add indexer allowlist, cap paging, emit update event ([`8bbe4cc`](../../commit/8bbe4cc83c34cbd85d4b04bb86e8547fcf38b3e5))

Closes [#1](../../issues/1), [#2](../../issues/2), [#3](../../issues/3), [#4](../../issues/4).

  [#1](../../issues/1) init() could be replayed if the instance entry expired. The Admin guard
  now lives in persistent storage, and every mutating entry point calls
  bump_ttl() so an active contract never lets its state lapse.

  [#2](../../issues/2) submit_event() only accepted the single admin address, forcing the
  indexer hot wallet to hold the cold admin key. Adds a persistent
  IndexerAllowlist (Vec<Address>, capped at MAX_INDEXERS = 20) with
  add_indexer/remove_indexer admin functions plus get_indexers/is_indexer
  readers; submit_event now accepts the admin or any allowlisted address.

  [#3](../../issues/3) get_events() accepted a raw u32 limit and would iterate until the host
  ran out of CPU instructions. Rejects limit > MAX_PAGE (200) with
  Error::LimitExceeded, and the end-offset computation is now saturating.

  [#4](../../issues/4) update_contract() was silent, so the indexer could not invalidate its
  ABI cache without polling. It now publishes ("update", contract_id) ->
  meta.name, mirroring register_contract.

  Two pre-existing build breakages had to be fixed for any of this to
  compile or run in CI:
  - Error was declared #[contracttype] rather than #[contracterror], so
    every panic_with_error! failed to typecheck and the crate did not build.
  - Cargo.lock resolved soroban-env-host 21.2.1 against ed25519-dalek 3.0.0,
    which it does not support; pinned back to 2.2.0.

  13 unit tests pass, including a regression test for [#1](../../issues/1) that fails against
  the old instance-storage implementation


- Add database backup strategy ([#106](../../issues/106)) ([`ecd0c8f`](../../commit/ecd0c8f9b30750147e55230e550aca6dd412daf0))

- Add scripts/backup.sh using pg_dump with configurable env vars
  - Document cron job: 0 2 * * * backup.sh >> /var/log/backup.log 2>&1
  - Document restore procedure in README.md
  - Document cloud deployment backups (RDS, Cloud SQL, Supabase, Neon)
  - Update ROADMAP Tranche 3 deliverable 3.2 to reflect implementation
  - Add PR_DESCRIPTION.md with detailed description closing [#106](../../issues/106)

  closes [#106](../../issues/106)


- Log malformed SAC_ASSETS entries and startup asset count ([`c88a102`](../../commit/c88a10289345f382fee9a7c81a5438698fcbffb5))

- Resolve frontend CI failures ([`3f89ce9`](../../commit/3f89ce9d7c66e2ab70f5ffcf8c3e8ec63053c05e))

- Add skipLibCheck and vite/client types to tsconfig.json
  - Replace process.env with import.meta.env.DEV in ErrorBoundary
  - Add distinctFunctions endpoint to API client and server
  - Add getDistinctFunctions query to database module


- Remove unused xdr and StrKey imports ([#30](../../issues/30)) ([`562ca48`](../../commit/562ca484aa0af97ece6b1570db9a0821a9b08808))

Only scValToNative is used in decoder.js. The xdr and StrKey named
  imports were present in an earlier version but are no longer referenced.
  Removing dead imports reduces the module's dependency surface and makes
  it clear what the module actually relies on.

  Closes [#30](../../issues/30)


- Handle BigInt in JSON.stringify for raw_data ([`10708cd`](../../commit/10708cd79455d3b74f75b7f9daef07840821e69a))

scValToNative returns BigInt for i64/u64/i128/u128 values. Passing the
  decoded data directly to JSON.stringify() threw:
    TypeError: Do not know how to serialize a BigInt


- Redact sensitive args and truncate to 64 chars in genericDescription ([#29](../../issues/29)) ([`852cb12`](../../commit/852cb12ef7522bfc20e79275e5ef304014717d86))

- Add isSensitive() helper that flags:
    * 56-char G-prefixed strings that are not valid strkeys
    * Raw hex blobs of 64+ chars (32+ byte nonces/keys)
    * Base64 blobs of 44+ chars (32-byte secrets)
  - Add sanitiseArg() that redacts sensitive values with [REDACTED]
    and truncates any value > 64 chars to 'first…last' form
  - genericDescription now maps args through sanitiseArg instead of
    String(), preventing private data from leaking into PostgreSQL
    and the public API

  Closes [#29](../../issues/29)


- Reload SAC map on SIGHUP signal ([#34](../../issues/34)) ([`2640006`](../../commit/264000636ba52fdffae2ebffd1b344a2169bf229))

- Clamp scvI128/scvI256 bit-shifting to signed range ([#33](../../issues/33)) ([`8fe5111`](../../commit/8fe51110357b58c743084a5f97f78550e7651cbf))

- Resolve assigned issue fixes ([`34a1377`](../../commit/34a1377ba354aa5d72de57a3f095f9822e8462e1))

- Return readable strings for opaque ScVal variants ([`2b2dd69`](../../commit/2b2dd692d4b1d37f64ba6f4c5a18a139bf8512c1))

scvLedgerKeyContractInstance, scvLedgerKeyNonce, and scvContractInstance
  previously returned plain objects that serialised to [object Object] when
  coerced to string (e.g. in genericDescription).

  - scvLedgerKeyContractInstance → "<contract-instance>"
  - scvContractInstance          → "<contract-instance>"
  - scvLedgerKeyNonce            → "<nonce:{n}>" (preserves nonce value)

  Adds indexer/test/scval.test.js with 4 test cases covering all three
  variants and the join-into-description scenario


- Bound caller-supplied payloads, add get_admin, harden event counter ([`280bd83`](../../commit/280bd83d5e678d50c71cf91e4dbd15d51d4c5ffc))

- submit_event rejects raw_data larger than MAX_RAW_DATA_BYTES (4096) before
    touching storage, so a single call cannot bloat on-chain state ([#7](../../issues/7))
  - add get_admin() view so off-chain tooling can read the admin without
    guessing the DataKey encoding ([#10](../../issues/10))
  - event_count()/get_events() now read the sequence counter through a helper
    that panics with NotInitialized instead of collapsing a missing counter
    into a misleading 0 ([#11](../../issues/11))
  - register_contract()/update_contract() reject ABI metadata above
    MAX_FUNCTIONS (64) or MAX_PARAMS (32) per function ([#12](../../issues/12))

  Also fixes two pre-existing build blockers that made the crate impossible to
  compile or test: Error carried #[contracttype] instead of #[contracterror]
  (so panic_with_error! never type-checked), and the lockfile resolved
  ed25519-dalek to 3.0.0, which soroban-env-host (">=2.0.0") cannot build against


- Emit abi_cleared event and add get_events boundary tests ([`288c799`](../../commit/288c7992271017e3f113008f2b25f598da5a2328))

Issue [#16](../../issues/16): emit (abi_cleared, contract_id) event in update_contract
  when meta.functions is empty, so the indexer can log a warning
  instead of silently falling back to generic descriptions.

  Issue [#15](../../issues/15): add three parameterised get_events pagination boundary tests:
  - test_get_events_limit_zero_returns_empty  (from=0, limit=0)
  - test_get_events_from_equals_total_returns_empty (from=total, limit=10)
  - test_get_events_from_last_returns_one  (from=total-1, limit=100)


- Move EventSeq to persistent storage to prevent seq reset on TTL expiry ([`10dbbfc`](../../commit/10dbbfc05d7d8dfe6614a51d332436d2af032252))

Instance storage has a short TTL; if it expires, EventSeq would fall back
  to 0 via unwrap_or(0) and new events would silently overwrite existing ones
  in persistent storage starting from seq 0.

  Fix by storing EventSeq in persistent storage alongside EventLog entries,
  and calling extend_ttl on both EventSeq and each EventLog entry every time
  submit_event is called. Two TTL constants are introduced:
    - EVENTSEQ_TTL_THRESHOLD (17_280 ledgers ≈ 1 day)  — only bump when below
    - EVENTSEQ_TTL_BUMP      (518_400 ledgers ≈ 30 days) — target TTL

  Closes [#17](../../issues/17)


- Improve rpc and database resilience ([`76f1d37`](../../commit/76f1d37ba0c5947589f722cc5eabcfee315b66bc))

- Resolve assigned event API and DB issues ([`5d6f68d`](../../commit/5d6f68d79689f2efd244dc8e76531ff9c7cb9bf3))

- Resolve issues [#70](../../issues/70), [#71](../../issues/71), [#72](../../issues/72), and [#73](../../issues/73) in indexer service ([`0a97e3f`](../../commit/0a97e3f9c87f346c2f7087c1caf641a39a47245a))

Detailed Summary of Changes:

  1. Fix Express Async Route Error Handling ([#73](../../issues/73)):
  - Introduced an asyncHandler wrapper function in indexer/src/api.js to catch promise rejections in async route handlers and forward them to Express's next(err).
  - Added a centralized Express error-handling middleware to safely return 500 error responses and prevent process crashes.
  - Refactored all API route callbacks to use asyncHandler.

  2. Graceful Database Connection Pool Termination on Unhandled Rejections ([#72](../../issues/72)):
  - Registered process.on('unhandledRejection') in indexer/src/db.js to log errors and await pool.end() before process exit, preventing PostgreSQL connection leaks.
  - Added db.close() method for graceful shutdown.

  3. Persist and Query SAC Asset Codes in Events Table ([#71](../../issues/71)):
  - Added sac_asset TEXT column to events table in db.init() with migration support.
  - Updated db.upsertEvent() to persist sac_asset when Stellar Asset Contract (SAC) events are processed.

  4. Add Container Health and Readiness Probes ([#70](../../issues/70)):
  - Implemented db.ping() in indexer/src/db.js to verify database connectivity.
  - Enhanced GET /health endpoint to check database status, include latestLedger, and return HTTP 503 on database disconnection or indexer lag.
  - Added GET /ready endpoint for Kubernetes and Docker Compose readiness probes.

  Closes [#70](../../issues/70)
  Closes [#71](../../issues/71)
  Closes [#72](../../issues/72)
  Closes [#73](../../issues/73)


- Resolve issues [#69](../../issues/69), [#68](../../issues/68), [#67](../../issues/67), and [#66](../../issues/66) simultaneously ([`fbff2bc`](../../commit/fbff2bcd27f3fbe11b8d379348684b4691835407))

1. Issue [#69](../../issues/69) - Add pagination to getWalletEvents & WalletPage:
  - Updated db.getWalletEvents to accept page and limit parameters, query total event count, and fetch paginated results using LIMIT and OFFSET in SQL.
  - Updated GET /api/wallet/:address endpoint to pass query parameters (page and limit) to db.getWalletEvents and return a wrapper object containing { events, total, page, limit }.
  - Updated frontend api.ts and WalletPage.tsx to pass page parameter to api.wallet and render Prev/Next pagination UI controls.

  2. Issue [#68](../../issues/68) - Handle sourceAccountNotFound in sep41Metadata simulation:
  - Updated simulateCall in sep41Metadata.js to catch sourceAccountNotFound simulation errors when sequence is "0" and automatically retry simulation with sequence "1".
  - Added JSDoc documentation and environment variable fallback (process.env.OPERATIONAL_ACCOUNT) for the simulation dummy source account.

  3. Issue [#67](../../issues/67) - Implement express-rate-limit middleware on Express API:
  - Added express-rate-limit package dependency to indexer/package.json.
  - Configured and registered rateLimit middleware in indexer/src/api.js (windowMs: 60,000 ms, max: 100 requests) to protect all API endpoints against DoS attacks.

  4. Issue [#66](../../issues/66) - Validate seq parameter in GET /api/events/:seq:
  - Added validation for req.params.seq in GET /api/events/:seq to ensure it is a non-negative integer using parseInt and regex pattern matching.
  - Returned HTTP 400 with { error: "seq must be a non-negative integer" } when given invalid inputs like non-numeric strings or negative numbers.

  Closes [#69](../../issues/69)
  Closes [#68](../../issues/68)
  Closes [#67](../../issues/67)
  Closes [#66](../../issues/66)


- Resolve frontend issues [#90](../../issues/90) [#91](../../issues/91) [#92](../../issues/92) [#93](../../issues/93) ([`5da7959`](../../commit/5da79592839c0627076ad979a3c751add9bbf36c))

[#90](../../issues/90) - Add Skeleton component with shimmer animation; replace all plain
       'Loading…' text in Home, ContractPage, WalletPage, and EventPage
       with shaped placeholder rows that match the EventTable layout,
       eliminating layout shift on data load.

  [#91](../../issues/91) - Read API base URL from VITE_API_URL env variable with '/api'
       fallback so the frontend works on separate-origin deployments
       (e.g. CDN frontend + api.pero-j.io API) without CORS errors.
       Document VITE_API_URL in .env.example.

  [#92](../../issues/92) - Configure QueryClient with staleTime: 30_000 (30 s) to prevent
       stale event-feed data. Add registerContract to api.ts and wire
       useMutation + queryClient.invalidateQueries({ queryKey: ['contract', id] })
       in ContractPage so metadata updates are reflected immediately
       after a successful POST /api/contracts.

  [#93](../../issues/93) - Add created_at?: string to DecodedEvent interface. Display it
       in EventPage as a human-readable UTC timestamp using
       new Date(ev.created_at).toUTCString(), giving users a readable
       time alongside the raw ledger number


- Resolve issues [#118](../../issues/118)-[#121](../../issues/121) — health endpoint, transfer_admin, ABI fixtures, load test ([`2a1664e`](../../commit/2a1664e8dcbfdd90dfd52bebdb20dce3ccd8802b))

Issue [#118](../../issues/118) — Contract admin key management
  - Add transfer_admin(current_admin, new_admin) to ExplorerContract; both
    parties must authorize to prevent accidental lock-out
  - Add three unit tests: happy path, unauthorized caller
  - Add SECURITY.md documenting key-management best practices and
    emergency recovery procedure

  Issue [#119](../../issues/119) — Indexer lag monitoring (GET /health)
  - Export shared health state (lastIndexedAt, lastLedger, startedAt)
    from index.js and update it after each ledger batch
  - Add GET /health endpoint to api.js: returns lag_seconds, uptime_seconds,
    last_ledger, last_indexed_at; HTTP 200 healthy / 503 degraded
  - Alert threshold configurable via LAG_ALERT_THRESHOLD_S env var (default 30)
  - Document uptime monitor setup and example responses in README

  Issue [#120](../../issues/120) — ABI fixtures for Tranche 2 deliverable 2.5
  - Add indexer/fixtures/stellarswap-abi.json (swap, add/remove liquidity, get_price)
  - Add indexer/fixtures/blend-abi.json (supply, withdraw, borrow, repay, liquidate)
  - Add make seed-testnet target to register ABIs via POST /api/contracts

  Issue [#121](../../issues/121) — Load testing
  - Add tests/load/api_load_test.js (k6): 100 VUs × 60 s on GET /api/events
  - Separate health probe scenario samples lag_seconds every 10 s
  - Thresholds: p95 < 500 ms, p99 < 1 s, error rate < 1 %, lag < 30 s
  - Add make load-test target



### CI / CD

- Fix frontend Node and lockfile ([`bbf0ec1`](../../commit/bbf0ec1ae4733eb5bde2275dbc0e60b3e50d558d))


### Documentation

- Auto-update CHANGELOG.md [skip ci] ([`4f33da4`](../../commit/4f33da42706c10acafb4e1a6c6e4ba0843430220))

- Auto-update CHANGELOG.md [skip ci] ([`c8ad944`](../../commit/c8ad9441917c159da99729fc9c161baf26bd6cda))

- Auto-update CHANGELOG.md [skip ci] ([`8607095`](../../commit/86070959f45ec1302a00de076575c8b4cb23747b))

- Auto-update CHANGELOG.md [skip ci] ([`3167e8a`](../../commit/3167e8a3b120dc11e07b26f3145f109e05cd5f89))

- Auto-update CHANGELOG.md [skip ci] ([`bb1eeca`](../../commit/bb1eeca69ae041ef18b3528953e010a2a29d843e))

- Auto-update CHANGELOG.md [skip ci] ([`65cac23`](../../commit/65cac237e43d54522170090734f8fbccb8b9ce66))

- Auto-update CHANGELOG.md [skip ci] ([`616702f`](../../commit/616702f6934a56e1f80441936d24811849a0a757))

- Auto-update CHANGELOG.md [skip ci] ([`da5607d`](../../commit/da5607da63529381e11704d54e44b442d021ec5b))

- Auto-update CHANGELOG.md [skip ci] ([`3a10d00`](../../commit/3a10d00550e5c586407a2ef978a34f7f3d328f90))

- Auto-update CHANGELOG.md [skip ci] ([`314822e`](../../commit/314822ec34b7f18d0ed99fc4fbda31490f2d4d35))

- Auto-update CHANGELOG.md [skip ci] ([`5f131b9`](../../commit/5f131b91d28dd0a0af5d90b2fe467893d8334eca))

- Auto-update CHANGELOG.md [skip ci] ([`7116486`](../../commit/71164862dbfa5047da2ff728a8663fe028223a77))

- Auto-update CHANGELOG.md [skip ci] ([`e846fba`](../../commit/e846fba3a10e00749812ffd3a04abd3ef6e390af))

- Auto-update CHANGELOG.md [skip ci] ([`281650d`](../../commit/281650dbbc5ed8a30b2e82d8ba39549e65c26f76))

- Auto-update CHANGELOG.md [skip ci] ([`1e2ac6a`](../../commit/1e2ac6a638e96e404aafb821ec18e96cd469bccc))

- Auto-update CHANGELOG.md [skip ci] ([`05f4eda`](../../commit/05f4edac9aa8370cb1614b05644c9d06197a0164))

- Auto-update CHANGELOG.md [skip ci] ([`f73f414`](../../commit/f73f414ab11985b7e7e0b8c8f8d7ec02c435b809))

- Note [#803](../../issues/803) RPC client recreation already implemented ([`cb5671e`](../../commit/cb5671eb67d5947298715e066b25f15d80c67d41))

- Note [#801](../../issues/801) GET /api/contracts already implemented ([`23dfd3d`](../../commit/23dfd3d7a86b67b47d9b79fd0162c3f5f79cc0da))

- Note [#800](../../issues/800) EventTable stable keys already implemented ([`9fabe3f`](../../commit/9fabe3f40e51cdac03fa881c07ac12ffb148f957))

- Auto-update CHANGELOG.md [skip ci] ([`ed86ee1`](../../commit/ed86ee159751eebede0327182ac2be5bd1fb252e))

- Note [#799](../../issues/799) ContractPage events guard already present ([`f62fbf2`](../../commit/f62fbf2eaf909da89bafa03985b27e5c69a25800))

- Note [#798](../../issues/798) WalletPage Next button already fixed ([`7d6649c`](../../commit/7d6649c48391cfb06710f34c640426da92d4dbba))

- Note [#797](../../issues/797) event count summary already implemented ([`73885db`](../../commit/73885dba5fe594c8f9439d199b1844ba605df7da))

- Note [#796](../../issues/796) function filter dropdown already implemented ([`b58be92`](../../commit/b58be92898ff90a15ae7671b78ca64a07a0c4e11))

- Auto-update CHANGELOG.md [skip ci] ([`bbe2429`](../../commit/bbe2429b4ac4a5f85ee6f9cb7dca3929a80d5035))

- Note [#807](../../issues/807) already implemented ([`c988b2e`](../../commit/c988b2e357ab196b708620ba8411ee470dbf1832))

- Note [#806](../../issues/806) already implemented ([`f68ad73`](../../commit/f68ad7333a66f061e35b2338f9d675c912227aa1))

- Note [#805](../../issues/805) already implemented ([`59a0af9`](../../commit/59a0af9f348e4bfbd04c61674ec2c40b123c0296))

- Note [#804](../../issues/804) already implemented ([`fb888a0`](../../commit/fb888a031d6aea7289982a8b3a63200d378a5aba))

- Auto-update CHANGELOG.md [skip ci] ([`d93f7e2`](../../commit/d93f7e2f38ddd854523b1484c8a321920a0907fd))

- Note [#811](../../issues/811) is already implemented on main ([`35bf3f8`](../../commit/35bf3f8429c0679a9578cf015712a744e24733af))

- Note [#810](../../issues/810) is already implemented on main ([`be133e2`](../../commit/be133e28ee18659e49e40f6a2f25f1132af1bb9d))

- Note [#809](../../issues/809) is already implemented on main ([`4dbfb9a`](../../commit/4dbfb9a94f8cb77ad34a631a53cc780722e2ed5c))

- Note [#808](../../issues/808) is already implemented on main ([`cb3631e`](../../commit/cb3631ede028afbcbcfaa4dfb9b9d772d9ef58e4))

- Auto-update CHANGELOG.md [skip ci] ([`c842703`](../../commit/c842703040a0af99c594bcca29d249461deebb31))

- Note [#795](../../issues/795) search debounce already implemented ([`a1fa90f`](../../commit/a1fa90f78288aeda1f1997b639d187bd4fe80bd5))

- Note [#794](../../issues/794) skeleton loading states already implemented ([`7f0ad23`](../../commit/7f0ad23ebd8b4f32980d2c1510a3d5841c8bba73))

- Note [#793](../../issues/793) CopyButton ariaLabel already implemented ([`943178e`](../../commit/943178e11116434ba982c3652601c62ee3d9d8da))

- Note [#792](../../issues/792) seq validation already implemented ([`57cc1b9`](../../commit/57cc1b9250d1e01f4894d4e7752ddee90dc3f47c))

- Auto-update CHANGELOG.md [skip ci] ([`575e7aa`](../../commit/575e7aa730deefdff79a597dd7cd4aae0647b84c))

- Auto-update CHANGELOG.md [skip ci] ([`c9644e4`](../../commit/c9644e49f02312e55fd077acca057d2f69056ef9))

- Auto-update CHANGELOG.md [skip ci] ([`f79a97a`](../../commit/f79a97a5f7c033a4b45ee860305c9c5367401732))

- Auto-update CHANGELOG.md [skip ci] ([`6a9d89f`](../../commit/6a9d89faed6d3d169ba21e40ffcfaee6f46217a0))

- Auto-update CHANGELOG.md [skip ci] ([`ce2cd15`](../../commit/ce2cd157445fc59f2aa2d2d5ea902c0442e7a51c))

- Auto-update CHANGELOG.md [skip ci] ([`b197139`](../../commit/b197139bd49727392a3a8c231954b8aa638444a8))

- Auto-update CHANGELOG.md [skip ci] ([`5ea7331`](../../commit/5ea7331f6945c1c6fae810de41c7ab73b79354cb))

- Auto-update CHANGELOG.md [skip ci] ([`dc23c01`](../../commit/dc23c01989eab5d84c36756240d38569e93c307a))

- Auto-update CHANGELOG.md [skip ci] ([`502ba1b`](../../commit/502ba1bb354c0ed9ca52510de8c058bcf5f026d6))

- Auto-update CHANGELOG.md [skip ci] ([`a449e58`](../../commit/a449e5893782c0d039f580232e000354786ac766))

- Auto-update CHANGELOG.md [skip ci] ([`18dd8bc`](../../commit/18dd8bc8e62397d3214ed568210dfdad84a5c102))

- Auto-update CHANGELOG.md [skip ci] ([`96a9e2f`](../../commit/96a9e2f17eacca410517e110ddf0c89667daf6a5))

- Auto-update CHANGELOG.md [skip ci] ([`2134a57`](../../commit/2134a57a69b3d086225f3affb7c0b5c40668a63a))

- Auto-update CHANGELOG.md [skip ci] ([`6b61255`](../../commit/6b612554c94649052e4a8fdaa4505641221f28d1))

- Auto-update CHANGELOG.md [skip ci] ([`bc83ced`](../../commit/bc83cedd948bcc6a645f6021c5afa2997d56d642))

- Auto-update CHANGELOG.md [skip ci] ([`1bf46a8`](../../commit/1bf46a8a9f247b1f3ab5301245ba80e0df0ba2b9))

- Auto-update CHANGELOG.md [skip ci] ([`073354b`](../../commit/073354b00b627491be90c82011d15c0da5020592))

- Auto-update CHANGELOG.md [skip ci] ([`f8cc6bd`](../../commit/f8cc6bd42ef625dfc6d3fb8e828f00a706c061ab))

- Auto-update CHANGELOG.md [skip ci] ([`64d24c3`](../../commit/64d24c36bdec3fc993011128f6fb39fd5bd928bd))

- Auto-update CHANGELOG.md [skip ci] ([`e42cd8b`](../../commit/e42cd8b0c9cdf8b7d4843973a5fd27febcc72818))

- Auto-update CHANGELOG.md [skip ci] ([`aa76762`](../../commit/aa7676255a07306bbb26b01afccc6806926e721c))

- Auto-update CHANGELOG.md [skip ci] ([`0afe35b`](../../commit/0afe35bccfcdd3a23864bd1e215408bcdbfb8880))

- Auto-update CHANGELOG.md [skip ci] ([`d275ce4`](../../commit/d275ce4bd562c8f665411bacfcde51ade2cc6bd6))

- Auto-update CHANGELOG.md [skip ci] ([`f758fd5`](../../commit/f758fd5b5dbbd826f98c1ef1cf829a6900a5e22c))

- Auto-update CHANGELOG.md [skip ci] ([`5488227`](../../commit/54882272aedaa66723ea7ad9160f87fe7921eb6c))

- Auto-update CHANGELOG.md [skip ci] ([`83a3473`](../../commit/83a3473beb147c060bb8b08f62032eec8ee4603d))

- Auto-update CHANGELOG.md [skip ci] ([`25150c0`](../../commit/25150c0b8bf454e45beed77cf96ba083f123d6b8))

- Auto-update CHANGELOG.md [skip ci] ([`c8a3e8f`](../../commit/c8a3e8f51b77932dbd9d3b1357dcf3cd06c24656))

- Auto-update CHANGELOG.md [skip ci] ([`8305968`](../../commit/830596888dd58a177aeebe51f2d0bd7948294481))

- Auto-update CHANGELOG.md [skip ci] ([`ca198df`](../../commit/ca198df4255301ed2c403fa3fd99793bb8e0076b))

- Auto-update CHANGELOG.md [skip ci] ([`b04a27e`](../../commit/b04a27e324eaa2800f5b73fb96bf5fd95f670c71))

- Auto-update CHANGELOG.md [skip ci] ([`40596c1`](../../commit/40596c172601f056e685b3396601dd081691f583))

- Auto-update CHANGELOG.md [skip ci] ([`552db35`](../../commit/552db35d00e929ba3a3999768af66432465a3878))

- Auto-update CHANGELOG.md [skip ci] ([`dad80c0`](../../commit/dad80c06e149e632f1a7c8fa6ea96e6680c9ff0f))

- Auto-update CHANGELOG.md [skip ci] ([`1cca5f8`](../../commit/1cca5f82a79c2ef73ee478b8327a4dee1b577c3b))

- Auto-update CHANGELOG.md [skip ci] ([`a2a6626`](../../commit/a2a6626612282c1a3671cf1fd77a7998a74e43f0))

- Auto-update CHANGELOG.md [skip ci] ([`f84205a`](../../commit/f84205aa6bf6002e90ac8efbe6120b5b87003652))

- Auto-update CHANGELOG.md [skip ci] ([`43a0c2c`](../../commit/43a0c2cae283ed71bc6fad269d93a63ab727912f))

- Auto-update CHANGELOG.md [skip ci] ([`ba0b6fb`](../../commit/ba0b6fb552ab3b9fc8c7f81cec1d99106952d965))

- Auto-update CHANGELOG.md [skip ci] ([`b3f537a`](../../commit/b3f537ac772eaa31e3655ddcf6bb787926d62596))

- Auto-update CHANGELOG.md [skip ci] ([`2db0487`](../../commit/2db0487179d36472701168dd7bcf55389cc0b0e6))

- Auto-update CHANGELOG.md [skip ci] ([`a079d4e`](../../commit/a079d4ef8211dd9662b6123f93d954ad0be4733d))

- Auto-update CHANGELOG.md [skip ci] ([`8ff57e4`](../../commit/8ff57e444a7176b192840d6dc5bbe219abc31329))

- Auto-update CHANGELOG.md [skip ci] ([`649b310`](../../commit/649b3109eea6a63dc73088f0a75df4ea6f0f5732))

- Auto-update CHANGELOG.md [skip ci] ([`07313ae`](../../commit/07313ae381624756d33f8d90290a979d3b03e70e))

- Auto-update CHANGELOG.md [skip ci] ([`d89fb76`](../../commit/d89fb7628c3ba5532af14ce9ef316d7dfe9588d4))

- Auto-update CHANGELOG.md [skip ci] ([`41a354c`](../../commit/41a354c38724e939a800fdea42bfb4311f7d7961))

- Auto-update CHANGELOG.md [skip ci] ([`86504f4`](../../commit/86504f4872c6620fe9ff86177201dfea73b75e14))

- Auto-update CHANGELOG.md [skip ci] ([`794b50e`](../../commit/794b50e925272991eb7fb7a6b7850949f3049229))

- Auto-update CHANGELOG.md [skip ci] ([`02f408c`](../../commit/02f408cffe1281391e353701550a61a8e4f9c4e0))

- Auto-update CHANGELOG.md [skip ci] ([`1cfc643`](../../commit/1cfc643791d2431c4b3f97c87dac5028598c3f4f))

- Auto-update CHANGELOG.md [skip ci] ([`ac18f6a`](../../commit/ac18f6ad35b9b8c1358b31fd2c04014674741f5d))

- Auto-update CHANGELOG.md [skip ci] ([`3d8b1de`](../../commit/3d8b1de4e6e2193be5de801c5a4b5ef9e29302e5))

- Auto-update CHANGELOG.md [skip ci] ([`7440e83`](../../commit/7440e8322c7b0e7da8a31ffbbb1ddf619a40a893))

- Auto-update CHANGELOG.md [skip ci] ([`ededb6b`](../../commit/ededb6b93522b02e0e225b63b970350d310dd0c8))

- Auto-update CHANGELOG.md [skip ci] ([`e109c95`](../../commit/e109c95990533074f7b32ecaac5192d1794f905d))

- Auto-update CHANGELOG.md [skip ci] ([`14b61dc`](../../commit/14b61dc9a86124722b4230ee3a22b438efc171ec))

- Auto-update CHANGELOG.md [skip ci] ([`09a1254`](../../commit/09a12541468238877ddb9c8a5e8ef538f428b408))

- Auto-update CHANGELOG.md [skip ci] ([`78cf7e2`](../../commit/78cf7e216964755ff68d176d0b0e70c01361145c))

- Auto-update CHANGELOG.md [skip ci] ([`0978cb8`](../../commit/0978cb8811912f61403f5cb15199f5a24f4160ef))

- Auto-update CHANGELOG.md [skip ci] ([`96bef84`](../../commit/96bef846f53002d3c8d637e795396fe6b30f12b1))

- Auto-update CHANGELOG.md [skip ci] ([`73a2fc3`](../../commit/73a2fc32d98f0fba1cc9a0561c9f34d58474edf8))

- Auto-update CHANGELOG.md [skip ci] ([`6f65ea6`](../../commit/6f65ea670192e67b9c9c7566219008543fd8901b))

- Auto-update CHANGELOG.md [skip ci] ([`8b37bbf`](../../commit/8b37bbf1fd37a748ed94303320ae8130dc0262bf))

- Auto-update CHANGELOG.md [skip ci] ([`c6c7c64`](../../commit/c6c7c64688bc20d8b0af135b7acc36e4457b79c7))

- Add emergency recovery section about permanent key loss ([`1d8f802`](../../commit/1d8f802104267b308e5ab6bf4842894e4496403e))

- Auto-update CHANGELOG.md [skip ci] ([`3651fd6`](../../commit/3651fd660a28416bb42b776a4052bff601c2b049))

- Auto-update CHANGELOG.md [skip ci] ([`806da8f`](../../commit/806da8ff966e0f1d892755508e3d69f1edd2711d))

- Add snapshot update instructions ([`7f6186a`](../../commit/7f6186a78c6a01dd0e38b92dbce373676225c497))

- Auto-update CHANGELOG.md [skip ci] ([`7f30f84`](../../commit/7f30f845bcce546a73488e15f378a497ee61c3d5))

- Auto-update CHANGELOG.md [skip ci] ([`98b9608`](../../commit/98b9608228bb49d4a2ab8bbefeda8ea1139c0da0))

- Auto-update CHANGELOG.md [skip ci] ([`b86cfe1`](../../commit/b86cfe10fd81adbe717a988f74b3e8febdc19f2e))

- Auto-update CHANGELOG.md [skip ci] ([`3095c76`](../../commit/3095c7652a9942fcbfc23f7a7435495cd275d109))

- Auto-update CHANGELOG.md [skip ci] ([`cd7650f`](../../commit/cd7650fea6c8b2f7645505353458e5c6d0d8cb81))

- Auto-update CHANGELOG.md [skip ci] ([`9cf9faa`](../../commit/9cf9faaa97fec34e7f532a865068f790452202d4))

- Auto-update CHANGELOG.md [skip ci] ([`2fd76c7`](../../commit/2fd76c7a0872682e768bb06d0b511a06a1370243))

- Auto-update CHANGELOG.md [skip ci] ([`81b919d`](../../commit/81b919d7152ed35210cd6f6d23056738ddf76cfc))

- Auto-update CHANGELOG.md [skip ci] ([`261d5f6`](../../commit/261d5f6281a52cb711dcdc549d6e8084a2b18ea7))

- Auto-update CHANGELOG.md [skip ci] ([`033f7a3`](../../commit/033f7a32e9fa2c8ac9d72684d344e08a1c1f964b))

- Auto-update CHANGELOG.md [skip ci] ([`914c72f`](../../commit/914c72ffe79395ea47f8fd2965ea1900e9c1f510))

- Auto-update CHANGELOG.md [skip ci] ([`dbeb400`](../../commit/dbeb4007050e4533b80b31dd8c2e67246fb0411e))

- Auto-update CHANGELOG.md [skip ci] ([`e3fca5f`](../../commit/e3fca5f828d9b608e06d9c4681cc5381da5411fe))

- Auto-update CHANGELOG.md [skip ci] ([`f30e7e1`](../../commit/f30e7e125cfcd9a1fcd32a1ff7a30ff28327e27a))

- Auto-update CHANGELOG.md [skip ci] ([`75074c9`](../../commit/75074c9a7160fcddaa5f8adc1d25ae11946c5ef1))

- Auto-update CHANGELOG.md [skip ci] ([`ada6b96`](../../commit/ada6b962732d5808ce0350f76055574f64a4d03e))

- Auto-update CHANGELOG.md [skip ci] ([`2b5bd65`](../../commit/2b5bd65f45eb55ef5534d7bf951e345dc508960e))

- Auto-update CHANGELOG.md [skip ci] ([`ce0cc39`](../../commit/ce0cc3991e752b191d69dc4091f8319076736068))

- Auto-update CHANGELOG.md [skip ci] ([`aeb2d39`](../../commit/aeb2d3966824bee99844d95bc2502022cb190f4e))

- Document GET /api/tokens/:id/volume and add decimals param ([`b512953`](../../commit/b5129536d0e0108978c33c1d93f53dae4ecbce8c))

- Auto-update CHANGELOG.md [skip ci] ([`0ff82b0`](../../commit/0ff82b0afa73997fface376a6441959c44ac7560))

- Auto-update CHANGELOG.md [skip ci] ([`8a5ef83`](../../commit/8a5ef8389fca5e8ec39a134e68bc9f3077fd2ddc))

- Auto-update CHANGELOG.md [skip ci] ([`3846d59`](../../commit/3846d5983235a147141d0b7341965b12303bb9ff))

- Auto-update CHANGELOG.md [skip ci] ([`e65789e`](../../commit/e65789ed540c0e4e8a424058d88eef23d566590f))

- Auto-update CHANGELOG.md [skip ci] ([`f7201b3`](../../commit/f7201b383ce7af4f9288e5087d3bd72113a40868))

- Auto-update CHANGELOG.md [skip ci] ([`2dc0400`](../../commit/2dc0400a37bd7dd94418273a2ae1abd86dd27cf5))

- Auto-update CHANGELOG.md [skip ci] ([`e3eabd2`](../../commit/e3eabd2e1d7b827fce42b24299ccbf3c47f325a7))

- Auto-update CHANGELOG.md [skip ci] ([`5d273dd`](../../commit/5d273dd1fe7383d2cfedccf43cccf53864bfddd1))

- Auto-update CHANGELOG.md [skip ci] ([`0c9ac09`](../../commit/0c9ac099ee45bfbd619c0455d6b292da263fcf4b))

- Auto-update CHANGELOG.md [skip ci] ([`4c6fcf4`](../../commit/4c6fcf4402649059fa993750584eac43dbcd7187))

- Auto-update CHANGELOG.md [skip ci] ([`b031ae7`](../../commit/b031ae7d10100b2a0e2bb5d4ae558d28d2965481))

- Auto-update CHANGELOG.md [skip ci] ([`3d538ec`](../../commit/3d538ec8e415785667740a702d09681f3b5aa3f3))

- Auto-update CHANGELOG.md [skip ci] ([`a951154`](../../commit/a95115440341111dd1c03dec58e94b8a7f810566))

- Auto-update CHANGELOG.md [skip ci] ([`fe6b590`](../../commit/fe6b590e8af9352bdec58a86ed65e447b403abbb))

- Auto-update CHANGELOG.md [skip ci] ([`cbaa3b9`](../../commit/cbaa3b99d8819537d2b1eec0794c4853e1726690))

- Auto-update CHANGELOG.md [skip ci] ([`07fedca`](../../commit/07fedca8254be28b38f5dd745581b05a02e4a2e4))

- Auto-update CHANGELOG.md [skip ci] ([`174d064`](../../commit/174d0645d2f1d14d56d3bf38fe6bde255e41520c))

- Auto-update CHANGELOG.md [skip ci] ([`c76b2f6`](../../commit/c76b2f6b16e1e36518bc31bc7b882e579afd63e7))

- Auto-update CHANGELOG.md [skip ci] ([`c72538b`](../../commit/c72538b09a9fcef2c86c50026af99e3d6705245d))

- Auto-update CHANGELOG.md [skip ci] ([`6cd5c41`](../../commit/6cd5c41f21f1399094420f1a03251b7924386e62))

- Auto-update CHANGELOG.md [skip ci] ([`90304fb`](../../commit/90304fb2a734e9e4f64660d636d42f6a79576cdb))

- Auto-update CHANGELOG.md [skip ci] ([`bcd14c7`](../../commit/bcd14c7dcd79720c93033f0414469926f468a40f))

- Auto-update CHANGELOG.md [skip ci] ([`b99cbce`](../../commit/b99cbce6f39353cbb35e53db58021846fb2f3ad9))

- Auto-update CHANGELOG.md [skip ci] ([`b0178f9`](../../commit/b0178f92e59be41908343c246fa84d333f4f7987))

- Auto-update CHANGELOG.md [skip ci] ([`2f01e74`](../../commit/2f01e7440fb80286f823cee453cfe22aeb4e6553))

- Auto-update CHANGELOG.md [skip ci] ([`64c2488`](../../commit/64c2488417fa0d6f93df6d6dc8b500cab5b767db))

- Auto-update CHANGELOG.md [skip ci] ([`193eeee`](../../commit/193eeee984e6e2cf5193124884bae892d6d428d9))

- Add issue and PR templates ([`a63913f`](../../commit/a63913ff65e8116ff4fdde38bbed0774001f6d9e))

- Fill TEAM.md with Sunday Abel's real information ([`93c8347`](../../commit/93c8347905599d235cf94ec8b8d7ca488ab370e4))

- Fill TEAM.md with real team information ([`d45fdb4`](../../commit/d45fdb41136db37d887b1fdf8159721ecb01b6b4))


### Features

- Add SEP-41 token metadata endpoint ([#816](../../issues/816)) ([`77ee7d8`](../../commit/77ee7d8bd455a71a0235b348d35bef8f197496fb))

- Add onchain_seq nullable column to events table ([#828](../../issues/828)) ([`02757a5`](../../commit/02757a5ed2e1e4324ee70cf1f8ac8ebefc4e9883))

- onchain_seq BIGINT column declared in migration 1 (CREATE TABLE)
  - Idempotent ALTER TABLE ADD COLUMN IF NOT EXISTS in migration 2
  - db.upsertEvent() persists ev.onchain_seq ?? null as $10 parameter
  - Expand README two-sentence note into a full 'Event sequence namespaces'
    section with a comparison table documenting seq vs onchain_seq

  Closes [#828](../../issues/828)


- Add NotFound page with home link and catch-all route ([#826](../../issues/826)) ([`c5d060f`](../../commit/c5d060f7281b99e531072c641f3eeb2ded023a0b))

- Add NotFound page component with 404 heading and Go to Home link
  - Text suggests checking the URL and trying again
  - Use semantic <main> element with aria-labelledby for accessibility
  - Register catch-all path="*" route in App.tsx to render NotFound

  Closes [#826](../../issues/826)


- Document admin key loss recovery, add burn_from decoder, cache invalidation, and volume metadata warning ([`4ded529`](../../commit/4ded5297828e1097f9a0880d91ceb99ae2ffb0ab))

- SECURITY.md: expand Emergency Recovery to document consequences of losing
    the admin key (permanent un-administrability), prevention (hardware wallet,
    multi-sig), and the redeployment migration procedure for registered contracts
  - decoder: add burn_from SEP-41 case and export evictContractMeta for ABI
    cache invalidation
  - index: handle explorer 'update' events to evict stale ABI cache entries
    near-instantly instead of waiting for the 60s LRU TTL
  - api: log a warning and add metadata_warning field to /api/tokens/:id/volume
    when token metadata fetch fails and decimals default to 7
  - tests: add decoder coverage for burn_from and cache eviction


- Cache distinct functions with 60s TTL ([`4db23da`](../../commit/4db23dace61a67f5958f7ca3df211c840149c0bb))

- Persist onchain_seq and submit events to contract ([`e9592ee`](../../commit/e9592ee8f3e61e37766ed13b3251d05100baefb2))

Implements [#322](../../issues/322) and [#323](../../issues/323):
  - Update db.upsertEvent() to accept and persist onchain_seq from contract submissions
  - Create contract.js with submitEvent() function to call soroban contract
  - Update indexer to submit each decoded event to on-chain ExplorerContract
  - Capture returned onchain_seq and store it in database
  - Add tests for onchain_seq persistence

  The indexer now populates the on-chain EventDecoder contract, enabling
  cross-referencing between off-chain DB events and on-chain contract state.


- Add Phoenix ABI fixture and auto-register fixtures at startup ([`7eb7434`](../../commit/7eb743476e12058962652e99d406f76925960ccf))

Add a Phoenix DEX ABI fixture (phoenix-abi.json) alongside the existing
  StellarSwap and Blend fixtures, and register all ABI fixtures automatically
  during indexer startup. This satisfies ROADMAP deliverable 2.5 (ABI metadata
  for live testnet DEX/lending contracts) and extends decoded coverage to the
  third major Stellar DEX.

  Registration uses the existing idempotent upsertContractMeta path and tags
  each row registered_by="fixture".

  Closes [#381](../../issues/381), [#384](../../issues/384), [#380](../../issues/380), [#378](../../issues/378)


- Add SEP-41 approve decode case ([`862be45`](../../commit/862be450940e15799515f5d00d2d504d19bb749f))

Add a dedicated buildDescription case for the SEP-41 approve function so
  allowance flows (DEX router approvals, lending authorizations) render as
  'Address GA... approved GA... to spend on <contract>' instead of a generic
  function call.

  Closes [#402](../../issues/402), [#404](../../issues/404), [#397](../../issues/397), [#403](../../issues/403)


- Add dedicated expand button for long descriptions in EventTable ([`1a14bf3`](../../commit/1a14bf3abef7b40285eac0201fe2eeb8ff9d55ac))

- Add Docker Compose health checks for indexer and frontend services ([`dd0f0b0`](../../commit/dd0f0b07d3ddc3ec524bcdc9ae34a0963e84b738))

- Add GET /api/events/stream SSE endpoint and streamEvents frontend client helper ([`8b09874`](../../commit/8b098743013c3ade80ebfcb8bf86d42fe0b385b3))

Closes [#413](../../issues/413)


- Add Kubernetes deployment manifests and guide for indexer and frontend ([`8d4b8d3`](../../commit/8d4b8d35d79bf38976c77b6fe25c772635cee869))

Closes [#341](../../issues/341)


- Add Contracts directory page with debounced search ([`4a1062a`](../../commit/4a1062a207c67ec154515e7f038dec98ce460b3c))

- Add Contracts link to nav ([`5198fac`](../../commit/5198fac464dc43898374b96135542069b6eeb18c))

- Add /contracts route ([`c1cc83a`](../../commit/c1cc83ab64192a625fba7af771ae18882f628e99))

- Add frontend api.contracts() search helper ([`f880b57`](../../commit/f880b57dc0284ba64de3bf0296e7893002dcdadb))

- Add GET /api/contracts list endpoint with q param ([`49ee764`](../../commit/49ee764a893a5c9798c6b9b1a6957c43688bcef8))

- Add db.getContracts with name/description search ([`480e135`](../../commit/480e135d8a457ac459b77e8d4933157fd217d373))

- Add transfer_from case to buildDescription ([`dd4d9dd`](../../commit/dd4d9ddc6567d86df7956fd9fa05d3b204dbb174))

- Add make db target for PostgreSQL container ([`c91e6ee`](../../commit/c91e6ee080d6e4a467917e53cf0b778640500ec2))

- Add ContractPage ABI registration form for new contracts ([`cb7031c`](../../commit/cb7031ca20af229eb5cda50f877135700224371b))

When navigating to an unregistered contract ID, render a registration form
  (name, description, functions) instead of the static 'Contract not found.'
  message. Submitting the form calls api.registerContract() and invalidates
  the contract query cache so the metadata view renders immediately.

  - Added RegistrationForm component with field validation
  - Name field is required; description and functions are optional
  - Functions list supports add/remove with name + description per entry
  - Existing registered contracts are unaffected


- Add robots.txt and SEO metadata tags ([`b0a44b9`](../../commit/b0a44b9c791fea500efc5fce5d300df1a02124e0))

- Add GET /api/events/:seq/raw endpoint returning un-decoded XDR topics ([#347](../../issues/347)) ([`4fad1ff`](../../commit/4fad1ffa698ff16b57dcbbef5931e5df4372cd13))

- Add GET /api/stats endpoint returning total events, contracts, and unique addresses ([`7e85094`](../../commit/7e850948f004cf2aa468738f065e793f125413d8))

- Add Blend protocol ABI fixture and decoders for supply, borrow, repay, liquidate ([`c1afa70`](../../commit/c1afa7024c7b2fc849fdb235d6dd41168a7cfa79))

- Add GET /api/tokens/:id/metadata endpoint for SEP-41 token info ([`cf64494`](../../commit/cf644946ab35832fa9aac190439f167a8d816dfa))

- Add GET /api/contracts/:id/events endpoint ([#349](../../issues/349)) ([`dd1586e`](../../commit/dd1586ec51b4eaeba5fba15b1db67ea59d00fcda))

- Expose list of all registered contract IDs ([`86853e7`](../../commit/86853e7234fed2f523b18b6435f9f021f320660d))

- Add DataKey::ContractList to store Vec<BytesN<32>> of registered contracts
  - Append contract ID to list on every register_contract call
  - Add get_contracts() function to return all registered IDs
  - Add test_get_contracts_lists_registered_ids test

  Closes [#18](../../issues/18)


- Add end-to-end tests verifying full pipeline (contract → indexer → API → frontend) ([`b774907`](../../commit/b774907e44bc12dfc98166ccb479dac83c91db7a))

Adds a tests/e2e/ directory with Playwright-based E2E tests that:

  - Start a full local stack via Docker Compose (postgres + indexer + frontend)
    with a Stellar Soroban sandbox (stellar/quickstart)
  - Build and deploy the ExplorerContract WASM to the sandbox
  - Initialize the contract and register ABI metadata
  - Submit a test event via the contract's submit_event function
  - Wait for the indexer to poll and decode the event
  - Verify the event appears in the REST API
  - Assert the frontend renders the decoded description
  - Test navigation to event detail and contract pages
  - Verify pagination controls are functional

  The test infrastructure includes:
  - docker-compose.e2e.yml       — Extended stack with Soroban sandbox
  - helpers/deploy.js             — Automated contract deployment + seeding
  - fixtures/explorer-abi.json    — ABI fixture for the ExplorerContract
  - e2e.test.js                  — 7 Playwright test cases
  - playwright.config.ts          — Playwright configuration
  - package.json                 — Dependencies (@playwright/test, @stellar/stellar-sdk)
  - Makefile targets             — e2e-setup, e2e-build, e2e-up, e2e-down,
                                    e2e-deploy, e2e-test, e2e, e2e-ci
  - CI job in ci.yml             — Full E2E on PR/push to main

  closes [#109](../../issues/109)


- Add database backup script and documentation ([`aeb57d5`](../../commit/aeb57d5ed4f50e45ad3fb210f3fd7052d7108286))

Add automated PostgreSQL backup via scripts/backup.sh using pg_dump
  with configurable retention. Document daily cron job, restore
  procedure, and cloud deployment backup options (RDS, Cloud SQL).

  Closes [#106](../../issues/106)


- Add CI pipeline, Docker Compose infrastructure, and frontend containerization ([`99a233a`](../../commit/99a233a5e5a70cf17f53f05e8a956393bf6b048c))

- Add CHANGELOG, JSDoc types, Node version enforcement, and linting ([`b47f6dd`](../../commit/b47f6dd58d2b4e6997f1e52781c3ac4ebad33ccc))

Add automated changelog generation:
    - cliff.toml: git-cliff config following Keep a Changelog format
    - CHANGELOG.md: seeded from git history, auto-updated on push via GitHub Actions
    - .github/workflows/changelog.yml: auto-commit CHANGELOG.md when conventional commits are pushed
    - make changelog: local regeneration target

  Add shared type definitions via JSDoc:
    - indexer/src/types.js: DecodedEvent, ContractMeta, HealthState, VolumeResult typedefs
    - decoder.js, db.js, index.js: annotated with @typedef imports and full @param/@returns
    - indexer/jsconfig.json: enable checkJs and strictNullChecks for editor type checking

  Enforce Node 20+:
    - indexer/package.json: add engines field
    - indexer/.npmrc: engine-strict=true to fail npm install on old Node

  Add code quality tooling:
    - indexer/eslint.config.js: ESLint 9 flat config (eslint:recommended + strict rules)
    - indexer/.prettierrc: consistent formatting (2 spaces, double quotes, trailing commas)
    - indexer/package.json: add lint, format, format:check scripts
    - Formatted all indexer/src/**/*.js for style consistency

  Update documentation:
    - README.md: add CHANGELOG.md link to SCF documents table
    - Makefile: add changelog target


- SAC detection, SEP-41 metadata fetcher, compliance validator, 24h volume endpoint ([`057cf07`](../../commit/057cf0757b4973bea27ef31f6d314aec26850023))

- sac.js: detect SAC bridge contracts, append classic asset code in descriptions
  - sep41Metadata.js: fetch name/symbol/decimals via simulateTransaction (read-only)
  - validateSep41.js: simulate all 10 mandatory SEP-41 functions, return compliance bool
  - db.js: get24hVolume() aggregates transfer events with NUMERIC precision
  - api.js: GET /api/tokens/:id/volume returns 24h rolling volume, zero float rounding


- Implement ScVal→JS converter and ContractAuth decoder ([`ff28c8a`](../../commit/ff28c8affce32c1d63ed0d61573fa62343e6d69c))

Closes [#3](../../issues/3) — Parse ScVal Types to Native JavaScript Types
  Closes [#4](../../issues/4) — Extract and Decode ContractAuth Arrays

  ---

  ## Issue [#3](../../issues/3) — ScVal to Native JS Type Converter (indexer/src/scval.js)

  ### Problem
  The existing decoder.js called scValToNative() from @stellar/stellar-sdk directly,
  which works for simple cases but loses precision on large integers (i64/u64/i128/u128/
  i256/u256) because JavaScript's Number type only has 53 bits of safe integer precision.
  There was also no centralised, well-typed utility that the rest of the codebase could
  import for consistent ScVal handling.

  ### Solution
  Created indexer/src/scval.js exporting a single function scValToJs(val).

  How it works:
  - Switches on val.switch().name to handle every ScVal variant explicitly.
  - Primitive types (bool, void, u32, i32, string, symbol, bytes) map directly to their
    JS equivalents.
  - Large integer types (u64, i64, timepoint, duration, u128, i128, u256, i256) are
    returned as native BigInt values, reconstructed from their hi/lo word pairs using
    bitwise shift operations, preventing any precision loss.
  - scvVec recursively maps each element through scValToJs, producing a plain JS array.
  - scvMap iterates the key/value pairs and builds a plain JS object, with keys coerced
    to strings.
  - scvAddress decodes both scAddressTypeAccount (Ed25519 public key → G... address via
    StrKey.encodeEd25519PublicKey) and scAddressTypeContract (contract hash → C... address
    via StrKey.encodeContract).
  - Ledger key and contract instance variants return descriptive sentinel objects rather
    than throwing.
  - Unknown/unhandled variants fall back to String(val) so the function never throws a
    runtime error, satisfying the acceptance criterion.

  ---

  ## Issue [#4](../../issues/4) — ContractAuth Array Extractor/Decoder (indexer/src/auth.js)

  ### Problem
  When a Soroban transaction is submitted, the InvokeHostFunctionOp XDR contains an
  auth[] vector of SorobanAuthorizationEntry objects. These entries record exactly which
  addresses authorised the invocation, the replay-prevention nonce each signer used, and
  the full tree of contract function calls being authorised. None of this was surfaced by
  the indexer, making it impossible to display authorisation information in the explorer.

  ### Solution
  Created indexer/src/auth.js exporting extractContractAuth(input).

  How it works:
  - Input flexibility: accepts either a base64 XDR string (TransactionEnvelope or bare
    Operation) or an already-parsed InvokeHostFunctionOp object. The function tries to
    parse as a full envelope first, then falls back to a bare operation, so callers do
    not need to pre-parse.
  - Auth entry decoding (decodeAuthEntry): inspects the credentials discriminant.
    - sorobanCredentialsAddress: extracts the signer address (account → G... string,
      contract → C... string) and the nonce as a BigInt.
    - sorobanCredentialsSourceAccount: signer and nonce remain null (source account
      authorisation carries no explicit address/nonce fields).
  - Invocation tree decoding (decodeInvocation, recursive): decodes the rootInvocation
    and all nested subInvocations into plain objects containing:
    - type: 'contractFn' | 'createContract' | raw discriminant name
    - contractId: C... encoded contract address
    - functionName: string name of the authorised function
    - args: array of native JS values produced by scValToJs (reuses issue [#3](../../issues/3) utility)
    - subInvocations: recursively decoded child invocations
  - Return shape per entry: { signer, nonce, rootInvocation } — directly satisfying the
    acceptance criteria of exposing the signer address, the nonce, and the root function
    call authorised


- Add XDR ContractEvent decoder utility ([`27f0a64`](../../commit/27f0a64fc7a9dfaced7942c6d5847cf4f643f7a8))

- Add indexer/src/xdr_decoder.js: decodeContractEvent(base64Xdr)
    decodes a raw ContractEvent XDR string into { contractId, type,
    topics, value } using @stellar/stellar-sdk xdr + scValToNative.
    Handles SYSTEM, CONTRACT, and DIAGNOSTIC event types. BigInt values
    are serialised as strings for JSON safety.

  - Add indexer/test/xdr_decoder.test.js: 5 unit tests covering all
    three event types, required-field presence, and BigInt serialisation.

  - Add "test" script to indexer/package.json (node --test)


- Add full Soroban Smart Block Explorer ([`90eb8a3`](../../commit/90eb8a37521e0e8efb3a6bc1a6da83c755298a8f))

- Soroban smart contract (ContractRegistry + EventDecoder)
  - Node.js indexer: Soroban RPC polling, XDR decoder, PostgreSQL, REST API
  - React frontend: Home, ContractPage, WalletPage, EventPage
  - SCF submission docs: ROADMAP.md, BUDGET.md, TEAM.md, MANIFEST.md
  - stellar.toml, Makefile, .env.example, LICENSE, .gitignore



### Miscellaneous

- Finalize issue [#752](../../issues/752)-[#755](../../issues/755) fix tracking ([`02d8e36`](../../commit/02d8e36ab30abe8437a82e9815e39f02056d1938))

- Resolve maintenance issues 372 through 375 ([`bba5bb7`](../../commit/bba5bb70d9af7c6d34d3ea26cd144952dcd01a2f))

- Add governance, security, and development guidelines ([`5a1beab`](../../commit/5a1beab905033480fd579388b275e34fef45d31f))

- Add CONTRIBUTING.md with dev environment setup, branch naming convention,
    conventional commit format, PR checklist, code style standards, and bug
    report template
  - Add SECURITY.md with vulnerability disclosure process, supported versions,
    response timelines (24h acknowledgment, 72h triage), and responsible disclosure
    guidelines
  - Complete SEP-1 stellar.toml with mandatory fields: SIGNING_KEY, DOCUMENTATION
    (ORG_NAME, ORG_GITHUB, ORG_DESCRIPTION, ORG_URL, ORG_SUPPORT_EMAIL), and
    PRINCIPALS metadata. Include signing instructions for file verification.
  - Set NODE_ENV=production in Makefile indexer target to enable production
    optimizations in pino, express, and other Node.js libraries



### Testing

- Transfer sends amount in event data per SEP-41 ([`5d467db`](../../commit/5d467db96421d79e171922ec8155cdbdfd227e2a))

- Add WASM sandbox integration test stubs ([`34a2dba`](../../commit/34a2dba4cf9dec0223758b8b5891a33584a9b96a))

Add a tests/integration/ directory with stub tests that document the
  intended integration test flow for the explorer contract deployed to a
  real Stellar CLI sandbox.  No WASM is compiled and no sandbox is
  required to run the stubs.

  Files added:
  - tests/integration/README.md         — setup instructions
  - tests/integration/run_integration.sh — shell CLI test harness
  - tests/integration/rust/Cargo.toml   — standalone test crate
  - tests/integration/rust/src/lib.rs   — Rust stub tests

  Closes [#24](../../issues/24)
  Closes [#25](../../issues/25)
  Closes [#27](../../issues/27)
  Closes [#28](../../issues/28)


- Add full test coverage for decoder, scval, sac, auth, sep41Metadata, validateSep41, db ([`2bbd439`](../../commit/2bbd439e443d94e48b205c6bbce641442f323c1b))

- Add indexer/test/decoder.test.js (10 tests)
  - Add indexer/test/scval.test.js (38 tests, all ScVal types + BigInt edge cases)
  - Add indexer/test/sac.test.js (13 tests, real XLM SAC contract ID on testnet)
  - Add indexer/test/auth.test.js (20 tests, pre-built base64 XDR fixtures)
  - Add indexer/test/sep41Metadata.test.js (6 tests, stubbed simulateTransaction)
  - Add indexer/test/validateSep41.test.js (8 tests, stubbed simulateTransaction)
  - Add indexer/test/db.test.js (20 tests, pg.Pool monkey-patched)

  Bug fixes in source modules:
  - Fix invalid DUMMY_SOURCE strkey in src/validateSep41.js (crashed at module load
    when Address.fromString() validated the checksum)
  - Fix invalid DUMMY_SOURCE strkey in src/sep41Metadata.js (crashed new Account())



### Contracts/explorer

- Enforce MAX_DESCRIPTION_LEN in submit_event ([`fa73dd0`](../../commit/fa73dd0aa7215a5fa8db77b0ee56909b6f076555))


### Indexer

- Treat 'function not found' as missing in validateSep41 ([`8c3d338`](../../commit/8c3d338dafb16a53a8035b1db346a5ea28bc3723))



