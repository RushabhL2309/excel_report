# Detailed Function Analysis - app/page.tsx

This document explains every function in detail: parameters, sources, calculations, and usage.

---

## 1. UTILITY FUNCTIONS

### `normalizeQuotes(value: string): string`
**Purpose:** Normalizes quote characters in strings

**Parameters:**
- `value: string` - Input string that may contain curly quotes

**Source:** Called from `stringifyCell()` and `normalizeKey()`

**Calculation:**
- Replaces curly quotes `'` and `'` with straight quote `'`
- Uses regex: `/[''']/g`

**Returns:** String with normalized quotes

**Example:**
```typescript
normalizeQuotes("John's Department") // "John's Department"
```

---

### `stringifyCell(value: string | number | Date | null): string`
**Purpose:** Converts any cell value to a clean string

**Parameters:**
- `value: string | number | Date | null` - Raw cell value from Excel

**Source:** Called from Excel row parsing (line 249-253)

**Calculation:**
1. If `null` or `undefined` → return empty string `''`
2. If `number`:
   - Check if finite (not NaN, Infinity)
   - Convert to string
3. If `Date` → convert to ISO string
4. Otherwise → trim whitespace and return string

**Returns:** Clean string representation

**Example:**
```typescript
stringifyCell(123) // "123"
stringifyCell(new Date()) // "2024-01-15T10:30:00.000Z"
stringifyCell("  Hello  ") // "Hello"
stringifyCell(null) // ""
```

---

### `normalizeKey(value: string | number | Date | null): string`
**Purpose:** Creates normalized key for comparison (lowercase, trimmed, single spaces)

**Parameters:**
- `value: string | number | Date | null` - Value to normalize

**Source:** Used to create keys for salesperson, customer, dates

**Calculation:**
1. Calls `normalizeQuotes(stringifyCell(value))`
2. Replaces multiple spaces with single space: `/\s+/g` → `' '`
3. Trims whitespace
4. Converts to lowercase

**Returns:** Normalized lowercase key string

**Example:**
```typescript
normalizeKey("  John   Doe  ") // "john doe"
normalizeKey("MENS ETHNICS") // "mens ethnics"
```

**Used for:**
- `salesmanKey` (line 255)
- `customerKey` (line 256)
- Date keys when date is invalid (line 114)

---

### `formatDisplayDate(iso: string): string`
**Purpose:** Formats ISO date string to human-readable format

**Parameters:**
- `iso: string` - ISO date string in format "YYYY-MM-DD"

**Source:** Called when displaying dates in UI

**Calculation:**
1. Split ISO string: `iso.split('-').map(Number)` → `[year, month, day]`
2. Create UTC Date: `new Date(Date.UTC(year, month - 1, day))`
3. Format using `Intl.DateTimeFormat` with 'en-GB' locale
4. Format: "DD MMM YYYY" (e.g., "15 Jan 2024")

**Returns:** Formatted date string

**Example:**
```typescript
formatDisplayDate("2024-01-15") // "15 Jan 2024"
formatDisplayDate("2024-12-25") // "25 Dec 2024"
```

**Used in:**
- `parseDateCell()` (line 90, 98, 110)
- `timeframeLabel` (line 546, 550)
- `groupedBreakdown` (line 562)

---

### `toIsoDate(date: Date): string`
**Purpose:** Converts Date object to ISO date string (YYYY-MM-DD)

**Parameters:**
- `date: Date` - JavaScript Date object

**Source:** Called from `parseDateCell()` and `addDaysToIso()`

**Calculation:**
- `date.toISOString().slice(0, 10)` - Takes first 10 characters (YYYY-MM-DD)

**Returns:** ISO date string

**Example:**
```typescript
toIsoDate(new Date("2024-01-15")) // "2024-01-15"
```

---

### `parseDateCell(value: string | number | Date | null): DateInfo`
**Purpose:** Parses various date formats from Excel cells

**Parameters:**
- `value: string | number | Date | null` - Raw date value from Excel cell

**Source:** Called from Excel row parsing (line 240)

**Calculation Steps:**

1. **Null/Empty Check:**
   - If `null`, `undefined`, or empty string → return `{ key: '__unknown__', iso: null, display: null }`

2. **Date Object:**
   - If `value instanceof Date`:
     - Convert to ISO: `toIsoDate(value)`
     - Format display: `formatDisplayDate(iso)`
     - Return: `{ key: iso, iso, display }`

