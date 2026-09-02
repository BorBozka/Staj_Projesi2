-- SQL Server unique constraints allow only one NULL. A card is unassigned when currentVisitId
-- is NULL, so use a filtered unique index to preserve one-card-per-active-visit without
-- preventing multiple AVAILABLE cards.
ALTER TABLE [dbo].[VisitorCard] DROP CONSTRAINT [VisitorCard_currentVisitId_key];

CREATE UNIQUE NONCLUSTERED INDEX [VisitorCard_currentVisitId_key]
  ON [dbo].[VisitorCard]([currentVisitId])
  WHERE [currentVisitId] IS NOT NULL;

CREATE NONCLUSTERED INDEX [VisitorCard_currentVisitId_idx]
  ON [dbo].[VisitorCard]([currentVisitId]);
