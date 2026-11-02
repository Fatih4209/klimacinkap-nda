import { z } from "zod";

export const userRoles = [
  "customer",
  "business_owner",
  "field_staff",
  "platform_admin",
] as const;

export type UserRole = (typeof userRoles)[number];

export const userRoleSchema = z.enum(userRoles);

export const roleLabelsTr: Record<UserRole, string> = {
  customer: "Müşteri",
  business_owner: "İşletme sahibi",
  field_staff: "Saha personeli",
  platform_admin: "Platform yönetici",
};

/** Business stays inactive until platform admin approval (category-scoped). */
export const businessApplicationStatuses = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "needs_info",
] as const;

export type BusinessApplicationStatus =
  (typeof businessApplicationStatuses)[number];

export const businessApplicationStatusSchema = z.enum(
  businessApplicationStatuses,
);

export const businessCategoryApprovalStatuses = [
  "pending",
  "approved",
  "rejected",
] as const;

export type BusinessCategoryApprovalStatus =
  (typeof businessCategoryApprovalStatuses)[number];