3. **Excel Date Number:**
   - If `typeof value === 'number'`:
     - Parse using `XLSX.SSF.parse_date_code(value)`
     - If parsed successfully:
       - Create UTC Date: `new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))`
       - Convert to ISO and format display
       - Return formatted date info

4. **String Date:**
   - Convert to string: `stringifyCell(value)`
   - If empty → return unknown
   - Try parsing: `new Date(text)`
   - If valid date → convert to ISO and format
   - If invalid → normalize as text key

**Returns:** `DateInfo` object:
```typescript
{
  key: string,      // Normalized key for grouping
  iso: string | null,  // ISO date "YYYY-MM-DD" or null
  display: string | null // Human-readable date or original text
}
```

**Example:**
```typescript
parseDateCell(new Date("2024-01-15"))
// { key: "2024-01-15", iso: "2024-01-15", display: "15 Jan 2024" }

parseDateCell(45296) // Excel date number
// { key: "2024-01-15", iso: "2024-01-15", display: "15 Jan 2024" }

parseDateCell("2024-01-15")
// { key: "2024-01-15", iso: "2024-01-15", display: "15 Jan 2024" }

parseDateCell(null)
// { key: "__unknown__", iso: null, display: null }

parseDateCell("Invalid Date")
// { key: "invalid date", iso: null, display: "Invalid Date" }
```

**Used in:**
- Excel row parsing (line 240)
- Creates `dateInfo` for each row

---

### `addDaysToIso(iso: string, days: number): string`
**Purpose:** Adds days to an ISO date string

**Parameters:**
- `iso: string` - ISO date string "YYYY-MM-DD"
- `days: number` - Number of days to add (can be negative)

**Source:** Called from `filterPredicate` for week calculations (line 453)

**Calculation:**
1. Parse ISO: `iso.split('-').map(Number)` → `[year, month, day]`
2. Create UTC Date: `new Date(Date.UTC(year, month - 1, day))`
3. Add days: `date.setUTCDate(date.getUTCDate() + days)`
4. Convert back to ISO: `toIsoDate(date)`

**Returns:** New ISO date string

**Example:**
```typescript
addDaysToIso("2024-01-15", 6) // "2024-01-21"
addDaysToIso("2024-01-15", -1) // "2024-01-14"
```

**Used in:**
- Week filter calculation (line 453)
- Week label display (line 549)

---

### `calculateIncentiveForDepartments(departmentCount: number): number`
**Purpose:** Calculates incentive amount based on number of departments visited

**Parameters:**
- `departmentCount: number` - Total unique departments visited by customer

**Source:** Called from `parseWorkbook()` during incentive calculation (line 320)

**Calculation Logic:**
```
If departmentCount >= 5 → return 80
If departmentCount === 4 → return 60
If departmentCount === 3 → return 40
If departmentCount === 2 → return 20
Otherwise → return 0
```

**Returns:** Incentive amount in rupees (₹)

**Example:**
```typescript
calculateIncentiveForDepartments(5) // 80
calculateIncentiveForDepartments(4) // 60
calculateIncentiveForDepartments(3) // 40
calculateIncentiveForDepartments(2) // 20
calculateIncentiveForDepartments(1) // 0
```

**Used in:**
- Incentive calculation loop (line 320)

---

## 2. DEPARTMENT NORMALIZATION FUNCTIONS

### `normalizeDepartment(department: string): string` (Local version, line 217)
**Purpose:** Normalizes department names to match master list

**Parameters:**
- `department: string` - Raw department name from Excel

**Source:** Called from `formatDepartment()` (line 229)

**Calculation:**
1. Normalize: `department.toLowerCase().trim()`
2. Check patterns:
   - Contains "shutting" → return "Shutting Shirting"
   - Contains "ethnic" AND "men" → return "Mens Ethnic"
   - Contains "kurta" → return "Kurta"
   - Contains "readymade" AND "men" → return "Mens Readymade"
   - Contains "saree" → return "Sarees"
   - Contains "ethnic" AND "women" → return "Womens Ethnic"
3. If no match → return empty string `''`

**Returns:** Normalized department name or empty string

**Note:** This is a LOCAL function (line 217-226) that conflicts with imported `normalizeDepartment` from `@/lib/departments`. The imported version is used via `formatDepartmentCounter()`.

**Example:**
```typescript
normalizeDepartment("MENS ETHNICS") // "Mens Ethnic"
normalizeDepartment("shutting shirting") // "Shutting Shirting"
normalizeDepartment("Unknown Dept") // ""
```

---

### `formatDepartment(department: string): string` (Line 228)
**Purpose:** Formats department name using normalization

