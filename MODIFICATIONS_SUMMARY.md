# Modifications Summary - Excel Parsing Updates

## Changes Made

### 1. **Customer Name Parsing**
- **Added:** "Account Name" column detection and parsing
- **Location:** Column detection (line ~193)
- **Usage:** Extracted as `rawAccountName` and stored in `CustomerVisitInfo` and `BreakdownEntry`
- **Display:** Shows customer name in breakdown, with customer ID in parentheses if name exists

### 2. **Department Categories for Cross-Selling**
- **Defined:** 6 departments for cross-selling consideration:
  - **Men's Category:**
    1. shutting shirting
    2. men's ethnic
    3. kurta
    4. men's readymade
  - **Women's Category:**
    5. sarees
    6. women's ethnic

- **Functions Added:**
  - `normalizeDepartmentForCrossSelling()` - Normalizes department names to match the 6 categories
  - `isCrossSellingDepartment()` - Checks if department is in cross-selling list
  - `CROSS_SELLING_DEPARTMENTS` - Constant array of the 6 departments

### 3. **Sales Type Filtering**
- **Added:** "Sales Type" column detection
- **Location:** Column detection (line ~193)
- **Logic:** Only "Sale" transactions are considered for cross-selling calculations
- **Filtering:** 
  - Non-sale transactions (Return, Replacement, etc.) are excluded from cross-selling tracking
  - If Sales Type column doesn't exist, all rows are assumed to be sales

### 4. **Counter Column Understanding**
- **Clarification:** Counter column represents shop counter (billing location)
- **Usage:** Two shops on either side of the road use different counters
- **Implementation:** Counter is still parsed and included in department labels (e.g., "men's ethnic (Counter A)")

### 5. **Data Structure Updates**

#### `BreakdownEntry` Type:
```typescript
{
  customerId: string
  customerName: string | null  // NEW: Account Name from Excel
  amount: number
  departmentsVisited: number | null
  visitedDepartments: string[]
  handledDepartments: string[]
  dateKey: string
  dateIso: string | null
  displayDate: string | null
}
```

#### `CustomerVisitInfo` Type:
```typescript
{
  customerId: string
  customerName: string | null  // NEW: Account Name from Excel
  departments: Set<string>
  dateIso: string | null
  dateKey: string
}
```

## Column Detection

The parser now looks for these columns:
1. **Voucher No** - `['voucher no']`
2. **Voucher Date** - `['voucher date', 'date']`
3. **Salesman Name** - `['salesman name', 'sales person']` (REQUIRED)
4. **ItemGroup Name** - `['itemgroup name', 'item group name', 'item group']` (REQUIRED)
5. **Counter Name** - `['counter name', 'counter']` (Shop counter)
6. **Mobile1** - `['mobile1', 'customer id', 'customer mobile']` (REQUIRED)
7. **Account Name** - `['account name', 'customer name', 'account']` (NEW)
8. **Sales Type** - `['sales type', 'type', 'transaction type', 'sale type']` (NEW)

## Cross-Selling Logic

### Filtering Rules:
1. **Department Filter:** Only the 6 specified departments are considered
2. **Transaction Filter:** Only "Sale" transactions are included
3. **Combined:** Both conditions must be met for cross-selling tracking

### Example:
- ✅ "men's ethnic" + "Sale" → Included in cross-selling
- ✅ "sarees" + "Sale" → Included in cross-selling
- ❌ "men's ethnic" + "Return" → Excluded (not Sale)
- ❌ "accessories" + "Sale" → Excluded (not in 6 departments)
- ❌ "accessories" + "Return" → Excluded (both conditions fail)

## Incentive Calculation

**Note:** The incentive calculation logic remains the same as before. The filtering for cross-selling departments and Sale transactions applies to cross-selling tracking, but the general incentive calculation may still consider all departments depending on the implementation.

## UI Updates

- Customer name is displayed in breakdown entries
- Format: "Customer Name (Customer ID)" if name exists, otherwise just "Customer ID"

## Testing Checklist

- [ ] Verify Account Name column is detected correctly
- [ ] Verify customer name appears in breakdown entries
- [ ] Verify only 6 specified departments are considered for cross-selling
- [ ] Verify Sales Type filtering works (only "Sale" transactions)
- [ ] Verify counter column is parsed correctly
- [ ] Verify incentive calculations still work correctly
- [ ] Test with Excel files containing:
  - Account Name column
  - Sales Type column with various values
  - Departments matching the 6 categories
  - Counter names

## Notes

- The `lib/departments.ts` file already contains the correct 6 departments in `MASTER_DEPARTMENTS`
- The `formatDepartmentCounter()` function from `lib/departments.ts` is still used for general department formatting
- Counter is understood as shop counter (billing location) for two shops on either side of the road
