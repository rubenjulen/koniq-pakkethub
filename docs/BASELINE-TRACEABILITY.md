# Baseline-traceability — v0.2.0 vs. Build-Ready Requirement Baseline v2.0

De baseline telt **496 requirements** (352 functioneel, 48 non-functioneel, 96 control `CR-*`),
20 risicoscenario's, 49 E2E-tests, 28 go-live-gates, verdeeld over releases R0/R1/R2/R3.
**v0.2.0** bouwt alle domeinen af **tot aan de externe-integratiegrens**; op elke grens draait een
**simulatie-adapter** (`src/lib/adapters`) plus een **Test Console** zodat de flow in testen te
volgen is. Er wordt geen 99%-claim gemaakt — dat vereist meting en onafhankelijke verificatie.

## Integratiegrenzen (hier stopt "echt bouwen", hier begint de simulatie)

| Grens | Simulatie-adapter | Echte provider bij livegang |
|---|---|---|
| Betalen / escrow / payout / FX | `PakketHub Pay (sandbox)` | Mollie / Stripe / gelicentieerde escrow |
| Identiteit (KYC/AML) | `PakketHub Verify (sandbox)` | Onfido / Veriff / iDIN |
| Notificaties | `PakketHub Notify (sandbox)` | Twilio / WhatsApp Business / Resend |
| Routing / ETA | `PakketHub Routing (sandbox)` | Google / Mapbox / HERE + vluchtschema's |
| AI assist | `PakketHub Assist (sandbox)` | LLM (Claude) |

De **Test Console** (`/app/console`) drijft deze events handmatig aan: betaling geslaagd/mislukt,
KYC goedkeuren/afwijzen, levering simuleren, corridor activeren, webhook afvuren.

## Domeinen

| Baseline-domein | Status | In deze build |
|---|---|---|
| PKB — Brand, positioning & corporate trust | 🟡 deels | Merkidentiteit, corridor-proposities, Trust Center, entiteit-disclosure, staged domein/noindex. Due-diligence/evidence-register = beleid. |
| SHP — Declared parcel crowdshipping | ✅ live | Request, itemaangifte, known-sender, **mystery-package gate**, eligibility, offers, levenscyclus. |
| PCK — Packing, inspection, labels, volumetric | 🟡 deels | Inspectie-record, verzegeling in custody. Volumetrische labels/DG-verpakking = gepland. |
| WEB — Website, video, growth & digital trust | ✅ live | Website als product, persona-flows, calculator, Trust Center, track. Video-CMS = gepland. |
| HUB — Hubs, service points & lockers | 🟡 deels | Hub-masterdata + services + werklijst + consolidatie. Slot-booking/lockers = gepland. |
| FIN — Betalingen, escrow, ledger, payout | ✅ live (sim) | Checkout→escrow→payout→refund, double-entry grootboek, wallet, fees. Grens: betaalprovider. |
| CLM — Claims, disputes & returns | ✅ live (sim) | Claim-workflow + berichten + AI-concept + refund via adapter; retour. |
| PUR — Purchase & Proof (jastip) | ✅ live | Shop-verzoeken, claimen door reiziger, bon als bewijs. |
| FLE — Fleet, vehicle, driver & dispatch | ✅ live (sim) | Fleets/voertuigen/chauffeurs + dispatch-workbench + last-mile. Grens: routing/maps. |
| WHS/FRT — Warehouse & managed freight | ✅ live (sim) | Consolidaties + freight-orders + ETA. Grens: carrier/douane-integratie. |
| ENT/API — Business, API & webhooks | ✅ live | Zakelijk account, API-sleutels, publieke REST API (Bearer+scopes), webhook-simulator. |
| MML — Multi-modal orchestration | 🟡 deels | Service-modes + freight-legs; volledige leg-orkestratie/manifests = gepland. |
| ANA — Analytics & unit economics | ✅ live | GMV, take rate, escrow, leverratio, claimratio uit live data. |

## Non-negotiable control-spine (baseline §01)

| Control | Status |
|---|---|
| Positive-list launch | ✅ `categories.traveler_eligible`, engine weigert de rest |
| Verified identity before value movement | ✅ `users.kyc_status`, STEP_UP-uitkomst; echte KYC-adapter = gepland |
| Open parcel inspection | ✅ `inspections`, seal in custody |
| Deterministic route/item/customs rules | ✅ `src/lib/eligibility.ts` (rule_version v1), beslissingen gelogd |
| Cargo-only / mystery-package gate | ✅ gesloten pakket → FREIGHT_ONLY |
| Immutable rule & contract snapshots | 🟡 eligibility-beslissing + inputs-hash gelogd; contract-snapshot = gepland |
| EPCIS-style chain of custody | ✅ `custody_events`, append-only volgnummer |
| Double-entry ledger | ⬜ gepland (payout-status wél state-based) |
| State-based payout release | ✅ HELD → RELEASED na DELIVERED |
| Protective holds | ✅ HOLD + hold_reason, override met reden |
| Four-eyes overrides | 🟡 override vereist reden + wordt gelogd; tweede goedkeuring = gepland |
| Cross-tenant isolation | ✅ tenant_id op alle records (data-access laag); Postgres RLS = productie-hardening |
| Kill switches | ✅ per corridor in Control Center |
| Continuous control testing / gates | ⬜ gepland (28 go-live-gates als checklist) |

## Bewust uitgesteld tot vóór livegang

Echte KYC-/AML-provider, gelicentieerde betaal-/escrow-adapter, kaart/PostGIS-routing,
video-CMS met consent, WCAG-audit, penetratietest, DR/restore-test, en het aflopen van de
28 go-live-gates met gemeten KRI's. Geen enkele "99% veiliger"-claim vóór meting + verificatie.
