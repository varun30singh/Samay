# SAMAY — Statutory Metrics & Performance Definitions (Single Source of Truth)

**Document Reference:** `docs/METRICS.md`  
**Governing Standard:** AICTE Approval Process Handbook (APH) Statutory Timelines & Pendency Standards  
**Engine Implementation:** `lib/metricsService.ts`

---

## 1. Statutory Metric Formulas

### 1.1 Pending Applications
- **Definition:** All active applications currently in the regulatory approval pipeline that have not reached a terminal determination.
- **Terminal Stages:** `approved`, `rejected`, `withdrawn`, `closed`.
- **Formula:**
  $$\text{Pending} = \{ a \in \text{Applications} \mid a.\text{stage} \notin \{\text{'approved'}, \text{'rejected'}, \text{'withdrawn'}, \text{'closed'}\} \land a.\text{stage} \ne \text{'draft'} \}$$
- **SQL / Prisma Predicate:**
  ```prisma
  where: {
    stage: { notIn: ['draft', 'approved', 'rejected', 'withdrawn', 'closed'] }
  }
  ```

---

### 1.2 Overdue Applications
- **Definition:** Any active (pending) application whose current processing duration has exceeded the statutory deadline or current stage SLA.
- **Formula:**
  $$\text{Overdue} = \{ a \in \text{Pending} \mid a.\text{statutory\_deadline} < T_{\text{current}} \lor a.\text{stage\_sla\_deadline} < T_{\text{current}} \}$$
- **SQL / Prisma Predicate:**
  ```prisma
  where: {
    stage: { notIn: ['draft', 'approved', 'rejected', 'withdrawn', 'closed'] },
    statutory_deadline: { lt: currentDate }
  }
  ```
- **Rule:** A completed (approved or rejected) application is NEVER classified as overdue in current pendency KPI cards, even if it was decided past the deadline. Historical delayed completions are captured under the *On-Time Rate*.

---

### 1.3 Approved Applications
- **Definition:** Applications that have completed statutory scrutiny, inspections, and committee reviews, receiving a formal grant of approval from the Competent Authority.
- **Formula:**
  $$\text{Approved} = \{ a \in \text{Applications} \mid a.\text{stage} = \text{'approved'} \}$$

---

### 1.4 Rejected Applications
- **Definition:** Applications formally rejected by the Competent Authority with recorded statutory grounds.
- **Formula:**
  $$\text{Rejected} = \{ a \in \text{Applications} \mid a.\text{stage} = \text{'rejected'} \}$$

---

### 1.5 Returned for Deficiency
- **Definition:** Applications currently held at the institution's desk awaiting compliance rectification following a formal notice issued by a Scrutiny Officer or Committee.
- **Distinction:** This metric represents current pendency at the institution (`stage = 'deficiency_raised'`). It is distinct from lifetime deficiency counts.
- **Formula:**
  $$\text{Returned For Deficiency} = \{ a \in \text{Applications} \mid a.\text{stage} = \text{'deficiency\_raised'} \}$$

---

### 1.6 Awaiting EVC (Expert Visit Committee)
- **Definition:** Applications that have successfully cleared preliminary scrutiny and require physical or hybrid expert committee inspection, either awaiting panel assignment or scheduled for inspection.
- **Formula:**
  $$\text{Awaiting EVC} = \{ a \in \text{Applications} \mid a.\text{stage} \in \{\text{'ready\_for\_evc'}, \text{'evc\_scheduled'}\} \}$$

---

### 1.7 Average Processing Time (Calendar Days / Working Days)
- **Definition:** The mean duration in calendar days from the date of application submission (`submitted_at`) to the date of final determination (`final_decision_at`) for all completed applications within the queried filter window.
- **Exclusion:** Applications in `draft` or still `pending` are excluded from this calculation to avoid truncation bias.
- **Formula:**
  $$\text{Avg Processing Time} = \frac{1}{|C|} \sum_{a \in C} \left( \frac{a.\text{final\_decision\_at} - a.\text{submitted\_at}}{86,400,000 \text{ ms}} \right)$$
  where $C = \{ a \in \text{Applications} \mid a.\text{stage} \in \{\text{'approved'}, \text{'rejected'}\} \land a.\text{submitted\_at} \ne \text{null} \land a.\text{final\_decision\_at} \ne \text{null} \}$.
- **Boundary Handling:** If $|C| = 0$, the metric returns `null` (displayed as `N/A` or `--` in the UI).

---

### 1.8 On-Time Rate (%)
- **Definition:** The proportion of completed applications whose final determination occurred on or before their statutory deadline.
- **Formula:**
  $$\text{On-Time Rate} = \frac{|\{ a \in C \mid a.\text{final\_decision\_at} \le a.\text{statutory\_deadline} \}|}{|C|} \times 100\%$$
- **Boundary Handling:** If $|C| = 0$, the metric returns `null` (displayed as `N/A` in the UI).

---

## 2. Regional Jurisdictions
The AICTE regulatory framework partitions institutional oversight into 8 statutory regions:
1. **Western:** Maharashtra, Goa, Daman & Diu, Dadra & Nagar Haveli
2. **Northern:** Uttar Pradesh, Uttarakhand
3. **Southern:** Tamil Nadu, Puducherry
4. **Eastern:** West Bengal, Odisha, Bihar, Jharkhand, Assam, NE States
5. **Central:** Madhya Pradesh, Chhattisgarh, Gujarat
6. **South-Western:** Karnataka, Kerala, Lakshadweep
7. **South-Central:** Andhra Pradesh, Telangana
8. **North-Western:** Delhi, Haryana, Punjab, Himachal Pradesh, Jammu & Kashmir, Ladakh, Rajasthan

---

## 3. CSV Formula Injection Defense
When exporting tabular analytics to CSV format, all user-controllable and textual fields are sanitized:
- Any cell whose leading character is `=`, `+`, `-`, `@`, `\t`, or `\r` MUST be prefixed with an apostrophe `'`.
- All fields containing commas `,`, double quotes `"`, or line breaks MUST be quoted in accordance with RFC 4180: `"field content with ""escaped quotes"""`.
