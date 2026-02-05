"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search, X, HelpCircle } from "lucide-react";
import { SEARCHABLE_FIELDS, SearchClause } from "@/types";
import { cn } from "@/lib/utils";

interface AdvancedSearchInputProps {
  onSearch: (query: string, parsedClauses: SearchClause[]) => void;
  placeholder?: string;
  className?: string;
}

// Operators for different field types
const OPERATORS: Record<string, { label: string; symbol: string }[]> = {
  string: [
    { label: "equals", symbol: "=" },
    { label: "not equals", symbol: "!=" },
    { label: "contains", symbol: "~" },
    { label: "not contains", symbol: "!~" },
    { label: "is empty", symbol: "is" },
    { label: "is not empty", symbol: "is not" },
  ],
  number: [
    { label: "equals", symbol: "=" },
    { label: "not equals", symbol: "!=" },
    { label: "greater than", symbol: ">" },
    { label: "greater or equal", symbol: ">=" },
    { label: "less than", symbol: "<" },
    { label: "less or equal", symbol: "<=" },
  ],
  enum: [
    { label: "equals", symbol: "=" },
    { label: "not equals", symbol: "!=" },
    { label: "in", symbol: "in" },
    { label: "not in", symbol: "not in" },
  ],
  date: [
    { label: "equals", symbol: "=" },
    { label: "not equals", symbol: "!=" },
    { label: "after", symbol: ">" },
    { label: "on or after", symbol: ">=" },
    { label: "before", symbol: "<" },
    { label: "on or before", symbol: "<=" },
  ],
  array: [
    { label: "contains", symbol: "~" },
    { label: "not contains", symbol: "!~" },
    { label: "is empty", symbol: "is" },
    { label: "is not empty", symbol: "is not" },
  ],
};

// Parse a JQL-like query string into clauses
export function parseSearchQuery(query: string): SearchClause[] {
  const clauses: SearchClause[] = [];

  if (!query.trim()) return clauses;

  // Split by AND/OR (simplified - doesn't handle nested expressions)
  const parts = query.split(/\s+(?:AND|and)\s+/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Try to match patterns like: field = value, field != value, field ~ "value", etc.
    const patterns = [
      // field in (value1, value2)
      /^(\w+)\s+(in|not\s+in)\s+\(([^)]+)\)$/i,
      // field is empty / field is not empty
      /^(\w+)\s+(is\s+not?)\s+(empty|null)$/i,
      // field operator "value" (quoted)
      /^(\w+)\s*(=|!=|~|!~|>=?|<=?)\s*"([^"]*)"$/,
      // field operator value (unquoted)
      /^(\w+)\s*(=|!=|~|!~|>=?|<=?)\s*(\S+)$/,
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const field = match[1].toLowerCase();
        let operator = match[2].toLowerCase().replace(/\s+/g, " ") as SearchClause["operator"];
        let value: SearchClause["value"] = match[3];

        // Handle "in" operator - parse comma-separated values
        if (operator === "in" || operator === "not in") {
          value = match[3].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
        }

        // Handle "is" / "is not" - value should be null
        if (operator.startsWith("is")) {
          operator = operator as "is" | "is not";
          value = null;
        }

        clauses.push({ field, operator, value });
        break;
      }
    }
  }

  return clauses;
}

