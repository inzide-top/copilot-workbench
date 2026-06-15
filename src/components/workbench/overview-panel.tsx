import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ApplicationDraft, JobDescriptionDraft, ProfileDraft, ProjectDraft } from "@/lib/types";
import { metricTone } from "./helpers";
import { Insight } from "./shared-fields";
import type { Section } from "./workbench-types";

function MetricCard(props: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-2xl">{props.value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{props.hint}</p>
      </CardContent>
    </Card>
  );
}

export function OverviewPanel(props: {
  applications: ApplicationDraft[];
  averageMatch: number;
  currentJd?: JobDescriptionDraft;
  isDemoMode: boolean;
  profile: ProfileDraft;
  projects: ProjectDraft[];
  resumeTitle: string;
  setActiveSection: (section: Section) => void;
}) {
  const activeApplications = props.applications.filter((item) => item.status !== "ARCHIVED").length;
  const usableProjects = props.projects.filter(
    (project) =>
      project.id !== "starter-ai-workbench" &&
      project.title !== "AI 求职/面试 Copilot 工作台" &&
      project.title.trim() &&
      (project.actions.trim() || project.challenge.trim() || project.impact.trim()),
  );
  const hasRealHeadline = props.profile.headline.trim() && props.profile.headline !== "前端 / AI 全栈开发候选人";
  const materialScore = Math.min(
    100,
    Math.round(
      (props.profile.name.trim() ? 12 : 0) +
        (hasRealHeadline ? 12 : 0) +
        (props.profile.phone.trim() ? 8 : 0) +
        (props.profile.email.trim() ? 8 : 0) +
        (props.profile.resumeText.trim() ? 25 : 0) +
        (props.profile.summary.trim() ? 15 : 0) +
        Math.min(20, usableProjects.length * 10),
    ),
  );

  return (
    <div className="grid gap-4">
      {props.isDemoMode ? (
        <Card className="border-emerald-500/25 bg-emerald-500/5">
          <CardHeader>
            <CardTitle>面试官体验 Demo</CardTitle>
            <CardDescription>
              这是 AI 求职/面试 Copilot 的演示站，已准备示例简历和示例 JD，可直接体验从导入、匹配分析、话术生成到模拟面试的完整工作流。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Insight text="简历项目页和 JD 分析页提供“应用示例”按钮，无需上传真实个人资料即可体验。" />
            <Insight text="演示站已接入服务端 DeepSeek 模型配置，未填写个人 API Key 也可以体验 AI 分析、生成和流式面试。" />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="当前简历素材度" value={`${materialScore}%`} hint={`${props.resumeTitle || "当前简历"} · 联系方式、正文、摘要、项目共同计算`} />
        <MetricCard label="项目素材" value={`${props.projects.length}`} hint="建议准备 2-3 个可深挖项目" />
        <MetricCard label="平均匹配度" value={`${props.averageMatch || 0}%`} hint="来自已分析 JD" />
        <MetricCard label="活跃投递" value={`${activeApplications}`} hint="未归档岗位数量" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>下一步工作流</CardTitle>
            <CardDescription>按这个顺序推进，项目演示和真实求职都比较顺。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[
              ["补全简历和项目", "把项目背景、动作、结果写成面试可讲素材。", "profile"],
              ["粘贴目标 JD", "拆关键词、缺口、匹配优势和补强建议。", "jd"],
              ["生成定制话术", "产出自我介绍、简历 bullet、项目讲法。", "pitch"],
              ["模拟面试复盘", "流式追问并按四维度评分。", "interview"],
            ].map(([title, desc, section]) => (
              <button
                key={title}
                className="rounded-md border bg-card p-4 text-left transition hover:bg-muted/60"
                onClick={() => props.setActiveSection(section as Section)}
              >
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近 JD</CardTitle>
            <CardDescription>{props.currentJd ? `${props.currentJd.company} · ${props.currentJd.role}` : "暂无分析记录"}</CardDescription>
          </CardHeader>
          <CardContent>
            {props.currentJd?.analysis ? (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>匹配度</span>
                    <span className={metricTone(props.currentJd.analysis.matchScore)}>{props.currentJd.analysis.matchScore}%</span>
                  </div>
                  <Progress value={props.currentJd.analysis.matchScore} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {props.currentJd.analysis.keywords.slice(0, 8).map((keyword) => (
                    <Badge key={keyword} variant="outline">{keyword}</Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{props.currentJd.analysis.summary}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">粘贴一个 JD 后，这里会显示最近一次匹配结果。</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
