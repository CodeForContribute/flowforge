"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Key,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  GitPullRequest,
  MessageSquare,
  Zap,
} from "lucide-react";

interface AISettings {
  aiEnabled: boolean;
  preferredProvider: string;
  autoExecuteTasks: boolean;
  autoRespondReviews: boolean;
  autoRespondComments: boolean;
  hasOpenaiKey: boolean;
  hasAnthropicKey: boolean;
  openaiKeyMasked: string | null;
  anthropicKeyMasked: string | null;
}

interface AIIntegrationsSettingsProps {
  projectId: string;
  isOwner: boolean;
}

export function AIIntegrationsSettings({ projectId, isOwner }: AIIntegrationsSettingsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [settings, setSettings] = useState<AISettings>({
    aiEnabled: false,
    preferredProvider: "openai",
    autoExecuteTasks: true,
    autoRespondReviews: true,
    autoRespondComments: true,
    hasOpenaiKey: false,
    hasAnthropicKey: false,
    openaiKeyMasked: null,
    anthropicKeyMasked: null,
  });

  // API key inputs
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [keyValidation, setKeyValidation] = useState<{
    openai?: { valid: boolean; message: string };
    anthropic?: { valid: boolean; message: string };
  }>({});

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch(`/api/projects/${projectId}/ai-settings`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
        }
      } catch (error) {
        console.error("Error fetching AI settings:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [projectId]);

  async function handleToggleAI(enabled: boolean) {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/ai-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiEnabled: enabled }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("Error updating AI settings:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSettings(updates: Partial<AISettings>) {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/ai-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("Error updating AI settings:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestKey(provider: "openai" | "anthropic") {
    const apiKey = provider === "openai" ? openaiKey : anthropicKey;
    if (!apiKey) {
      alert("Please enter an API key first");
      return;
    }

    setTesting(provider);
    try {
      const response = await fetch(`/api/projects/${projectId}/ai-settings/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });

      const data = await response.json();
      setKeyValidation((prev) => ({
        ...prev,
        [provider]: { valid: data.valid, message: data.message || data.error },
      }));
    } catch (error) {
      console.error("Error testing API key:", error);
      setKeyValidation((prev) => ({
        ...prev,
        [provider]: { valid: false, message: "Failed to test key" },
      }));
    } finally {
      setTesting(null);
    }
  }

  async function handleSaveKey(provider: "openai" | "anthropic") {
    const apiKey = provider === "openai" ? openaiKey : anthropicKey;
    const keyField = provider === "openai" ? "openaiApiKey" : "anthropicApiKey";

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/ai-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [keyField]: apiKey || null }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        // Clear the input after saving
        if (provider === "openai") setOpenaiKey("");
        else setAnthropicKey("");
        setKeyValidation((prev) => ({ ...prev, [provider]: undefined }));
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save API key");
      }
    } catch (error) {
      console.error("Error saving API key:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveKey(provider: "openai" | "anthropic") {
    const keyField = provider === "openai" ? "openaiApiKey" : "anthropicApiKey";

    if (!confirm(`Are you sure you want to remove the ${provider === "openai" ? "OpenAI" : "Anthropic"} API key?`)) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/ai-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [keyField]: null }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to remove API key");
      }
    } catch (error) {
      console.error("Error removing API key:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main AI Toggle */}
      <Card className={settings.aiEnabled ? "border-primary/50 bg-primary/5" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                settings.aiEnabled
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  AI Integrations
                  {settings.aiEnabled && (
                    <Badge variant="default" className="bg-primary">
                      Enabled
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {settings.aiEnabled
                    ? "AI-powered features are active for this project"
                    : "Enable AI to automate task execution and code reviews"}
                </CardDescription>
              </div>
            </div>
            {isOwner && (
              <Switch
                checked={settings.aiEnabled}
                onCheckedChange={handleToggleAI}
                disabled={saving}
              />
            )}
          </div>
        </CardHeader>
        {!settings.aiEnabled && (
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">When AI is disabled:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Tasks will be managed manually (like a traditional project board)</li>
                <li>No automatic code generation or PR creation</li>
                <li>GitHub webhooks will not trigger AI responses</li>
                <li>Perfect for planning phases or non-development projects</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {settings.aiEnabled && (
        <>
          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Provide your own API keys to use AI features. Keys are encrypted and stored securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OpenAI API Key */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">OpenAI API Key</Label>
                  {settings.hasOpenaiKey && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  )}
                </div>
                {settings.hasOpenaiKey ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <code className="flex-1 text-sm">{settings.openaiKeyMasked}</code>
                    {isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveKey("openai")}
                        disabled={saving}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ) : (
                  isOwner && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showOpenaiKey ? "text" : "password"}
                            value={openaiKey}
                            onChange={(e) => setOpenaiKey(e.target.value)}
                            placeholder="sk-..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleTestKey("openai")}
                          disabled={testing === "openai" || !openaiKey}
                        >
                          {testing === "openai" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Test"
                          )}
                        </Button>
                        <Button
                          onClick={() => handleSaveKey("openai")}
                          disabled={saving || !openaiKey}
                        >
                          Save
                        </Button>
                      </div>
                      {keyValidation.openai && (
                        <div className={`flex items-center gap-2 text-sm ${
                          keyValidation.openai.valid ? "text-green-600" : "text-red-600"
                        }`}>
                          {keyValidation.openai.valid ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          {keyValidation.openai.message}
                        </div>
                      )}
                    </div>
                  )
                )}
                <p className="text-xs text-muted-foreground">
                  Get your API key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>

              <div className="border-t" />

              {/* Anthropic API Key */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Anthropic API Key</Label>
                  {settings.hasAnthropicKey && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  )}
                </div>
                {settings.hasAnthropicKey ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <code className="flex-1 text-sm">{settings.anthropicKeyMasked}</code>
                    {isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveKey("anthropic")}
                        disabled={saving}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ) : (
                  isOwner && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showAnthropicKey ? "text" : "password"}
                            value={anthropicKey}
                            onChange={(e) => setAnthropicKey(e.target.value)}
                            placeholder="sk-ant-..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleTestKey("anthropic")}
                          disabled={testing === "anthropic" || !anthropicKey}
                        >
                          {testing === "anthropic" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Test"
                          )}
                        </Button>
                        <Button
                          onClick={() => handleSaveKey("anthropic")}
                          disabled={saving || !anthropicKey}
                        >
                          Save
                        </Button>
                      </div>
                      {keyValidation.anthropic && (
                        <div className={`flex items-center gap-2 text-sm ${
                          keyValidation.anthropic.valid ? "text-green-600" : "text-red-600"
                        }`}>
                          {keyValidation.anthropic.valid ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          {keyValidation.anthropic.message}
                        </div>
                      )}
                    </div>
                  )
                )}
                <p className="text-xs text-muted-foreground">
                  Get your API key from{" "}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    console.anthropic.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preferred Provider */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Preferred Provider
              </CardTitle>
              <CardDescription>
                Select which AI provider to use for code generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.preferredProvider}
                onValueChange={(value) => handleSaveSettings({ preferredProvider: value as "openai" | "anthropic" })}
                disabled={!isOwner || saving}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai" disabled={!settings.hasOpenaiKey}>
                    <div className="flex items-center gap-2">
                      <span>OpenAI (GPT-4o)</span>
                      {!settings.hasOpenaiKey && (
                        <Badge variant="outline" className="text-xs">No key</Badge>
                      )}
                    </div>
                  </SelectItem>
                  <SelectItem value="anthropic" disabled={!settings.hasAnthropicKey}>
                    <div className="flex items-center gap-2">
                      <span>Anthropic (Claude)</span>
                      {!settings.hasAnthropicKey && (
                        <Badge variant="outline" className="text-xs">No key</Badge>
                      )}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Feature Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                AI Features
              </CardTitle>
              <CardDescription>
                Configure which AI-powered features are enabled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="font-medium">Auto-Execute Tasks</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically generate code and create PRs when tasks are created
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.autoExecuteTasks}
                  onCheckedChange={(checked) => handleSaveSettings({ autoExecuteTasks: checked })}
                  disabled={!isOwner || saving}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                    <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="font-medium">Auto-Respond to Reviews</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically address PR review feedback and push fixes
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.autoRespondReviews}
                  onCheckedChange={(checked) => handleSaveSettings({ autoRespondReviews: checked })}
                  disabled={!isOwner || saving}
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="font-medium">Auto-Respond to Comments</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically respond to PR comments and questions
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.autoRespondComments}
                  onCheckedChange={(checked) => handleSaveSettings({ autoRespondComments: checked })}
                  disabled={!isOwner || saving}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