**Parameters:**
- `department: string` - Raw department name

**Source:** Called but NOT USED in current code (seems unused)

**Calculation:**
- Calls local `normalizeDepartment(department)`
- Returns normalized name or empty string

**Returns:** Normalized department name or empty string

**Note:** This function appears to be unused/dead code.

---

## 3. MAIN PARSING FUNCTION

### `parseWorkbook(buffer: ArrayBuffer): ParsedWorkbook`
**Purpose:** Main function that parses Excel file and calculates all incentives

**Parameters:**
- `buffer: ArrayBuffer` - Excel file content as binary buffer

**Source:** Called from `handleUpload()` (line 514)

**Returns:** `ParsedWorkbook` object:
```typescript
{
  metrics: SalespersonMetric[],        // All salesperson incentive data
  availableDates: string[],            // Sorted list of ISO dates
  dateLabels: Record<string, string>   // ISO date → display label mapping
}
```

**Calculation Steps:**

#### Step 1: Read Excel File (Lines 136-154)
```typescript
const workbook = XLSX.read(buffer, { type: 'array' })
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: null })
```
- Reads Excel file using XLSX library
- Gets first sheet
- Converts to array of rows (each row is array of cell values)

#### Step 2: Find Header Row (Lines 156-161)
```typescript
const HEADER_ROW_NUMBER = 4  // Expects header at row 4 (index 3)
const headerRowIndex = HEADER_ROW_NUMBER - 1 < rows.length 
  ? HEADER_ROW_NUMBER - 1 
  : rows.findIndex((row) => row.some((value) => stringifyCell(value) !== ''))
```
- First tries row 4 (index 3)
- If not found, searches for first non-empty row
- Creates normalized header lookup arrays

#### Step 3: Find Column Indices (Lines 167-196)
Uses `findHeaderIndex()` helper to locate columns:

**Required Columns:**
- `voucherNoIndex` - "voucher no"
- `voucherDateIndex` - "voucher date" or "date"
- `firstSalesmanIndex` - "salesman name" or "sales person" (REQUIRED)
- `itemGroupIndex` - "itemgroup name" or "item group name" or "item group" (REQUIRED)
- `counterIndex` - "counter name" or "counter" (optional)
- `firstMobileIndex` - "mobile1" or "customer id" or "customer mobile" (REQUIRED)

**Helper Function: `findHeaderIndex(needles, fromIndex)`**
- Searches header row for matching column names
- Supports multiple name variations (array)
- Case-insensitive matching
- Returns column index or -1 if not found

#### Step 4: Initialize Data Structures (Lines 198-206)
```typescript
const salesmanDepartments = new Map<string, { name: string; departments: Set<string> }>()
// Maps: salesmanKey → { name, departments }

const customerVisits = new Map<string, CustomerVisitInfo>()
// Maps: visitKey (customerKey__dateKey) → { customerId, departments, dateIso, dateKey }

const customerSalesmen = new Map<string, Map<string, { name: string; departments: Set<string> }>>()
// Maps: visitKey → Map of salesmanKey → { name, departments }

const breakdownMap = new Map<string, InternalBreakdown>()
// Maps: salesmanKey → { name, breakdown[] }

const availableDates = new Set<string>()  // ISO dates found
const dateLabels = new Map<string, string>()  // ISO date → display label
```

#### Step 5: Process Each Row (Lines 234-305)
For each data row (after header):

1. **Parse Date:**
   ```typescript
   const dateInfo = parseDateCell(row[voucherDateIndex])
   if (dateInfo.iso) {
     availableDates.add(dateInfo.iso)
     dateLabels.set(dateInfo.iso, dateInfo.display ?? formatDisplayDate(dateInfo.iso))
   }
   ```

2. **Extract Raw Values:**
   ```typescript
   const rawSalesman = stringifyCell(row[firstSalesmanIndex])
   const rawDepartment = stringifyCell(row[itemGroupIndex])
   const rawCounter = stringifyCell(row[counterIndex]) || ''
   const rawCustomerFromTable1 = stringifyCell(row[firstMobileIndex])
   const voucherNo = stringifyCell(row[voucherNoIndex]) || ''
   ```

3. **Normalize Keys:**
   ```typescript
   const salesmanKey = normalizeKey(rawSalesman)
   const customerKey = normalizeKey(rawCustomerFromTable1)
   const departmentLabel = formatDepartmentCounter(rawDepartment, rawCounter)
   ```
   - Uses imported `formatDepartmentCounter()` from `@/lib/departments`
   - This normalizes department and adds counter name

