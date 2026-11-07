# My stories

Source: `docs/TILT GENZ Requirements.xlsx`, tab "Final". Wording is copied exactly from the sheet. Row numbers are the sheet rows.

Total: 127 stories.

## Branch Manager (58 stories)

### Branch Dashboard

- [x] A branch manager can view their branch's sales for today, returns and net sales _(row 271)_
- [x] A branch manager can compare today and this week with the previous period _(row 272)_
- [x] A branch manager can view their branch's top-selling products _(row 273)_
- [x] A branch manager can see each product's contribution to their branch's sales (units and %) _(row 274)_
- [x] A branch manager cannot see cost, margin, commission, profit or any other branch's data _(row 275)_

### Staff

- [x] A branch manager can see the staff of their branch _(row 277)_
- [x] A branch manager can view each cashier's sales _(row 278)_
- [x] A branch manager can view the discounts each cashier gave _(row 279)_

### Branch Stock

- [x] A branch manager can view their branch's stock by brand, product, size and colour _(row 281)_
- [x] A branch manager can see how much of each item is on the shop floor and in the back room _(row 282)_
- [x] A branch manager can view stock by status (available, reserved, in transit, defective) _(row 283)_
- [x] A branch manager can see items that are low or out of stock _(row 284)_
- [x] A branch manager can check stock of an item in the other branches _(row 285)_
- [x] A branch manager can request new stock of a product for their branch _(row 286)_
- [x] A branch manager can view the movement history of an item in their branch _(row 287)_

### Transfers

- [x] A branch manager can request items from another branch _(row 289)_
- [x] A branch manager can approve or reject transfers into and out of their branch before items are sent _(row 290)_
- [x] A branch manager can track a transfer's status (requested, approved, sent, received) _(row 291)_
- [x] A branch manager can cancel a request before it is sent _(row 292)_
- [x] A branch manager can confirm that a transfer has arrived _(row 293)_
- [x] A branch manager can report missing or extra items in a transfer _(row 294)_
- [x] A branch manager can review a flagged difference between a driver's pickup and delivery quantities and close it with a note _(row 295)_

### Stock Counts

- [x] A branch manager can start a full or partial stock count _(row 297)_
- [x] A branch manager can run a blind count, where the counter can't see the expected quantity _(row 298)_
- [x] A branch manager can review the differences found in a stock count _(row 299)_
- [x] A branch manager can approve count adjustments within their limit, which corrects the stock _(row 300)_
- [x] A branch manager must give a reason for every stock adjustment _(row 301)_

### Defects & Write-offs

- [x] A branch manager can report a defective or damaged item in the branch with a reason, so it cannot be sold _(row 303)_
- [x] A branch manager can view the branch's defect list and the status of each item _(row 304)_
- [x] A branch manager can mark defective items to be sent back to the brand _(row 305)_
- [x] A branch manager can write off lost items with a reason _(row 306)_

### Approvals

- [x] A branch manager can see requests waiting for their approval _(row 308)_
- [x] A branch manager can approve a request on the spot by entering their personal approval PIN on the cashier's screen _(row 309)_
- [x] A branch manager can set and change their own approval PIN _(row 310)_
- [x] A branch manager can approve or reject a request from their phone when not at the till _(row 311)_
- [x] A branch manager must choose a reason when approving or rejecting _(row 312)_
- [x] A branch manager cannot approve their own sales, discounts or refunds _(row 313)_
- [x] A branch manager's approval PIN is locked after 3 wrong tries _(row 314)_
- [x] A branch manager can approve discounts above the cashier's limit, within their own limit _(row 315)_
- [x] A branch manager can approve a price change at the till _(row 316)_
- [x] A branch manager can approve a refund above the limit _(row 317)_
- [x] A branch manager can approve a return outside the return window (e.g. day 16) _(row 318)_
- [x] A branch manager can approve a return without a receipt _(row 319)_
- [x] A branch manager can void a sale with a reason, which creates a reversal record _(row 320)_
- [x] Every approval is saved with who approved it, when, and why _(row 321)_

