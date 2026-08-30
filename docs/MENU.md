# Menu & Inventory Management

This document details the structure of the menu system, category layouts, preparation configurations, and automatic stock deduction mechanics.

## 1. Schema Relationships

The menu structure is defined by a one-to-many relationship between categories and items:

```text
+-----------------------+           +-----------------------+
|  menu_categories      | 1       * |  menu_items           |
|  - id                 |-----------|  - id                 |
|  - name               |           |  - category_id        |
|  - slug               |           |  - name               |
|                       |           |  - price              |
+-----------------------+           |  - stock_capacity     |
                                    |  - is_available       |
                                    +-----------------------+
```

*   **`menu_categories`**: Dynamic folders managed by the Tenant Admin (e.g., Appetizers, Main Course, Drinks, Dessert).
*   **`menu_items`**: Individual items containing prices, descriptions, images, availability flags, and stock limits.

## 2. Stock Capacity & Rules

To prevent restaurants from accepting orders for items they cannot prepare due to ingredient depletion:

*   **Stock Limits**: Every menu item can define a `stockCapacity` (e.g. only 20 servings of Ribeye Steak per night).
*   **Availability Flags**: If `isAvailable` is toggled `false` by the admin, the item is hidden from the customer-facing booking wizard.

## 3. Stock Deductions & Rollbacks

Stock changes are managed in transactions alongside reservation checkout:

1.  **Deduction (Mode 2 Checkout)**: When a reservation with a pre-order checkout is paid, the system decrements the stock count of each ordered item in a PostgreSQL transaction:
    ```sql
    UPDATE menu_items 
    SET stock_capacity = stock_capacity - $1 
    WHERE id = $2 AND stock_capacity >= $1;
    ```
2.  **Validation**: If the update fails because the requested quantity exceeds the remaining stock, the transaction is aborted, and the customer is prompted to change their pre-order selection.
3.  **Rollback on Cancel**: If a guest cancels their reservation within the policy limits, or a pending invoice expires, the worker/API releases the tables and increments the item stock counts back by the pre-ordered quantities.
