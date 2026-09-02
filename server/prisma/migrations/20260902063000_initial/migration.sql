BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Company] (
    [id] VARCHAR(36) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [nameNormalized] NVARCHAR(200) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [Company_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Company_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Company_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Company_nameNormalized_key] UNIQUE NONCLUSTERED ([nameNormalized])
);

-- CreateTable
CREATE TABLE [dbo].[Facility] (
    [id] VARCHAR(36) NOT NULL,
    [companyId] VARCHAR(36) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [nameNormalized] NVARCHAR(200) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [Facility_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Facility_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Facility_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Facility_companyId_nameNormalized_key] UNIQUE NONCLUSTERED ([companyId],[nameNormalized])
);

-- CreateTable
CREATE TABLE [dbo].[Department] (
    [id] VARCHAR(36) NOT NULL,
    [companyId] VARCHAR(36) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [nameNormalized] NVARCHAR(200) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [Department_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Department_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Department_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Department_companyId_nameNormalized_key] UNIQUE NONCLUSTERED ([companyId],[nameNormalized])
);

-- CreateTable
CREATE TABLE [dbo].[SecurityGate] (
    [id] VARCHAR(36) NOT NULL,
    [facilityId] VARCHAR(36) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [nameNormalized] NVARCHAR(200) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [SecurityGate_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SecurityGate_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SecurityGate_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SecurityGate_facilityId_nameNormalized_key] UNIQUE NONCLUSTERED ([facilityId],[nameNormalized])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] VARCHAR(36) NOT NULL,
    [username] VARCHAR(100) NOT NULL,
    [usernameNormalized] VARCHAR(100) NOT NULL,
    [fullName] NVARCHAR(200) NOT NULL,
    [email] VARCHAR(320) NOT NULL,
    [emailNormalized] VARCHAR(320) NOT NULL,
    [passwordHash] VARCHAR(255),
    [role] VARCHAR(20) NOT NULL,
    [authenticationSource] VARCHAR(32) NOT NULL CONSTRAINT [User_authenticationSource_df] DEFAULT 'LOCAL',
    [active] BIT NOT NULL CONSTRAINT [User_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_usernameNormalized_key] UNIQUE NONCLUSTERED ([usernameNormalized]),
    CONSTRAINT [User_emailNormalized_key] UNIQUE NONCLUSTERED ([emailNormalized])
);

-- CreateTable
CREATE TABLE [dbo].[UserCompanyScope] (
    [userId] VARCHAR(36) NOT NULL,
    [companyId] VARCHAR(36) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserCompanyScope_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserCompanyScope_pkey] PRIMARY KEY CLUSTERED ([userId],[companyId])
);

-- CreateTable
CREATE TABLE [dbo].[UserFacilityScope] (
    [userId] VARCHAR(36) NOT NULL,
    [facilityId] VARCHAR(36) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserFacilityScope_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserFacilityScope_pkey] PRIMARY KEY CLUSTERED ([userId],[facilityId])
);

-- CreateTable
CREATE TABLE [dbo].[UserSecurityGateScope] (
    [userId] VARCHAR(36) NOT NULL,
    [securityGateId] VARCHAR(36) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserSecurityGateScope_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserSecurityGateScope_pkey] PRIMARY KEY CLUSTERED ([userId],[securityGateId])
);

