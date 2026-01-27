import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

export interface AIConfig {
  aiEnabled: boolean;
  preferredProvider: "openai" | "anthropic";
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  autoExecuteTasks: boolean;
  autoRespondReviews: boolean;
  autoRespondComments: boolean;
}

/**
 * Get AI configuration for a project.
 * Returns the project's AI settings with decrypted API keys.
 * Falls back to environment variables if no project-specific keys are set.
 */
export async function getProjectAIConfig(projectId: string): Promise<AIConfig> {
  const aiSettings = await prisma.projectAISettings.findUnique({
    where: { projectId },
  });

  // Default config when AI is disabled or not configured
  const defaultConfig: AIConfig = {
    aiEnabled: false,
    preferredProvider: "openai",
    openaiApiKey: null,
    anthropicApiKey: null,
    autoExecuteTasks: false,
    autoRespondReviews: false,
    autoRespondComments: false,
  };

  if (!aiSettings || !aiSettings.aiEnabled) {
    return defaultConfig;
  }

  // Decrypt API keys if present, fall back to environment variables
  let openaiApiKey = process.env.OPENAI_API_KEY || null;
  let anthropicApiKey = process.env.ANTHROPIC_API_KEY || null;

  try {
    if (aiSettings.openaiApiKey) {
      openaiApiKey = decrypt(aiSettings.openaiApiKey);
    }
    if (aiSettings.anthropicApiKey) {
      anthropicApiKey = decrypt(aiSettings.anthropicApiKey);
    }
  } catch (error) {
    console.error("Error decrypting API keys:", error);
  }

  return {
    aiEnabled: aiSettings.aiEnabled,
    preferredProvider: aiSettings.preferredProvider as "openai" | "anthropic",
    openaiApiKey,
    anthropicApiKey,
    autoExecuteTasks: aiSettings.autoExecuteTasks,
    autoRespondReviews: aiSettings.autoRespondReviews,
    autoRespondComments: aiSettings.autoRespondComments,
  };
}

/**
 * Get the API key for the preferred provider.
 * Returns null if AI is disabled or no key is available.
 */
export async function getActiveApiKey(projectId: string): Promise<{ provider: string; apiKey: string } | null> {
  const config = await getProjectAIConfig(projectId);

  if (!config.aiEnabled) {
    return null;
  }

  // Try preferred provider first
  if (config.preferredProvider === "openai" && config.openaiApiKey) {
    return { provider: "openai", apiKey: config.openaiApiKey };
  }
  if (config.preferredProvider === "anthropic" && config.anthropicApiKey) {
    return { provider: "anthropic", apiKey: config.anthropicApiKey };
  }

  // Fall back to any available key
  if (config.openaiApiKey) {
    return { provider: "openai", apiKey: config.openaiApiKey };
  }
  if (config.anthropicApiKey) {
    return { provider: "anthropic", apiKey: config.anthropicApiKey };
  }

  return null;
}

/**
 * Check if AI is enabled for a project.
 */
export async function isAIEnabled(projectId: string): Promise<boolean> {
  const config = await getProjectAIConfig(projectId);
  return config.aiEnabled;
}

/**
 * Check if a specific AI feature is enabled for a project.
 */
export async function isFeatureEnabled(
  projectId: string,
  feature: "autoExecuteTasks" | "autoRespondReviews" | "autoRespondComments"
): Promise<boolean> {
  const config = await getProjectAIConfig(projectId);
  return config.aiEnabled && config[feature];
}