4. **Build Salesman-Department Map:**
   ```typescript
   if (salesmanKey) {
     if (!salesmanDepartments.has(salesmanKey)) {
       salesmanDepartments.set(salesmanKey, { name: rawSalesman, departments: new Set() })
     }
     if (departmentLabel) {
       salesmanDepartments.get(salesmanKey)!.departments.add(departmentLabel)
     }
   }
   ```
   - Tracks all departments each salesperson handles

5. **Build Customer-Salesman Map:**
   ```typescript
   if (salesmanKey && customerKey) {
     const visitKey = `${customerKey}__${dateInfo.key}`
     // Creates nested map: visitKey → salesmanKey → { name, departments }
   }
   ```
   - Groups salespersons by customer visit

6. **Build Customer Visits Map:**
   ```typescript
   if (customerKey) {
     const visitKey = `${customerKey}__${dateInfo.key}`
     if (!customerVisits.has(visitKey)) {
       customerVisits.set(visitKey, {
         customerId: rawCustomerFromTable1,
         departments: new Set<string>(),
         dateIso: dateInfo.iso,
         dateKey: dateInfo.key,
       })
     }
     if (departmentLabel) {
       customerVisits.get(visitKey)!.departments.add(departmentLabel)
     }
   }
   ```
   - Tracks all departments visited per customer per date

#### Step 6: Calculate Incentives (Lines 307-348)
For each customer visit:

1. **Get Salesmen for Visit:**
   ```typescript
   const salesmenForVisit = customerSalesmen.get(visitKey)
   if (!salesmenForVisit || salesmenForVisit.size === 0) return  // Skip if no salesmen
   ```

2. **Count Unique Departments:**
   ```typescript
   const uniqueVisitedDepartments = new Set(visitInfo.departments)
   salesmenForVisit.forEach(({ departments }) => {
     departments.forEach((dept) => uniqueVisitedDepartments.add(dept))
   })
   const departmentsVisitedCount = uniqueVisitedDepartments.size
   ```
   - Combines departments from:
     - Customer visits (`visitInfo.departments`)
     - All salespersons who handled this visit

3. **Calculate Incentive:**
   ```typescript
   const incentiveAmount = calculateIncentiveForDepartments(departmentsVisitedCount)
   if (incentiveAmount === 0) return  // Skip if no incentive
   ```

4. **Create Breakdown Entries:**
   ```typescript
   salesmenForVisit.forEach(({ name, departments }, salesmanKey) => {
     breakdownMap.get(salesmanKey)!.breakdown.push({
       customerId: visitInfo.customerId,
       amount: incentiveAmount,  // SAME amount for ALL salespersons
       departmentsVisited: departmentsVisitedCount,
       visitedDepartments: Array.from(uniqueVisitedDepartments),
       handledDepartments: Array.from(departments),
       dateKey: visitInfo.dateKey,
       dateIso: visitInfo.dateIso,
       displayDate: displayDate,
     })
   })
   ```
   - **IMPORTANT:** All salespersons get the FULL incentive amount
   - Incentive is NOT split between salespersons

#### Step 7: Build Final Metrics (Lines 350-394)
1. **Create Salesperson Metrics:**
   ```typescript
   breakdownMap.forEach(({ name, breakdown }, key) => {
     const departments = salesmanDepartments.get(key)?.departments ?? new Set<string>()
     const sortedBreakdown = breakdown.sort((a, b) => {
       // Sort by date (newest first), then by amount
     })
     const total = sortedBreakdown.reduce((sum, entry) => sum + entry.amount, 0)
     metrics.push({
       name,
       departments: Array.from(departments),
       totalIncentive: total,
       breakdown: sortedBreakdown,
     })
   })
   ```

2. **Include Salespersons with Zero Incentives:**
   ```typescript
   salesmanDepartments.forEach(({ name, departments }, key) => {
     if (!breakdownMap.has(key)) {
       metrics.push({ name, departments: Array.from(departments), totalIncentive: 0, breakdown: [] })
     }
   })
   ```

3. **Sort and Return:**
   ```typescript
   const sortedMetrics = metrics.sort((a, b) => 
     b.totalIncentive - a.totalIncentive || a.name.localeCompare(b.name)
   )
   const availableDatesList = Array.from(availableDates).sort()
   const dateLabelRecord = Object.fromEntries(dateLabels.entries())
   
   return { metrics: sortedMetrics, availableDates: availableDatesList, dateLabels: dateLabelRecord }
   ```

