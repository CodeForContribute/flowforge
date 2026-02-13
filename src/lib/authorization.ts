import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Check if a user can access a project (read-only access)
 * Access is granted if the user is:
 * - The project owner (userId)
 * - A project member
 * - A member of the organization that owns the project
 */
export async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      userId: true,
      organizationId: true,
      members: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  if (!project) {
    return false;
  }

  // User is the project owner
  if (project.userId === userId) {
    return true;
  }

  // User is a project member
  if (project.members.length > 0) {
    return true;
  }

  // If project belongs to an organization, check org membership
  if (project.organizationId) {
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId,
        },
      },
    });
    return !!orgMembership;
  }

  return false;
}

/**
 * Check if a user can manage a project (admin-level access)
 * Management access is granted if the user is:
 * - The project owner
 * - A project member with OWNER or ADMIN role
 * - An organization member with OWNER or ADMIN role (for org projects)
 */
export async function canManageProject(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      userId: true,
      organizationId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!project) {
    return false;
  }

  // User is the project owner
  if (project.userId === userId) {
    return true;
  }

  // User is a project member with OWNER or ADMIN role
  if (project.members.length > 0 && (project.members[0].role === "OWNER" || project.members[0].role === "ADMIN")) {
    return true;
  }

  // If project belongs to an organization, check org membership role
  if (project.organizationId) {
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId,
        },
      },
    });
    // Org OWNER or ADMIN can manage all org projects
    if (orgMembership && (orgMembership.role === "OWNER" || orgMembership.role === "ADMIN")) {
      return true;
    }
  }

  return false;
}

/**
 * Get user's effective role for a project
 * Returns the highest privilege role the user has for the project
 */
export async function getProjectRole(
  userId: string,
  projectId: string
): Promise<"OWNER" | "ADMIN" | "MEMBER" | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      userId: true,
      organizationId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!project) {
    return null;
  }

  // User is the project owner
  if (project.userId === userId) {
    return "OWNER";
  }

  let highestRole: "OWNER" | "ADMIN" | "MEMBER" | null = null;

  // Check project membership
  if (project.members.length > 0) {
    highestRole = project.members[0].role as "OWNER" | "ADMIN" | "MEMBER";
  }

  // Check organization membership if applicable
  if (project.organizationId) {
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId,
        },
      },
    });

    if (orgMembership) {
      const orgRole = orgMembership.role as "OWNER" | "ADMIN" | "MEMBER";
      // Compare roles: OWNER > ADMIN > MEMBER
      const roleHierarchy = { OWNER: 3, ADMIN: 2, MEMBER: 1 };
      if (!highestRole || roleHierarchy[orgRole] > roleHierarchy[highestRole]) {
        highestRole = orgRole;
      }
    }
  }

  return highestRole;
}

/**
 * Build a Prisma where clause for filtering projects the user can access
 * Used for listing projects
 */
export function buildProjectAccessFilter(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      // User is the project owner
      { userId },
      // User is a project member
      {
        members: {
          some: { userId },
        },
      },
      // User is a member of the organization that owns the project
      {
        organization: {
          members: {
            some: { userId },
          },
        },
      },
    ],
  };
}

/**
 * Build a Prisma where clause for filtering projects within a specific organization
 */
export function buildOrgProjectFilter(userId: string, organizationId: string): Prisma.ProjectWhereInput {
  return {
    organizationId,
    OR: [
      // User is a member of the organization
      {
        organization: {
          members: {
            some: { userId },
          },
        },
      },
      // User is a direct project member
      {
        members: {
          some: { userId },
        },
      },
    ],
  };
}

/**
 * Check if user is a member of an organization
 */
export async function isOrgMember(userId: string, organizationId: string): Promise<boolean> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });
  return !!membership;
}

/**
 * Check if user can manage an organization (OWNER or ADMIN)
 */
export async function canManageOrg(userId: string, organizationId: string): Promise<boolean> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });
  return !!membership && (membership.role === "OWNER" || membership.role === "ADMIN");
}

/**
 * Check if user is an organization owner
 */
export async function isOrgOwner(userId: string, organizationId: string): Promise<boolean> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });
  return !!membership && membership.role === "OWNER";
}