export function AdvancedSearchInput({
  onSearch,
  placeholder = "Search tasks... (e.g., status = TODO AND priority = HIGH)",
  className,
}: AdvancedSearchInputProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState<"field" | "operator" | "value">("field");
  const [currentField, setCurrentField] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine what to suggest based on current query state
  const getSuggestionContext = useCallback((text: string) => {
    const trimmed = text.trim();
    const parts = trimmed.split(/\s+/);
    const lastPart = parts[parts.length - 1] || "";

    // Check if we just typed AND
    if (lastPart.toLowerCase() === "and" || trimmed.endsWith(" ")) {
      return { type: "field" as const, field: null, prefix: "" };
    }

    // Check if we have a complete field and operator
    const operatorMatch = trimmed.match(/(\w+)\s*(=|!=|~|!~|>=?|<=?|in|not\s+in|is\s+not?)\s*$/i);
    if (operatorMatch) {
      return { type: "value" as const, field: operatorMatch[1].toLowerCase(), prefix: "" };
    }

    // Check if we have just a field
    const fieldMatch = trimmed.match(/(\w+)\s*$/);
    if (fieldMatch && fieldMatch[1].toLowerCase() in SEARCHABLE_FIELDS) {
      return { type: "operator" as const, field: fieldMatch[1].toLowerCase(), prefix: "" };
    }

    // Default to field suggestions
    return { type: "field" as const, field: null, prefix: lastPart };
  }, []);

  const handleSearch = () => {
    const parsedClauses = parseSearchQuery(query);
    onSearch(query, parsedClauses);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
      setShowSuggestions(false);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const insertSuggestion = (suggestion: string, addSpace = true) => {
    const context = getSuggestionContext(query);

    let newQuery = query;
    if (context.prefix) {
      // Replace the prefix with the suggestion
      newQuery = query.slice(0, query.length - context.prefix.length) + suggestion;
    } else {
      newQuery = query + suggestion;
    }

    if (addSpace) {
      newQuery += " ";
    }

    setQuery(newQuery);
    inputRef.current?.focus();
  };

  const getFieldSuggestions = () => {
    const context = getSuggestionContext(query);
    return Object.keys(SEARCHABLE_FIELDS).filter(
      (f) => !context.prefix || f.toLowerCase().startsWith(context.prefix.toLowerCase())
    );
  };

  const getOperatorSuggestions = () => {
    const context = getSuggestionContext(query);
    if (!context.field) return [];

    const fieldConfig = SEARCHABLE_FIELDS[context.field];
    if (!fieldConfig) return [];

    return OPERATORS[fieldConfig.type] || OPERATORS.string;
  };

  const getValueSuggestions = () => {
    const context = getSuggestionContext(query);
    if (!context.field) return [];

    const fieldConfig = SEARCHABLE_FIELDS[context.field];
    if (!fieldConfig?.enumValues) return [];

    return fieldConfig.enumValues;
  };

  useEffect(() => {
    const context = getSuggestionContext(query);
    setSuggestionType(context.type);
    setCurrentField(context.field);
  }, [query, getSuggestionContext]);

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-9 pr-8 font-mono text-sm"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => {
                setQuery("");
                onSearch("", []);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button onClick={handleSearch}>Search</Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="end">
            <div className="space-y-3">
              <h4 className="font-medium">Search Query Syntax</h4>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Use JQL-like syntax to search tasks:
                </p>
                <div className="space-y-1 font-mono text-xs bg-muted p-2 rounded">
                  <p>status = TODO</p>
                  <p>priority = HIGH AND assignee = &quot;John&quot;</p>
                  <p>status in (TODO, IN_PROGRESS)</p>
                  <p>label ~ &quot;bug&quot;</p>
                  <p>due {"<"} 2024-01-01</p>
                  <p>assignee is empty</p>
                </div>
                <div className="pt-2">
                  <p className="font-medium mb-1">Available fields:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(SEARCHABLE_FIELDS).map((field) => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Autocomplete suggestions */}
      {showSuggestions && query && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">
          <Command className="rounded-lg border shadow-md">
            <CommandList>
              <CommandEmpty>No suggestions</CommandEmpty>

              {suggestionType === "field" && (
                <CommandGroup heading="Fields">
                  {getFieldSuggestions().slice(0, 8).map((field) => (
                    <CommandItem
                      key={field}
                      value={field}
                      onSelect={() => insertSuggestion(field)}
                    >
                      <span className="font-mono">{field}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({SEARCHABLE_FIELDS[field].type})
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {suggestionType === "operator" && currentField && (
                <CommandGroup heading="Operators">
                  {getOperatorSuggestions().map((op) => (
                    <CommandItem
                      key={op.symbol}
                      value={op.symbol}
                      onSelect={() => insertSuggestion(op.symbol)}
                    >
                      <span className="font-mono">{op.symbol}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {op.label}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {suggestionType === "value" && currentField && (
                <CommandGroup heading="Values">
                  {getValueSuggestions().slice(0, 8).map((value) => (
                    <CommandItem
                      key={value}
                      value={value}
                      onSelect={() => insertSuggestion(value, true)}
                    >
                      <span className="font-mono">{value}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandGroup heading="Quick Actions">
                <CommandItem onSelect={() => insertSuggestion("AND ", false)}>
                  <span className="font-mono">AND</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    Add another condition
                  </span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
