"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Settings2,
  Plus,
  Edit,
  Trash2,
  Loader2,
  GripVertical,
  X,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Link,
} from "lucide-react";
import { CustomFieldDefinition, CustomFieldType, CustomFieldOption } from "@/types";

interface CustomFieldsSettingsProps {
  projectId: string;
}

const fieldTypeConfig: Record<CustomFieldType, { label: string; icon: typeof Type }> = {
  text: { label: "Text", icon: Type },
  number: { label: "Number", icon: Hash },
  date: { label: "Date", icon: Calendar },
  select: { label: "Single Select", icon: List },
  multiselect: { label: "Multi Select", icon: List },
  checkbox: { label: "Checkbox", icon: CheckSquare },
  url: { label: "URL", icon: Link },
};

export function CustomFieldsSettings({ projectId }: CustomFieldsSettingsProps) {
  const router = useRouter();
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [deleteField, setDeleteField] = useState<CustomFieldDefinition | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [description, setDescription] = useState("");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<CustomFieldOption[]>([]);

  useEffect(() => {
    fetchFields();
  }, [projectId]);

  async function fetchFields() {
    try {
      const response = await fetch(`/api/projects/${projectId}/custom-fields`);
      if (response.ok) {
        const data = await response.json();
        setFields(data);
      }
    } catch (error) {
      console.error("Error fetching custom fields:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setType("text");
    setDescription("");
    setRequired(false);
    setOptions([]);
  }

  function openEditDialog(field: CustomFieldDefinition) {
    setEditingField(field);
    setName(field.name);
    setType(field.type);
    setDescription(field.description || "");
    setRequired(field.required);
    setOptions(field.options || []);
  }

  function addOption() {
    const newOption: CustomFieldOption = {
      id: `opt_${Date.now()}`,
      label: "",
    };
    setOptions([...options, newOption]);
  }

  function updateOption(index: number, label: string) {
    const updated = [...options];
    updated[index] = { ...updated[index], label };
    setOptions(updated);
  }

  function removeOption(index: number) {
    setOptions(options.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    if ((type === "select" || type === "multiselect") && options.filter((o) => o.label.trim()).length === 0) {
      alert("At least one option is required for select fields");
      return;
    }

    setIsSaving(true);
    try {
      const validOptions = options.filter((o) => o.label.trim());
      const payload = {
        id: editingField?.id,
        name,
        type,
        description: description || undefined,
        required,
        options: (type === "select" || type === "multiselect") ? validOptions : undefined,
      };

      const response = await fetch(`/api/projects/${projectId}/custom-fields`, {
        method: editingField ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setEditingField(null);
        resetForm();
        fetchFields();
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save custom field");
      }
    } catch (error) {
      console.error("Error saving custom field:", error);
      alert("An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteField) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/custom-fields?fieldId=${deleteField.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setDeleteField(null);
        fetchFields();
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete custom field");
      }
    } catch (error) {
      console.error("Error deleting custom field:", error);
      alert("An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Custom Fields
            </CardTitle>
            <CardDescription>
              Add project-specific fields to your tasks
            </CardDescription>
          </div>
          <Dialog
            open={showCreateDialog || !!editingField}
            onOpenChange={(open) => {
              if (!open) {
                setShowCreateDialog(false);
                setEditingField(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingField ? "Edit Custom Field" : "Add Custom Field"}
                </DialogTitle>
                <DialogDescription>
                  Custom fields will appear on all tasks in this project
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="space-y-2">
                  <Label htmlFor="field-name">Field Name *</Label>
                  <Input
                    id="field-name"
                    placeholder="e.g., Customer, Environment"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="field-type">Field Type</Label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as CustomFieldType)}
                    disabled={!!editingField}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(fieldTypeConfig) as CustomFieldType[]).map((t) => {
                        const config = fieldTypeConfig[t];
                        const Icon = config.icon;
                        return (
                          <SelectItem key={t} value={t}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {editingField && (
                    <p className="text-xs text-muted-foreground">
                      Field type cannot be changed after creation
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="field-description">Description</Label>
                  <Textarea
                    id="field-description"
                    placeholder="What is this field for?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Required Field</Label>
                    <p className="text-xs text-muted-foreground">
                      Tasks must have a value for this field
                    </p>
                  </div>
                  <Switch checked={required} onCheckedChange={setRequired} />
                </div>

                {/* Options for select/multiselect */}
                {(type === "select" || type === "multiselect") && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Options</Label>
                      <Button variant="outline" size="sm" onClick={addOption}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Option
                      </Button>
                    </div>
                    {options.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Add at least one option
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {options.map((option, index) => (
                          <div key={option.id} className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder={`Option ${index + 1}`}
                              value={option.label}
                              onChange={(e) => updateOption(index, e.target.value)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOption(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingField(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingField ? "Save Changes" : "Add Field"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : fields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No custom fields defined</p>
            <p className="text-sm">Add fields to capture project-specific information</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field) => {
                const config = fieldTypeConfig[field.type];
                const Icon = config.icon;

                return (
                  <TableRow key={field.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{field.name}</div>
                        {field.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {field.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {field.required ? (
                        <Badge variant="default">Required</Badge>
                      ) : (
                        <span className="text-muted-foreground">Optional</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(field)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteField(field)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteField} onOpenChange={() => setDeleteField(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Custom Field?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deleteField?.name}&quot;? All values
                stored in this field across tasks will be lost. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
