import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { TaskFunnelView } from '@/components/projects/TaskFunnelView';
import { Briefcase } from 'lucide-react';

export const Route = createFileRoute('/projects')({
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tarefas</h1>
            <p className="text-sm text-muted-foreground">
              Filtre por cliente, projeto, responsável, status e período.
            </p>
          </div>
        </div>

        <TaskFunnelView />
      </div>
    </MainLayout>
  );
}
