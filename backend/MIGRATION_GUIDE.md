# Database Schema Migration Guide

This guide will help you update your existing Google Sheets to support the new property fields.

---

## 📋 What Changed?

We added **5 new property fields** that will be captured in both the Properties database and Reports:

| Field | Arabic Name | Example |
|-------|-------------|---------|
| waqfType | نوع الوقف | وقف خيري |
| propertyType | نوع العقار | سكني |
| endowedTo | موقوف على | الفقراء والمساكين |
| building | مبنى | برج أ |
| unitNumber | رقم الوحدة | 101 |

**Why these changes?**
- More detailed property information
- Better tracking and reporting
- Auto-fill from database with ability to edit

---

## 🔄 Migration Steps

### Step 1: Update Properties Sheet

**Current Structure (8 columns):**
```
A: id
B: code
C: name
D: road
E: block
F: area
G: governorate
H: defaultLocationLink
```

**New Structure (13 columns):**
```
A: id
B: code
C: name
D: waqfType            ← NEW
E: propertyType        ← NEW
F: endowedTo           ← NEW
G: building            ← NEW
H: unitNumber          ← NEW
I: road                ← MOVED from D
J: area                ← MOVED from F
K: governorate         ← MOVED from G
L: block               ← MOVED from E
M: defaultLocationLink ← MOVED from H
```

#### Option A: Manual Update (Recommended for small datasets)

1. **Open your Properties Sheet**
2. **Insert 5 new columns after column C:**
   - Right-click on column D
   - Select "Insert 5 columns to the right"
3. **Update headers in row 1:**
   - D1: `waqfType`
   - E1: `propertyType`
   - F1: `endowedTo`
   - G1: `building`
   - H1: `unitNumber`
4. **Leave the new columns empty** (or fill in data if available)
5. **Done!** Your data in columns I-M will automatically shift over

#### Option B: Using Google Sheets Script (For large datasets)

1. **Open your Properties Sheet**
2. **Go to Extensions → Apps Script**
3. **Paste this script:**

```javascript
function migratePropertiesSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();

  // Insert 5 columns after column C
  sheet.insertColumnsAfter(3, 5);

  // Update headers
  sheet.getRange('D1').setValue('waqfType');
  sheet.getRange('E1').setValue('propertyType');
  sheet.getRange('F1').setValue('endowedTo');
  sheet.getRange('G1').setValue('building');
  sheet.getRange('H1').setValue('unitNumber');

  SpreadsheetApp.getUi().alert('Migration complete! ✅\n\nColumns D-H have been added.\nYour existing data has been preserved.');
}
```

4. **Click the disk icon to save**
5. **Click Run**
6. **Grant permissions** when prompted
7. **Done!**

---

### Step 2: Update Reports Sheet

**Current Structure (21 columns A-U):**
```
A-E: Basic info (reportId, submittedAt, propertyId, propertyCode, propertyName)
F-I: Location (road, area, governorate, block)
J-U: Report details
```

**New Structure (26 columns A-Z):**
```
A-E: Basic info (unchanged)
F-J: NEW property fields (waqfType, propertyType, endowedTo, building, unitNumber)
K-N: Location (road, area, governorate, block) ← MOVED from F-I
O-Z: Report details ← MOVED from J-U
```

#### Option A: Manual Update

1. **Open your Reports Sheet**
2. **Insert 5 new columns after column E:**
   - Right-click on column F
   - Select "Insert 5 columns to the right"
3. **Update headers in row 1:**
   - F1: `waqfType`
   - G1: `propertyType`
   - H1: `endowedTo`
   - I1: `building`
   - J1: `unitNumber`
4. **Done!** Existing reports will have empty values for these fields

#### Option B: Using Google Sheets Script

