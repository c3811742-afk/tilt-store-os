# Plan: Branch Manager, Storekeeper, Driver, Online Orders

Branch `ops-stories`, based on Lobna's `owner-stories`. Mirrored to `tilt-store-os` after each confirmed section.
Story numbers below are the sheet rows in `docs/my-stories.md`.

## 1. What I reuse from `owner-stories` (nothing rebuilt)

- **Data:** the mock server in `shared/api` (`respond`, `mutate`, `logActivity`, `notify`), the stock ledger (`StockMovement`, `stockLevels`, `filterLevels`, `qtyAt`), and the existing records: `Transfer` (with `pickup` / `delivery` / `receipt` signatures), `Receiving`, `Batch`, `Defect`, `WriteOff`, `StockRequest`, `StockCount`, `Shift`, `ApprovalRequest`, `AppNotification`, `Sale`, `SaleReturn`.
- **Existing functions:** `decideStockRequest`, `decideCount`, `decideApproval`, `decideWriteOff`, `toTransferView`, `flagDriverMismatch`, `getItemHistory`, `lowStockRows`, `getNotifications`.
- **Seed:** the users already exist for every role. Karim Adel manages Park Mall (New Cairo), Hana Wael manages Royal Park (Sheikh Zayed), Mostafa Gamal is the Park Mall storekeeper, Hassan Ragab is the warehouse storekeeper, Mahmoud Saeed is the driver and Mariam Tamer handles online orders. Branches: Park Mall, Royal Park, Souq 7 (Jeddah), genz-s.com (online) and the main warehouse.
- **Settings:** `defaults.ts` limits: discount limits (cashier 10%, manager 25%), `refundApprovalAbove`, `stockCountApprovalAbove`, `approvalPinTries: 3`, `lowStockDefault`, and the reason lists (defect, write-off, count, approval).
- **Components:** Table, Card, StatCard, Tabs, Modal, PageHeader, FilterBar, TextField, SelectField, Badge, Notice, Menu, Icon, BarList, DetailList and the others.

## 2. Shared changes I need (additive; each needs your OK)

