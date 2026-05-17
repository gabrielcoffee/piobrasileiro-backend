# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/).

## [Unreleased]

### Fixed

- `generate.sql` rewritten to match the live production schema. Previous file
  had broken `password_reset` DDL (missing comma, trailing comma, no semicolon)
  and referenced a non-existent `manage_quarto_ocupado()` function/trigger, so
  it was not runnable.

### Changed

- `solicitacao` schema column corrected to `telefone` (production name);
  old `generate.sql` listed it as `num_telefone`.
- pgcrypto provided via `CREATE EXTENSION IF NOT EXISTS pgcrypto` instead of
  hand-declared functions.

### Added

- `refeicao_cleanup()` function and `refeicao_cleanup_trigger`
  (AFTER INSERT OR UPDATE on `refeicao`) documented in `generate.sql`,
  matching production.
