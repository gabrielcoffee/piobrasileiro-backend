-- F2a-ajuste: campos extras na hospedagem (consistência grupo↔individual).
-- Aditivo, reversível. forma_pagamento_enum já criado na migração f2a.
-- Aplicar UP no Docker (5433) e depois no prod. Sync generate.sql.

-- ===== UP =====
BEGIN;
ALTER TABLE hospedagem ADD COLUMN cafe boolean DEFAULT false;
ALTER TABLE hospedagem ADD COLUMN forma_pagamento forma_pagamento_enum;
COMMIT;

-- ===== ROLLBACK =====
-- BEGIN;
-- ALTER TABLE hospedagem DROP COLUMN forma_pagamento;
-- ALTER TABLE hospedagem DROP COLUMN cafe;
-- COMMIT;
