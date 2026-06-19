import { FileText, Loader2, Plus, Save, Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getSupportedImportAccept } from "@/lib/document-import";
import type { ProfileDraft, ProjectDraft, ResumeDraft } from "@/lib/types";
import { Field, TextareaField } from "./shared-fields";

export function ProfileProjectsPanel(props: {
  addProject: () => void;
  addResume: () => void;
  applyResumeExample: () => void;
  activeResume: ResumeDraft;
  activeResumeId: string;
  confirmPendingProjects: () => void;
  draftProject: ProjectDraft;
  handleResumeFile: (file?: File) => void;
  isDemoMode: boolean;
  isImporting: boolean;
  pendingImportedProjects: ProjectDraft[];
  profile: ProfileDraft;
  projects: ProjectDraft[];
  removeResume: (id: string) => void;
  resumes: ResumeDraft[];
  resumeFormError: string;
  resumeImportProgress: number | null;
  resumeImportStatus: string;
  removePendingProject: (id: string) => void;
  saveCurrentResume: () => void;
  setActiveResumeId: (id: string) => void;
  setDraftProject: (project: ProjectDraft) => void;
  updateActiveResume: (patch: Partial<ResumeDraft>) => void;
  updatePendingProject: (id: string, patch: Partial<ProjectDraft>) => void;
  updateProfile: (key: keyof ProfileDraft, value: string) => void;
}) {
  const [editingProject, setEditingProject] = useState<ProjectDraft | null>(null);

  function saveEditingProject() {
    if (!editingProject) return;
    props.updateActiveResume({
      projects: props.projects.map((project) => (project.id === editingProject.id ? editingProject : project)),
    });
    setEditingProject(null);
  }

  function handleResumeImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    props.handleResumeFile(file);
  }

  return (
    <>
      <div className="grid items-start gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="self-start">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>简历与个人定位</CardTitle>
              <CardDescription>支持粘贴文本，也支持导入 Word、PDF 和图片。</CardDescription>
            </div>
            <div className="grid gap-2 md:justify-items-end">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={props.addResume}>
                  <Plus className="size-4" />
                  新建简历
                </Button>
                <Button variant="outline" size="sm" onClick={props.saveCurrentResume}>
                  <Save className="size-4" />
                  保存简历
                </Button>
                {props.isDemoMode ? (
                  <Button variant="outline" size="sm" onClick={props.applyResumeExample} disabled={props.isImporting}>
                    {props.isImporting ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                    应用示例
                  </Button>
                ) : null}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="outline" size="sm">
                      <label className="cursor-pointer">
                        {props.isImporting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                        导入简历
                        <input
                          className="hidden"
                          type="file"
                          accept={getSupportedImportAccept("resume")}
                          onChange={handleResumeImportChange}
                        />
                      </label>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>支持 .txt、.md、.docx、.pdf 和常见图片</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {props.resumeFormError ? (
              <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {props.resumeFormError}
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <div className="grid gap-2">
                <Label>当前简历</Label>
                <Select value={props.activeResumeId} onValueChange={props.setActiveResumeId}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {props.resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id}>{resume.title || "未命名简历"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field
                label="简历名称"
                value={props.activeResume.title}
                onChange={(value) => props.updateActiveResume({ title: value })}
              />
              <div className="flex items-end">
                <Button
                  className="w-full md:w-auto"
                  variant="ghost"
                  onClick={() => props.removeResume(props.activeResumeId)}
                  disabled={props.resumes.length <= 1}
                >
                  删除
                </Button>
              </div>
            </div>
            <Field
              label="目标方向"
              value={props.activeResume.targetRole}
              onChange={(value) => props.updateActiveResume({ targetRole: value })}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="姓名" value={props.profile.name} onChange={(value) => props.updateProfile("name", value)} />
              <Field label="定位" value={props.profile.headline} onChange={(value) => props.updateProfile("headline", value)} />
              <Field label="城市" value={props.profile.location} onChange={(value) => props.updateProfile("location", value)} />
              <Field label="邮箱" value={props.profile.email} onChange={(value) => props.updateProfile("email", value)} />
              <Field label="电话" value={props.profile.phone} onChange={(value) => props.updateProfile("phone", value)} />
            </div>
            <div className="grid gap-2">
              <Label>个人摘要</Label>
              <Textarea value={props.profile.summary} onChange={(event) => props.updateProfile("summary", event.target.value)} placeholder="例如：3 年前端经验，关注复杂业务系统、AI 应用集成和工程化..." />
            </div>
            <div className="grid gap-2">
              <Label>简历正文</Label>
              <Textarea className="max-h-[520px] min-h-64 overflow-y-auto resize-y" value={props.profile.resumeText} onChange={(event) => props.updateProfile("resumeText", event.target.value)} placeholder="粘贴你的简历文本，后续 JD 分析和话术生成都会引用这里。" />
              {props.resumeImportStatus ? (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{props.resumeImportStatus}</span>
                    {props.resumeImportProgress !== null ? <span>{props.resumeImportProgress}%</span> : null}
                  </div>
                  {props.resumeImportProgress !== null ? <Progress value={props.resumeImportProgress} /> : null}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>新增项目经历</CardTitle>
              <CardDescription>背景、个人贡献、成果不是必填，但写得越清楚，后续 AI 话术越准。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="项目名" value={props.draftProject.title} onChange={(value) => props.setDraftProject({ ...props.draftProject, title: value })} />
                <Field label="你的角色" value={props.draftProject.role} onChange={(value) => props.setDraftProject({ ...props.draftProject, role: value })} />
              </div>
              <Field label="技术栈" value={props.draftProject.stack} onChange={(value) => props.setDraftProject({ ...props.draftProject, stack: value })} />
              <TextareaField className="min-h-20" label="背景" value={props.draftProject.challenge} onChange={(value) => props.setDraftProject({ ...props.draftProject, challenge: value })} />
              <TextareaField className="min-h-24" label="个人贡献" value={props.draftProject.actions} onChange={(value) => props.setDraftProject({ ...props.draftProject, actions: value })} />
              <TextareaField className="min-h-20" label="成果" value={props.draftProject.impact} onChange={(value) => props.setDraftProject({ ...props.draftProject, impact: value })} />
              <Button onClick={props.addProject}><Plus className="size-4" />添加项目</Button>
            </CardContent>
          </Card>

          {props.pendingImportedProjects.length ? (
            <Card>
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>待确认项目经历</CardTitle>
                  <CardDescription>从简历中自动识别，可修改后批量添加。</CardDescription>
                </div>
                <Button onClick={props.confirmPendingProjects}>
                  <Plus className="size-4" />
                  添加全部
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4">
                {props.pendingImportedProjects.map((project, index) => (
                  <div key={project.id} className="grid gap-3 rounded-md border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">项目 {index + 1}</p>
                      <Button variant="ghost" size="sm" onClick={() => props.removePendingProject(project.id)}>
                        移除
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="项目名" value={project.title} onChange={(value) => props.updatePendingProject(project.id, { title: value })} />
                      <Field label="你的角色" value={project.role} onChange={(value) => props.updatePendingProject(project.id, { role: value })} />
                    </div>
                    <Field label="技术栈" value={project.stack} onChange={(value) => props.updatePendingProject(project.id, { stack: value })} />
                    <TextareaField label="背景" value={project.challenge} onChange={(value) => props.updatePendingProject(project.id, { challenge: value })} />
                    <TextareaField label="个人贡献" value={project.actions} onChange={(value) => props.updatePendingProject(project.id, { actions: value })} />
                    <TextareaField label="成果" value={project.impact} onChange={(value) => props.updatePendingProject(project.id, { impact: value })} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>项目素材库</CardTitle>
              <CardDescription>JD 分析和话术生成会优先引用这里。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {props.projects.map((project) => (
                <button
                  key={project.id}
                  className="rounded-md border p-4 text-left transition hover:bg-muted/45"
                  onClick={() => setEditingProject(project)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{project.title}</p>
                    <Badge variant="secondary">{project.role || "角色待补充"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{project.impact || project.challenge}</p>
                  <p className="mt-3 font-mono text-xs text-muted-foreground">{project.stack}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={Boolean(editingProject)} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑项目经历</DialogTitle>
            <DialogDescription>保存后会更新当前简历的项目素材库。</DialogDescription>
          </DialogHeader>
          {editingProject ? (
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="项目名" value={editingProject.title} onChange={(value) => setEditingProject({ ...editingProject, title: value })} />
                <Field label="你的角色" value={editingProject.role} onChange={(value) => setEditingProject({ ...editingProject, role: value })} />
              </div>
              <Field label="技术栈" value={editingProject.stack} onChange={(value) => setEditingProject({ ...editingProject, stack: value })} />
              <TextareaField className="min-h-24" label="背景" value={editingProject.challenge} onChange={(value) => setEditingProject({ ...editingProject, challenge: value })} />
              <TextareaField className="min-h-28" label="个人贡献" value={editingProject.actions} onChange={(value) => setEditingProject({ ...editingProject, actions: value })} />
              <TextareaField className="min-h-24" label="成果" value={editingProject.impact} onChange={(value) => setEditingProject({ ...editingProject, impact: value })} />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>取消</Button>
            <Button onClick={saveEditingProject}>保存项目</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