**Used in:**
- `handleUpload()` (line 514)

---

## 4. REACT COMPONENT FUNCTIONS

### `toTimestamp(iso: string): number`
**Purpose:** Converts ISO date string to timestamp

**Parameters:**
- `iso: string` - ISO date string "YYYY-MM-DD"

**Source:** Called from `filterPredicate` for week filtering (lines 451, 455)

**Calculation:**
- Creates Date: `new Date(`${iso}T00:00:00Z`)`
- Gets timestamp: `.getTime()`

**Returns:** Timestamp number (milliseconds since epoch)

**Example:**
```typescript
toTimestamp("2024-01-15") // 1705276800000
```

---

### `filterPredicate` (useMemo, Lines 436-461)
**Purpose:** Creates filter function based on selected timeframe

**Parameters:** None (uses state variables)

**Source:** Created as memoized value, used in `computedMetrics`

**Dependencies:**
- `timeframe: 'all' | 'day' | 'week'`
- `selectedDay: string` (ISO date)
- `weekStart: string` (ISO date)

**Calculation:**

1. **If timeframe === 'all':**
   ```typescript
   return () => true  // No filtering
   ```

2. **If timeframe === 'day':**
   ```typescript
   return (entry: BreakdownEntry) => {
     if (!selectedDay) return false
     return entry.dateIso === selectedDay
   }
   ```

3. **If timeframe === 'week':**
   ```typescript
   return (entry: BreakdownEntry) => {
     if (!weekStart) return false
     if (!entry.dateIso) return false
     const startTs = toTimestamp(weekStart)
     const endIso = addDaysToIso(weekStart, 6)  // +6 days = 7 days total
     const endTs = toTimestamp(endIso)
     const entryTs = toTimestamp(entry.dateIso)
     return entryTs >= startTs && entryTs <= endTs
   }
   ```

**Returns:** Filter function `(entry: BreakdownEntry) => boolean`

**Used in:**
- `computedMetrics` (line 466)

---

### `computedMetrics` (useMemo, Lines 463-477)
**Purpose:** Calculates filtered metrics for each salesperson

**Parameters:** None (uses `rawMetrics` and `filterPredicate`)

**Source:** Memoized calculation

**Calculation:**
For each salesperson metric:
```typescript
{
  ...metric,  // Original metric data
  filteredBreakdown: metric.breakdown.filter(filterPredicate),
  filteredTotal: filteredBreakdown.reduce((sum, entry) => sum + entry.amount, 0),
  customersCount: new Set(filteredBreakdown.map(entry => entry.customerId)).size
}
```

**Returns:** `ComputedMetric[]` - Array of salesperson metrics with filtered data

**Used in:**
- Stats calculation (line 480)
- UI rendering (line 755)

---

### `stats` (useMemo, Lines 479-495)
**Purpose:** Calculates aggregate statistics

**Parameters:** None (uses `computedMetrics`)

**Source:** Memoized calculation

**Calculation:**
```typescript
{
  totalIncentive: computedMetrics.reduce((sum, metric) => sum + metric.filteredTotal, 0),
  customersCovered: // Unique customer IDs across all filtered breakdowns
  totalSalespeople: rawMetrics.length,
  highestIndividual: computedMetrics[0]?.filteredTotal ?? 0,
  averagePayout: totalIncentive / totalSalespeople
}
```

**Returns:** Stats object with totals and averages

**Used in:**
- Dashboard stats cards (lines 599, 605, 611, 617)

---

### `timeframeLabel` (useMemo, Lines 540-553)
**Purpose:** Creates human-readable label for current timeframe

**Parameters:** None (uses state variables)

**Source:** Memoized calculation

**Calculation:**
- `'all'` → `'All time'`
- `'day'` → Display date label or formatted date
- `'week'` → `"Start Date – End Date"` (7-day range)

**Returns:** String label

**Used in:**
- Timeline filter display (line 721)
- Top performer display (line 667)

---

### `groupedBreakdown` (useMemo, Lines 555-580)
**Purpose:** Groups breakdown entries by date for selected salesperson

**Parameters:** None (uses `selectedSalesperson` and `dateLabels`)

**Source:** Memoized calculation

**Calculation:**
1. Groups entries by `dateIso ?? dateKey`
2. For each group:
   - `label`: Display date or "Unknown date"
   - `entries`: All entries for that date
   - `total`: Sum of amounts for that date
3. Sorts groups by date (newest first) or by total

**Returns:** Array of grouped breakdown entries

