# SOTA Museum Admin

Vietnamese administrator frontend for the SOTA museum MVP. It provides a browser demo with sample accounts, museum-scoped records, catalog editing, admissions, fulfillment and statistics.

The current version uses in-memory fixtures. Reloading the page resets records, uploaded file references and the selected account. Signing out clears the account and selected museum while retaining sample records in the current tab.

## Open the demo

Open [index.html](index.html) in Microsoft Edge or Chrome. The checked-in JavaScript runs directly from disk, so you can try the demo immediately.

1. Choose **Quản trị bảo tàng** and select **Tiếp tục**.
2. Select **Bảo tàng Mỹ thuật**.
3. Select **Mở không gian quản trị**.

| Sample account | Access |
| --- | --- |
| Quản trị bảo tàng (`admin_user`) | Manage Bảo tàng Mỹ thuật through active museum membership |
| Quản trị hệ thống (`super_admin`) | Manage both sample museums and create museums |
| Khách tham quan (`normal_user`) | Display the administrator access-denied state |

Account selection simulates authorization for this local demo. Live authentication and server authorization require backend integration.

## Features

| Screen | Available actions |
| --- | --- |
| Tổng quan | View ticket sales, simulated ticket revenue and orders awaiting shipment |
| Bảo tàng | Edit museum details and publication status, create a museum as a system administrator |
| Hiện vật | Create and edit artifacts, validate inventory codes, import repeatable Smithsonian sample fixtures |
| Triển lãm | Edit dates and publication status, attach or remove same-museum artifacts |
| Loại vé | Edit ticket prices and sales availability |
| Soát vé | Filter ticket orders, inspect purchases, redeem an entry code and cancel an eligible future visit |
| Lưu niệm | Maintain souvenir products, prices, SKU and stock |
| Đơn hàng | Inspect order snapshots, advance fulfillment and cancel an eligible order |
| Thư viện media | Preview and attach local files, change sort order and primary status, confirm removal |
| Thống kê | Filter paid ticket sales by transaction date and exhibition, view daily totals |

Money is displayed in VND. Visit-day checks use `Asia/Ho_Chi_Minh` (UTC+7). Museum publication uses `draft`, `published` and `archived`. Shop fulfillment follows `confirmed → shipped → completed`. Cancelling a confirmed shop order restores stock once.

Media accepts JPEG, PNG and WebP images up to 10 MB, and MP4 and WebM videos up to 50 MB. Files are attached to an artifact or souvenir within the selected museum and previewed through temporary browser object URLs.

Exhibitions, Smithsonian sample imports and exhibition statistics are course simulations. Their backend routes are pending definition in the referenced contract. Configurable capacity, exhibition ticket sales, audio, catalog hard deletion, role provisioning and live payments are outside the current demo scope.

## Develop and verify

Use Node.js 22.12+ or Node.js 24 with npm. Run commands from this directory.

```powershell
git clone https://github.com/DoranUwU/sota-frontend.git
cd sota-frontend
npm ci --ignore-scripts
npm run typecheck
npm test
```

If your terminal already opens in the frontend directory, begin with `npm ci --ignore-scripts`. In the original course workspace, that directory is named `museum-admin`.

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Check the TypeScript mock service |
| `npm run build` | Compile `mock.ts` into the browser's `mock.js` |
| `npm test` | Compile the mock service and run its Vitest cases |
| `node browser-smoke.mjs` | Exercise the local HTML through headless Microsoft Edge |

Rebuild after editing `mock.ts`, then reload the page. Edits to `app.js` or `style.css` take effect after a reload.

The browser smoke test uses an installed Edge browser. To select another installed Chromium browser, set its executable path in PowerShell before running the test.

```powershell
$env:SOTA_BROWSER_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node browser-smoke.mjs
```

The smoke test exercises sample account access, museum selection, artifact editing, duplicate imports, exhibition links, ticket redemption, fulfillment, media and museum creation. It checks the dashboard, artifacts and statistics screens for horizontal overflow at widths of 360, 768 and 1366 pixels. Page errors and HTTP requests fail the test.

Vitest covers permissions, membership revocation, validation, attribution preservation, ticket redemption, order transitions, stock restoration, reporting and media operations. These checks exercise local fixtures. Backend transaction and integration verification belongs to the backend test suite.

## Manual demo scenarios

Start each independent scenario after reloading and entering Bảo tàng Mỹ thuật.

1. **Duplicate import** — Open **Hiện vật**, select **Nhập mẫu Smithsonian** and import two samples twice. Expect two additions first, then two skips. Editing a sample preserves its source attribution.
2. **Admission** — Open **Soát vé** and redeem `SOTA-101`. A second attempt shows a repeated-use error. `SOTA-102` is dated tomorrow and fails today's admission check.
3. **Fulfillment** — Open **Đơn hàng**, inspect `SHP-201` and advance it to **Đang giao**, then **Đã giao**.
4. **Cancellation** — On fresh fixtures, cancel `SHP-201` while confirmed. The postcard stock in **Lưu niệm** increases from 18 to 20.
5. **Statistics** — The initial museum has three paid tickets totaling 180,000 VND. Filtering transaction dates to tomorrow shows the empty state. One ticket's future visit date is independent of its transaction date.
6. **Museum isolation** — Sign out and choose **Quản trị hệ thống**. Switch to Bảo tàng Di sản and verify its catalog contains **Ấn triện**.

## Project files

| File | Responsibility |
| --- | --- |
| [index.html](index.html) | Browser entry point and shared dialog |
| [style.css](style.css) | Responsive layout, typography and interaction styles |
| [app.js](app.js) | Screens, forms, navigation and event handling |
| [mock.ts](mock.ts) | Typed fixture data, validation and simulated domain operations |
| [mock.js](mock.js) | Compiled service loaded before `app.js` |
| [mock.test.mjs](mock.test.mjs) | Isolated Vitest service tests |
| [browser-smoke.mjs](browser-smoke.mjs) | Local browser workflow checks |
| [tsconfig.json](tsconfig.json) | TypeScript configuration for the mock service |

## Design and backend references

The Figma file contains ten main administrator views and six additional task frames. [Editable design](https://www.figma.com/design/Oeu1JMIB2X7QV8vmLI0X9F/Sota-museum-admin?node-id=4-761), [prototype entry](https://www.figma.com/proto/Oeu1JMIB2X7QV8vmLI0X9F/Sota-museum-admin?node-id=8-2&starting-point-node-id=8%3A2).

Follow the backend authentication guide, API contract and database design. Confirm route readiness against the backend roadmap before integrating. These references live in the backend repository. [Authentication guide](https://github.com/zetomis-was-taken/sota-backend/blob/main/docs/auth-guide.md), [API contract](https://github.com/zetomis-was-taken/sota-backend/blob/main/docs/api-contract.md), [database design](https://github.com/zetomis-was-taken/sota-backend/blob/main/docs/database-design.md), [backend roadmap](https://github.com/zetomis-was-taken/sota-backend/blob/main/TODO.md).

For future live integration, obtain sessions through Supabase Auth with its publishable key. Send the access token as a Bearer token to Express under `/api/v1`. Fetch roles and active museum memberships from `GET /api/v1/me` on login, focus and reload. Express must enforce permissions, calculate amounts and own transactional operations. Keep database and privileged storage credentials on the server. Handle expired sessions through refresh or sign-out, and remove museum access when the server returns a permission denial.
