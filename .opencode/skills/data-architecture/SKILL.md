---
name: data-architecture
description: >-
  Guidance for data architecture decisions: database technology selection,
  schema design principles, migration strategies, indexing, naming
  conventions, and data flow modeling. Use this when designing or evolving
  the data layer.
---

# Data Architecture

Guidance on database technology selection, schema design, migration management, and data modeling.

---

## Core Principles

1. **Choose the right tool for the data shape.** Relational for structured/relational data, document for schemaless/aggregate data, key-value for caching, search engine for full-text search.
2. **Schema is a contract.** Even in NoSQL databases, define and enforce schema at the application boundary.
3. **Design for migrations.** Every schema change should be reversible, incremental, and automated.
4. **Index with intent.** Don't over-index (write penalty) or under-index (query penalty). Index based on query patterns, not guesses.

---

## Database Technology Selection

### Decision matrix

| Workload | Recommended | Consider if... |
|----------|-------------|----------------|
| Structured data with relationships | PostgreSQL | Default choice for most applications |
| High-volume writes, simple lookups | PostgreSQL or DynamoDB | If AWS ecosystem, DynamoDB |
| Full-text search | Elasticsearch / Meilisearch | When basic `LIKE` queries aren't enough |
| Session cache, rate limiting | Redis | In-memory, TTL-based data |
| Document/blob storage | S3 / MinIO | User uploads, files, large objects |
| Time-series metrics | TimescaleDB (Postgres extension) | Metrics, monitoring data |
| Event log / audit trail | PostgreSQL or Kafka | Not for primary data; append-only |
| Graph data | PostgreSQL with `ltree` or dedicated graph DB | Social graphs, recommendation engines |

### Default stack preference

```
PostgreSQL — primary/relational
Redis — caching, sessions, queues
MinIO / S3 — file storage
Elasticsearch — search (only when needed)
```

---

## Schema Design

### Naming conventions

| Element | Convention | Example |
|---------|------------|---------|
| Tables | `snake_case`, plural | `users`, `order_items` |
| Columns | `snake_case`, singular | `created_at`, `email_address` |
| Primary keys | `id` (auto-increment or UUID) | `id` |
| Foreign keys | `{singular_table}_id` | `user_id`, `order_id` |
| Join tables | `{table1}_{table2}` | `users_roles`, `products_categories` |
| Indexes | `idx_{table}_{column(s)}` | `idx_users_email` |
| Unique constraints | `uq_{table}_{column(s)}` | `uq_users_email` |

### Schema design rules

- Every table must have a primary key
- Prefer **UUID** primary keys for distributed systems, **bigserial** for single-server
- Use `TIMESTAMPTZ` for all timestamp columns (store in UTC)
- Use `VARCHAR` with length limits for user-facing text fields
- Use `TEXT` without length limits for unbounded content
- Add `created_at` and `updated_at` to every table (use triggers or ORM auto-setting)
- Use `CHECK` constraints for column-level validation
- Define foreign keys explicitly (not just by convention)
- Use `ENUM` types sparingly — prefer reference tables for values that may change

### Normalisation guidance

- Normalise to 3NF by default
- Denormalise only when:
  - Query performance is measurably insufficient after indexing
  - The denormalisation solves a real, observed bottleneck (not theoretical)
  - You have a strategy for keeping denormalised data in sync

---

## Migrations

### Principles

- Every migration must be reversible (have a `down`/`rollback`)
- Never edit a migration that has been applied to any environment
- Name migrations sequentially: `YYYYMMDD_description.sql` or `NNNN_description.sql`
- Test migrations against a copy of production data before applying

### Migration workflow

```
1. Write migration (up + down)
2. Review with peers
3. Apply to staging, verify
4. Apply to production
5. Never look back
```

### Risky migrations (require extra care)

| Operation | Risk | Mitigation |
|-----------|------|------------|
| `DROP COLUMN` | Data loss | Mark as deprecated first, drop in a later release |
| `ALTER COLUMN` type | Locking, data corruption | Add new column, backfill, swap, drop old |
| `RENAME TABLE/COLUMN` | Breaking app code | Use view or dual-write during transition |
| Add `NOT NULL` to existing column | Failure if NULLs exist | Backfill first, then add constraint |
| Large table index creation | Locking | Use `CONCURRENTLY` (Postgres) |

---

## Data Flow Modeling

For complex data flows (especially across service boundaries):

1. **Identify the data entity** — What is being passed?
2. **Source of truth** — Which service owns this data?
3. **Flow direction** — Read-only copy? Write-through? Eventual sync?
4. **Consistency requirements** — Strong vs. eventual consistency?
5. **Failure modes** — What happens when the source is unavailable?

Document data flows in `docs/diagrams/data-flows/` using Mermaid sequence or flow diagrams.