**Used in:**
- Detailed breakdown display (line 838)

---

### `handleUpload(file: File): Promise<void>`
**Purpose:** Handles Excel file upload and parsing

**Parameters:**
- `file: File` - Uploaded Excel file

**Source:** Called from `onFileChange()` (line 537)

**Calculation:**
1. Sets `isParsing = true`
2. Converts file to ArrayBuffer: `await file.arrayBuffer()`
3. Stores in context: `setExcelData(buffer, file.name)`
4. Parses workbook: `parseWorkbook(buffer)`
5. Updates state:
   - `setRawMetrics(parsed.metrics)`
   - `setAvailableDates(parsed.availableDates)`
   - `setDateLabels(parsed.dateLabels)`
6. Sets default timeframe and dates
7. Handles errors

**Returns:** Promise<void>

**Used in:**
- File input onChange handler (line 537)

---

### `onFileChange(event: React.ChangeEvent<HTMLInputElement>): void`
**Purpose:** Handles file input change event

**Parameters:**
- `event: React.ChangeEvent<HTMLInputElement>` - File input change event

**Source:** Called from file input (line 636)

**Calculation:**
- Extracts file: `event.target.files?.[0]`
- If file exists, calls `handleUpload(file)`

**Returns:** void

**Used in:**
- File input element (line 636)

---

## 5. KEY DATA STRUCTURES

### `BreakdownEntry`
```typescript
{
  customerId: string              // Original customer ID from Excel
  amount: number                  // Incentive amount (₹)
  departmentsVisited: number | null  // Total unique departments visited
  visitedDepartments: string[]   // All departments visited (array)
  handledDepartments: string[]   // Departments handled by this salesperson
  dateKey: string                 // Normalized date key
  dateIso: string | null         // ISO date "YYYY-MM-DD" or null
  displayDate: string | null      // Human-readable date or null
}
```

### `SalespersonMetric`
```typescript
{
  name: string                    // Salesperson name
  departments: string[]           // All departments this salesperson handles
  totalIncentive: number          // Sum of all incentive amounts
  breakdown: BreakdownEntry[]    // Detailed breakdown entries
}
```

### `CustomerVisitInfo`
```typescript
{
  customerId: string              // Original customer ID
  departments: Set<string>         // Set of departments visited
  dateIso: string | null          // ISO date or null
  dateKey: string                 // Normalized date key
}
```

---

## 6. IMPORTANT NOTES

### Department Normalization Conflict
- **Line 6:** Imports `normalizeDepartment` from `@/lib/departments`
- **Line 217-226:** Defines LOCAL `normalizeDepartment` function
- **Line 257:** Uses `formatDepartmentCounter()` which uses the IMPORTED version
- **Line 229:** Local `formatDepartment()` uses LOCAL version (but is unused)

**Recommendation:** Remove local `normalizeDepartment` and `formatDepartment` functions, use only imported versions.

### Incentive Calculation Logic
- Incentive is based on **TOTAL unique departments** visited by customer
- **ALL salespersons** who handled the customer get the **FULL incentive amount**
- Incentive is **NOT split** between salespersons
- Example: Customer visits 4 departments, Salesperson A handled 2, Salesperson B handled 1
  - Both get ₹60 (full amount for 4 departments)
  - Total paid: ₹120

### Visit Key Format
- Format: `"customerKey__dateKey"`
- Example: `"9876543210__2024-01-15"`
- Used to group all transactions for same customer on same date

### Date Handling
- Valid dates → ISO format "YYYY-MM-DD"
- Invalid dates → Normalized text key (e.g., "invalid date")
- Unknown dates → `"__unknown__"` key

---

## 7. MODIFICATION GUIDE

To add new fields or calculations:

1. **Add Column Detection:**
   - Add to `findHeaderIndex()` calls (lines 187-192)
   - Example: `const newFieldIndex = findHeaderIndex(['new field name'])`

2. **Extract in Row Loop:**
   - Add extraction in row processing loop (lines 234-305)
   - Example: `const newFieldValue = stringifyCell(row[newFieldIndex])`

3. **Store in Data Structures:**
   - Add to `BreakdownEntry` type (lines 10-19)
   - Store in breakdown entry creation (lines 337-346)

4. **Display in UI:**
   - Add to breakdown display section (lines 863-890)

5. **Add Calculations:**
   - Create new calculation function (similar to `calculateIncentiveForDepartments`)
   - Call in appropriate place in `parseWorkbook()` or component

---

END OF DOCUMENT
