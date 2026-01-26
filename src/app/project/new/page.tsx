import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { Navbar } from "@/components/layout/Navbar";

export default async function NewProjectPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 bg-muted/30">
        <ProjectForm mode="create" />
      </main>
    </div>
  );
}
