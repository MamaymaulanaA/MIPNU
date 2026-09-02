/**
 * Konstanta permission Phase 1-4.
 *
 * Harus sinkron dengan seed di
 * `supabase/migrations/20260829001200_seed_system_data.sql` (Phase 1),
 * `supabase/migrations/20260830091000_phase2_permissions.sql` (Phase 2),
 * `supabase/migrations/20260830122000_finance_permissions.sql` (Phase 3), dan
 * `supabase/migrations/20260830152000_election_permissions.sql` (Phase 4).
 *
 * Gunanya bukan menjadi source of truth authorization — database tetap
 * pemutusnya — melainkan menghapus magic string dari codebase sehingga salah
 * ketik permission menjadi error compile, bukan penolakan diam-diam saat
 * runtime (SYSTEM.md §85).
 */
export const PERMISSIONS = {
  organization: {
    view: "organization.view",
    edit: "organization.edit",
    manage: "organization.manage",
    create: "organization.create",
    activate: "organization.activate",
    deactivate: "organization.deactivate",
    archive: "organization.archive",
  },
  members: {
    view: "members.view",
    viewPrivate: "members.view_private",
    create: "members.create",
    edit: "members.edit",
    delete: "members.delete",
    restore: "members.restore",
    import: "members.import",
    export: "members.export",
    manageStatus: "members.manage_status",
  },
  periods: {
    view: "periods.view",
    create: "periods.create",
    edit: "periods.edit",
    activate: "periods.activate",
    close: "periods.close",
    archive: "periods.archive",
  },
  positions: {
    view: "positions.view",
    create: "positions.create",
    edit: "positions.edit",
    delete: "positions.delete",
    managePermissions: "positions.manage_permissions",
  },
  management: {
    view: "management.view",
    assign: "management.assign",
    edit: "management.edit",
    end: "management.end",
    export: "management.export",
  },
  agenda: {
    view: "agenda.view",
    create: "agenda.create",
    edit: "agenda.edit",
    delete: "agenda.delete",
    manage: "agenda.manage",
  },
  events: {
    view: "events.view",
    create: "events.create",
    edit: "events.edit",
    delete: "events.delete",
    publish: "events.publish",
    manage: "events.manage",
    register: "events.register",
    cancelRegistration: "events.cancel_registration",
    manageParticipants: "events.manage_participants",
    assignCommittee: "events.assign_committee",
    exportParticipants: "events.export_participants",
  },
  attendance: {
    view: "attendance.view",
    viewOwn: "attendance.view_own",
    createSession: "attendance.create_session",
    editSession: "attendance.edit_session",
    manage: "attendance.manage",
    checkIn: "attendance.check_in",
    export: "attendance.export",
  },
  users: {
    view: "users.view",
    create: "users.create",
    edit: "users.edit",
    disable: "users.disable",
    assignRole: "users.assign_role",
    assignOrganization: "users.assign_organization",
    resetAccess: "users.reset_access",
  },
  permissions: {
    view: "permissions.view",
    assign: "permissions.assign",
    manageRoleDefaults: "permissions.manage_role_defaults",
    managePositionDefaults: "permissions.manage_position_defaults",
    manageOverrides: "permissions.manage_overrides",
  },
  audit: {
    view: "audit.view",
    viewGlobal: "audit.view_global",
    export: "audit.export",
  },
  settings: {
    view: "settings.view",
    editOrganization: "settings.edit_organization",
    editSystem: "settings.edit_system",
  },
  reports: {
    view: "reports.view",
    export: "reports.export",
    viewGlobal: "reports.view_global",
  },

  cadreship: {
    view: "cadreship.view",
    viewOwn: "cadreship.view_own",
    create: "cadreship.create",
    edit: "cadreship.edit",
    delete: "cadreship.delete",
    verify: "cadreship.verify",
    export: "cadreship.export",
  },
  programs: {
    view: "programs.view",
    create: "programs.create",
    edit: "programs.edit",
    delete: "programs.delete",
    manage: "programs.manage",
    updateProgress: "programs.update_progress",
  },
  meetings: {
    view: "meetings.view",
    create: "meetings.create",
    edit: "meetings.edit",
    delete: "meetings.delete",
    manageParticipants: "meetings.manage_participants",
    manageMinutes: "meetings.manage_minutes",
    export: "meetings.export",
  },
  letters: {
    view: "letters.view",
    create: "letters.create",
    edit: "letters.edit",
    delete: "letters.delete",
    manage: "letters.manage",
    approve: "letters.approve",
    export: "letters.export",
  },
  documents: {
    view: "documents.view",
    viewPrivate: "documents.view_private",
    create: "documents.create",
    edit: "documents.edit",
    delete: "documents.delete",
    download: "documents.download",
    manageVisibility: "documents.manage_visibility",
  },
  finance: {
    view: "finance.view",
    create: "finance.create",
    edit: "finance.edit",
    delete: "finance.delete",
    post: "finance.post",
    approve: "finance.approve",
    void: "finance.void",
    manageAccounts: "finance.manage_accounts",
    manageCategories: "finance.manage_categories",
    manageBudgets: "finance.manage_budgets",
    viewReports: "finance.view_reports",
    viewProofs: "finance.view_proofs",
    export: "finance.export",
  },
  announcements: {
    view: "announcements.view",
    create: "announcements.create",
    edit: "announcements.edit",
    delete: "announcements.delete",
    publish: "announcements.publish",
    manageAudience: "announcements.manage_audience",
  },

  elections: {
    view: "elections.view",
    create: "elections.create",
    edit: "elections.edit",
    manage: "elections.manage",
    manageCandidates: "elections.manage_candidates",
    manageVoters: "elections.manage_voters",
    assignCommittee: "elections.assign_committee",
    open: "elections.open",
    close: "elections.close",
    vote: "elections.vote",
    publishResult: "elections.publish_result",
    viewResult: "elections.view_result",
    viewAudit: "elections.view_audit",
    archive: "elections.archive",
  },
} as const;

/**
 * Union seluruh permission code yang dikenal, mis. `"members.edit"`.
 *
 * Dipetakan per grup lebih dulu, baru digabung. Menulis
 * `Group[keyof Group]` langsung di atas union grup akan menghasilkan
 * IRISAN key antar-grup — praktisnya hanya `view` — bukan gabungannya.
 */
export type Permission = {
  [
    Group in keyof typeof PERMISSIONS
  ]: (typeof PERMISSIONS)[Group][keyof (typeof PERMISSIONS)[Group]];
}[keyof typeof PERMISSIONS];

export const ROLES = {
  superAdmin: "SUPER_ADMIN",
  operator: "OPERATOR_ORGANISASI",
  pengurus: "PENGURUS",
  anggota: "ANGGOTA",
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];
