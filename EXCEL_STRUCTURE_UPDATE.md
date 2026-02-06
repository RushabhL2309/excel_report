# Excel Structure Update - Department Name & Item Group Name

## Updated Excel Column Structure

Based on the actual Excel file structure, the parser now handles:

### Column Mapping

1. **Department Name** (Main Category)
   - Contains: `Mens` or `Womens`
   - Purpose: Main category classification
   - Column detection: `['department name', 'department', 'dept name', 'main category']`

2. **Item Group Name** (Sub-Category)
   - Contains: Actual department names like:
     - `shutting shirting`
     - `men's ethnic`
     - `kurta`
     - `men's readymade`
     - `sarees`
     - `women's ethnic`
   - Purpose: Sub-category used for cross-selling calculations
   - Column detection: `['itemgroup name', 'item group name', 'item group', 'sub category', 'subcategory']`

3. **Sales Type**
   - Contains: `Sale`, `Return`, `Replacement`, etc.
   - Filter: **ONLY "Sale" transactions are processed**
   - Column detection: `['sales type', 'type', 'transaction type', 'sale type']`

### Processing Logic

#### Step 1: Filter by Sales Type
```typescript
// ONLY process rows where Sales Type = "Sale"
const salesType = normalizeKey(row[salesTypeIndex])
const isSale = salesType === 'sale'

if (!isSale && salesTypeIndex !== -1) {
  continue // Skip Return, Replacement, etc.
}
```

#### Step 2: Extract Columns
- **Department Name**: Main category (Mens/Womens) - stored but not used in calculations
- **Item Group Name**: Sub-category - used for department normalization and cross-selling
- **Counter**: Shop counter (billing location)
- **Account Name**: Customer name
- **Mobile1**: Customer ID
- **Salesman Name**: Salesperson name
- **Voucher No**: Voucher number
- **Voucher Date**: Transaction date

#### Step 3: Normalize Department
- Uses **Item Group Name** (sub-category) for normalization
- Matches against the 6 cross-selling departments:
  - Men's: shutting shirting, men's ethnic, kurta, men's readymade
  - Women's: sarees, women's ethnic

#### Step 4: Build Data Structures
- Only processes rows where:
  - Sales Type = "Sale" (if column exists)
  - Item Group Name matches one of the 6 cross-selling departments
- Builds:
  - Salesman-department mapping
  - Customer visits
  - Customer-salesman mapping
  - Incentive breakdown

## Excel File Structure Example

| Department Name | Item Group Name | Sales Type | Account Name | Mobile1 | Salesman Name | Counter | Voucher No | Voucher Date |
|----------------|-----------------|------------|--------------|---------|---------------|---------|-------------|--------------|
| Mens           | shutting shirting | Sale      | John Doe     | 9876543210 | Salesperson A | Counter 1 | V001 | 2024-01-15 |
| Mens           | men's ethnic     | Sale      | John Doe     | 9876543210 | Salesperson B | Counter 2 | V002 | 2024-01-15 |
| Womens         | sarees           | Return    | Jane Smith   | 9876543211 | Salesperson A | Counter 1 | V003 | 2024-01-15 |
| Womens         | women's ethnic   | Sale      | Jane Smith   | 9876543211 | Salesperson C | Counter 2 | V004 | 2024-01-15 |

**Processing:**
- Row 1: ✅ Processed (Mens + shutting shirting + Sale)
- Row 2: ✅ Processed (Mens + men's ethnic + Sale)
- Row 3: ❌ Skipped (Return transaction)
- Row 4: ✅ Processed (Womens + women's ethnic + Sale)

## Key Changes

1. **Added Department Name column detection**
   - Detects main category (Mens/Womens)
   - Stored but not used in calculations

2. **Item Group Name is primary source**
   - Used for department normalization
   - Contains the 6 sub-categories for cross-selling

3. **Strict Sales Type filtering**
   - Only "Sale" transactions are processed
   - All other types (Return, Replacement, etc.) are skipped

4. **Backward compatibility**
   - If Sales Type column doesn't exist, all rows are processed
   - If Department Name column doesn't exist, still works with Item Group Name

## Column Detection Priority

### Department Name (Main Category)
1. "department name"
2. "department"
3. "dept name"
4. "main category"

### Item Group Name (Sub-Category)
1. "itemgroup name"
2. "item group name"
3. "item group"
4. "sub category"
5. "subcategory"

### Sales Type
1. "sales type"
2. "type"
3. "transaction type"
4. "sale type"

## Testing Checklist

- [x] Department Name column detected correctly
- [x] Item Group Name column detected correctly
- [x] Sales Type filtering works (only "Sale" processed)
- [x] Non-sale transactions skipped
- [x] Department normalization uses Item Group Name
- [x] Cross-selling calculations use correct departments
- [x] Incentive calculations work correctly
- [x] Customer name (Account Name) parsed correctly
- [x] Counter column parsed correctly

## Notes

- **Department Name** (Mens/Womens) is extracted but not used in calculations
- **Item Group Name** is the primary source for department matching
- Only the 6 specified departments are considered for cross-selling
- Only "Sale" transactions are processed (if Sales Type column exists)
- All other existing logic remains the same