| # | Change | Why |
|---|---|---|
| S1 | Move `features/owner/layout/OwnerLayout` + `NotificationBell` to `shared/components/AppShell`, taking a `nav` prop. The owner passes `ownerNav`, so nothing changes for Lobna's screens. | All 5 roles use the same frame. CLAUDE.md says "second feature needs it, move it to shared". |
| S2 | `app/routing/RequireRole` (next to `RequireOwner`), plus a `SessionUser.roles` field. The sign-in page sends each role to its home and lists one demo account per role. | Today the sign-in page only lets owners in. |
| S3 | New API files in `shared/api/`: `branchScope.ts` (the signed-in user's branches, used by every call below), `branchOps.ts` (manager dashboard, staff, registers, reports), `stockOps.ts` (stock views, status changes, floor/back moves, min qty), `transfers.ts` (the full lifecycle), `counts.ts`, `receiving.ts`, `defects.ts`, `brandReturns.ts`, `onlineOrders.ts`, `approvalPin.ts`. | CLAUDE.md: "all data goes through `shared/api/`". |
| S4 | **Cost is removed on the server side.** Manager / storekeeper / driver / online calls return view types that have no cost, margin, commission or profit fields at all. | Stories 275, 471. Hiding fields in the UI isn't enough. |
| S5 | Types (optional fields only, nothing breaks): `OnlineOrder` and `BrandReturn` (new); `CashCheck` (new); `StockCount.scope` (full / brand / shelf) and `status: 'open' \| 'submitted' \| ...`; `Defect.photos`; `Receiving.consignment`; `Transfer.differenceClosedAt/ById`. | Records that don't exist yet. |
| S6 | `Database` gets `onlineOrders`, `brandReturns` and `cashChecks`. Seed data is added for each, and `mockConfig.databaseVersion` goes up, which resets saved demo data in the browser once. | Demo data for the new records. |
| S7 | `routes.manager.*`, `routes.stock.*`, `routes.driver.*`, `routes.online.*`, and text keys under `manager`, `storekeeper`, `driver`, `online` in `en.ts` and `ar.ts`. | No hard-coded paths or text. |
| S8 | New shared components (5 files each): `ScanField` (type or scan a barcode and press Enter), `SignatureForm` (quantity per product, typed full name, confirm), `ApprovalPinDialog` (PIN entry that locks after 3 tries), `PrintSheet` (print layout for notes and labels), `StatusTimeline` (transfer and order steps). | Each is used by 2+ roles. |

## 3. Screens and story map

### Branch Manager (`/manager`, `src/features/manager/`)
| Screen | Stories |
|---|---|
| Dashboard: sales / returns / net today, vs previous period, top products, contribution (units and %), needs attention | 271–275 |
| Staff: branch staff, sales per cashier, discounts per cashier | 277–279 |
| Stock: by brand/product/size/colour, floor vs back room, status tabs, low/out, other branches (quantity only), request stock, item history page | 281–287 |
| Transfers: tabs To approve / Incoming / Outgoing / Differences. Request from another branch. Detail page with timeline, approve/reject, cancel, confirm arrival, report missing/extra, close a driver difference with a note | 289–295 |
| Stock counts: start full/partial, blind option, review differences, approve within limit (above the limit goes to the owner), reason required | 297–301 |
| Defects & write-offs: report a defect (status leaves *available*), defect list, mark "to return to brand", write off lost items with a reason | 303–306 |
| Approvals: waiting list, approve/reject with a reason, phone-friendly layout, own approval PIN settings, PIN dialog (shared), blocks approving own sales, limits from settings, void a sale (reversal record), decision log | 308–321 |
| Registers & cash: open/closed registers and who is on them, cash check at any time, close a register, closing difference + note, approve the shift closing, daily closing report per payment method | 323–329 |
| Reports: daily sales (all completed sales), returns & exchanges | 331–332 |
| Alerts: bell + notifications page (low stock, approval waiting, transfer arrived, stock request decided) | 334–337 |

### Storekeeper (`/stock`, `src/features/stock/`)
| Screen | Stories |
|---|---|
| Home: today's tasks (transfers to prepare, deliveries to receive, defective returns from cashiers, low on floor) | entry to all |
| Receiving: list. New receiving: brand + branch, batch, expected vs received per variant, scan or type, missing/damaged, add a new size/colour/barcode, consignment, courier signs then storekeeper countersigns, confirm (adds accepted stock). Detail: print receiving note, print labels and price tags | 443–454 |
| Inspection & defects: split a delivery into accepted/defective, report a defect (product, qty, type, reason, notes, photos, who pays), defects found later against the batch, inspect customer returns | 456–461 |
| Stock: levels by brand/product/size/colour, pieces per brand, item page (set status, move floor ↔ back room, min quantity per branch, full history, other branches + online). No quantity edit anywhere | 463–471 |
| Stock counts: scan to count, one brand or shelf at a time, differences with reasons, submit to the manager | 473–476 |
| Transfers: request from another branch, approved list, warehouse dispatch from approved stock requests ("X of Y to store A"), create + scan items, assign a driver, hand over (driver signs), send (in transit), print transfer note, receive and sign (received / defects / missing per product; accepted stock added, defects recorded against the batch), extra/damaged, Egypt ↔ Jeddah | 478–491 |
| Returns to brand: create with a return note, cashier-submitted defective items (brand-defective → brand, store-damaged → warehouse), record a replacement or credit, stock goes down | 493–496 |
| Alerts: low stock per item and size, low on floor but in back room, transfer ready to prepare, defective item from a cashier | 498–501 |

### Driver (`/driver`, `src/features/driver/`, built for phones)
| Screen | Stories |
|---|---|
| My jobs: only transfers assigned to me | 506 |
| Job page: pickup signature (qty per product; saved with date, time, driver, storekeeper), delivery signature at the store (difference flagged to the manager and owner) | 507–508, 510–512 |
| Alerts: new assignment | 514 |

### Online orders (`/online`, `src/features/online/`)
| Screen | Stories |
|---|---|
| Orders: tabs New / Packed / Shipped / Delivered / Cancelled / Returns. New orders arrive from the mock feed | 531 |
| Order page: fulfilment location, mark packed / shipped / COD paid, cancel (stock released), return | 534–539 |
| Online stock: what the website shows (available minus reserved), updates live | 532–533 |

## 4. Build order

0. **Foundation:** S1, S2, S7 skeleton, `branchScope`, empty home page per role. `npm run check` must pass, and the owner screens must still work.
1. **Branch Manager**, section by section in sheet order (dashboard → … → alerts).
2. **Storekeeper**, in sheet order.
3. **Driver**.
4. **Online orders**.

After each section: tick the stories in `my-stories.md`, `npm run check`, check EN/AR, light/dark, phone/desktop, and report to you. After you confirm: commit, mirror to TILT, push, PR.

## 5. Status (2026-11-07)

All 127 stories are built and ticked in `my-stories.md`. `npm run check` passes. Each role was tested in the browser
(EN and AR), including a full transfer across storekeeper → sending manager → driver → receiving manager.

### For the Cashier teammate (the till)
- **Manager approval at the till (row 309):** create the request with `requestTillApproval({ branchId, kind, summary, amount, percent })`
  (it routes to the manager or, above their limit, the owner, and alerts them), then open `<ApprovalPinDialog approvalId branchId />`.
- **Defective customer returns (rows 461, 494, 501):** record returned pieces with status `pendingInspection`
  (movement `kind: 'return'`), then call `alertDefectiveReturn(branchId, variantId)`. The storekeeper inspects them.
- **Low-stock alerts (rows 334, 498, 499):** after a checkout, call `checkStockAlerts(branchId, variantIds)` (the live demo already does).

### Shared code added or moved (see the plan's section 2)
- Moved from `features/owner` to `shared`: the app frame (`AppShell` + bell), `useAlertText`, `useChange`, the
  reference selects and `PerRecord`. The owner screens import them from their new place; nothing looks different.
- New in `shared/api`: branch-scoped calls for staff (`branch*.ts`, `transfers`, `counts`, `receiving`,
  `brandReturns`, `onlineOrders`, `stockAlerts`, `storekeeperToday`). None of them return cost, margin or profit.
- Small changes to Lobna's code: `decideStockRequest` now alerts the requester and the warehouse storekeepers;
  `decideApproval` handles transfer approvals; `listCounts` and the counts report skip counts still being counted;
  `getReferenceData` adds each brand's defect policy; `products.ts` exports `checkUnique` and `freshBarcode`.
- `mockConfig.databaseVersion` is 9 (the browser's saved demo data resets once).
- After review: the Sheikh Zayed branch is renamed **Arkan** (seed, `b-royal-park` id kept); branch managers only see store
  branches (not genz-s.com); the sign-in page lists every store's branch manager with the branch name;
  `mockConfig.databaseVersion` is 10.
- Transfers after review: on approval, the receiving branch's storekeepers are alerted too and see it under Incoming;
  the requester's alert links to their own screen; the sign-in page lists a storekeeper for every branch and the warehouse.
