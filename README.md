# Bargetown Market · StockSense

Open `index.html` in the project root to access the page from Ship Studio's files.

Ship Studio manages the dev server at http://localhost:3000 using the `dev` script.
For manual development outside Ship Studio, run `npm.cmd run dev` on Windows.
Run `npm.cmd run build` to copy the page into `dist` for hosting.

The mockup is personalized for Bargetown Market, 330 Main Street, Evansville, Indiana 47708. Overview shows two practical lists: daily in-store prep with completion checkboxes, and low-stock products with delivery-comparison links. Owners can add their own prep tasks. Checkmarks and custom prep tasks are saved per local calendar day in this browser. Completing prep tracks the task only; it does not automatically change inventory quantities.

Default sandwich and fruit-cup targets are sample lunch plans, not actual sales forecasts or a verified menu. Imported inventory drives on-hand counts and restock alerts. The former weather, tariff, commodity, and seasonal-chart panels have been removed to simplify the workspace.

Run `node scripts/check-signals.mjs` to verify prep completion, undo, task persistence, custom tasks, and inventory-driven restock links.

`suppliers.html` compares Walmart, Sam’s Club, and Gordon Food Service options listed for Evansville by their official websites. Exact delivery to the market, product availability, live prices, and time slots are not connected or preverified. Users enter a quote and confirm address eligibility. Complete confirmed quotes rank by requested quantity (or supplier minimum quantity, if larger) times price per matching unit/pack, plus entered delivery fee. Sorting supports lowest total cost and fastest delivery. Tax, tips, and membership costs are excluded. Checkout takes place on the supplier website; the app never submits or marks an order placed.

The optional example-quote mode is explicitly labeled and never saves example prices over real quotes. Quotes are local browser records, not automatically refreshed supplier offers. Run `node scripts/check-suppliers.mjs` for comparison totals, fee handling, supplier minimum quantities, delivery sorting, and example-mode labeling.

Inventory is a separate page at `inventory.html`. It shows the full product list, stock counts, category totals, costs, shelf locations, and low-stock status. Search and filters only change the list; summary cards always reflect the whole store. Add/edit products or replace the starter sample inventory with a CSV import. Records persist in this browser using localStorage; export CSV for a portable copy. This is local storage, not a shared store database or live POS connection.

CSV headers: `sku,name,category,quantity,unit,unitCost,reorderPoint,location`. SKU, name, and quantity are required. Stock counts and minimum stock must be nonnegative whole numbers. SKU values must be unique. Unit cost is the cost of one listed unit/pack; inventory value is quantity times unit cost.

Run `node scripts/check-inventory.mjs` for import validation, filtering, stock status, and value calculations.
