# Google Sheets Templates

Quick reference for setting up your Google Sheets.

---

## 📊 Properties Sheet Template

**Sheet Name:** `Properties` (or set in `PROPERTIES_SHEET_NAME` env var)

### Column Headers (Row 1):

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | id | Unique property ID | 1, 2, 3... |
| B | code | Property code used by inspectors | 843, 844, 100 |
| C | name | Property name (Arabic/English) | عقار النخيل السكني |
| D | waqfType | Waqf type (نوع الوقف) | وقف خيري |
| E | propertyType | Property type (نوع العقار) | سكني |
| F | endowedTo | Endowed to (موقوف على) | الفقراء والمساكين |
| G | building | Building (مبنى) | برج أ |
| H | unitNumber | Unit number (رقم الوحدة) | 101 |
| I | road | Road/Street (طريق \ شارع) | طريق الملك فهد |
| J | area | Area (المنطقة) | المنامة |
| K | governorate | Governorate (المحافظة) | محافظة العاصمة |
| L | block | Complex (مجمع) | مجمع أ |
| M | defaultLocationLink | Google Maps link (optional) | https://maps.google.com/?q=26.2285,50.5860 |

### Example Data:

```
A    B    C                      D           E       F                    G      H    I                J        K                L        M
id   code name                   waqfType    type    endowedTo            bldg   unit road             area     governorate      block    defaultLocationLink
1    843  عقار النخيل السكني    وقف خيري   سكني    الفقراء والمساكين   برج أ  101  طريق الملك فهد   المنامة  محافظة العاصمة   مجمع أ   https://maps.google.com/?q=26.2285,50.5860
2    844  عقار الورود التجاري  وقف ذري    تجاري  أهل الواقف          برج ب  202  شارع البديع       المحرق   محافظة المحرق    مجمع ب   https://maps.google.com/?q=26.2540,50.6130
3    100  برج المستقبل          وقف خيري   مكتبي  المساجد             برج ج  303  طريق الشيخ عيسى الرفاع   محافظة الجنوبية  مجمع ج   https://maps.google.com/?q=26.1296,50.5550
```

**Note:** Columns D-L can be left empty if data is not available. The frontend will auto-fill these fields from the database when a property is selected, and users can edit them before submitting.

### Bulk Import from CSV

If you have existing data in CSV format:

1. Open your Properties Sheet
2. File → Import
3. Upload your CSV file
4. Make sure columns match the template above

---

## 📋 Reports Sheet Template

**Sheet Name:** `Reports` (or set in `REPORTS_SHEET_NAME` env var)

### Column Headers (Row 1):

| Column | Header | Description | Type |
|--------|--------|-------------|------|
| A | reportId | Unique report ID (REPORT-001, REPORT-002, etc.) | Text |
| B | submitDate | Submission date (YYYY-MM-DD) | Date |
| C | submitTime | Submission time (HH:mm:ss, Bahrain time) | Time |
| D | propertyId | Property ID | Text |
| E | propertyCode | Property code | Text |
| F | propertyName | Property name | Text |
| G | waqfType | Waqf type (نوع الوقف) | Text |
| H | propertyType | Property type (نوع العقار) | Text |
| I | endowedTo | Endowed to (موقوف على) | Text |
| J | building | Building (مبنى) | Text |
| K | unitNumber | Unit number (رقم الوحدة) | Text |
| L | road | Road/Street (طريق \ شارع) | Text |
| M | area | Area (المنطقة) | Text |
| N | governorate | Governorate (المحافظة) | Text |
| O | block | Complex (مجمع) | Text |
| P | locationDescription | Location description | Text |
| Q | locationLink | Google Maps link | Text |
| R | visitType | Type of visit (routine/complaint) | Text |
| S | complaint | Complaint details (if visitType=complaint) | Text |
| T | complaintFilesCount | Number of complaint files | Number |
| U | complaintFiles | Complaint files (PDFs, images, etc.) | JSON Array |
| V | mainPhotosCount | Number of main photos | Number |
| W | mainPhotosUrls | URLs of main photos | JSON Array |
| X | findingsCount | Number of findings | Number |
| Y | findings | Findings with photos | JSON Array |
| Z | actionsCount | Number of actions | Number |
| AA | actions | Actions taken | JSON Array |
| AB | corrector | Corrector name (optional) | Text |
| AC | inspectorName | Inspector name (optional) | Text |
| AD | floorsCount | Number of floors (عدد الطوابق) | Number |
| AE | flatsCount | Number of flats (عدد الشقق) | Number |
| AF | additionalNotes | Additional notes (ملاحظات إضافية) | Text |

### Example Headers (Copy-Paste):

```
reportId	submitDate	submitTime	propertyId	propertyCode	propertyName	waqfType	propertyType	endowedTo	building	unitNumber	road	area	governorate	block	locationDescription	locationLink	visitType	complaint	complaintFilesCount	complaintFiles	mainPhotosCount	mainPhotosUrls	findingsCount	findings	actionsCount	actions	corrector	inspectorName	floorsCount	flatsCount	additionalNotes
```

### Notes:

- **Columns T, V, X, Z** contain JSON data (arrays)
- **Columns F-N** store property details that can be edited during report submission
- **Column Q (visitType)** can be "routine" or "complaint"
  - If "routine": complaint field (R) is optional
  - If "complaint": complaint field (R) is required, and complaint files (T) can be attached
