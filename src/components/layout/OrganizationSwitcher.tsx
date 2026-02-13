"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Organization {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  userRole?: string;
  _count?: {
    members: number;
    projects: number;
  };
}

interface OrganizationSwitcherProps {
  className?: string;
}

export function OrganizationSwitcher({ className }: OrganizationSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're currently in an org context from the URL
  const orgSlugFromPath = pathname.match(/^\/org\/([^/]+)/)?.[1];

  useEffect(() => {
    fetchOrganizations();
    fetchActiveOrganization();
  }, []);

  // Update active org when path changes
  useEffect(() => {
    if (orgSlugFromPath && organizations.length > 0) {
      const orgFromPath = organizations.find((org) => org.slug === orgSlugFromPath);
      if (orgFromPath && orgFromPath.id !== activeOrg?.id) {
        setActiveOrg(orgFromPath);
      }
    }
  }, [orgSlugFromPath, organizations, activeOrg?.id]);

  async function fetchOrganizations() {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchActiveOrganization() {
    try {
      const response = await fetch("/api/user/active-organization");
      if (response.ok) {
        const data = await response.json();
        if (data.organization) {
          setActiveOrg(data.organization);
        }
      }
    } catch (error) {
      console.error("Error fetching active organization:", error);
    }
  }

  async function switchOrganization(org: Organization | null) {
    try {
      await fetch("/api/user/active-organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org?.id || null }),
      });
      setActiveOrg(org);
      setOpen(false);

      // Navigate to the appropriate dashboard
      if (org) {
        router.push(`/org/${org.slug}`);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error switching organization:", error);
    }
  }

  if (loading) {
    return (
      <Button
        variant="outline"
        className={cn("w-[200px] justify-between", className)}
        disabled
      >
        <span className="truncate">Loading...</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
        >
          <div className="flex items-center gap-2 truncate">
            {activeOrg ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={activeOrg.image || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {activeOrg.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{activeOrg.name}</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                <span>Personal</span>
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup heading="Personal">
              <CommandItem
                onSelect={() => switchOrganization(null)}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Personal Account</span>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    !activeOrg ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            </CommandGroup>
            {organizations.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Organizations">
                  {organizations.map((org) => (
                    <CommandItem
                      key={org.id}
                      onSelect={() => switchOrganization(org)}
                      className="cursor-pointer"
                    >
                      <Avatar className="mr-2 h-5 w-5">
                        <AvatarImage src={org.image || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {org.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{org.name}</span>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          activeOrg?.id === org.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  router.push("/org/new");
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>Create Organization</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
