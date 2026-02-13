import { prisma } from "@/lib/prisma";

/**
 * Generate a project key suggestion from the project name
 * E.g., "My Project" -> "MP", "FlowForge" -> "FF"
 */
export function generateProjectKey(name: string): string {
  // Get uppercase letters from the start of each word
  const words = name.trim().split(/\s+/);
  let key = words
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  // If too short, use first letters of the name
  if (key.length < 2) {
    key = name
      .replace(/[^a-zA-Z]/g, "")
      .substring(0, 4)
      .toUpperCase();
  }

  // Ensure it's between 2-10 characters
  if (key.length < 2) {
    key = "PR"; // Default fallback
  } else if (key.length > 10) {
    key = key.substring(0, 10);
  }

  return key;
}

/**
 * Validate project key format (2-10 uppercase letters)
 */
export function validateProjectKey(key: string): { valid: boolean; error?: string } {
  if (!key) {
    return { valid: false, error: "Project key is required" };
  }

  if (key.length < 2) {
    return { valid: false, error: "Project key must be at least 2 characters" };
  }

  if (key.length > 10) {
    return { valid: false, error: "Project key must be at most 10 characters" };
  }

  if (!/^[A-Z]+$/.test(key)) {
    return { valid: false, error: "Project key must contain only uppercase letters (A-Z)" };
  }

  return { valid: true };
}

/**
 * Check if a project key is available (not already used)
 */
export async function isProjectKeyAvailable(
  key: string,
  excludeProjectId?: string
): Promise<boolean> {
  const existing = await prisma.project.findFirst({
    where: {
      projectKey: key,
      ...(excludeProjectId && { id: { not: excludeProjectId } }),
    },
    select: { id: true },
  });

  return !existing;
}

/**
 * Generate a unique project key by appending numbers if needed
 */
export async function generateUniqueProjectKey(name: string): Promise<string> {
  const baseKey = generateProjectKey(name);

  // Try the base key first
  if (await isProjectKeyAvailable(baseKey)) {
    return baseKey;
  }

  // Try appending numbers
  for (let i = 2; i <= 99; i++) {
    const candidateKey = `${baseKey.substring(0, 8)}${i}`.toUpperCase();
    if (candidateKey.length <= 10 && (await isProjectKeyAvailable(candidateKey))) {
      return candidateKey;
    }
  }

  // Fallback: use random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${baseKey.substring(0, 8)}${randomSuffix}`;
}