- **Complaint files (Column T)** can include PDFs, images, documents, videos, etc.
- Data is automatically added by the backend when reports are submitted
- You can add formulas in additional columns for analysis
- Don't delete or rename these columns - the backend depends on them

---

## 📁 Google Drive Folder Structure

The backend automatically creates this structure:

```
VisitProp Uploads/  (your main folder)
├── 843 - عقار النخيل السكني/           (code - name)
│   └── 2024-01-15/                      (date)
│       ├── الصور الرئيسية/              (main photos)
│       │   ├── photo1.jpg
│       │   └── photo2.jpg
│       ├── Finding1 - تسرب في السقف/    (finding 1 description)
│       │   ├── image1.jpg
│       │   └── image2.jpg
│       ├── Finding2 - شرخ في الجدار/    (finding 2 description)
│       │   └── image1.jpg
│       └── ملفات البلاغ/                (complaint files)
│           ├── document.pdf
│           └── report.docx
├── 844 - عقار الورود التجاري/
│   └── 2024-01-15/
│       └── الصور الرئيسية/
│           └── photo1.jpg
```

### Folder Organization Rules:

1. **Property Folder** - Named as `[Code] - [Property Name]` (e.g., "843 - عقار النخيل السكني")
2. **Date Folder** - One folder per day in YYYY-MM-DD format
3. **Main Photos** - Stored in "الصور الرئيسية" folder
4. **Finding Photos** - Each finding gets its own folder: "Finding[N] - [description]"
   - Description is limited to first 50 characters of the finding text
5. **Complaint Files** - Stored in "ملفات البلاغ" folder (PDFs, documents, etc.)
6. **Filenames** - Use original filenames (Arabic characters supported)

This structure makes it easy to:
- Find all files for a specific property by name and code
- Find all files from a specific date
- See findings organized by description
- Distinguish between main photos, findings, and complaint documents
- Archive old data by property or date

---

## 🎨 Optional: Make Sheets Pretty

### Properties Sheet:

1. **Freeze header row**: View → Freeze → 1 row
2. **Format header**: Bold, centered, background color
3. **Auto-resize columns**: Select all → Format → Resize columns → Fit to data
4. **Add data validation** for code column (if needed)
5. **Add filter views**: Data → Create a filter

### Reports Sheet:

1. **Freeze header row**: View → Freeze → 1 row
2. **Format timestamps**: Select column B → Format → Number → Date time
3. **Format counts**: Select columns N, P, R → Format → Number → Number
4. **Wrap text**: Select columns J, M, O, Q, S → Format → Text wrapping → Wrap
5. **Add conditional formatting** for visit types or status

### Useful Formulas:

#### Total Reports Per Property:
```excel
=COUNTIF(D:D, "843")
```

#### Reports This Month:
```excel
=COUNTIF(B:B, ">="&DATE(2024,1,1))
```

#### Average Photos Per Report:
```excel
=AVERAGE(N:N)
```

---

## 🔄 Data Migration

If you're migrating from an existing system:

### From Excel:

1. Open your Excel file
2. Save As → CSV (Comma delimited)
3. Upload to Google Sheets (File → Import)
4. Map columns to match the template

### From Database:

Export as CSV with these columns in order:
```sql
SELECT
  id,
  code,
  name,
  waqf_type,
  property_type,
  endowed_to,
  building,
  unit_number,
  road,
  area,
  governorate,
  block,
  default_location_link
FROM properties
```

Then import to Google Sheets.

---

## 📊 Reporting & Analytics

### Built-in Google Sheets Features:

1. **Pivot Tables** - Analyze reports by property, date, visit type
2. **Charts** - Visualize trends over time
3. **Data Studio** - Connect for advanced dashboards
4. **Apps Script** - Automate tasks or add custom functions

### Example Queries:

```javascript
// Count reports by property
=QUERY(Reports!D:D, "SELECT D, COUNT(D) GROUP BY D")

// Reports this week
=QUERY(Reports!B:U, "SELECT * WHERE B >= date '"&TEXT(TODAY()-7,"yyyy-mm-dd")&"'")

// Properties with most complaints
=QUERY(Reports!D:M, "SELECT D, COUNT(D) GROUP BY D ORDER BY COUNT(D) DESC")
```

---

## 🔐 Access Control

### Service Account Access (Required):

- **Properties Sheet**: Editor permission
- **Reports Sheet**: Editor permission
- **Drive Folder**: Editor permission

### Human Users (Optional):

You can also share with team members:

- **Managers**: Can edit properties and view reports
- **Analysts**: View-only access for reporting
- **Auditors**: View-only access with download disabled

Settings → Share → Add people → Set permissions

---

## 🆘 Common Issues

### Backend can't read properties:
- Check service account has Editor access
- Verify Sheet ID in .env
- Verify column headers match exactly

### Properties not showing in search:
- Check data starts on row 2 (row 1 is headers)
- Check no extra spaces in property names/codes
- Check sheet name matches `PROPERTIES_SHEET_NAME` in .env

### Reports not being saved:
- Check service account has Editor access to Reports sheet
- Verify Sheet ID in .env
- Check column headers match exactly (including order)

---

**Now you're ready to populate your sheets and start collecting reports! 🎉**
