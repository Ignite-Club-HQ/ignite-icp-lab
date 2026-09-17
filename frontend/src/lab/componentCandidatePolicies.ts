export type EventAttendanceSummary =
  | { state: "players"; count: number }
  | { state: "social"; total: number; adults: number; children: number }
  | { state: "loading" }
  | { state: "unavailable" };

export function formatEventAttendanceSummary(summary: EventAttendanceSummary): string {
  if (summary.state === "loading") return "Loading...";
  if (summary.state === "unavailable") return "Attendance unavailable";
  if (summary.state === "players") {
    return `${summary.count} player${summary.count === 1 ? "" : "s"} attending`;
  }
  const adultLabel = `${summary.adults} adult${summary.adults === 1 ? "" : "s"}`;
  const childLabel = `${summary.children} child${summary.children === 1 ? "" : "ren"}`;
  return `${summary.total} attending (${adultLabel}, ${childLabel})`;
}

export interface EventLocationModel {
  address?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  locationName?: string | null;
  legacyLocation?: string | null;
}

export function resolveEventMapAddress(location: EventLocationModel): string | null {
  return location.address?.trim() || location.legacyLocation?.trim() || null;
}

export function eventLocationLabels(location: EventLocationModel): string[] {
  const labels = [
    location.address?.trim(),
    [location.suburb, location.state, location.postcode].filter(Boolean).join(", "),
    location.locationName?.trim(),
    location.legacyLocation?.trim(),
  ].filter((label): label is string => Boolean(label));
  return [...new Set(labels)];
}

export interface EventPassiveFactsModel {
  opponent?: string | null;
  arrivalTime?: string | null;
  arrivalMinutes?: number | null;
  price?: number | null;
  eventType: "game" | "social" | "training";
}

export function formatEventPassiveFacts(model: EventPassiveFactsModel): {
  opponent: string | null;
  arrival: string | null;
  price: string | null;
} {
  return {
    opponent: model.eventType === "game" && model.opponent ? `vs ${model.opponent}` : null,
    arrival:
      model.eventType === "game" &&
      model.arrivalTime &&
      model.arrivalMinutes != null
        ? `Arrive by ${model.arrivalTime} (${model.arrivalMinutes} min before kickoff)`
        : null,
    price:
      model.eventType === "social" && model.price != null && model.price > 0
        ? `$${model.price.toFixed(2)} per person`
        : null,
  };
}

export type EventReminderAvailability = "hidden" | "enabled" | "pro-disabled";

export interface EventAdminActionModel {
  visible: boolean;
  showEdit: boolean;
  reminder: EventReminderAvailability;
  showResend: boolean;
  showCancel: boolean;
  showDelete: boolean;
}

export function getEventAdminActionLabels(
  model: EventAdminActionModel,
  eventTypeLabel: string,
): Array<{ label: string; enabled: boolean }> {
  if (!model.visible) return [];
  return [
    ...(model.showEdit ? [{ label: `Edit ${eventTypeLabel}`, enabled: true }] : []),
    ...(model.reminder !== "hidden"
      ? [{ label: "Send Reminders", enabled: model.reminder === "enabled" }]
      : []),
    ...(model.showResend ? [{ label: "Resend Invites", enabled: true }] : []),
    ...(model.showCancel ? [{ label: `Cancel ${eventTypeLabel}`, enabled: true }] : []),
    ...(model.showDelete ? [{ label: `Delete ${eventTypeLabel}`, enabled: true }] : []),
  ];
}

export function getEventLifecycleScopes(recurring: boolean): Array<"single" | "series"> {
  return recurring ? ["single", "series"] : ["single"];
}

export function getEventNotificationState(
  isPending: boolean,
  actionsDisabled: boolean,
): { sendLabel: string; sendDisabled: boolean } {
  return {
    sendLabel: isPending ? "Sending..." : "Send In-App",
    sendDisabled: isPending || actionsDisabled,
  };
}

export function resolveEventMatchScoreContract(input: {
  visible: boolean;
  opponent: string | null;
  canEdit: boolean;
  eventId: string;
  teamId: string | null;
  teamName?: string | null;
  sport?: string;
}): {
  eventId: string;
  teamId: string;
  teamName: string;
  opponent: string;
  sport?: string;
  canEdit: boolean;
} | null {
  if (!input.visible || !input.teamId || !input.opponent) return null;
  return {
    eventId: input.eventId,
    teamId: input.teamId,
    teamName: input.teamName || "Our Team",
    opponent: input.opponent,
    ...(input.sport ? { sport: input.sport } : {}),
    canEdit: input.canEdit,
  };
}

export function formatEventCalendarLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
  return `${dateLabel} at ${timeLabel}`;
}

export type InviteDeliveryMethod = "email" | "share";

export function getInviteDeliveryState(
  deliveryMethod: InviteDeliveryMethod,
  email: string,
): { showEmail: boolean; selectedAction: "Email" | "Share Link"; canSubmit: boolean } {
  const trimmedEmail = email.trim();
  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail);
  return {
    showEmail: deliveryMethod === "email",
    selectedAction: deliveryMethod === "email" ? "Email" : "Share Link",
    canSubmit: deliveryMethod === "share" || validEmail,
  };
}

export function buildInviteSmsUrl(phone: string, message: string, isAndroid: boolean): string {
  const normalizedPhone = phone.replace(/[\s()-]/g, "");
  return `sms:${normalizedPhone}${isAndroid ? "?" : "&"}body=${encodeURIComponent(message.trim())}`;
}

