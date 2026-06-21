-- Add a generic rejected action for safe audit entries when a guarded write is blocked.
ALTER TYPE "AuditAction" ADD VALUE 'REJECTED';
