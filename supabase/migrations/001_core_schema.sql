-- FundFlow Database Schema
-- Migration 001: Core tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel TEXT NOT NULL CHECK (channel IN ('web', 'telegram')),
    user_id TEXT NOT NULL,
    language TEXT NOT NULL CHECK (language IN ('en', 'am', 'om')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'submitted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Messages/turns table
CREATE TABLE turns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content_type TEXT NOT NULL CHECK (content_type IN ('text', 'voice', 'photo')),
    content_text TEXT,
    media_url TEXT,
    language TEXT NOT NULL CHECK (language IN ('en', 'am', 'om')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_turns_session_id ON turns(session_id);

-- Evidence table
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    value JSONB NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('self_reported', 'document_supported', 'visually_observed', 'verified', 'not_established', 'contradicted')),
    confidence NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    source_turn_ids UUID[] DEFAULT '{}',
    contradiction_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, field_key)
);

CREATE INDEX idx_evidence_session_id ON evidence(session_id);

-- Applications table (completed application packs)
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    evidence_snapshot JSONB NOT NULL,
    scores JSONB NOT NULL,
    exclusions JSONB NOT NULL,
    gaps JSONB NOT NULL,
    sdg_suggestions JSONB NOT NULL,
    declarations JSONB NOT NULL,
    readiness_score NUMERIC(5,2) NOT NULL,
    programme_score NUMERIC(5,2),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'shortlisted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id)
);

CREATE INDEX idx_applications_status ON applications(status);

-- Reviewer shortlist
CREATE TABLE shortlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    slots_available INTEGER NOT NULL,
    c7_variant_used TEXT NOT NULL CHECK (c7_variant_used IN ('C7a', 'C7b')),
    reasoning JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(application_id)
);

CREATE INDEX idx_shortlist_rank ON shortlist(rank);

-- Files storage bucket will be created via Supabase dashboard or storage API
-- Photos: business_license, workshop