### Registers & Cash

- [x] A branch manager can see all open and closed registers in their branch and who is using them _(row 323)_
- [x] A branch manager can count the cash in the store at any time and check that it equals the expected amount _(row 324)_
- [x] A branch manager can close a register for a cashier _(row 325)_
- [x] A branch manager can see the cash difference of each register at closing _(row 326)_
- [x] A branch manager can add a note explaining a cash difference _(row 327)_
- [x] A branch manager can review and approve a shift closing and its cash difference _(row 328)_
- [x] A branch manager can view the branch's daily closing report with totals for each payment method _(row 329)_

### Branch Reports

- [x] A branch manager can see the daily sales report of their branch, including all completed sales _(row 331)_
- [x] A branch manager can see the returns and exchanges report of their branch _(row 332)_

### Alerts

- [x] A branch manager gets an alert when an item runs low in the branch _(row 334)_
- [x] A branch manager gets an alert when something is waiting for their approval _(row 335)_
- [x] A branch manager gets an alert when a transfer arrives _(row 336)_
- [x] A branch manager gets an alert when their new stock request is approved or rejected _(row 337)_

## Storekeeper (53 stories)

### Receiving

- [x] A storekeeper can create a receiving record for a brand delivery, choosing the brand and the branch receiving the items _(row 443)_
- [x] A storekeeper can link the receipt to a batch _(row 444)_
- [x] A storekeeper can enter the expected and received quantity of each variant, counted against the brand's list _(row 445)_
- [x] A storekeeper can scan or type the items and quantities while receiving _(row 446)_
- [x] A storekeeper can record missing or damaged pieces against the delivery _(row 447)_
- [x] A brand's driver or courier signs electronically for the quantity of each product delivered, and the storekeeper countersigns with the quantity received, defects and missing pieces for each product _(row 448)_
- [x] A storekeeper can create items with size, colour and barcode while receiving _(row 449)_
- [x] A storekeeper can confirm the receiving, which adds the accepted stock to the branch _(row 450)_
- [x] Every receiving is saved with the date and who did it _(row 451)_
- [x] A storekeeper can print a receiving note for both sides to sign _(row 452)_
- [x] A storekeeper can print barcode labels and price tags, including for items that arrive without a barcode _(row 453)_
- [x] A storekeeper can mark received items as consignment _(row 454)_

### Inspection & Defects

- [x] A storekeeper can inspect a delivery and split it into accepted and defective pieces _(row 456)_
- [x] A storekeeper at the store or warehouse must always report every defect found, recording the product, quantity, defect type, reason and notes _(row 457)_
- [x] A storekeeper can record who carries the cost of a defect (brand or GenZ) _(row 458)_
- [x] A storekeeper can attach photos of defects _(row 459)_
- [x] A storekeeper can record defects found later in storage against the original batch _(row 460)_
- [x] A storekeeper can inspect items returned by customers and confirm their condition _(row 461)_

### Stock Control

- [x] A storekeeper can view their branch's stock by brand, product, size and colour _(row 463)_
- [x] A storekeeper can see how many pieces each brand currently has in the store _(row 464)_
- [x] A storekeeper can set an item's status: available, reserved, pending inspection, defective, repairable, to return to brand, returned, written off _(row 465)_
- [x] A storekeeper can move items between the back room and the shop floor _(row 466)_
- [x] A storekeeper can set the minimum quantity of an item in each branch _(row 467)_
- [x] A storekeeper can view the full movement history of any item _(row 468)_
- [x] A storekeeper cannot change stock quantities directly, only through recorded movements _(row 469)_
- [x] A storekeeper can check a piece's availability in other branches and online _(row 470)_
- [x] A storekeeper cannot see cost, commission, profit or any other financial data _(row 471)_

### Stock Counts

