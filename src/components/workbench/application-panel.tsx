import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  ApplicationDraft,
  ApplicationPriority,
  ApplicationRegion,
  ApplicationStatus,
  InterviewRoundDraft,
  JobDescriptionDraft,
} from "@/lib/types";
import { industryOptions, priorityOptions, priorityTone, regionOptions, statusLabels } from "./constants";
import { metricTone } from "./helpers";
import { Field, Insight, TextareaField } from "./shared-fields";

function FilterSelect(props: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      <Select value={props.value} onValueChange={props.onChange}>
        <SelectTrigger className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">全部</SelectItem>
          {props.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function IndustrySelect(props: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>行业</Label>
      <Select value={props.value || "none"} onValueChange={(value) => props.onChange(value === "none" ? "" : value)}>
        <SelectTrigger className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">未设置</SelectItem>
          {industryOptions.map((industry) => (
            <SelectItem key={industry} value={industry}>{industry}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PrioritySelect(props: { value: ApplicationPriority; onChange: (value: ApplicationPriority) => void }) {
  return (
    <div className="grid gap-2">
      <Label>优先级</Label>
      <Select value={props.value} onValueChange={(value) => props.onChange(value as ApplicationPriority)}>
        <SelectTrigger className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {priorityOptions.map((priority) => (
            <SelectItem key={priority} value={priority}>{priority}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function RegionSelect(props: { value: ApplicationRegion; onChange: (value: ApplicationRegion) => void }) {
  return (
    <div className="grid gap-2">
      <Label>地区</Label>
      <Select value={props.value || "none"} onValueChange={(value) => props.onChange(value === "none" ? "" : value as ApplicationRegion)}>
        <SelectTrigger className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">未设置</SelectItem>
          {regionOptions.map((region) => (
            <SelectItem key={region} value={region}>{region}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatusSelect(props: { value: ApplicationStatus; onChange: (value: ApplicationStatus) => void }) {
  return (
    <Select value={props.value} onValueChange={(value) => props.onChange(value as ApplicationStatus)}>
      <SelectTrigger className="w-full min-w-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(statusLabels) as ApplicationStatus[]).map((status) => (
          <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ApplicationPanel(props: {
  addApplication: () => void;
  applicationDraft: ApplicationDraft;
  applications: ApplicationDraft[];
  jobDescriptions: JobDescriptionDraft[];
  setApplicationDraft: (application: ApplicationDraft) => void;
  updateApplication: (id: string, patch: Partial<ApplicationDraft>) => void;
}) {
  const [editingApplications, setEditingApplications] = useState<Record<string, ApplicationDraft>>({});
  const [savedApplicationId, setSavedApplicationId] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedApplicationId, setExpandedApplicationId] = useState("");
  const [selectedJdPreview, setSelectedJdPreview] = useState<JobDescriptionDraft | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(20);
  const [filters, setFilters] = useState<{
    status: ApplicationStatus | "ALL";
    industry: string;
    priority: ApplicationPriority | "ALL";
    region: ApplicationRegion | "ALL";
  }>({
    status: "ALL",
    industry: "ALL",
    priority: "ALL",
    region: "ALL",
  });

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) return;
      setEditingApplications((current) => {
        const next: Record<string, ApplicationDraft> = {};
        for (const application of props.applications) {
          next[application.id] = current[application.id] ?? application;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [props.applications]);

  function findJd(jdId: string) {
    return props.jobDescriptions.find((jd) => jd.id === jdId);
  }

  const filteredApplications = useMemo(
    () =>
      props.applications.filter((application) => {
        if (filters.status !== "ALL" && application.status !== filters.status) return false;
        if (filters.industry !== "ALL" && application.industry !== filters.industry) return false;
        if (filters.priority !== "ALL" && application.priority !== filters.priority) return false;
        if (filters.region !== "ALL" && application.region !== filters.region) return false;
        return true;
      }),
    [filters, props.applications],
  );
  const visibleApplications = filteredApplications.slice(0, visibleLimit);

  function updateApplicationDraft(id: string, patch: Partial<ApplicationDraft>) {
    setSavedApplicationId("");
    setEditingApplications((current) => {
      const currentDraft = current[id] ?? props.applications.find((application) => application.id === id);
      if (!currentDraft) return current;
      return {
        ...current,
        [id]: { ...currentDraft, ...patch },
      };
    });
  }

  function updateApplicationStatus(id: string, status: ApplicationStatus) {
    updateApplicationDraft(id, { status });
  }

  function updateInterviewRound(id: string, roundId: string, patch: Partial<InterviewRoundDraft>) {
    const draft = editingApplications[id] ?? props.applications.find((application) => application.id === id);
    if (!draft) return;
    updateApplicationDraft(id, {
      interviewRounds: draft.interviewRounds.map((round) => (round.id === roundId ? { ...round, ...patch } : round)),
    });
  }

  function addInterviewRound(id: string) {
    const draft = editingApplications[id] ?? props.applications.find((application) => application.id === id);
    if (!draft) return;
    updateApplicationDraft(id, {
      interviewRounds: [
        ...draft.interviewRounds,
        {
          id: crypto.randomUUID(),
          name: `加面 ${draft.interviewRounds.length + 1}`,
          status: "TODO",
          scheduledAt: "",
          notes: "",
        },
      ],
    });
  }

  function removeInterviewRound(id: string, roundId: string) {
    const draft = editingApplications[id] ?? props.applications.find((application) => application.id === id);
    if (!draft) return;
    updateApplicationDraft(id, {
      interviewRounds: draft.interviewRounds.filter((round) => round.id !== roundId),
    });
  }

  function saveApplicationDraft(id: string) {
    const draft = editingApplications[id];
    if (!draft) return;
    props.updateApplication(id, draft);
    setSavedApplicationId(id);
    window.setTimeout(() => setSavedApplicationId(""), 1800);
  }

  function selectDraftJd(jdId: string) {
    const jd = findJd(jdId);
    props.setApplicationDraft({
      ...props.applicationDraft,
      jdId,
      jdTitle: jd ? `${jd.company} · ${jd.role}` : "",
      company: props.applicationDraft.company || jd?.company || "",
      role: props.applicationDraft.role || jd?.role || "",
    });
  }

  function selectRowJd(applicationId: string, jdId: string) {
    const jd = findJd(jdId);
    updateApplicationDraft(applicationId, {
      jdId,
      jdTitle: jd ? `${jd.company} · ${jd.role}` : "",
      company: jd?.company || editingApplications[applicationId]?.company || "",
      role: jd?.role || editingApplications[applicationId]?.role || "",
    });
  }

  function createApplication() {
    if (!props.applicationDraft.company.trim() || !props.applicationDraft.role.trim()) return;
    props.addApplication();
    setIsCreateOpen(false);
  }

  function previewJd(jdId: string) {
    const jd = findJd(jdId);
    if (jd) setSelectedJdPreview(jd);
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle>投递筛选</CardTitle>
            <CardDescription>默认展示全部记录；海投场景下可以按状态、行业、优先级和地区快速收窄。</CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" />
            新增投递
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 [&_[data-slot=select-trigger]]:w-full">
          <FilterSelect
            label="状态"
            value={filters.status}
            onChange={(value) => setFilters((current) => ({ ...current, status: value as ApplicationStatus | "ALL" }))}
            options={(Object.keys(statusLabels) as ApplicationStatus[]).map((status) => ({ value: status, label: statusLabels[status] }))}
          />
          <FilterSelect
            label="行业"
            value={filters.industry}
            onChange={(value) => setFilters((current) => ({ ...current, industry: value }))}
            options={industryOptions.map((industry) => ({ value: industry, label: industry }))}
          />
          <FilterSelect
            label="优先级"
            value={filters.priority}
            onChange={(value) => setFilters((current) => ({ ...current, priority: value as ApplicationPriority | "ALL" }))}
            options={priorityOptions.map((priority) => ({ value: priority, label: priority }))}
          />
          <FilterSelect
            label="地区"
            value={filters.region}
            onChange={(value) => setFilters((current) => ({ ...current, region: value as ApplicationRegion | "ALL" }))}
            options={regionOptions.map((region) => ({ value: region, label: region }))}
          />
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>新增投递</DialogTitle>
            <DialogDescription>一条投递记录对应一个岗位，可以手动关联已有 JD 分析。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="公司" value={props.applicationDraft.company} onChange={(value) => props.setApplicationDraft({ ...props.applicationDraft, company: value })} />
              <Field label="岗位" value={props.applicationDraft.role} onChange={(value) => props.setApplicationDraft({ ...props.applicationDraft, role: value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <IndustrySelect value={props.applicationDraft.industry} onChange={(industry) => props.setApplicationDraft({ ...props.applicationDraft, industry })} />
              <PrioritySelect value={props.applicationDraft.priority} onChange={(priority) => props.setApplicationDraft({ ...props.applicationDraft, priority })} />
              <RegionSelect value={props.applicationDraft.region} onChange={(region) => props.setApplicationDraft({ ...props.applicationDraft, region })} />
              <Field label="Base 城市" value={props.applicationDraft.city} onChange={(value) => props.setApplicationDraft({ ...props.applicationDraft, city: value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>状态</Label>
                <StatusSelect value={props.applicationDraft.status} onChange={(status) => props.setApplicationDraft({ ...props.applicationDraft, status })} />
              </div>
              <div className="grid gap-2">
                <Label>关联 JD 分析</Label>
                <Select value={props.applicationDraft.jdId || "none"} onValueChange={(value) => selectDraftJd(value === "none" ? "" : value)}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-4rem)] md:max-w-[640px]">
                    <SelectItem value="none">暂不关联</SelectItem>
                    {props.jobDescriptions.map((jd) => (
                      <SelectItem key={jd.id} value={jd.id}>
                        {jd.company} · {jd.role} · {jd.analysis?.matchScore ?? 0}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <TextareaField label="备注" value={props.applicationDraft.notes} onChange={(notes) => props.setApplicationDraft({ ...props.applicationDraft, notes })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>取消</Button>
            <Button onClick={createApplication}><Plus className="size-4" />新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>投递看板</CardTitle>
          <CardDescription>共 {props.applications.length} 条，当前筛选 {filteredApplications.length} 条。默认折叠展示，展开后编辑详情。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {visibleApplications.length ? visibleApplications.map((application) => {
            const draft = editingApplications[application.id] ?? application;
            const linkedJd = findJd(draft.jdId);
            const isExpanded = expandedApplicationId === application.id;
            const finishedRounds = draft.interviewRounds.filter((round) => round.status === "DONE").length;
            return (
              <div key={application.id} className="grid gap-3 rounded-md border bg-card p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{draft.company || "公司待补充"}</p>
                      <Badge variant="secondary">{statusLabels[draft.status]}</Badge>
                      <span className={`inline-flex h-5 items-center rounded-4xl border px-2 text-xs font-medium ${priorityTone[draft.priority]}`}>
                        {draft.priority}
                      </span>
                      {draft.industry ? <Badge variant="outline">{draft.industry}</Badge> : null}
                      {draft.region ? <Badge variant="outline">{draft.region}{draft.city ? ` · ${draft.city}` : ""}</Badge> : null}
                      {linkedJd?.analysis ? <Badge variant="outline">匹配 {linkedJd.analysis.matchScore}%</Badge> : null}
                      {linkedJd?.analysis?.gaps.length ? <Badge variant="outline">缺口 {linkedJd.analysis.gaps.length}</Badge> : null}
                      {draft.interviewRounds.length ? <Badge variant="outline">面试 {finishedRounds}/{draft.interviewRounds.length}</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{draft.role || "岗位待补充"}</p>
                    {draft.notes ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{draft.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => previewJd(draft.jdId)} disabled={!draft.jdId}>
                      查看 JD
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setExpandedApplicationId(isExpanded ? "" : application.id)}>
                      {isExpanded ? "收起" : "展开"}
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="grid gap-3 border-t pt-3">
                    {savedApplicationId === application.id ? (
                      <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                        已保存这条投递记录。
                      </div>
                    ) : null}

                    <div className="grid gap-3 xl:grid-cols-[1fr_1fr_180px]">
                      <Field label="公司" value={draft.company} onChange={(value) => updateApplicationDraft(application.id, { company: value })} />
                      <Field label="岗位" value={draft.role} onChange={(value) => updateApplicationDraft(application.id, { role: value })} />
                      <div className="grid gap-2">
                        <Label>状态</Label>
                        <StatusSelect value={draft.status} onChange={(status) => updateApplicationStatus(application.id, status)} />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <IndustrySelect value={draft.industry} onChange={(industry) => updateApplicationDraft(application.id, { industry })} />
                      <PrioritySelect value={draft.priority} onChange={(priority) => updateApplicationDraft(application.id, { priority })} />
                      <RegionSelect value={draft.region} onChange={(region) => updateApplicationDraft(application.id, { region })} />
                      <Field label="Base 城市" value={draft.city} onChange={(city) => updateApplicationDraft(application.id, { city })} />
                    </div>

                    <div className="grid gap-2">
                      <Label>关联 JD</Label>
                      <Select value={draft.jdId || "none"} onValueChange={(value) => selectRowJd(application.id, value === "none" ? "" : value)}>
                        <SelectTrigger className="w-full min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-w-[calc(100vw-4rem)] md:max-w-[720px]">
                          <SelectItem value="none">暂不关联</SelectItem>
                          {props.jobDescriptions.map((jd) => (
                            <SelectItem key={jd.id} value={jd.id}>
                              {jd.company} · {jd.role} · {jd.analysis?.matchScore ?? 0}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label>面试轮次</Label>
                        <Button size="sm" variant="outline" onClick={() => addInterviewRound(application.id)}>
                          <Plus className="size-4" />
                          添加轮次
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        {draft.interviewRounds.map((round) => (
                          <div key={round.id} className="grid gap-2 rounded-md border bg-muted/20 p-3 xl:grid-cols-[140px_140px_180px_1fr_auto]">
                            <Input value={round.name} onChange={(event) => updateInterviewRound(application.id, round.id, { name: event.target.value })} />
                            <Select value={round.status} onValueChange={(status) => updateInterviewRound(application.id, round.id, { status: status as InterviewRoundDraft["status"] })}>
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TODO">待进行</SelectItem>
                                <SelectItem value="DONE">已完成</SelectItem>
                                <SelectItem value="SKIPPED">跳过</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input placeholder="时间" value={round.scheduledAt} onChange={(event) => updateInterviewRound(application.id, round.id, { scheduledAt: event.target.value })} />
                            <Input placeholder="问题、反馈、准备重点" value={round.notes} onChange={(event) => updateInterviewRound(application.id, round.id, { notes: event.target.value })} />
                            <Button size="icon-sm" variant="ghost" onClick={() => removeInterviewRound(application.id, round.id)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <TextareaField label="备注" value={draft.notes} onChange={(notes) => updateApplicationDraft(application.id, { notes })} />

                    {linkedJd?.analysis?.suggestions.length ? (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                        关联 JD 建议：{linkedJd.analysis.suggestions[0]}
                      </div>
                    ) : null}

                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => saveApplicationDraft(application.id)}>
                        <Save className="size-4" />
                        保存变更
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          }) : <p className="py-8 text-sm text-muted-foreground">还没有投递记录。</p>}
          {filteredApplications.length > visibleApplications.length ? (
            <Button variant="outline" onClick={() => setVisibleLimit((current) => current + 20)}>
              加载更多
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedJdPreview)} onOpenChange={(open) => !open && setSelectedJdPreview(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] gap-5 p-6 xl:max-w-6xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{selectedJdPreview ? `${selectedJdPreview.company} · ${selectedJdPreview.role}` : "JD 分析"}</DialogTitle>
            <DialogDescription>在这里查看关联 JD，不打断当前 JD 分析页面的输入和分析状态。</DialogDescription>
          </DialogHeader>
          {selectedJdPreview ? (
            <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-2">
              {selectedJdPreview.analysis ? (
                <Tabs defaultValue="summary">
                  <TabsList>
                    <TabsTrigger value="summary">概览</TabsTrigger>
                    <TabsTrigger value="keywords">关键词</TabsTrigger>
                    <TabsTrigger value="actions">补强</TabsTrigger>
                  </TabsList>
                  <TabsContent value="summary" className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>匹配度</span>
                        <span className={metricTone(selectedJdPreview.analysis.matchScore)}>{selectedJdPreview.analysis.matchScore}%</span>
                      </div>
                      <Progress value={selectedJdPreview.analysis.matchScore} />
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedJdPreview.analysis.summary}</p>
                    {selectedJdPreview.analysis.strengths.map((item) => <Insight key={item} text={item} />)}
                  </TabsContent>
                  <TabsContent value="keywords" className="flex flex-wrap gap-2">
                    {selectedJdPreview.analysis.keywords.map((keyword) => <Badge key={keyword} variant="secondary">{keyword}</Badge>)}
                  </TabsContent>
                  <TabsContent value="actions" className="space-y-3">
                    {selectedJdPreview.analysis.gaps.map((gap) => <Badge key={gap} variant="outline">{gap}</Badge>)}
                    <Separator />
                    {selectedJdPreview.analysis.suggestions.map((suggestion) => <Insight key={suggestion} text={suggestion} />)}
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="text-sm text-muted-foreground">这条 JD 暂无完成的分析结果。</p>
              )}
              <Textarea className="min-h-72" readOnly value={selectedJdPreview.rawText} />
            </div>
          ) : null}
          <DialogFooter className="-mx-6 -mb-6 px-6">
            <Button variant="outline" onClick={() => setSelectedJdPreview(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
