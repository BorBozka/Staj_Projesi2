CREATE TABLE [dbo].[Invitation] (
    [id] VARCHAR(36) NOT NULL,
    [visitId] VARCHAR(36) NOT NULL,
    [tokenHash] VARCHAR(64) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Invitation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Invitation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Invitation_visitId_key] UNIQUE NONCLUSTERED ([visitId]),
    CONSTRAINT [Invitation_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

CREATE NONCLUSTERED INDEX [Invitation_tokenHash_idx] ON [dbo].[Invitation]([tokenHash]);

ALTER TABLE [dbo].[Invitation] ADD CONSTRAINT [Invitation_visitId_fkey]
  FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
