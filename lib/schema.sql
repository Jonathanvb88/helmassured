-- HelmAssured schema
-- PostgreSQL (Neon-compatible), derived from HelmAssured-ERD.mermaid / HelmAssured-Data-Model.md
-- Convention: uuid PKs, soft-delete via deleted_at, created_at/updated_at audit columns on every table.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
-- ============================================================
-- AUTHORITY_LEVELS (Delegation of Authority framework)
-- ============================================================
CREATE TABLE authority_levels (
    authority_level_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    level_name          text NOT NULL UNIQUE,
    rank                int NOT NULL UNIQUE,
    max_premium         numeric(14,2) NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    user_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL,
    role                text NOT NULL,
    email               text UNIQUE,
    password_hash       text,
    authority_level_id  uuid REFERENCES authority_levels(authority_level_id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);

-- ============================================================
-- BROKERS
-- ============================================================
CREATE TABLE brokers (
    broker_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL,
    contact_email       text,
    contact_phone       text,
    tier                text NOT NULL DEFAULT 'building_history'
                        CHECK (tier IN ('green','orange','red','building_history')),
    loss_ratio          numeric(6,4),
    tier_calculated_at  timestamptz,
    override_reason     text,
    override_expiry     timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);
CREATE INDEX idx_brokers_tier ON brokers(tier) WHERE deleted_at IS NULL;

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE clients (
    client_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id       uuid REFERENCES brokers(broker_id),
    name            text NOT NULL,
    date_of_birth   date,
    contact_email   text,
    contact_phone   text,
    address         text,
    portal_token    uuid UNIQUE DEFAULT gen_random_uuid(),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);
CREATE INDEX idx_clients_broker ON clients(broker_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_dob ON clients(date_of_birth) WHERE deleted_at IS NULL;

-- ============================================================
-- PRODUCTS / PRODUCT_VERSIONS / PRODUCT_FIELDS / RATE_TABLES
-- ============================================================
CREATE TABLE products (
    product_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL,
    class_of_business   text NOT NULL,
    status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','live','retired')),
    effective_date      date,
    current_version     int NOT NULL DEFAULT 1,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);

CREATE TABLE product_versions (
    version_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      uuid NOT NULL REFERENCES products(product_id),
    version_number  int NOT NULL,
    status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published')),
    published_at    timestamptz,
    published_by    uuid REFERENCES users(user_id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (product_id, version_number)
);
CREATE INDEX idx_product_versions_product ON product_versions(product_id);

CREATE TABLE product_fields (
    field_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      uuid NOT NULL REFERENCES products(product_id),
    field_name      text NOT NULL,
    field_type      text NOT NULL CHECK (field_type IN ('text','select','number','date')),
    display_order   int NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);
CREATE INDEX idx_product_fields_product ON product_fields(product_id) WHERE deleted_at IS NULL;

CREATE TABLE rate_tables (
    rate_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      uuid NOT NULL REFERENCES products(product_id),
    band_label      text NOT NULL,
    base_premium    numeric(12,2) NOT NULL,
    excess          numeric(12,2) NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);
CREATE INDEX idx_rate_tables_product ON rate_tables(product_id) WHERE deleted_at IS NULL;

-- ============================================================
-- POLICIES / POLICY_TRANSACTIONS
-- ============================================================
CREATE TABLE policies (
    policy_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           uuid NOT NULL REFERENCES clients(client_id),
    broker_id           uuid NOT NULL REFERENCES brokers(broker_id),
    product_id          uuid NOT NULL REFERENCES products(product_id),
    policy_number       text NOT NULL UNIQUE,
    status              text NOT NULL DEFAULT 'quote'
                        CHECK (status IN ('quote','active','lapsed','cancelled','expired')),
    sum_insured         numeric(14,2),
    premium             numeric(12,2),
    inception_date      date,
    renewal_date        date,
    underinsurance_flag boolean NOT NULL DEFAULT false,
    lapse_risk_tier     text NOT NULL DEFAULT 'none'
                        CHECK (lapse_risk_tier IN ('none','watch','high')),
    risk_data           jsonb,
    quote_group_id      uuid,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);
CREATE INDEX idx_policies_client ON policies(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_broker ON policies(broker_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_status ON policies(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_renewal_date ON policies(renewal_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_lapse_risk ON policies(lapse_risk_tier) WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_quote_group ON policies(quote_group_id) WHERE quote_group_id IS NOT NULL;

CREATE TABLE policy_transactions (
    transaction_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id           uuid NOT NULL REFERENCES policies(policy_id),
    transaction_type     text NOT NULL
                        CHECK (transaction_type IN ('new_business','endorsement','renewal','cancellation')),
    transaction_date    date NOT NULL,
    premium_delta       numeric(12,2),
    description         text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    created_by          uuid REFERENCES users(user_id)
);
CREATE INDEX idx_policy_transactions_policy ON policy_transactions(policy_id);

-- ============================================================
-- CLAIMS / CLAIM_PAYMENTS
-- ============================================================
CREATE TABLE claims (
    claim_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id           uuid NOT NULL REFERENCES policies(policy_id),
    status              text NOT NULL DEFAULT 'fnol'
                        CHECK (status IN ('fnol','validation','estimate','payment','closed')),
    incident_date       date,
    description         text,
    estimate_amount     numeric(14,2),
    final_settlement_amount numeric(14,2),
    fraud_risk_tier     text CHECK (fraud_risk_tier IN ('low','medium','high')),
    fraud_flag_reason   text,
    decision_outcome    text NOT NULL DEFAULT 'pending'
                        CHECK (decision_outcome IN ('pending','approved','declined')),
    repudiation_reason  text
                        CHECK (repudiation_reason IN (
                            'non_disclosure_at_inception','excluded_peril',
                            'policy_lapsed_at_date_of_loss','fraud_indicators_confirmed',
                            'outside_policy_limits','other'
                        )),
    stp_eligible        boolean NOT NULL DEFAULT false,
    stp_status          text NOT NULL DEFAULT 'manual_review'
                        CHECK (stp_status IN ('routed_stp','manual_review')),
    subrogation_flag    boolean NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);
CREATE INDEX idx_claims_policy ON claims(policy_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_claims_status ON claims(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_claims_fraud_tier ON claims(fraud_risk_tier) WHERE deleted_at IS NULL;
CREATE INDEX idx_claims_stp_status ON claims(stp_status) WHERE deleted_at IS NULL;

CREATE TABLE claim_payments (
    payment_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id        uuid NOT NULL REFERENCES claims(claim_id),
    amount          numeric(14,2) NOT NULL,
    payment_date    date NOT NULL,
    payment_type    text NOT NULL CHECK (payment_type IN ('payment','recovery')),
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_claim_payments_claim ON claim_payments(claim_id);

-- ============================================================
-- REINSURANCE_TREATIES / TREATY_PLACEMENTS
-- ============================================================
CREATE TABLE reinsurance_treaties (
    treaty_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    treaty_type     text NOT NULL
                    CHECK (treaty_type IN ('proportional','non_proportional','facultative','quota_share')),
    period_start    date NOT NULL,
    period_end      date NOT NULL,
    capacity        numeric(16,2) NOT NULL,
    utilisation     numeric(16,2) NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);
CREATE INDEX idx_treaties_period ON reinsurance_treaties(period_start, period_end) WHERE deleted_at IS NULL;

CREATE TABLE treaty_placements (
    placement_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    treaty_id       uuid NOT NULL REFERENCES reinsurance_treaties(treaty_id),
    policy_id       uuid NOT NULL REFERENCES policies(policy_id),
    section         text,
    placed_amount   numeric(14,2) NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_treaty_placements_treaty ON treaty_placements(treaty_id);
CREATE INDEX idx_treaty_placements_policy ON treaty_placements(policy_id);

-- ============================================================
-- NOTIFICATION_TEMPLATES / NOTIFICATIONS
-- ============================================================
CREATE TABLE notification_templates (
    template_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type   text NOT NULL
                        CHECK (notification_type IN (
                            'birthday','anniversary','renewal_reminder','custom_nudge','lapse_risk'
                        )),
    subject             text NOT NULL,
    body                text NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);

CREATE TABLE notifications (
    notification_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id            uuid NOT NULL REFERENCES clients(client_id),
    policy_id            uuid REFERENCES policies(policy_id),
    template_id          uuid REFERENCES notification_templates(template_id),
    notification_type    text NOT NULL
                        CHECK (notification_type IN (
                            'birthday','anniversary','renewal_reminder','custom_nudge','lapse_risk'
                        )),
    send_mode            text NOT NULL DEFAULT 'auto' CHECK (send_mode IN ('auto','manual','off')),
    status                text NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','sent','held','failed')),
    scheduled_for         timestamptz,
    sent_at               timestamptz,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_client ON notifications(client_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);

-- ============================================================
-- PAYMENT_METHODS / BILLING_RUNS / BILLING_TRANSACTIONS / COMMISSION_STATEMENTS
-- ============================================================
CREATE TABLE payment_methods (
    method_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id       uuid NOT NULL REFERENCES policies(policy_id),
    method_type     text NOT NULL
                    CHECK (method_type IN ('debit_order','credit_card','salary_deduction','cash','eft','bordereaux')),
    detail_masked   text,
    payment_frequency text NOT NULL DEFAULT 'monthly'
                    CHECK (payment_frequency IN ('once_off','monthly','quarterly','bi_annual','annual')),
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);
CREATE INDEX idx_payment_methods_policy ON payment_methods(policy_id) WHERE deleted_at IS NULL;

CREATE TABLE billing_runs (
    run_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_date        date NOT NULL,
    status          text NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','processing','completed','failed')),
    total_amount    numeric(16,2),
    policy_count    int,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_billing_runs_date ON billing_runs(run_date);

CREATE TABLE billing_transactions (
    transaction_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          uuid REFERENCES billing_runs(run_id),
    policy_id       uuid NOT NULL REFERENCES policies(policy_id),
    method_id       uuid REFERENCES payment_methods(method_id),
    amount          numeric(14,2) NOT NULL,
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','success','failed')),
    failure_reason  text,
    collection_type text NOT NULL DEFAULT 'scheduled' CHECK (collection_type IN ('scheduled','ad_hoc')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_billing_transactions_run ON billing_transactions(run_id);
CREATE INDEX idx_billing_transactions_policy ON billing_transactions(policy_id);
CREATE INDEX idx_billing_transactions_status ON billing_transactions(status);

CREATE TABLE commission_statements (
    statement_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id       uuid NOT NULL REFERENCES brokers(broker_id),
    period_start    date NOT NULL,
    period_end      date NOT NULL,
    total_commission numeric(14,2) NOT NULL DEFAULT 0,
    status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','issued','paid')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_commission_statements_broker ON commission_statements(broker_id);
CREATE INDEX idx_commission_statements_period ON commission_statements(period_start, period_end);

-- ============================================================
-- TIER_THRESHOLDS / LAPSE_RISK_CONFIG (superuser-configurable, no hardcoded defaults)
-- ============================================================
CREATE TABLE tier_thresholds (
    threshold_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_of_business    text NOT NULL,
    premium_floor        numeric(14,2) NOT NULL,
    green_max_ratio      numeric(6,4) NOT NULL,
    orange_max_ratio     numeric(6,4) NOT NULL,
    updated_by           uuid REFERENCES users(user_id),
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    UNIQUE (class_of_business)
);

CREATE TABLE lapse_risk_config (
    config_id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_of_business            text NOT NULL,
    premium_increase_threshold   numeric(5,2) NOT NULL,
    missed_payment_high_risk_count int NOT NULL DEFAULT 2,
    updated_by                   uuid REFERENCES users(user_id),
    created_at                   timestamptz NOT NULL DEFAULT now(),
    updated_at                   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (class_of_business)
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE documents (
    document_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     text NOT NULL CHECK (entity_type IN ('policy','claim','client','broker')),
    entity_id       uuid NOT NULL,
    category        text NOT NULL CHECK (category IN ('policy_schedule','id_document','claim_photo','correspondence','other')),
    file_name       text NOT NULL,
    mime_type       text,
    file_size_bytes int,
    file_data       bytea NOT NULL,
    uploaded_by     uuid REFERENCES users(user_id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id) WHERE deleted_at IS NULL;

-- ============================================================
-- UNDERWRITING_RULES / UNDERWRITING_CASES
-- ============================================================
CREATE TABLE underwriting_rules (
    rule_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    uuid NOT NULL REFERENCES products(product_id),
    rule_name     text NOT NULL,
    field_name    text NOT NULL,
    operator      text NOT NULL CHECK (operator IN ('>','<','>=','<=','=')),
    compare_value numeric NOT NULL,
    action        text NOT NULL CHECK (action IN ('decline','refer','loading','accept')),
    loading_pct   numeric(5,2),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE underwriting_cases (
    case_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id       uuid NOT NULL REFERENCES policies(policy_id),
    status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','referred','approved','declined')),
    triggered_rules jsonb,
    decision_by     uuid REFERENCES users(user_id),
    decision_notes  text,
    assigned_to                 uuid REFERENCES users(user_id),
    required_authority_level_id uuid REFERENCES authority_levels(authority_level_id),
    decided_by                  uuid REFERENCES users(user_id),
    within_authority            boolean,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_underwriting_cases_policy ON underwriting_cases(policy_id);

-- ============================================================
-- COMPLAINTS
-- ============================================================
CREATE TABLE complaints (
    complaint_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id        uuid REFERENCES clients(client_id),
    policy_id        uuid REFERENCES policies(policy_id),
    category         text NOT NULL CHECK (category IN ('rejected_claim','non_payment','premium_increase','policy_terms','service','other')),
    status           text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','escalated_to_ombud')),
    description      text,
    raised_date      date NOT NULL DEFAULT CURRENT_DATE,
    resolved_date    date,
    resolution_notes text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SIU_CASES
-- ============================================================
CREATE TABLE siu_cases (
    siu_case_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id        uuid NOT NULL REFERENCES claims(claim_id),
    status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','confirmed_fraud','cleared')),
    referral_reason text,
    findings_notes  text,
    opened_at       timestamptz NOT NULL DEFAULT now(),
    closed_at       timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TASKS (Work Management)
-- ============================================================
CREATE TABLE tasks (
    task_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title         text NOT NULL,
    description   text,
    entity_type   text CHECK (entity_type IN ('policy','claim','client','broker','general')),
    entity_id     uuid,
    assigned_to   uuid REFERENCES users(user_id),
    created_by    uuid REFERENCES users(user_id),
    status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed')),
    priority      text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
    due_date      date,
    completed_at  timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);

-- ============================================================
-- INSURED_ASSETS (Asset Management)
-- ============================================================
CREATE TABLE insured_assets (
    asset_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id     uuid NOT NULL REFERENCES policies(policy_id),
    asset_type    text NOT NULL CHECK (asset_type IN ('vehicle','building','contents','specified_item','equipment','other')),
    description   text NOT NULL,
    sum_insured   numeric(14,2) NOT NULL,
    serial_number text,
    location      text,
    status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_insured_assets_policy ON insured_assets(policy_id) WHERE status = 'active';

-- ============================================================
-- SERVICE_PROVIDERS / CLAIM_PROVIDER_ASSIGNMENTS
-- ============================================================
CREATE TABLE service_providers (
    provider_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name           text NOT NULL,
    provider_type  text NOT NULL CHECK (provider_type IN ('assessor','repairer','legal','medical','other')),
    contact_email  text,
    contact_phone  text,
    region         text,
    status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE claim_provider_assignments (
    assignment_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id        uuid NOT NULL REFERENCES claims(claim_id),
    provider_id     uuid NOT NULL REFERENCES service_providers(provider_id),
    assignment_type text NOT NULL CHECK (assignment_type IN ('assessment','repair','legal','medical','other')),
    status          text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','completed')),
    assigned_at     timestamptz NOT NULL DEFAULT now(),
    completed_at    timestamptz,
    notes           text
);
CREATE INDEX idx_claim_provider_claim ON claim_provider_assignments(claim_id);
CREATE INDEX idx_claim_provider_provider ON claim_provider_assignments(provider_id);

-- ============================================================
-- REFUNDS
-- ============================================================
CREATE TABLE refunds (
    refund_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id    uuid NOT NULL REFERENCES policies(policy_id),
    amount       numeric(14,2) NOT NULL,
    reason       text NOT NULL CHECK (reason IN ('cancellation','overpayment','other')),
    status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed')),
    processed_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_refunds_policy ON refunds(policy_id);

-- ============================================================
-- COINSURANCE_PARTICIPANTS
-- ============================================================
CREATE TABLE coinsurance_participants (
    participant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id      uuid NOT NULL REFERENCES policies(policy_id),
    insurer_name   text NOT NULL,
    share_pct      numeric(5,2) NOT NULL CHECK (share_pct > 0 AND share_pct <= 100),
    is_lead        boolean NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_coinsurance_policy ON coinsurance_participants(policy_id);

-- ============================================================
-- AUDIT_LOG (generic — powers every timeline component)
-- ============================================================
CREATE TABLE audit_log (
    log_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     text NOT NULL,
    entity_id       uuid NOT NULL,
    event           text NOT NULL,
    occurred_at     timestamptz NOT NULL DEFAULT now(),
    user_id         uuid REFERENCES users(user_id),
    details         jsonb
);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_occurred_at ON audit_log(occurred_at);