export function buildInviteWhatsAppUrl(phone: string, message: string): string {
  const normalizedPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message.trim())}`;
}

export function formatInviteSuccessSummary(
  childNames: readonly string[],
  teamName: string,
  invitedEmail: string,
): string {
  const children = childNames.join(", ");
  return invitedEmail
    ? `${children} added to ${teamName}; Invite sent to ${invitedEmail}`
    : `${children} added to ${teamName}; Invite link created - share it with them`;
}

export function formatBulkInviteOutcome(
  result: { email: string; sent: boolean },
): "Sent" | "Failed" | "Link only" {
  if (result.sent) return "Sent";
  return result.email ? "Failed" : "Link only";
}

export function getInvitationFooterState(input: {
  wizardStep: 1 | 2 | 3;
  hasMemberIdentity: boolean;
  hasMemberName: boolean;
  selectedRole: "player" | "parent" | "coach" | "team_admin";
  hasNamedChild: boolean;
  deliveryMethod: InviteDeliveryMethod;
  email: string;
  isPending: boolean;
}): { canContinue: boolean; message: string | null } {
  if (input.wizardStep === 1) {
    return {
      canContinue: input.hasMemberName,
      message: input.hasMemberName ? null : "Enter a name to continue",
    };
  }
  if (input.wizardStep === 2 && input.selectedRole === "parent" && !input.hasNamedChild) {
    return { canContinue: false, message: "Add at least one child's name to continue." };
  }
  if (input.wizardStep === 2 && input.hasMemberIdentity && input.selectedRole !== "parent") {
    return { canContinue: true, message: null };
  }
  if (input.wizardStep === 3 && input.deliveryMethod === "email") {
    if (!input.email.trim()) {
      return { canContinue: false, message: "Enter an email address to send the invite." };
    }
    if (!getInviteDeliveryState("email", input.email).canSubmit) {
      return { canContinue: false, message: "That email doesn't look right" };
    }
  }
  return { canContinue: !input.isPending, message: null };
}

export type VaultStorageTone = "primary" | "warning" | "destructive";

export function getVaultStorageTone(storagePercentage: number): VaultStorageTone {
  if (storagePercentage >= 90) return "destructive";
  if (storagePercentage >= 70) return "warning";
  return "primary";
}

export function getVaultSelectedCount(photoCount: number, fileCount: number): number {
  return photoCount + fileCount;
}

export function getVaultExportState(photoCount: number, fileCount: number): {
  selectedCount: number;
  canExport: boolean;
  confirmationLabel: string;
} {
  const selectedCount = getVaultSelectedCount(photoCount, fileCount);
  return {
    selectedCount,
    canExport: selectedCount > 0,
    confirmationLabel: `Export ${selectedCount} Items as ZIP`,
  };
}

export function getVaultSelectedBytes(
  items: readonly { id: string; size: number }[],
  selectedIds: ReadonlySet<string>,
): number {
  return items.reduce((total, item) => total + (selectedIds.has(item.id) ? item.size : 0), 0);
}

export function canRenameVaultValue(value: string): boolean {
  return value.trim().length > 0;
}

export function getVaultMutationState(input: {
  kind: "photo" | "file" | "folder";
  permanent?: boolean;
  selectedCount?: number;
  deletingSelected?: boolean;
}): { title: string; confirmLabel: string; destructive: boolean; canConfirm: boolean } {
  if (input.kind === "photo") {
    return {
      title: input.permanent ? "Permanently Delete Photo" : "Move Photo to Trash",
      confirmLabel: input.permanent ? "Delete Permanently" : "Move to Trash",
      destructive: Boolean(input.permanent),
      canConfirm: true,
    };
  }
  if (input.kind === "file") {
    return {
      title: input.permanent ? "Permanently Delete File" : "Move File to Trash",
      confirmLabel: input.permanent ? "Delete Permanently" : "Move to Trash",
      destructive: Boolean(input.permanent),
      canConfirm: true,
    };
  }
  const count = input.selectedCount ?? 0;
  return {
    title: `Delete ${count} selected item${count === 1 ? "" : "s"}?`,
    confirmLabel: `Delete ${count} Item${count === 1 ? "" : "s"}`,
    destructive: true,
    canConfirm: count > 0 && !input.deletingSelected,
  };
}

export interface PitchBoardRestoreInput {
  currentPath: string;
  storedPath: string | null;
  open: boolean;
  openedAt: number | null;
  now: number;
  mounted: boolean;
  restoreWindowOpen: boolean;
}

export function resolvePitchBoardRestore(input: PitchBoardRestoreInput): {
  navigateTo: string | null;
  clearMarker: boolean;
} {
  if (!input.restoreWindowOpen || input.mounted || !input.open || !input.storedPath) {
    return { navigateTo: null, clearMarker: false };
  }
  if (input.openedAt == null || input.now - input.openedAt >= 12 * 60 * 60 * 1000) {
    return { navigateTo: null, clearMarker: true };
  }
  const [path, query = ""] = input.storedPath.split("?");
  const [currentPath, currentQuery = ""] = input.currentPath.split("?");
  if (path === "/" || path === "/home" || ["/auth", "/reset-password", "/verify-reset-code", "/complete-profile", "/terms", "/privacy"].includes(currentPath)) {
    return { navigateTo: null, clearMarker: false };
  }
  if (currentPath === path && new URLSearchParams(currentQuery).get("openPitchBoard") === "1") {
    return { navigateTo: null, clearMarker: false };
  }
  const params = new URLSearchParams(query);
  params.set("openPitchBoard", "1");
  return { navigateTo: `${path}?${params.toString()}`, clearMarker: true };
}
