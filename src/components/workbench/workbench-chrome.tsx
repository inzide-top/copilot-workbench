import { ClipboardCheck, Layers3, Loader2, Plus, Save, X } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { navItems } from "./constants";
import type { Section } from "./workbench-types";

export function WorkbenchChrome(props: {
  activeSection: Section;
  children: ReactNode;
  isSaving: boolean;
  newResumeDialogOpen: boolean;
  pendingProjectsDialogOpen: boolean;
  performAddResume: () => void;
  performSaveCurrentResume: (options?: { includePendingProjects?: boolean }) => void;
  pitchToast: { jdId: string; title: string } | null;
  resumeToast: string;
  saveState: string;
  saveToDatabase: () => void;
  setActiveSection: (section: Section) => void;
  setNewResumeDialogOpen: (open: boolean) => void;
  setPendingProjectsDialogOpen: (open: boolean) => void;
  setPitchToast: (toast: { jdId: string; title: string } | null) => void;
  openPitchDetail: (jdId: string) => void;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {props.resumeToast ? (
        <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-md border border-emerald-500/25 bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 shadow-lg">
          <span className="inline-flex items-center gap-2">
            <ClipboardCheck className="size-4" />
            {props.resumeToast}
          </span>
        </div>
      ) : null}
      {props.pitchToast ? (
        <div className="fixed right-5 top-4 z-[60] w-[min(420px,calc(100vw-2.5rem))] rounded-md border border-emerald-500/25 bg-card p-4 text-sm shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-emerald-200">话术生成完毕</p>
              <p className="mt-1 text-muted-foreground">{props.pitchToast.title}</p>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={() => props.setPitchToast(null)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                props.openPitchDetail(props.pitchToast?.jdId ?? "");
                props.setActiveSection("pitch");
                props.setPitchToast(null);
              }}
            >
              查看详情
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={props.pendingProjectsDialogOpen} onOpenChange={props.setPendingProjectsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>还有待确认项目经历</DialogTitle>
            <DialogDescription>
              当前简历中还有从导入内容识别出的项目经历没有确认。保存前建议先添加到项目素材库，避免后续 JD 匹配遗漏这些项目。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => props.performSaveCurrentResume({ includePendingProjects: true })}>
              <Plus className="size-4" />
              添加全部
            </Button>
            <Button variant="outline" onClick={() => props.setPendingProjectsDialogOpen(false)}>
              返回确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={props.newResumeDialogOpen} onOpenChange={props.setNewResumeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>当前简历还没保存</DialogTitle>
            <DialogDescription>
              你正在编辑的简历有未保存改动。继续新建会切换到一份空白简历，请确认当前内容已经不需要继续保存。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => props.setNewResumeDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={props.performAddResume}>
              继续新建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[248px_1fr]">
        <aside className="border-sidebar-border bg-sidebar/95 lg:border-r">
          <div className="flex h-full flex-col gap-5 px-4 py-5">
            <div className="flex items-center gap-3 px-2">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Layers3 className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">面试 Copilot</p>
                <p className="text-xs text-muted-foreground">AI 求职工作台</p>
              </div>
            </div>

            <nav className="grid gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = props.activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    className={`flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm transition ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                    }`}
                    onClick={() => props.setActiveSection(item.id)}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto rounded-md border border-sidebar-border bg-background/55 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ClipboardCheck className="size-4 text-emerald-300" />
                {props.saveState}
              </div>
              <Button className="mt-3 w-full" size="sm" onClick={props.saveToDatabase} disabled={props.isSaving}>
                {props.isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                同步数据库
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="border-b px-5 py-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-normal">AI 求职/面试 Copilot 工作台</h1>
                <Badge variant="secondary">MVP</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                从简历维护、JD 匹配、定制话术到模拟面试和投递复盘，聚合成一个可讲清楚的 AI 全栈项目。
              </p>
            </div>
          </header>

          <div className="p-5">{props.children}</div>
        </main>
      </div>
    </div>
  );
}
