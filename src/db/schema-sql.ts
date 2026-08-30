// AUTO-GEGENEREERD uit schema.sql — niet handmatig bewerken.
// Regenereren na wijziging van schema.sql:  npm run gen:schema
export const SCHEMA_SQL = `
-- =============================================================================
-- BugaWuga.com — controlled corridor crowdshipping platform
-- Schema baseline (PGlite / PostgreSQL 16). Public schema, UUID keys,
-- tenant_id on every business record. Money = numeric, ts = timestamptz (UTC).
--
-- Maps to Build-Ready Requirement Baseline v2.0. Scope of this baseline (v0.1.0):
--   R0 Trust & Compliance  +  R1 NL-SR Jastip Core.
-- Non-negotiable spine implemented here: positive-list launch, verified identity
-- before value movement, declared+inspectable parcels, deterministic eligibility,
-- append-only custody chain, protective holds, and audit.
-- Advanced domains (fleet, multimodal, managed freight, business API) are modelled
-- at the corridor/service-mode level and flagged 'planned' — not faked as done.
-- =============================================================================

-- ---------- Tenant, identity & access ---------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  timezone      text NOT NULL DEFAULT 'Europe/Amsterdam',
  currency      char(3) NOT NULL DEFAULT 'EUR',
  default_language text NOT NULL DEFAULT 'nl',
  brand         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status        text NOT NULL DEFAULT 'ACTIVE',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid REFERENCES tenants(id),
  key          text NOT NULL,
  name         text NOT NULL,
  capabilities text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid REFERENCES tenants(id),
  first_name    text NOT NULL,
  last_name     text NOT NULL DEFAULT '',
  name          text GENERATED ALWAYS AS (trim(first_name || ' ' || last_name)) STORED,
  email         text,
  phone         text,
  country       char(2),
  city          text,
  password_hash text NOT NULL,
  role_id       uuid REFERENCES roles(id),
  avatar_url    text,
  is_platform_admin boolean NOT NULL DEFAULT false,
  -- Trust: verified identity before value movement (CR spine).
  kyc_status    text NOT NULL DEFAULT 'UNVERIFIED', -- UNVERIFIED|PENDING|VERIFIED|REJECTED
  kyc_level     text NOT NULL DEFAULT 'NONE',       -- NONE|BASIC|FULL
  rating        numeric(3,2),                       -- reputatiescore 0-5
  active        boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id  uuid REFERENCES tenants(id),
  token      text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Verified identity records (KYC/KYB). Value movement is gated on these.
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method       text NOT NULL DEFAULT 'MANUAL',   -- MANUAL|ID_SCAN|IDEAL|BANK
  level        text NOT NULL DEFAULT 'BASIC',
  status       text NOT NULL DEFAULT 'PENDING',  -- PENDING|VERIFIED|REJECTED|EXPIRED
  document_ref text,
  reviewed_by  uuid REFERENCES users(id),
  reviewed_at  timestamptz,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------- Corridors, service modes & positive-list rules -------------------
CREATE TABLE IF NOT EXISTS corridors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  code         text NOT NULL,                -- NL-SR
  name         text NOT NULL,
  from_country char(2) NOT NULL,
  to_country   char(2) NOT NULL,
  status       text NOT NULL DEFAULT 'PILOT', -- PLANNED|PILOT|LIVE|PAUSED
  -- Pilot limieten (go-live gate parameters).
  max_item_value_eur   numeric(18,2) NOT NULL DEFAULT 250,
  max_parcel_weight_kg numeric(10,2) NOT NULL DEFAULT 20,
  max_items_per_parcel integer NOT NULL DEFAULT 20,
  service_modes text[] NOT NULL DEFAULT '{CROWDSHIP,HUB,FREIGHT}',
  kill_switch  boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS corridors_code_idx ON corridors(tenant_id, code);

-- Positive-list categories. Only listed & traveler_eligible categories may move
-- through crowdshipping; everything else routes to review/freight or is rejected.
CREATE TABLE IF NOT EXISTS categories (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id),
  code              text NOT NULL,
  name              text NOT NULL,
  description       text,
  traveler_eligible boolean NOT NULL DEFAULT false, -- op de positieve lijst?
  requires_review   boolean NOT NULL DEFAULT false, -- altijd handmatig beoordelen
  prohibited        boolean NOT NULL DEFAULT false, -- nooit toegestaan
  dangerous_goods   boolean NOT NULL DEFAULT false,
  max_value_eur     numeric(18,2),
  sort_order        integer NOT NULL DEFAULT 100
);
CREATE UNIQUE INDEX IF NOT EXISTS categories_code_idx ON categories(tenant_id, code);

-- ---------- Hubs / service points -------------------------------------------
CREATE TABLE IF NOT EXISTS hubs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  name         text NOT NULL,
  hub_type     text NOT NULL DEFAULT 'HUB', -- HUB|SERVICE_POINT|LOCKER|WAREHOUSE
  country      char(2) NOT NULL,
  city         text,
  address_text text,
  services     text[] NOT NULL DEFAULT '{INTAKE,INSPECTION,PACKING,PICKUP}',
  status       text NOT NULL DEFAULT 'ACTIVE',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------- Trips (traveler capacity) ---------------------------------------
CREATE TABLE IF NOT EXISTS trips (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  traveler_id  uuid NOT NULL REFERENCES users(id),
  corridor_id  uuid NOT NULL REFERENCES corridors(id),
  depart_date  date NOT NULL,
  arrive_date  date,
  capacity_kg  numeric(10,2) NOT NULL DEFAULT 10,
  price_indication_eur numeric(18,2),
  notes        text,
  status       text NOT NULL DEFAULT 'OPEN', -- OPEN|FULL|CLOSED|CANCELLED
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trips_corridor_idx ON trips(tenant_id, corridor_id, status);

-- ---------- Shipments (declared parcel request) -----------------------------
CREATE TABLE IF NOT EXISTS shipments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id),
  reference      text NOT NULL,                 -- PH-2026-000123
  sender_id      uuid NOT NULL REFERENCES users(id),
  corridor_id    uuid NOT NULL REFERENCES corridors(id),
  service_mode   text NOT NULL DEFAULT 'CROWDSHIP', -- CROWDSHIP|HUB|FREIGHT
  -- Recipient (ontvanger) — beperkte gegevens.
  recipient_name  text NOT NULL,
  recipient_phone text,
  recipient_city  text,
  recipient_country char(2),
  -- Parcel.
  declared_weight_kg numeric(10,2),
  length_cm     numeric(10,1),
  width_cm      numeric(10,1),
  height_cm     numeric(10,1),
  is_sealed_closed boolean NOT NULL DEFAULT false, -- mystery-package gate
  deadline      date,
  pickup_choice text NOT NULL DEFAULT 'HUB_DROPOFF', -- HOME_PICKUP|HUB_DROPOFF|MERCHANT|WAREHOUSE
  notes         text,
  -- Lifecycle (FR-SHP-008).
  status        text NOT NULL DEFAULT 'DRAFT',
    -- DRAFT|SCREENING|QUOTED|BOOKED|INTAKE|SEALED|IN_CUSTODY|IN_TRANSIT|CUSTOMS|READY|DELIVERED|RETURNED|CLOSED
  -- Deterministic eligibility outcome (risk decision flow).
  eligibility   text NOT NULL DEFAULT 'PENDING',
    -- PENDING|ALLOW|STEP_UP|REVIEW|HOLD|FREIGHT_ONLY|REJECT
  hold_reason   text,
  total_declared_value_eur numeric(18,2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS shipments_ref_idx ON shipments(tenant_id, reference);
CREATE INDEX IF NOT EXISTS shipments_sender_idx ON shipments(tenant_id, sender_id, status);
CREATE INDEX IF NOT EXISTS shipments_status_idx ON shipments(tenant_id, status, eligibility);

CREATE TABLE IF NOT EXISTS shipment_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  shipment_id   uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  description   text NOT NULL,
  quantity      integer NOT NULL DEFAULT 1,
  unit_value    numeric(18,2) NOT NULL DEFAULT 0,
  currency      char(3) NOT NULL DEFAULT 'EUR',
  origin_country char(2),
  category_code text NOT NULL DEFAULT 'UNKNOWN',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipment_items_idx ON shipment_items(shipment_id);

-- Deterministic eligibility decisions are persisted (inputs, reasons, version).
CREATE TABLE IF NOT EXISTS eligibility_decisions (
  id           bigserial PRIMARY KEY,
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  shipment_id  uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  decision     text NOT NULL,
  reasons      jsonb NOT NULL DEFAULT '[]'::jsonb,
  rule_version text NOT NULL DEFAULT 'v1',
  inputs_hash  text,
  decided_by   uuid REFERENCES users(id),  -- null = automatisch
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------- Offers & bookings (marketplace) ---------------------------------
CREATE TABLE IF NOT EXISTS offers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  shipment_id  uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  trip_id      uuid REFERENCES trips(id),
  traveler_id  uuid NOT NULL REFERENCES users(id),
  price_eur    numeric(18,2) NOT NULL,
  message      text,
  status       text NOT NULL DEFAULT 'OPEN', -- OPEN|ACCEPTED|DECLINED|WITHDRAWN|EXPIRED
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS offers_shipment_idx ON offers(shipment_id, status);
CREATE INDEX IF NOT EXISTS offers_traveler_idx ON offers(tenant_id, traveler_id, status);

CREATE TABLE IF NOT EXISTS bookings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  shipment_id  uuid NOT NULL UNIQUE REFERENCES shipments(id) ON DELETE CASCADE,
  offer_id     uuid REFERENCES offers(id),
  traveler_id  uuid NOT NULL REFERENCES users(id),
  agreed_price_eur numeric(18,2) NOT NULL,
  -- State-based payout release (funds held tot bewijs van levering).
  payout_status text NOT NULL DEFAULT 'HELD', -- HELD|RELEASED|REFUNDED|DISPUTED
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------- Custody chain (append-only) & inspection ------------------------
CREATE TABLE IF NOT EXISTS custody_events (
  id           bigserial PRIMARY KEY,
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  shipment_id  uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  seq          integer NOT NULL,
  event_type   text NOT NULL,
    -- CREATED|SCREENED|INTAKE|INSPECTED|SEALED|HANDOVER|DEPARTED|CUSTOMS|ARRIVED|DELIVERED|RETURNED|HOLD|RELEASED
  actor_id     uuid REFERENCES users(id),
  hub_id       uuid REFERENCES hubs(id),
  seal_no      text,
  location_text text,
  notes        text,
  photo_ref    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS custody_seq_idx ON custody_events(shipment_id, seq);

CREATE TABLE IF NOT EXISTS inspections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  shipment_id  uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  inspector_id uuid REFERENCES users(id),
  hub_id       uuid REFERENCES hubs(id),
  checklist    jsonb NOT NULL DEFAULT '{}'::jsonb,
  result       text NOT NULL DEFAULT 'PENDING', -- PENDING|PASS|FAIL|MODIFIED
  seal_no      text,
  photos       jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------- Chat: overleg & afspraken tussen de partijen --------------------
-- Elke zending krijgt een gesprek waar afzender ⇄ reiziger (en waar nodig ops)
-- kunnen overleggen en afspraken vastleggen.
CREATE TABLE IF NOT EXISTS conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  shipment_id   uuid REFERENCES shipments(id) ON DELETE CASCADE,
  subject       text,
  status        text NOT NULL DEFAULT 'OPEN', -- OPEN|LOCKED|CLOSED
  last_message_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_shipment_idx ON conversations(shipment_id);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  party_role      text NOT NULL DEFAULT 'MEMBER', -- SENDER|TRAVELER|OPS|MEMBER
  last_read_at    timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid REFERENCES users(id),      -- null = systeembericht
  kind            text NOT NULL DEFAULT 'TEXT',   -- TEXT|SYSTEM|PROPOSAL|AGREEMENT
  body            text NOT NULL,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb, -- bv. voorstel: {price, pickup, date}
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_conv_idx ON chat_messages(conversation_id, created_at);

-- Afspraken die in de chat worden gemaakt en bevestigd (handover, prijs, tijd).
CREATE TABLE IF NOT EXISTS agreements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  shipment_id     uuid REFERENCES shipments(id) ON DELETE CASCADE,
  proposed_by     uuid REFERENCES users(id),
  terms           jsonb NOT NULL DEFAULT '{}'::jsonb, -- {handover_place, handover_time, price_eur, note}
  status          text NOT NULL DEFAULT 'PROPOSED',   -- PROPOSED|ACCEPTED|DECLINED|CANCELLED
  accepted_by     uuid REFERENCES users(id),
  accepted_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------- Trust Center content & website leads ----------------------------
CREATE TABLE IF NOT EXISTS content_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  slug         text NOT NULL,
  kind         text NOT NULL DEFAULT 'POLICY', -- POLICY|FAQ|VIDEO|PAGE
  title        text NOT NULL,
  summary      text,
  body         text,
  language     text NOT NULL DEFAULT 'nl',
  owner        text,
  review_date  date,
  status       text NOT NULL DEFAULT 'PUBLISHED',
  sort_order   integer NOT NULL DEFAULT 100
);
CREATE UNIQUE INDEX IF NOT EXISTS content_slug_idx ON content_items(tenant_id, slug);

CREATE TABLE IF NOT EXISTS leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  kind         text NOT NULL DEFAULT 'SENDER', -- SENDER|TRAVELER|BUSINESS|PARTNER
  name         text,
  email        text,
  phone        text,
  corridor_code text,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  handled      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------- Audit -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid,
  user_id     uuid,
  action      text NOT NULL,
  entity_type text,
  entity_id   uuid,
  summary     text,
  meta        jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_log(entity_type, entity_id);

-- =============================================================================
-- ADDENDUM v0.2.0 — R1-finance, claims, jastip + R2 (managed commerce) + R3.
-- Externe integraties (betalen, KYC, notificaties, routing, AI) draaien via
-- simulatie-adapters (src/lib/adapters). Datamodel is provider-agnostisch.
-- =============================================================================

-- ---------- i18n: meertalige content (Trust Center) ------------------------
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS title_i18n   jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS summary_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS body_i18n    jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ---------- Finance: payment intents, double-entry ledger, wallets ----------
CREATE TABLE IF NOT EXISTS payment_intents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id),
  purpose        text NOT NULL,                 -- CHARGE|PAYOUT|REFUND
  amount_eur     numeric(18,2) NOT NULL,
  currency       char(3) NOT NULL DEFAULT 'EUR',
  fx_rate        numeric(18,6) NOT NULL DEFAULT 1,
  payer_id       uuid REFERENCES users(id),
  payee_id       uuid REFERENCES users(id),
  reference_type text NOT NULL,                 -- booking|claim|shopping_request
  reference_id   uuid NOT NULL,
  provider       text NOT NULL,
  provider_ref   text,
  status         text NOT NULL DEFAULT 'REQUIRES_ACTION',
    -- REQUIRES_ACTION|PROCESSING|SUCCEEDED|FAILED|REFUNDED
  description    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS intents_ref_idx ON payment_intents(reference_type, reference_id);

-- Append-only dubbele boekhouding. Elke transactie (txn_id) is in balans:
-- som(DEBIT) = som(CREDIT). Accounts: EXTERNAL, ESCROW, PLATFORM_FEE, WALLET:<userId>.
CREATE TABLE IF NOT EXISTS ledger_entries (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  txn_id      uuid NOT NULL,
  account     text NOT NULL,
  direction   text NOT NULL,                    -- DEBIT|CREDIT
  amount_eur  numeric(18,2) NOT NULL,
  currency    char(3) NOT NULL DEFAULT 'EUR',
  ref_type    text,
  ref_id      uuid,
  memo        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_account_idx ON ledger_entries(tenant_id, account);
CREATE INDEX IF NOT EXISTS ledger_txn_idx ON ledger_entries(txn_id);

CREATE TABLE IF NOT EXISTS wallets (
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency    char(3) NOT NULL DEFAULT 'EUR',
  balance_eur numeric(18,2) NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

-- ---------- Notifications outbox (simulated WhatsApp/e-mail/push) ------------
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid REFERENCES users(id),
  channel     text NOT NULL DEFAULT 'WHATSAPP',
  template    text NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL,
  status      text NOT NULL DEFAULT 'SENT',      -- QUEUED|SENT|FAILED|READ
  provider    text,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications(tenant_id, user_id, created_at);

-- ---------- Claims, disputes & returns --------------------------------------
CREATE TABLE IF NOT EXISTS claims (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  shipment_id  uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  opened_by    uuid REFERENCES users(id),
  claim_type   text NOT NULL,                    -- DAMAGE|LOSS|DELAY|MISMATCH|OTHER
  description  text,
  amount_eur   numeric(18,2),
  status       text NOT NULL DEFAULT 'OPEN',      -- OPEN|INVESTIGATING|RESOLVED|REJECTED
  resolution   text,
  resolved_by  uuid REFERENCES users(id),
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS claims_status_idx ON claims(tenant_id, status);

CREATE TABLE IF NOT EXISTS claim_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  claim_id   uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  sender_id  uuid REFERENCES users(id),
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS returns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  shipment_id  uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  reason       text,
  status       text NOT NULL DEFAULT 'REQUESTED', -- REQUESTED|APPROVED|IN_TRANSIT|COMPLETED|REJECTED
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------- Purchase & Proof (crowdshopping / jastip) -----------------------
CREATE TABLE IF NOT EXISTS shopping_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  requester_id  uuid NOT NULL REFERENCES users(id),
  corridor_id   uuid REFERENCES corridors(id),
  product_name  text NOT NULL,
  product_url   text,
  quantity      integer NOT NULL DEFAULT 1,
  budget_eur    numeric(18,2),
  reward_eur    numeric(18,2),                    -- vergoeding voor de reiziger
  category_code text NOT NULL DEFAULT 'UNKNOWN',
  notes         text,
  status        text NOT NULL DEFAULT 'OPEN',      -- OPEN|CLAIMED|PURCHASED|DELIVERED|CANCELLED
  claimed_by    uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shopreq_status_idx ON shopping_requests(tenant_id, status);

CREATE TABLE IF NOT EXISTS purchase_tasks (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id),
  shopping_request_id uuid NOT NULL REFERENCES shopping_requests(id) ON DELETE CASCADE,
  traveler_id        uuid NOT NULL REFERENCES users(id),
  receipt_ref        text,
  amount_paid_eur    numeric(18,2),
  status             text NOT NULL DEFAULT 'PENDING', -- PENDING|PURCHASED|VERIFIED|REJECTED
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------- Warehouse consolidation & managed freight -----------------------
CREATE TABLE IF NOT EXISTS consolidations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  hub_id       uuid REFERENCES hubs(id),
  reference    text NOT NULL,
  status       text NOT NULL DEFAULT 'OPEN',      -- OPEN|SEALED|DISPATCHED|CLOSED
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consolidation_items (
  consolidation_id uuid NOT NULL REFERENCES consolidations(id) ON DELETE CASCADE,
  shipment_id      uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  PRIMARY KEY (consolidation_id, shipment_id)
);

CREATE TABLE IF NOT EXISTS freight_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id),
  reference        text NOT NULL,
  shipment_id      uuid REFERENCES shipments(id),
  consolidation_id uuid REFERENCES consolidations(id),
  carrier_name     text,
  mode             text NOT NULL DEFAULT 'AIR',   -- AIR|SEA|ROAD
  status           text NOT NULL DEFAULT 'BOOKED', -- BOOKED|IN_TRANSIT|CUSTOMS|DELIVERED|CANCELLED
  eta_days         integer,
  docs             jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ---------- Fleet, vehicles, drivers, routes & dispatch ---------------------
CREATE TABLE IF NOT EXISTS fleets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  name         text NOT NULL,
  kyb_status   text NOT NULL DEFAULT 'PENDING',   -- PENDING|VERIFIED|REJECTED
  service_area text,
  manager_id   uuid REFERENCES users(id),
  status       text NOT NULL DEFAULT 'ACTIVE',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  fleet_id    uuid NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
  plate       text,
  vehicle_type text NOT NULL DEFAULT 'VAN',
  capacity_kg numeric(10,2) NOT NULL DEFAULT 500,
  status      text NOT NULL DEFAULT 'AVAILABLE'
);

CREATE TABLE IF NOT EXISTS drivers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  fleet_id    uuid NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text,
  license_ref text,
  status      text NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS dispatch_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  shipment_id uuid REFERENCES shipments(id),
  fleet_id    uuid REFERENCES fleets(id),
  vehicle_id  uuid REFERENCES vehicles(id),
  driver_id   uuid REFERENCES drivers(id),
  job_type    text NOT NULL DEFAULT 'LAST_MILE', -- PICKUP|LAST_MILE|HUB_TRANSFER
  status      text NOT NULL DEFAULT 'UNASSIGNED', -- UNASSIGNED|ASSIGNED|IN_PROGRESS|DONE|FAILED
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- Business accounts, API keys & webhooks --------------------------
CREATE TABLE IF NOT EXISTS business_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  name          text NOT NULL,
  vat_number    text,
  credit_limit_eur numeric(18,2) NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'ACTIVE',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_members (
  business_id uuid NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'MEMBER',    -- OWNER|APPROVER|MEMBER
  PRIMARY KEY (business_id, user_id)
);

CREATE TABLE IF NOT EXISTS api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  business_id uuid REFERENCES business_accounts(id) ON DELETE CASCADE,
  label       text NOT NULL,
  prefix      text NOT NULL,                     -- zichtbaar deel, bv. pk_live_ab12
  key_hash    text NOT NULL,
  scopes      text[] NOT NULL DEFAULT '{quote,booking,tracking}',
  last_used_at timestamptz,
  revoked     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON api_keys(prefix);

CREATE TABLE IF NOT EXISTS webhooks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  business_id uuid REFERENCES business_accounts(id) ON DELETE CASCADE,
  url         text NOT NULL,
  events      text[] NOT NULL DEFAULT '{shipment.status}',
  secret      text NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  webhook_id  uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event       text NOT NULL,
  payload     jsonb NOT NULL,
  status      text NOT NULL DEFAULT 'SENT',      -- SENT|FAILED|RETRY
  response_code integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ===========================================================================
--  v0.3 ADDENDUM (bucket 3) — multimodale legs/manifests, lockers/tijdslots/
--  reconciliatie, zakelijke bulk + adres-/productboeken. Alle CREATE IF NOT
--  EXISTS zodat bestaande PGlite/Postgres-databases meegroeien.
-- ===========================================================================

-- ---------- Block A: multimodale legs & manifests --------------------------
-- Een manifest bundelt zendingen op één fysieke beweging (bv. een vlucht of
-- een busrit). Elke zending krijgt een keten van legs (pickup→hub→linehaul→
-- hub→delivery); een leg kan aan een manifest hangen.
CREATE TABLE IF NOT EXISTS manifests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  reference     text NOT NULL,
  mode          text NOT NULL DEFAULT 'AIR',       -- ROAD|AIR|SEA|RAIL|TRAVELER
  carrier_type  text NOT NULL DEFAULT 'FREIGHT',   -- FLEET|TRAVELER|FREIGHT|HUB
  carrier_ref   text,                              -- vluchtnr/kenteken/vervoerder
  trip_id       uuid REFERENCES trips(id),
  fleet_id      uuid REFERENCES fleets(id),
  origin_hub_id uuid REFERENCES hubs(id),
  dest_hub_id   uuid REFERENCES hubs(id),
  depart_at     timestamptz,
  arrive_at     timestamptz,
  status        text NOT NULL DEFAULT 'DRAFT',     -- DRAFT|SEALED|IN_TRANSIT|ARRIVED|CLOSED
  sealed_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS manifests_status_idx ON manifests(tenant_id, status);

CREATE TABLE IF NOT EXISTS shipment_legs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  shipment_id   uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  seq           integer NOT NULL DEFAULT 1,
  leg_type      text NOT NULL DEFAULT 'LINEHAUL',  -- PICKUP|HUB_TRANSFER|LINEHAUL|CUSTOMS|DELIVERY
  mode          text NOT NULL DEFAULT 'ROAD',      -- ROAD|AIR|SEA|RAIL|TRAVELER
  from_label    text,
  to_label      text,
  from_hub_id   uuid REFERENCES hubs(id),
  to_hub_id     uuid REFERENCES hubs(id),
  carrier_type  text NOT NULL DEFAULT 'FLEET',     -- FLEET|TRAVELER|FREIGHT|HUB
  carrier_ref   text,
  manifest_id   uuid REFERENCES manifests(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'PLANNED',   -- PLANNED|ASSIGNED|IN_TRANSIT|ARRIVED|COMPLETED|FAILED
  scan_in_ref   text,
  scan_out_ref  text,
  planned_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS legs_shipment_idx ON shipment_legs(shipment_id, seq);
CREATE INDEX IF NOT EXISTS legs_manifest_idx ON shipment_legs(manifest_id);

-- ---------- Block B: lockers, compartimenten, tijdslots & reconciliatie -----
CREATE TABLE IF NOT EXISTS lockers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  hub_id        uuid REFERENCES hubs(id),
  code          text NOT NULL,
  name          text NOT NULL,
  address       text,
  city          text,
  country       text NOT NULL DEFAULT 'SR',
  status        text NOT NULL DEFAULT 'ACTIVE',    -- ACTIVE|OFFLINE
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locker_compartments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  locker_id     uuid NOT NULL REFERENCES lockers(id) ON DELETE CASCADE,
  label         text NOT NULL,
  size          text NOT NULL DEFAULT 'M',         -- S|M|L|XL
  status        text NOT NULL DEFAULT 'FREE',      -- FREE|RESERVED|OCCUPIED|OUT_OF_SERVICE
  shipment_id   uuid REFERENCES shipments(id) ON DELETE SET NULL,
  pin_code      text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS compartments_locker_idx ON locker_compartments(locker_id, status);

CREATE TABLE IF NOT EXISTS timeslots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  hub_id        uuid REFERENCES hubs(id),
  locker_id     uuid REFERENCES lockers(id),
  slot_type     text NOT NULL DEFAULT 'DROPOFF',   -- DROPOFF|PICKUP|INTAKE
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  capacity      integer NOT NULL DEFAULT 5,
  booked        integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS timeslots_when_idx ON timeslots(tenant_id, starts_at);

CREATE TABLE IF NOT EXISTS slot_bookings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  timeslot_id   uuid NOT NULL REFERENCES timeslots(id) ON DELETE CASCADE,
  shipment_id   uuid REFERENCES shipments(id) ON DELETE SET NULL,
  user_id       uuid NOT NULL REFERENCES users(id),
  purpose       text NOT NULL DEFAULT 'DROPOFF',
  status        text NOT NULL DEFAULT 'BOOKED',    -- BOOKED|CHECKED_IN|COMPLETED|NO_SHOW|CANCELLED
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reconciliations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  hub_id        uuid REFERENCES hubs(id),
  reference     text NOT NULL,
  status        text NOT NULL DEFAULT 'OPEN',      -- OPEN|BALANCED|DISCREPANCY|CLOSED
  expected_count integer NOT NULL DEFAULT 0,
  scanned_count  integer NOT NULL DEFAULT 0,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz
);

CREATE TABLE IF NOT EXISTS reconciliation_scans (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id uuid NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
  shipment_ref      text NOT NULL,
  result            text NOT NULL DEFAULT 'MATCH', -- MATCH|UNEXPECTED|MISSING
  scanned_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------- Block C: adres- & productboeken + zakelijke bulk-upload ---------
CREATE TABLE IF NOT EXISTS address_book (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  owner_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  business_id   uuid REFERENCES business_accounts(id) ON DELETE CASCADE,
  label         text NOT NULL,
  name          text NOT NULL,
  phone         text,
  line1         text,
  city          text,
  country       text NOT NULL DEFAULT 'SR',
  postal        text,
  is_default    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS addressbook_owner_idx ON address_book(tenant_id, owner_id);

CREATE TABLE IF NOT EXISTS product_book (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id),
  owner_id          uuid REFERENCES users(id) ON DELETE CASCADE,
  business_id       uuid REFERENCES business_accounts(id) ON DELETE CASCADE,
  name              text NOT NULL,
  category_code     text NOT NULL DEFAULT 'UNKNOWN',
  default_value_eur numeric(18,2),
  default_weight_kg numeric(10,2),
  hs_code           text,
  url               text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS productbook_owner_idx ON product_book(tenant_id, owner_id);

CREATE TABLE IF NOT EXISTS bulk_uploads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  business_id   uuid REFERENCES business_accounts(id) ON DELETE CASCADE,
  uploaded_by   uuid NOT NULL REFERENCES users(id),
  filename      text,
  total_rows    integer NOT NULL DEFAULT 0,
  ok_rows       integer NOT NULL DEFAULT 0,
  error_rows    integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'PARSED',    -- PARSED|COMMITTED|FAILED
  rows          jsonb NOT NULL DEFAULT '[]'::jsonb,-- geparste regels + validatie
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bulk_upload_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_upload_id uuid NOT NULL REFERENCES bulk_uploads(id) ON DELETE CASCADE,
  row_no         integer NOT NULL,
  shipment_id    uuid REFERENCES shipments(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'OK',       -- OK|ERROR|CREATED
  error          text
);

-- ===========================================================================
--  v0.5 ADDENDUM (BugaWuga sociaal) — profielen, ratings (1–4 sterren, carrier
--  vs client), badges, volgen, en route/verzoek-zichtbaarheid voor de
--  route-matching marktplaats.
-- ===========================================================================

-- Profiel-uitbreiding op users (foto, bio, plaats/land staan al deels).
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider text NOT NULL DEFAULT 'PASSWORD'; -- PASSWORD|FACEBOOK|GOOGLE
ALTER TABLE users ADD COLUMN IF NOT EXISTS registered boolean NOT NULL DEFAULT true;        -- geregistreerd vs WU-zonder-ID

-- Wederzijdse beoordelingen. Rol = hoe de beoordeelde optrad in deze transactie.
CREATE TABLE IF NOT EXISTS ratings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  rater_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ratee_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'CARRIER',   -- CARRIER (reiziger) | CLIENT (afzender/ontvanger)
  stars        integer NOT NULL CHECK (stars BETWEEN 1 AND 4),
  comment      text,
  shipment_id  uuid REFERENCES shipments(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ratings_ratee_idx ON ratings(ratee_id, role);

-- Badge-catalogus + verdiende badges.
CREATE TABLE IF NOT EXISTS badges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  code         text NOT NULL,
  name         text NOT NULL,
  description  text,
  tier         text NOT NULL DEFAULT 'STANDARD',  -- ELITE|PRO|STANDARD
  icon         text,                              -- emoji/short glyph
  sort_order   integer NOT NULL DEFAULT 100
);
CREATE UNIQUE INDEX IF NOT EXISTS badges_code_idx ON badges(tenant_id, code);

CREATE TABLE IF NOT EXISTS user_badges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id     uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

-- Volgen: zie wanneer een vriend reist (feature 5).
CREATE TABLE IF NOT EXISTS follows (
  follower_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id)
);

-- Route-matching: reiziger maakt route zichtbaar met prijs + info.
ALTER TABLE trips ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT false;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS short_info text;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS long_info text;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS package_size text NOT NULL DEFAULT 'MEDIUM'; -- SMALL|MEDIUM|LARGE|XLARGE

-- Route-matching: afzender maakt verzoek zichtbaar met te-betalen prijs + info.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT false;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS offered_price_eur numeric(18,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS request_info text;

-- Betaalmethode (3 C's): Cash/Western Union, Card, Crypto. Gekozen bij afrekenen.
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS method text; -- CASH_WU|CARD|CRYPTO

-- Punten/coins-portemonnee (feature 9): interne valuta + uitbetaaldrempel.
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS payout_threshold_eur numeric(18,2) NOT NULL DEFAULT 500;

-- B2B-advertenties (feature 18): bedrijven kopen ruimte/prominentie.
CREATE TABLE IF NOT EXISTS ads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  advertiser   text NOT NULL,
  title        text NOT NULL,
  body         text,
  link_url     text,
  icon         text,                              -- emoji/glyph (foto-upload = later)
  placement    text NOT NULL DEFAULT 'MARKETPLACE', -- MARKETPLACE|HOME|SIDEBAR
  active       boolean NOT NULL DEFAULT true,
  impressions  integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ads_placement_idx ON ads(tenant_id, placement, active);

-- Virtuele cadeaus (feature 18 / in-app purchase): coins → cadeau naar een ander lid.
CREATE TABLE IF NOT EXISTS gifts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  from_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         text NOT NULL,                     -- FLOWER|COFFEE|TROPHY|HEART
  coins        integer NOT NULL DEFAULT 0,
  message      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Directe gesprekken (reiziger ⇄ afzender) los van een zending, evt. over een route.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES trips(id) ON DELETE SET NULL;

-- Gelezen-status voor notificaties (ongelezen-badge), los van de bezorgstatus.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Uitbetaling aanvragen (feature 9): lid vraagt opname aan zodra de drempel is bereikt.
CREATE TABLE IF NOT EXISTS payout_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_eur   numeric(18,2) NOT NULL,
  method       text,                              -- CASH_WU|CARD|CRYPTO
  status       text NOT NULL DEFAULT 'REQUESTED', -- REQUESTED|PAID|REJECTED
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Ontvangst bevestigen met code (OTP) bij overdracht/aflevering.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receipt_code text;

-- Melden/rapporteren (safety): een lid meldt een gebruiker/listing → naar Control Center.
CREATE TABLE IF NOT EXISTS reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  reporter_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type   text NOT NULL,                    -- USER|SHIPMENT|TRIP
  target_id     uuid NOT NULL,
  reason        text NOT NULL,                    -- SPAM|FRAUD|UNSAFE|OFFENSIVE|OTHER
  note          text,
  status        text NOT NULL DEFAULT 'OPEN',     -- OPEN|REVIEWED|DISMISSED
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(tenant_id, status);

-- =============================================================================
--  v0.8 — Publieke (geanonimiseerde) ontdek-pagina op de website
--  Aparte opt-in naast \`visible\`: \`visible\` = zichtbaar voor ingelogde leden,
--  \`public_listed\` = óók anoniem tonen op de publieke website (geen login).
-- =============================================================================
ALTER TABLE trips     ADD COLUMN IF NOT EXISTS public_listed boolean NOT NULL DEFAULT false;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS public_listed boolean NOT NULL DEFAULT false;
`;