- [x] A storekeeper can run a stock count by scanning items _(row 473)_
- [x] A storekeeper can count one brand or shelf at a time _(row 474)_
- [x] A storekeeper can record differences against the system, with a reason for any missing item _(row 475)_
- [x] A storekeeper can submit a count and its differences for the branch manager to approve _(row 476)_

### Transfers

- [x] A storekeeper can request a transfer of pieces from another branch _(row 478)_
- [x] A storekeeper can view approved transfer requests _(row 479)_
- [x] A storekeeper at the warehouse sees approved new stock requests and prepares a dispatch for each one _(row 480)_
- [x] A storekeeper can assign a driver to a transfer _(row 481)_
- [x] A storekeeper can create a transfer and scan the items going into it _(row 482)_
- [x] A storekeeper at the warehouse writes each dispatch request with the quantity of each product and the store it is going to (quantity X of product Y to be delivered to store A) _(row 483)_
- [x] A storekeeper can send a transfer, which marks the items as in transit _(row 484)_
- [x] A storekeeper hands a transfer to the driver only after the driver signs electronically for the quantity of each product received _(row 485)_
- [x] A storekeeper can print a transfer note to go with the items _(row 486)_
- [x] A storekeeper can receive a transfer and confirm the quantities _(row 487)_
- [x] A storekeeper answers each delivery by signing electronically at the store, confirming for each product the quantity received, the number of defects and any missing pieces (received X, defects Y, missing W for product Z) _(row 488)_
- [x] When the storekeeper signs for a delivery, the accepted quantity is added to the branch stock and defective pieces are recorded against the batch _(row 489)_
- [x] A storekeeper can record missing, extra or damaged pieces in a transfer _(row 490)_
- [x] A storekeeper can send items between Egypt and Jeddah _(row 491)_

### Returns to Brand

- [x] A storekeeper can create a return of unsold or defective items to a brand with a return note _(row 493)_
- [x] A storekeeper sees defective items submitted by cashiers and sends items received defective back to the local brand, and items damaged in the store to the warehouse _(row 494)_
- [x] A storekeeper can record a replacement or credit from the brand for returned defective items _(row 495)_
- [x] Stock goes down when items are sent back to a brand _(row 496)_

### Alerts

- [x] A storekeeper gets low-stock alerts per item and size _(row 498)_
- [x] A storekeeper gets an alert when an item is low on the shop floor but available in the back room _(row 499)_
- [x] A storekeeper gets an alert when a transfer is approved and ready to prepare _(row 500)_
- [x] A storekeeper gets an alert when a cashier submits a defective item for return _(row 501)_

## Driver / Courier (7 stories)

### Pickup

- [x] A driver can see the transfers and deliveries assigned to them _(row 506)_
- [x] A driver must sign an electronic agreement when picking up stock, confirming the quantity received for each product (received X of product Y) _(row 507)_
- [x] The pickup agreement is saved with the date, time, driver and the storekeeper who handed over the stock _(row 508)_

### Delivery

- [x] A driver must sign electronically at the store when delivering stock, confirming the quantity delivered for each product (delivered X of product Y) _(row 510)_
- [x] The delivery record is saved with the date, time, driver and the storekeeper who received the stock _(row 511)_
- [x] Any difference between the quantity picked up and the quantity delivered is flagged to the branch manager and the owner _(row 512)_

### Alerts

- [x] A driver gets a notification when a transfer is assigned to them _(row 514)_

## Online Orders Staff (9 stories)

### Online Orders

- [x] Orders from the online store appear in the system _(row 531)_
- [x] Items are reserved as soon as an online order is placed _(row 532)_
- [x] The online store shows the right stock automatically _(row 533)_
- [x] An online orders staff member can see which location the order is sent from _(row 534)_
- [x] An online orders staff member can mark an order as packed _(row 535)_
- [x] An online orders staff member can mark an order as shipped _(row 536)_
- [x] An online orders staff member can mark a cash-on-delivery order as paid _(row 537)_
- [x] An online orders staff member can handle a return of an online order _(row 538)_
- [x] A cancelled order puts the items back in stock _(row 539)_