```javascript
function migrateReportsSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();

  // Insert 5 columns after column E
  sheet.insertColumnsAfter(5, 5);

  // Update headers
  sheet.getRange('F1').setValue('waqfType');
  sheet.getRange('G1').setValue('propertyType');
  sheet.getRange('H1').setValue('endowedTo');
  sheet.getRange('I1').setValue('building');
  sheet.getRange('J1').setValue('unitNumber');

  SpreadsheetApp.getUi().alert('Migration complete! ✅\n\nColumns F-J have been added for property details.\nYour existing reports have been preserved.');
}
```

---

## ✅ Verification

After migration, verify your sheets:

### Properties Sheet Checklist:
- [ ] Column A: `id`
- [ ] Column B: `code`
- [ ] Column C: `name`
- [ ] Column D: `waqfType`
- [ ] Column E: `propertyType`
- [ ] Column F: `endowedTo`
- [ ] Column G: `building`
- [ ] Column H: `unitNumber`
- [ ] Column I: `road`
- [ ] Column J: `area`
- [ ] Column K: `governorate`
- [ ] Column L: `block`
- [ ] Column M: `defaultLocationLink`

### Reports Sheet Checklist:
- [ ] Columns A-E: Basic info (reportId → propertyName)
- [ ] Columns F-J: Property details (waqfType → unitNumber)
- [ ] Columns K-N: Location (road → block)
- [ ] Columns O-P: Location details (locationDescription, locationLink)
- [ ] Columns Q-R: Visit info (visitType, complaint)
- [ ] Columns S-T: Complaint files (complaintFilesCount, complaintFiles)
- [ ] Columns U-AB: Photos, findings, actions, corrector, inspector

---

## 🧪 Test Your Setup

1. **Restart your backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Test property search:**
   ```bash
   curl "http://localhost:8080/api/properties?search=test"
   ```

   You should see the new fields in the response:
   ```json
   {
     "id": "1",
     "code": "843",
     "name": "عقار النخيل السكني",
     "waqfType": "وقف خيري",
     "propertyType": "سكني",
     "endowedTo": "الفقراء والمساكين",
     "building": "برج أ",
     "unitNumber": "101",
     "road": "طريق الملك فهد",
     ...
   }
   ```

3. **Test the frontend:**
   - Open the app in your browser
   - Search for a property
   - Verify all new fields are displayed and editable
   - Submit a test report
   - Check your Reports sheet to see all fields saved correctly

---

## 📝 Filling in Data (Optional)

You can fill in the new property fields in your Properties sheet:

### Bulk Update via CSV:

1. **Export your Properties sheet** to CSV
2. **Open in Excel/Google Sheets**
3. **Add data** to columns D-H
4. **Re-import** to Google Sheets

### Manual Entry:

Just edit the cells directly in your Properties sheet. The new fields will:
- ✅ Auto-fill in the form when a property is selected
- ✅ Remain editable even when populated
- ✅ Be saved in reports

### Leave Empty:

It's perfectly fine to leave these fields empty! The system will:
- Show empty fields in the form
- Allow users to fill them during report submission
- Save whatever the user enters

---

## 🐛 Troubleshooting

### "Properties not loading"
- Check that you inserted columns in the correct position (after column C)
- Verify headers match exactly (case-sensitive)
- Make sure your service account still has Editor access

### "Reports not saving"
- Check that you inserted columns in the correct position (after column E)
- Verify all column headers are present (A-Z)
- Restart your backend after migration

### "Old data is missing"
- Don't worry! When you insert columns, Google Sheets automatically shifts data
- Your old data should be in columns I-M (Properties) or K-Z (Reports)
- Check the "Version history" if something went wrong

### Need to rollback?
1. Go to File → Version history → See version history
2. Find the version before migration
3. Click "Restore this version"

---

## 🎉 You're Done!

Your Google Sheets are now updated to support the new property fields.

New reports will include:
- ✅ All 5 new property fields
- ✅ Auto-filled from database
- ✅ Editable before submission
- ✅ Saved in Reports sheet

**Questions?** Check the main documentation in `SHEETS_TEMPLATES.md`
