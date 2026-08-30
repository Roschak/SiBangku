# Visual Table Layout Builder

This document details the architecture and relative grid positioning models used by the **SiBangku** Visual Floor Plan builder.

## 1. Grid Design (Responsive Canvas)

Traditional pixel-based absolute coordinates ($x, y$ in pixels) do not scale on different device dimensions, which causes layout overlaps on mobile phone displays. 

To solve this, SiBangku stores layout positions as **relative percentages** (PRD §29, §158).

```text
+-------------------------------------------------------+
| Canvas (100% width, 100% height)                      |
|                                                       |
|   +---------------+                                   |
|   | Table 1       |  x: 20%                           |
|   | (Square)      |  y: 15%                           |
|   +---------------+                                   |
|                                                       |
|                       +---------------+               |
|                       | Table 2       |  x: 60%       |
|                       | (Round)       |  y: 55%       |
|                       +---------------+               |
+-------------------------------------------------------+
```

*   **Coordinate Bounds**: Positions are floats mapped between `0` and `100` representing relative offset from the container boundaries.
*   **Rendering**: On the customer-facing booking page and tenant admin console, the canvas container sets relative dimensions. The tables are absolutely positioned inside using CSS percentage offsets:
    ```css
    left: 20%;
    top: 15%;
    ```
*   **Scale Invariance**: Layout proportions are maintained identically across desktop, tablet, and mobile screens.

## 2. Table Metadata Properties

Each table record stores styling and capacity parameters in the database schema:

*   **`tableNumber`**: Unique alphanumeric code (e.g. `T-01`, `VIP-02`).
*   **`shape`**: Renders matching SVG nodes:
    *   `SQUARE`: Standard square table.
    *   `ROUND`: Circular table.
    *   `RECTANGLE`: Rectangular table for larger crowds.
    *   `BOOTH`: Semi-private booth layout.
*   **`capacity`**: Maximum seat count (Pax) supported by the table.
*   **`rotation`**: Angle in degrees (`0`, `90`, `180`, `270`) for styling.

## 3. Bulk Coordinates Update

To minimize DB network overhead, the tenant administrator does not trigger saving queries on every single drag-and-drop event. Instead:
1.  Positions are updated locally in React state variables.
2.  Clicking **"Save Layout"** bundles all positions into a single JSON payload.
3.  A `PUT /api/v1/tables/layout` request is dispatched to the `tenant-api`.
4.  The endpoint maps the coordinates to a PostgreSQL bulk upsert transaction, updating all table entries in a single step.
