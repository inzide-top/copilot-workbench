import { FileText, Gauge, Loader2, Upload } from "lucide-react";
import type { ChangeEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getSupportedImportAccept } from "@/lib/document-import";
import type { JobDescriptionDraft, ResumeDraft } from "@/lib/types";
import { metricTone } from "./helpers";
import { Field, Insight } from "./shared-fields";

export function JdPanel(props: {
  analyzeJd: () => void;
  applyJdExample: () => void;
  currentJd?: JobDescriptionDraft;
  handleJdFile: (file?: File) => void;
  isDemoMode: boolean;
  isImporting: boolean;
  isLoading: boolean;
  jdCompanyWarning: string;
  jdDraft: { company: string; role: string; rawText: string };
  jdImportProgress: number | null;
  jdImportStatus: string;
  jobDescriptions: JobDescriptionDraft[];
  resumes: ResumeDraft[];
  selectJd: (jd: JobDescriptionDraft) => void;
  selectedJdId: string;
  selectedResumeId: string;
  setSelectedResumeId: (id: string) => void;
  setJdDraft: (draft: { company: string; role: string; rawText: string }) => void;
}) {
  function handleJdImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    props.handleJdFile(file);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>粘贴 JD</CardTitle>
            <CardDescription>输入公司、岗位和完整 JD，也可以直接导入截图、PDF 或文本。</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {props.isDemoMode ? (
              <Button variant="outline" size="sm" onClick={props.applyJdExample} disabled={props.isImporting}>
                {props.isImporting ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                应用示例
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <label className="cursor-pointer">
                {props.isImporting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                导入 JD 截图/文件
                <input
                  className="hidden"
                  type="file"
                  accept={getSupportedImportAccept("jd")}
                  onChange={handleJdImportChange}
                />
              </label>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <Label>用于匹配的简历</Label>
            <Select value={props.selectedResumeId} onValueChange={props.setSelectedResumeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {props.resumes.map((resume) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    {resume.title || "未命名简历"}{resume.targetRole ? ` · ${resume.targetRole}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label>公司</Label>
                {props.jdCompanyWarning && !props.jdDraft.company ? <span className="text-xs text-amber-300">{props.jdCompanyWarning}</span> : null}
              </div>
              <Input value={props.jdDraft.company} onChange={(event) => props.setJdDraft({ ...props.jdDraft, company: event.target.value })} />
            </div>
            <Field label="岗位" value={props.jdDraft.role} onChange={(value) => props.setJdDraft({ ...props.jdDraft, role: value })} />
          </div>
          {props.jdImportStatus ? (
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{props.jdImportStatus}</span>
                {props.jdImportProgress !== null ? <span>{props.jdImportProgress}%</span> : null}
              </div>
              {props.jdImportProgress !== null ? <Progress value={props.jdImportProgress} /> : null}
            </div>
          ) : null}
          <Textarea className="min-h-96" value={props.jdDraft.rawText} onChange={(event) => props.setJdDraft({ ...props.jdDraft, rawText: event.target.value })} placeholder="粘贴 JD 原文，包括岗位职责、任职要求、加分项..." />
          <Button onClick={props.analyzeJd} disabled={props.isLoading}>
            {props.isLoading ? <Loader2 className="size-4 animate-spin" /> : <Gauge className="size-4" />}
            分析匹配度
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>匹配分析</CardTitle>
            <CardDescription>
              {props.currentJd
                ? `${props.currentJd.company} · ${props.currentJd.role}${props.currentJd.resumeTitle ? ` · ${props.currentJd.resumeTitle}` : ""}`
                : "等待分析"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {props.currentJd?.analysisStatus === "ANALYZING" ? (
              <div className="space-y-4 rounded-md border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  正在分析匹配度
                </div>
                <Progress value={62} />
                <p className="text-sm text-muted-foreground">
                  已创建历史记录，正在拆解岗位职责、任职要求、关键词和简历证据。
                </p>
              </div>
            ) : props.currentJd?.analysisStatus === "FAILED" ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                分析失败，可以重新点击“分析匹配度”。
              </div>
            ) : props.currentJd?.analysis ? (
              <Tabs defaultValue="summary">
                <TabsList>
                  <TabsTrigger value="summary">概览</TabsTrigger>
                  <TabsTrigger value="keywords">关键词</TabsTrigger>
                  <TabsTrigger value="actions">补强</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>匹配度</span>
                      <span className={metricTone(props.currentJd.analysis.matchScore)}>{props.currentJd.analysis.matchScore}%</span>
                    </div>
                    <Progress value={props.currentJd.analysis.matchScore} />
                  </div>
                  <p className="text-sm text-muted-foreground">{props.currentJd.analysis.summary}</p>
                  {props.currentJd.analysis.strengths.map((item) => <Insight key={item} text={item} />)}
                </TabsContent>
                <TabsContent value="keywords" className="flex flex-wrap gap-2">
                  {props.currentJd.analysis.keywords.map((keyword) => <Badge key={keyword} variant="secondary">{keyword}</Badge>)}
                </TabsContent>
                <TabsContent value="actions" className="space-y-3">
                  {props.currentJd.analysis.gaps.map((gap) => <Badge key={gap} variant="outline">{gap}</Badge>)}
                  <Separator />
                  {props.currentJd.analysis.suggestions.map((item) => <Insight key={item} text={item} />)}
                </TabsContent>
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">分析结果会展示结构化匹配度、关键词、缺口和建议。</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>历史 JD</CardTitle>
            <CardDescription>保留最近分析记录，方便面试前回看。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {props.jobDescriptions.length ? props.jobDescriptions.map((jd) => (
              <button
                key={jd.id}
                className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition hover:bg-muted/50 ${
                  props.selectedJdId === jd.id ? "border-primary/50 bg-primary/10" : ""
                }`}
                onClick={() => props.selectJd(jd)}
              >
                <div>
                  <p className="text-sm font-medium">{jd.company} · {jd.role}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(jd.createdAt).toLocaleString()}{jd.resumeTitle ? ` · ${jd.resumeTitle}` : ""}
                  </p>
                </div>
                {jd.analysisStatus === "ANALYZING" ? (
                  <Badge variant="outline">
                    <Loader2 className="size-3 animate-spin" />
                    分析中
                  </Badge>
                ) : jd.analysisStatus === "FAILED" ? (
                  <Badge variant="destructive">失败</Badge>
                ) : (
                  <Badge>{jd.analysis?.matchScore ?? 0}%</Badge>
                )}
              </button>
            )) : <p className="text-sm text-muted-foreground">暂无历史记录。</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
