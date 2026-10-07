# Stock Sense

A working inventory and order-management MVP for a neighborhood convenience store. The existing dependency-free HTML/JavaScript application structure is retained; the new interface uses a shared domain model and browser persistence.

## Run

- `npm.cmd run dev` starts the local app at http://localhost:3000.
- Open `/` for the public landing page; choose **Explore the demo** to open the workspace at `/#app/overview`.
- `npm.cmd run build` creates the static application in `dist/`.
- `npm.cmd install` installs the development test dependency. The app itself has no runtime package dependencies.
- `npm.cmd test` runs domain and DOM-based interface tests.

The old Inventory, Suppliers, and Checkout URLs redirect to the corresponding workspace pages. Older Bargetown prototype files remain in the repository for reference and are not part of the current application.

## Working capabilities

- Overview: derived inventory value at cost, product and low-stock counts, open sales orders, 14-day fulfilled-sales and stock-movement charts, accessible daily data tables, alerts, recent orders, activity, and quick actions.
- Inventory: product search, category/supplier/location/status filters, sorting, add/edit products, location-level quantities, movement history, reason-required physical count adjustments, and CSV export.
- CSV import: file parsing, field mapping, validation, a 10-row preview, and explicit confirmation. SKU/name/quantity are required. Optional location names must match Settings; otherwise the selected default location is used. Matching SKUs update product details and physical counts at the chosen locations. Duplicate SKU/location rows, unknown locations, invalid quantities/prices, and counts below reservations are rejected. Unmapped optional prices retain existing values. No partial import is saved when validation fails.
- Sales: customer/location/line-item order creation and exact integer-cent totals. Draft orders can be confirmed, fulfilled, or cancelled through the allowed status transitions. Confirmation reserves location-specific stock; fulfillment deducts it and releases the reservation; cancellation releases reservations. Completed/cancelled orders cannot be fulfilled again.
- Purchasing: supplier/location/line-item purchase orders, expected dates, ordered/received/outstanding quantities, partial receiving, and dated receipts. Unique delivery references prevent duplicate receiving; over-receiving is blocked. Inventory is valued at the current product unit cost; purchase costs do not automatically recalculate unit costs.
- Customers and Suppliers: searchable, editable contact records and related orders.
- Insights: fulfilled-unit rankings, no-sales inventory, sales-based stock coverage, and restock suggestions with explicit formulas and data thresholds. Recommendations are transparent rules, not AI predictions.
- Settings: business name, display currency, locations, and default reorder point for new products. Currency changes relabel amounts without converting them. Existing locations can be renamed and new ones added. Demo backup download and confirmed reset work.

## Inventory model

`stock-model.mjs` is the shared data layer. `stock()` calculates:

- **On hand:** physical quantities by product/location.
- **Reserved:** line quantities on confirmed, unfulfilled sales orders.
- **Available:** on hand minus reserved.
- **Incoming:** ordered minus received purchase quantities.

Every opening count, adjustment, receipt, fulfillment, and reservation change has a dated movement with its reason, location, and related order where applicable. Monetary amounts are stored as integer cents. Inventory value is on hand times current unit cost; reserved units remain part of physical inventory value.

Commands operate on a cloned state, validate the whole operation, then save one complete browser-storage record. Submission tokens make repeated submissions idempotent. Web Locks serialize commits across tabs on supported browsers. A storage write failure does not update the visible committed state. This is demo-level device persistence, not a production transaction system.

## Persistence and demo data

The current workspace is stored in `localStorage` under `stocksense.workspace.v3`. It seeds realistic example products, customers, suppliers, sales, a partial purchase, and movement history for **Bargetown Market**, with a sales floor and back stockroom. All headline metrics are calculated from those records. Demo contacts use example.com addresses and are not real customer records.

Refreshing keeps changes in the same browser and origin. The legacy prototype's data is left separate; it is not silently migrated. **Settings → Reset demo data** explicitly confirms replacement of the current demo. **Download demo backup** exports the entire state as JSON for records; backup restoration is not implemented. Inventory CSV can be imported through the reviewed import flow.

## Insight rules

The observation period is the lesser of 28 days or days since the workspace's observation start. Only fulfilled sales count. Reliable stock-coverage estimates require at least 14 observed days and sales on three distinct days. Otherwise the interface says **Not enough data**.

Daily rate = fulfilled units / observed days. Days remaining = available / daily rate. Restock target = larger of product reorder point or seven days of sales. Suggested order = ceiling(target - available - incoming), with a floor of zero. Without enough data, suggestions use only the reorder point. Stockouts and incomplete sales records can understate actual demand. Coverage recommendations combine locations; reservations and fulfillment enforce the chosen location's stock.

## Verification

`check-workspace.mjs` verifies the full workflow (add product, purchase, partial/full receiving, sales draft, reservation, fulfillment, movement history, inventory value, and persistent reload), plus cancellation, location-specific insufficient stock, duplicate receipt/submission handling, over-receiving, stock-adjustment reasons, cents totals, CSV validation/atomicity, and insight thresholds.

`check-interface.mjs` uses Happy DOM to exercise the actual page renderers, forms, click handlers, product/purchase/receiving/sales flow, persistence, filters, contact editing, settings, CSV mapping/preview/confirmation, and reset confirmation. These are automated DOM tests, not a visual browser test. The Ship Studio web preview was inactive during verification, so screenshots and mobile browser rendering could not be inspected. Responsive CSS and keyboard-visible focus states are implemented.

## Production infrastructure still required

A shared database, authenticated users and roles, server-side inventory transactions, audit protection, durable backups, monitored deployment, and refund/return flows are needed before using this as a shared production system. POS/payments, ecommerce, accounting, and shipping are not connected. A future integration must verify provider events, map product identifiers, and enforce idempotency on the server. Browser storage may be cleared, is device-local, and must not be treated as shared inventory truth.

## Bargetown personalization

The sample catalog includes sandwiches, wraps, fruit cups, bottled water, soda, chips, chocolate, milk, orange juice, ice, bread, and paper towels. Products, prices, sales, supplier contacts, and purchase records are examples, not a verified live store catalog. Suppliers are illustrative and not connected.

Existing untouched Harbor demo products and contacts are personalized on the next load. Custom products, custom names, stock counts, and user-created orders are preserved. The pre-personalization record is retained at `stocksense.workspace.v3.before-bargetown`. Reset seeds the Bargetown catalog.
