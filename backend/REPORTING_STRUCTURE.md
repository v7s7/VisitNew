# 📊 Advanced Reporting Structure

This document describes the complete reporting system with automated summaries and dashboards.

---

## 📋 Sheet Structure Overview

Your Google Sheets workbook should have these tabs:

1. **Reports** - Raw data (all report submissions)
2. **Monthly Summary** - Auto-generated monthly statistics
3. **Yearly Summary** - Auto-generated yearly statistics
4. **By Building** - Reports grouped by building/property
5. **Dashboard** - Visual overview with key metrics

---

## 1️⃣ Reports Sheet (Raw Data)

**Purpose:** Store all raw report data (current structure - don't change)

This is your single source of truth. All other sheets pull data from here.

**Columns A-AE:** (as documented in SHEETS_TEMPLATES.md)

---

## 2️⃣ Monthly Summary Sheet

**Purpose:** Automatic monthly breakdown of all visits

### Column Headers:

| Column | Header | Formula/Description |
|--------|--------|---------------------|
| A | Month | YYYY-MM format (e.g., 2024-01) |
| B | Total Visits | Count of all reports that month |
| C | Routine Visits | Count where visitType = "routine" |
| D | Complaint Visits | Count where visitType = "complaint" |
| E | Properties Visited | Unique property count |
| F | Total Findings | Sum of all findings |
| G | Total Photos | Sum of all photos |
| H | Avg Findings Per Visit | Average findings per report |

### Setup Instructions:

**Step 1:** Create a new sheet called "Monthly Summary"

**Step 2:** Add headers in Row 1 (A1:H1)

**Step 3:** In A2, add first month manually (e.g., "2024-01")

**Step 4:** Add these formulas:

```
B2: =COUNTIFS(Reports!$B:$B,">="&DATE(LEFT(A2,4),RIGHT(A2,2),1),Reports!$B:$B,"<"&DATE(LEFT(A2,4),RIGHT(A2,2)+1,1))

C2: =COUNTIFS(Reports!$B:$B,">="&DATE(LEFT(A2,4),RIGHT(A2,2),1),Reports!$B:$B,"<"&DATE(LEFT(A2,4),RIGHT(A2,2)+1,1),Reports!$Q:$Q,"routine")

D2: =COUNTIFS(Reports!$B:$B,">="&DATE(LEFT(A2,4),RIGHT(A2,2),1),Reports!$B:$B,"<"&DATE(LEFT(A2,4),RIGHT(A2,2)+1,1),Reports!$Q:$Q,"complaint")

E2: =SUMPRODUCT((TEXT(Reports!$B:$B,"YYYY-MM")=A2)/COUNTIFS(Reports!$D:$D,Reports!$D:$D&"",Reports!$B:$B,Reports!$B:$B))

F2: =SUMIFS(Reports!$W:$W,Reports!$B:$B,">="&DATE(LEFT(A2,4),RIGHT(A2,2),1),Reports!$B:$B,"<"&DATE(LEFT(A2,4),RIGHT(A2,2)+1,1))

G2: =SUMIFS(Reports!$U:$U,Reports!$B:$B,">="&DATE(LEFT(A2,4),RIGHT(A2,2),1),Reports!$B:$B,"<"&DATE(LEFT(A2,4),RIGHT(A2,2)+1,1))

H2: =IF(B2>0,F2/B2,0)
```

**Step 5:** Add months in column A (2024-01, 2024-02, etc.) and copy formulas down

---

## 3️⃣ Yearly Summary Sheet

**Purpose:** Annual statistics and trends

### Column Headers:

| Column | Header | Description |
|--------|--------|-------------|
| A | Year | 2024, 2025, etc. |
| B | Total Visits | All reports that year |
| C | Routine Visits | Routine inspections |
| D | Complaint Visits | Complaint-based visits |
| E | Properties Visited | Unique properties |
| F | Total Findings | All findings |
| G | Total Photos | All photos |
| H | Avg Visits/Month | Average per month |

### Setup Instructions:

**Step 1:** Create a new sheet called "Yearly Summary"

**Step 2:** Add headers in Row 1

**Step 3:** Add year in A2 (e.g., "2024")

**Step 4:** Add formulas:

```
B2: =COUNTIFS(Reports!$B:$B,">="&DATE(A2,1,1),Reports!$B:$B,"<"&DATE(A2+1,1,1))

C2: =COUNTIFS(Reports!$B:$B,">="&DATE(A2,1,1),Reports!$B:$B,"<"&DATE(A2+1,1,1),Reports!$Q:$Q,"routine")

D2: =COUNTIFS(Reports!$B:$B,">="&DATE(A2,1,1),Reports!$B:$B,"<"&DATE(A2+1,1,1),Reports!$Q:$Q,"complaint")

E2: =SUMPRODUCT((YEAR(Reports!$B:$B)=A2)/COUNTIFS(Reports!$D:$D,Reports!$D:$D&"",Reports!$B:$B,Reports!$B:$B))

F2: =SUMIFS(Reports!$W:$W,Reports!$B:$B,">="&DATE(A2,1,1),Reports!$B:$B,"<"&DATE(A2+1,1,1))

G2: =SUMIFS(Reports!$U:$U,Reports!$B:$B,">="&DATE(A2,1,1),Reports!$B:$B,"<"&DATE(A2+1,1,1))

H2: =B2/12
```

---

## 4️⃣ By Building Sheet

**Purpose:** Reports grouped by property/building

### Using QUERY Function (Recommended):

```
=QUERY(Reports!A:AE, "SELECT D, E, COUNT(A), SUM(W), SUM(U) WHERE A IS NOT NULL GROUP BY D, E ORDER BY COUNT(A) DESC LABEL D 'Property Code', E 'Property Name', COUNT(A) 'Total Visits', SUM(W) 'Total Findings', SUM(U) 'Total Photos'", 1)
```

This will automatically generate a table showing:
- Property Code
- Property Name
- Total Visits
- Total Findings
- Total Photos

Sorted by most visited properties.

### Alternative: Pivot Table

1. Go to Data → Pivot Table
2. Select data range: Reports!A:AE
3. Rows: Add "propertyCode" and "propertyName"
4. Values: Add COUNT of reportId, SUM of findingsCount, SUM of mainPhotosCount
5. Sort by: Total visits (descending)

---

## 5️⃣ Dashboard Sheet

**Purpose:** Executive overview with key metrics

### Layout:

```
┌─────────────────────────────────────┐
│         VISITPROP DASHBOARD         │
├─────────────────────────────────────┤
│                                     │
│  📊 This Month                      │
│  Total Visits: 45                   │
│  Routine: 32  |  Complaints: 13     │
│  Properties Visited: 28             │
│                                     │
│  📈 This Year                       │
│  Total Visits: 523                  │
│  Avg Visits/Month: 43.6             │
│  Total Findings: 1,247              │
│                                     │
│  🏢 Top 5 Most Visited Properties   │
│  1. 843 - عقار النخيل (45 visits)   │
│  2. 844 - عقار الورود (38 visits)   │
│  ...                                │
│                                     │
│  🔴 Most Complaints                 │
│  1. Property 100 (12 complaints)    │
│  2. Property 205 (8 complaints)     │
│  ...                                │
└─────────────────────────────────────┘
```

### Formulas for Dashboard:

**This Month's Total:**
```
=COUNTIFS(Reports!$B:$B,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),Reports!$B:$B,"<"&DATE(YEAR(TODAY()),MONTH(TODAY())+1,1))
```

**This Month's Routine:**
```
=COUNTIFS(Reports!$B:$B,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),Reports!$B:$B,"<"&DATE(YEAR(TODAY()),MONTH(TODAY())+1,1),Reports!$Q:$Q,"routine")
```

**This Year's Total:**
```
=COUNTIFS(Reports!$B:$B,">="&DATE(YEAR(TODAY()),1,1),Reports!$B:$B,"<"&DATE(YEAR(TODAY())+1,1,1))
```

**Top 5 Properties (using QUERY):**
```
=QUERY(Reports!D:E, "SELECT D, E, COUNT(D) WHERE D IS NOT NULL GROUP BY D, E ORDER BY COUNT(D) DESC LIMIT 5 LABEL D 'Code', E 'Name', COUNT(D) 'Visits'", 1)
```

**Top Complaints:**
```
=QUERY(Reports!D:Q, "SELECT D, E, COUNT(D) WHERE D IS NOT NULL AND Q='complaint' GROUP BY D, E ORDER BY COUNT(D) DESC LIMIT 5 LABEL D 'Code', E 'Name', COUNT(D) 'Complaints'", 1)
```

---

## 📊 Visual Charts

### Recommended Charts:

1. **Monthly Trend Line Chart**
   - Data: Monthly Summary → Columns A, B
   - Shows visit trends over time

2. **Routine vs Complaint Pie Chart**
   - Data: Monthly Summary → Current month's C and D
   - Shows distribution of visit types

3. **Top Properties Bar Chart**
   - Data: By Building → Top 10 properties
   - Horizontal bar chart

4. **Findings Distribution**
   - Data: Reports → findingsCount column
   - Histogram showing finding frequency

---

## 🔄 Auto-Refresh with Google Apps Script (Optional)

Add a script to auto-refresh summaries:

```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('VisitProp')
    .addItem('Refresh Reports', 'refreshReports')
    .addToUi();
}

function refreshReports() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dashboard = ss.getSheetByName('Dashboard');

  // Force recalculation
  dashboard.getRange('A1').setValue(new Date());

  SpreadsheetApp.flush();
  Browser.msgBox('Reports refreshed!');
}
```

---

## 📤 Export Reports

### Monthly Report PDF:

1. Go to Dashboard or Monthly Summary
2. File → Download → PDF
3. Set page orientation: Landscape
4. Choose: Current sheet only

### Excel Export:

1. File → Download → Microsoft Excel (.xlsx)
2. All sheets will be included

---

## 🎯 Quick Setup Checklist

- [ ] Keep "Reports" sheet with raw data (A-AE columns)
- [ ] Create "Monthly Summary" sheet with formulas
- [ ] Create "Yearly Summary" sheet with formulas
- [ ] Create "By Building" sheet with QUERY or Pivot Table
- [ ] Create "Dashboard" sheet with key metrics
- [ ] Add charts for visual representation
- [ ] Set up conditional formatting for alerts (optional)
- [ ] Share view-only link with stakeholders

---

## 🚀 Benefits of This Structure

✅ **Automatic Updates** - All summaries update when new reports are added
✅ **No Manual Work** - Formulas do all the calculations
✅ **Clear Insights** - Easy to see trends and patterns
✅ **Professional Reports** - Export clean PDFs for management
✅ **Performance Tracking** - Track inspectors, properties, and trends
✅ **Scalable** - Works with 10 reports or 10,000 reports

---

**Your raw data stays in the "Reports" sheet. All analysis happens automatically in the other sheets!** 📊
