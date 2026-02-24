# KYC & AML Compliance Roadmap

## Current State

SusuPay is a **record-keeping layer** on top of existing MTN MoMo transactions — it does not move money, hold float, or operate a wallet. This distinction matters for regulatory scope in Ghana.

### What's Already in Place
- Phone-based identity (collectors + clients tied to MTN MoMo numbers)
- Transaction audit trail with SMS verification and screenshot evidence
- Multi-tenant isolation (collectors cannot access each other's data)
- Raw SMS text encrypted at rest (pgcrypto)
- Phone numbers never logged in plaintext
- OTP-based client verification (hashed, 5-min expiry)

---

## Regulatory Framework

### 1. Payment Systems and Services Act (2019)
- If SusuPay remains record-keeping only (no float, no wallet, no fund transfers), it likely falls **outside** Bank of Ghana's direct licensing requirements
- If it ever facilitates transfers or holds funds, it would need a **Payment Service Provider (PSP)** or **Enhanced Mobile Money** license
- Monitor BoG's evolving fintech sandbox and regulatory guidelines

### 2. Data Protection Act (2012)
- Ghana's DPA requires **explicit consent** for personal data processing
- Cross-border data transfer restrictions apply — Supabase EU hosting is acceptable but needs a formal **data processing impact assessment** for production
- Appoint a Data Protection Officer if processing data at scale
- Register with the Data Protection Commission

### 3. Electronic Transactions Act (2008)
- Provides legal recognition for electronic records and signatures
- SMS-based transaction records have legal standing under this act

---

## KYC Strategy: Tiered Approach

### Tier 1 — Minimum (Current)
- **Who:** All users (collectors + clients)
- **Requirements:** Phone number + OTP verification
- **Rationale:** Leverages implicit KYC from MoMo accounts (which require Ghana Card verification at the telco level)
- **Limits:** Suitable for small daily susu contributions

### Tier 2 — Medium (Recommended for Production)
- **Who:** Collectors (they handle group funds)
- **Requirements:**
  - Full legal name
  - Ghana Card number (NIA)
  - MoMo registered name cross-check
  - Business location (GPS digital address if available)
- **Implementation:** Add fields to collector registration, verify Ghana Card via NIA API or manual review
- **Limits:** Higher transaction volumes, larger group sizes

### Tier 3 — Enhanced (Future / High Volume)
- **Who:** Collectors exceeding volume thresholds, institutional users
- **Requirements:**
  - Ghana Card photo upload + liveness check
  - Proof of address / business registration
  - Source of funds declaration
  - Periodic re-verification
- **Implementation:** Integrate with identity verification provider (e.g., Smile Identity, Appruve)
- **Limits:** Unlimited

---

## AML Considerations

### Risk Profile
Traditional susu carries inherent AML risks: cash-based, informal, no paper trail. SusuPay **reduces** these risks by creating digital records. Key residual risks:

- **Structuring:** Splitting deposits to stay below reporting thresholds
- **Layering:** Using multiple susu groups to obscure fund origins
- **Identity fraud:** Fake phone numbers or SIM swap attacks

### Recommended Controls

#### Transaction Monitoring
- Flag unusual deposit patterns (sudden spikes, round-number structuring)
- Alert on transaction velocity exceeding norms for group size
- Monitor for dormant accounts with sudden activity
- Track cumulative daily/weekly/monthly volumes per collector

#### Suspicious Activity Reporting
- Build internal SAR (Suspicious Activity Report) workflow
- Define escalation thresholds aligned with BoG guidelines
- Maintain audit logs for all flagged transactions
- Report to Financial Intelligence Centre (FIC) as required

#### Account Controls
- Rate limiting already in place (5 submissions/hour, 3 OTP attempts/10 min)
- Add maximum group size limits
- Add daily/monthly transaction caps per tier
- Implement cooling-off periods for new accounts

---

## Implementation Priority

| Priority | Item | Effort | Dependency |
|----------|------|--------|------------|
| P0 | Terms of Service + Privacy Policy | Low | Legal review |
| P0 | Data Protection Commission registration | Low | Legal |
| P1 | Collector Tier 2 KYC fields | Medium | DB migration + UI |
| P1 | Transaction volume monitoring | Medium | Background worker |
| P2 | Ghana Card verification API | Medium | NIA API access or 3rd party |
| P2 | SAR workflow + FIC reporting | Medium | Compliance process |
| P3 | Liveness check / biometric | High | 3rd party integration |
| P3 | Automated AML scoring | High | ML pipeline |

---

## Useful Contacts & Resources

- **Bank of Ghana — Fintech & Innovation Office:** Regulatory sandbox inquiries
- **Data Protection Commission Ghana:** Registration and compliance
- **Financial Intelligence Centre (FIC):** SAR reporting obligations
- **National Identification Authority (NIA):** Ghana Card verification API
- **Ghana Interbank Payment and Settlement Systems (GhIPSS):** Interoperability standards

---

## Notes

- The current architecture supports adding KYC fields and compliance checks without major restructuring
- Collector registration already follows a multi-step flow — adding KYC fields fits naturally
- The Celery worker infrastructure can handle background verification jobs and monitoring tasks
- Revisit this document when approaching real users or seeking regulatory approval