-- CreateTable
CREATE TABLE [dbo].[Employee] (
    [id] VARCHAR(36) NOT NULL,
    [userId] VARCHAR(36),
    [fullName] NVARCHAR(200) NOT NULL,
    [companyId] VARCHAR(36) NOT NULL,
    [departmentId] VARCHAR(36),
    [active] BIT NOT NULL CONSTRAINT [Employee_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Employee_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Employee_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Employee_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[EmployeeFacilityScope] (
    [employeeId] VARCHAR(36) NOT NULL,
    [facilityId] VARCHAR(36) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmployeeFacilityScope_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [EmployeeFacilityScope_pkey] PRIMARY KEY CLUSTERED ([employeeId],[facilityId])
);

-- CreateTable
CREATE TABLE [dbo].[VisitType] (
    [id] VARCHAR(36) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [nameNormalized] NVARCHAR(200) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [VisitType_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VisitType_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [VisitType_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VisitType_nameNormalized_key] UNIQUE NONCLUSTERED ([nameNormalized])
);

-- CreateTable
CREATE TABLE [dbo].[OperationalSettings] (
    [id] VARCHAR(36) NOT NULL CONSTRAINT [OperationalSettings_id_df] DEFAULT 'default',
    [overdueToleranceMinutes] INT NOT NULL CONSTRAINT [OperationalSettings_overdueToleranceMinutes_df] DEFAULT 15,
    [overdueAlertRepeatMinutes] INT NOT NULL CONSTRAINT [OperationalSettings_overdueAlertRepeatMinutes_df] DEFAULT 10,
    [workdayEndTime] VARCHAR(5) NOT NULL CONSTRAINT [OperationalSettings_workdayEndTime_df] DEFAULT '18:15',
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [OperationalSettings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Visitor] (
    [id] VARCHAR(36) NOT NULL,
    [firstName] NVARCHAR(100) NOT NULL,
    [lastName] NVARCHAR(100) NOT NULL,
    [email] VARCHAR(320),
    [company] NVARCHAR(200) NOT NULL,
    [phone] VARCHAR(40),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Visitor_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Visitor_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Meeting] (
    [id] VARCHAR(36) NOT NULL,
    [creatorEmployeeId] VARCHAR(36) NOT NULL,
    [visitTypeId] VARCHAR(36) NOT NULL,
    [hostEmployeeId] VARCHAR(36),
    [hostEmployeeName] NVARCHAR(200) NOT NULL,
    [hostCompanyId] VARCHAR(36) NOT NULL,
    [facilityId] VARCHAR(36) NOT NULL,
    [plannedStart] DATETIME2 NOT NULL,
    [plannedEnd] DATETIME2 NOT NULL,
    [note] NVARCHAR(2000),
    [hasAdditionalRequirements] BIT NOT NULL CONSTRAINT [Meeting_hasAdditionalRequirements_df] DEFAULT 0,
    [additionalRequirementNote] NVARCHAR(2000),
    [actualMeetingEnd] DATETIME2,
    [meetingEndSource] VARCHAR(32),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Meeting_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Meeting_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Visit] (
    [id] VARCHAR(36) NOT NULL,
    [meetingId] VARCHAR(36) NOT NULL,
    [visitorId] VARCHAR(36) NOT NULL,
    [actualCheckIn] DATETIME2,
    [actualCheckOut] DATETIME2,
    [visitorCardReturned] BIT,
    [visitorCardId] VARCHAR(36),
    [visitorCardNumber] VARCHAR(100),
    [vehiclePlate] VARCHAR(32),
    [status] VARCHAR(20) NOT NULL,
    [invitationStatus] VARCHAR(20) NOT NULL CONSTRAINT [Visit_invitationStatus_df] DEFAULT 'NOT_SENT',
    [invitationSentAt] DATETIME2,
    [invitationError] NVARCHAR(1000),
    [cancelledAt] DATETIME2,
    [cancelledByUserId] VARCHAR(36),
    [cancellationReason] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Visit_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Visit_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VisitorCard] (
    [id] VARCHAR(36) NOT NULL,
    [cardNumber] VARCHAR(100) NOT NULL,
    [cardNumberNormalized] VARCHAR(100) NOT NULL,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [VisitorCard_status_df] DEFAULT 'AVAILABLE',
    [assignedVisitorName] NVARCHAR(200),
    [currentVisitId] VARCHAR(36),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VisitorCard_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [VisitorCard_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VisitorCard_cardNumberNormalized_key] UNIQUE NONCLUSTERED ([cardNumberNormalized]),
    CONSTRAINT [VisitorCard_currentVisitId_key] UNIQUE NONCLUSTERED ([currentVisitId])
);

-- CreateTable
CREATE TABLE [dbo].[VisitorRuleVersion] (
    [id] VARCHAR(36) NOT NULL,
    [version] INT NOT NULL,
    [content] NVARCHAR(4000) NOT NULL,
    [publishedAt] DATETIME2 NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [VisitorRuleVersion_active_df] DEFAULT 0,
    CONSTRAINT [VisitorRuleVersion_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VisitorRuleVersion_version_key] UNIQUE NONCLUSTERED ([version])
);

-- CreateTable
CREATE TABLE [dbo].[VisitRuleAcceptance] (
    [id] VARCHAR(36) NOT NULL,
    [visitId] VARCHAR(36) NOT NULL,
    [visitorId] VARCHAR(36) NOT NULL,
    [visitorRuleVersionId] VARCHAR(36) NOT NULL,
    [ruleVersion] INT NOT NULL,
    [acceptedAt] DATETIME2 NOT NULL,
    [method] VARCHAR(32) NOT NULL,
    [contentSnapshot] NVARCHAR(4000) NOT NULL,
    [integrityHash] VARCHAR(128),
    [ipAddress] VARCHAR(64),
    CONSTRAINT [VisitRuleAcceptance_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VisitRuleAcceptance_visitId_ruleVersionId_key] UNIQUE NONCLUSTERED ([visitId],[visitorRuleVersionId])
);

-- CreateTable
CREATE TABLE [dbo].[HostCorrectionAudit] (
    [id] VARCHAR(36) NOT NULL,
    [visitId] VARCHAR(36) NOT NULL,
    [previousHostName] NVARCHAR(200) NOT NULL,
    [correctedHostName] NVARCHAR(200) NOT NULL,
    [correctedByUserId] VARCHAR(36),
    [correctedByEmployeeId] VARCHAR(36),
    [correctedAt] DATETIME2 NOT NULL CONSTRAINT [HostCorrectionAudit_correctedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [HostCorrectionAudit_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Resource] (
    [id] VARCHAR(36) NOT NULL,
    [type] VARCHAR(32) NOT NULL,
    [companyId] VARCHAR(36) NOT NULL,
    [facilityId] VARCHAR(36) NOT NULL,
    [name] NVARCHAR(200),
    [totalQuantity] INT,
    [brand] NVARCHAR(100),
    [model] NVARCHAR(100),
    [licensePlate] VARCHAR(32),
    [fullName] NVARCHAR(200),
    [canDriveCommercialVehicles] BIT,
    [active] BIT NOT NULL CONSTRAINT [Resource_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Resource_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Resource_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DriverLicenseClass] (
    [resourceId] VARCHAR(36) NOT NULL,
    [value] VARCHAR(20) NOT NULL,
    CONSTRAINT [DriverLicenseClass_pkey] PRIMARY KEY CLUSTERED ([resourceId],[value])
);

-- CreateTable
CREATE TABLE [dbo].[DriverDocument] (
    [id] VARCHAR(36) NOT NULL,
    [resourceId] VARCHAR(36) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    CONSTRAINT [DriverDocument_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [DriverDocument_resourceId_name_key] UNIQUE NONCLUSTERED ([resourceId],[name])
);

-- CreateTable
CREATE TABLE [dbo].[ResourceAssignment] (
    [id] VARCHAR(36) NOT NULL,
    [meetingId] VARCHAR(36) NOT NULL,
    [resourceId] VARCHAR(36) NOT NULL,
    [resourceType] VARCHAR(32) NOT NULL,
    [resourceName] NVARCHAR(200) NOT NULL,
    [companyId] VARCHAR(36) NOT NULL,
    [facilityId] VARCHAR(36) NOT NULL,
    [totalQuantity] INT,
    [requestedQuantity] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ResourceAssignment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ResourceAssignment_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ResourceAssignment_meetingId_resourceId_key] UNIQUE NONCLUSTERED ([meetingId],[resourceId])
);

-- CreateTable
CREATE TABLE [dbo].[TransportAssignment] (
    [id] VARCHAR(36) NOT NULL,
    [companyId] VARCHAR(36) NOT NULL,
    [facilityId] VARCHAR(36) NOT NULL,
    [plannedStart] DATETIME2 NOT NULL,
    [plannedEnd] DATETIME2 NOT NULL,
    [purpose] NVARCHAR(1000) NOT NULL,
    [vehicleResourceId] VARCHAR(36) NOT NULL,
    [vehicleName] NVARCHAR(200) NOT NULL,
    [vehicleLicensePlate] VARCHAR(32) NOT NULL,
    [driverResourceId] VARCHAR(36) NOT NULL,
    [driverName] NVARCHAR(200) NOT NULL,
    [relatedMeetingId] VARCHAR(36),
    [relatedVisitId] VARCHAR(36),
    [status] VARCHAR(20) NOT NULL CONSTRAINT [TransportAssignment_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TransportAssignment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TransportAssignment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[GoodsMovement] (
    [id] VARCHAR(36) NOT NULL,
    [direction] VARCHAR(20) NOT NULL,
    [companyId] VARCHAR(36) NOT NULL,
    [facilityId] VARCHAR(36) NOT NULL,
    [counterpartyName] NVARCHAR(200) NOT NULL,
    [plannedDate] DATE NOT NULL,
    [plannedTime] VARCHAR(5),
    [goodsDescription] NVARCHAR(2000) NOT NULL,
    [referenceNumber] VARCHAR(200),
    [note] NVARCHAR(2000),
    [status] VARCHAR(20) NOT NULL CONSTRAINT [GoodsMovement_status_df] DEFAULT 'PLANNED',
    [actualAt] DATETIME2,
    [actualPlate] VARCHAR(32),
    [actualDriverName] NVARCHAR(200),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [GoodsMovement_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [GoodsMovement_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [id] VARCHAR(36) NOT NULL,
    [userId] VARCHAR(36) NOT NULL,
    [tokenHash] VARCHAR(128) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Session_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [expiresAt] DATETIME2 NOT NULL,
    [lastUsedAt] DATETIME2,
    [revokedAt] DATETIME2,
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Session_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Facility_companyId_idx] ON [dbo].[Facility]([companyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Department_companyId_idx] ON [dbo].[Department]([companyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SecurityGate_facilityId_idx] ON [dbo].[SecurityGate]([facilityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_active_role_idx] ON [dbo].[User]([active], [role]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserCompanyScope_companyId_idx] ON [dbo].[UserCompanyScope]([companyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserFacilityScope_facilityId_idx] ON [dbo].[UserFacilityScope]([facilityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserSecurityGateScope_securityGateId_idx] ON [dbo].[UserSecurityGateScope]([securityGateId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_companyId_idx] ON [dbo].[Employee]([companyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_departmentId_idx] ON [dbo].[Employee]([departmentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmployeeFacilityScope_facilityId_idx] ON [dbo].[EmployeeFacilityScope]([facilityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Visitor_lastName_firstName_idx] ON [dbo].[Visitor]([lastName], [firstName]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Visitor_company_idx] ON [dbo].[Visitor]([company]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Meeting_facilityId_plannedStart_idx] ON [dbo].[Meeting]([facilityId], [plannedStart]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Meeting_hostEmployeeId_plannedStart_idx] ON [dbo].[Meeting]([hostEmployeeId], [plannedStart]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Visit_meetingId_idx] ON [dbo].[Visit]([meetingId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Visit_visitorId_idx] ON [dbo].[Visit]([visitorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Visit_status_actualCheckIn_idx] ON [dbo].[Visit]([status], [actualCheckIn]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VisitorCard_status_idx] ON [dbo].[VisitorCard]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VisitorRuleVersion_active_idx] ON [dbo].[VisitorRuleVersion]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VisitRuleAcceptance_visitorId_idx] ON [dbo].[VisitRuleAcceptance]([visitorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [HostCorrectionAudit_visitId_correctedAt_idx] ON [dbo].[HostCorrectionAudit]([visitId], [correctedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Resource_companyId_facilityId_type_active_idx] ON [dbo].[Resource]([companyId], [facilityId], [type], [active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ResourceAssignment_resourceId_idx] ON [dbo].[ResourceAssignment]([resourceId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TransportAssignment_facilityId_plannedStart_idx] ON [dbo].[TransportAssignment]([facilityId], [plannedStart]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TransportAssignment_vehicleResourceId_plannedStart_idx] ON [dbo].[TransportAssignment]([vehicleResourceId], [plannedStart]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TransportAssignment_driverResourceId_plannedStart_idx] ON [dbo].[TransportAssignment]([driverResourceId], [plannedStart]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodsMovement_facilityId_plannedDate_status_idx] ON [dbo].[GoodsMovement]([facilityId], [plannedDate], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Session_userId_expiresAt_idx] ON [dbo].[Session]([userId], [expiresAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Session_expiresAt_idx] ON [dbo].[Session]([expiresAt]);

-- AddForeignKey
ALTER TABLE [dbo].[Facility] ADD CONSTRAINT [Facility_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Department] ADD CONSTRAINT [Department_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SecurityGate] ADD CONSTRAINT [SecurityGate_facilityId_fkey] FOREIGN KEY ([facilityId]) REFERENCES [dbo].[Facility]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserCompanyScope] ADD CONSTRAINT [UserCompanyScope_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserCompanyScope] ADD CONSTRAINT [UserCompanyScope_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserFacilityScope] ADD CONSTRAINT [UserFacilityScope_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserFacilityScope] ADD CONSTRAINT [UserFacilityScope_facilityId_fkey] FOREIGN KEY ([facilityId]) REFERENCES [dbo].[Facility]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserSecurityGateScope] ADD CONSTRAINT [UserSecurityGateScope_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserSecurityGateScope] ADD CONSTRAINT [UserSecurityGateScope_securityGateId_fkey] FOREIGN KEY ([securityGateId]) REFERENCES [dbo].[SecurityGate]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Employee] ADD CONSTRAINT [Employee_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Employee] ADD CONSTRAINT [Employee_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Employee] ADD CONSTRAINT [Employee_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[EmployeeFacilityScope] ADD CONSTRAINT [EmployeeFacilityScope_employeeId_fkey] FOREIGN KEY ([employeeId]) REFERENCES [dbo].[Employee]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[EmployeeFacilityScope] ADD CONSTRAINT [EmployeeFacilityScope_facilityId_fkey] FOREIGN KEY ([facilityId]) REFERENCES [dbo].[Facility]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Meeting] ADD CONSTRAINT [Meeting_creatorEmployeeId_fkey] FOREIGN KEY ([creatorEmployeeId]) REFERENCES [dbo].[Employee]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Meeting] ADD CONSTRAINT [Meeting_visitTypeId_fkey] FOREIGN KEY ([visitTypeId]) REFERENCES [dbo].[VisitType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Meeting] ADD CONSTRAINT [Meeting_hostEmployeeId_fkey] FOREIGN KEY ([hostEmployeeId]) REFERENCES [dbo].[Employee]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Meeting] ADD CONSTRAINT [Meeting_hostCompanyId_fkey] FOREIGN KEY ([hostCompanyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Meeting] ADD CONSTRAINT [Meeting_facilityId_fkey] FOREIGN KEY ([facilityId]) REFERENCES [dbo].[Facility]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Visit] ADD CONSTRAINT [Visit_meetingId_fkey] FOREIGN KEY ([meetingId]) REFERENCES [dbo].[Meeting]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Visit] ADD CONSTRAINT [Visit_visitorId_fkey] FOREIGN KEY ([visitorId]) REFERENCES [dbo].[Visitor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Visit] ADD CONSTRAINT [Visit_visitorCardId_fkey] FOREIGN KEY ([visitorCardId]) REFERENCES [dbo].[VisitorCard]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Visit] ADD CONSTRAINT [Visit_cancelledByUserId_fkey] FOREIGN KEY ([cancelledByUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VisitorCard] ADD CONSTRAINT [VisitorCard_currentVisitId_fkey] FOREIGN KEY ([currentVisitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VisitRuleAcceptance] ADD CONSTRAINT [VisitRuleAcceptance_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VisitRuleAcceptance] ADD CONSTRAINT [VisitRuleAcceptance_visitorId_fkey] FOREIGN KEY ([visitorId]) REFERENCES [dbo].[Visitor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VisitRuleAcceptance] ADD CONSTRAINT [VisitRuleAcceptance_visitorRuleVersionId_fkey] FOREIGN KEY ([visitorRuleVersionId]) REFERENCES [dbo].[VisitorRuleVersion]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[HostCorrectionAudit] ADD CONSTRAINT [HostCorrectionAudit_visitId_fkey] FOREIGN KEY ([visitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[HostCorrectionAudit] ADD CONSTRAINT [HostCorrectionAudit_correctedByUserId_fkey] FOREIGN KEY ([correctedByUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[HostCorrectionAudit] ADD CONSTRAINT [HostCorrectionAudit_correctedByEmployeeId_fkey] FOREIGN KEY ([correctedByEmployeeId]) REFERENCES [dbo].[Employee]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Resource] ADD CONSTRAINT [Resource_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Resource] ADD CONSTRAINT [Resource_facilityId_fkey] FOREIGN KEY ([facilityId]) REFERENCES [dbo].[Facility]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DriverLicenseClass] ADD CONSTRAINT [DriverLicenseClass_resourceId_fkey] FOREIGN KEY ([resourceId]) REFERENCES [dbo].[Resource]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DriverDocument] ADD CONSTRAINT [DriverDocument_resourceId_fkey] FOREIGN KEY ([resourceId]) REFERENCES [dbo].[Resource]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ResourceAssignment] ADD CONSTRAINT [ResourceAssignment_meetingId_fkey] FOREIGN KEY ([meetingId]) REFERENCES [dbo].[Meeting]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ResourceAssignment] ADD CONSTRAINT [ResourceAssignment_resourceId_fkey] FOREIGN KEY ([resourceId]) REFERENCES [dbo].[Resource]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TransportAssignment] ADD CONSTRAINT [TransportAssignment_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TransportAssignment] ADD CONSTRAINT [TransportAssignment_facilityId_fkey] FOREIGN KEY ([facilityId]) REFERENCES [dbo].[Facility]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TransportAssignment] ADD CONSTRAINT [TransportAssignment_vehicleResourceId_fkey] FOREIGN KEY ([vehicleResourceId]) REFERENCES [dbo].[Resource]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TransportAssignment] ADD CONSTRAINT [TransportAssignment_driverResourceId_fkey] FOREIGN KEY ([driverResourceId]) REFERENCES [dbo].[Resource]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TransportAssignment] ADD CONSTRAINT [TransportAssignment_relatedMeetingId_fkey] FOREIGN KEY ([relatedMeetingId]) REFERENCES [dbo].[Meeting]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TransportAssignment] ADD CONSTRAINT [TransportAssignment_relatedVisitId_fkey] FOREIGN KEY ([relatedVisitId]) REFERENCES [dbo].[Visit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsMovement] ADD CONSTRAINT [GoodsMovement_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsMovement] ADD CONSTRAINT [GoodsMovement_facilityId_fkey] FOREIGN KEY ([facilityId]) REFERENCES [dbo].[Facility]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
