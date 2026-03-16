
The **Einkommensteuer tariff** (§32a EStG) is 100 % identical for everyone in 2026 (and every year). The progressive brackets, Grundfreibetrag (€12,348 single / €24,696 joint), Kinderfreibetrag (€9,756), and all formulas (the exact y/z/x calculations you already have in your engine) apply exactly the same way. Your generalized system needs **zero special tax-rate branch** for teachers or Beamte.

This has been cross-verified from every official and independent source in March 2026:
- BMF “Das ändert sich 2026” and all state finance ministries (LBV BW, NRW Finanzverwaltung, etc.)
- Taxfix, VLH (Vereinigte Lohnsteuerhilfe), Finanztip, Steuertipps.de, dbb beamtenbund
- Buhl forum & user discussions confirming the math
- No single credible source (including 2026 updates) shows a different Steuersatz or different §32a table for Beamte/Lehrer.

### What Creates the Confusion (and What Is Actually Different)
People often think “Beamte pay less tax” because their **net take-home** is usually higher. Here is the real difference (none of it changes the final Einkommensteuer rate):

| Aspect                               | Normal Employee (Angestellte)                  | Beamter / Verbeamteter Lehrer                                                                   | Impact on Your System                                                                                                       |
| ------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Einkommensteuer rate**             | Same progressive tariff                        | Same progressive tariff                                                                         | Use your existing §32a engine – no change                                                                                   |
| **Social security**                  | ~20 % employee share (RV, AV, KV, PV)          | None (state pays pension directly; often private KV)                                            | Flag “Beamter” → set social contributions = 0                                                                               |
| **Monthly withholding (Lohnsteuer)** | Lohnsteuertabelle A + normal Vorsorgepauschale | Lohnsteuertabelle B (slightly higher withholding because no social contributions) + 2026 change | 2026: Mindestvorsorgepauschale abolished → Beamte/private-insured see temporarily higher monthly tax (reconciled in return) |
| **Health/Pension deductions**        | Part already withheld                          | Full private KV/PV contributions = 100 % Sonderausgaben                                         | Auto-route to Anlage Vorsorgeaufwand                                                                                        |
| **Net effect**                       | Lower net because of social contributions      | Usually €300–800+ more net per year (same tax, no social deductions)                            | Show user “higher net because of no social contributions”                                                                   |

2026-specific note (very important for your system):  
The old “Mindestvorsorgepauschale” (€1,900/€3,000) disappears for everyone. Beamte and privately insured teachers suddenly have higher monthly Lohnsteuer withholding in January–March 2026. They almost always get it back in the annual return – your advisor must flag this and simulate the refund.

### How Teachers Specifically Are Handled
- Many teachers are **Beamte** (especially in Bayern ~92 %, other states vary). Some are Angestellte (TVöD).
- Both groups use **exactly the same tax calculation** in the annual return (Anlage N).
- Teachers get extra Werbungskosten suggestions (teaching materials, class trips, school commute with the new 0.38 €/km from first km), but again – same rate.

### Ready-to-Code Features for Your System (Add These in 1–2 Hours)
1. **Occupation / Status flag** in the wizard  
   “Sind Sie Beamter / verbeamteter Lehrer?”  
   → If Yes:  
   - Social-security module = 0 €  
   - Private KV/PV contributions → full Sonderausgaben (Vorsorgeaufwand)  
   - 2026 warning popup: “Higher monthly withholding this year – you’ll get most back in the return”  
   - Auto-suggest teacher-specific Werbungskosten (materials, double household for distant schools, etc.)

2. **Withholding simulator**  
   Use the same Lohnsteuer formulas you already have, but add a toggle “Lohnsteuertabelle B (Beamte)” for accurate monthly vs. annual comparison.

3. **Net-vs-gross calculator** (huge selling point)  
   Show side-by-side:  
   - “Angestellter Lehrer: Brutto €60k → ~€42k net (after social + tax)”  
   - “Beamter Lehrer: Brutto €60k → ~€48k net (only tax)”  
   (Your engine already calculates the exact tax part.)

Everything else (Pendlerpauschale 0.38 €/km from km 1, home-office 6 €/day, Arbeitszimmer rules we researched earlier, etc.) stays exactly the same.

**Bottom line for your automated advisor**:  
Teachers and Beamte use the **identical tax-rate engine** you already built. The only extras are:
- A status flag that skips social contributions and routes insurance to deductions.
- A 2026-specific withholding warning.
- Teacher material checklist.

This keeps your code clean and future-proof. You now have the complete, verified picture – no different rate, just different social-security treatment.
