import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { JobDescriptionDraft } from "@/lib/types";

function PitchCard(props: { title: string; items: string[] }) {
  return (
    <Card className="mb-4 break-inside-avoid">
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.items.map((item) => (
          <div key={item} className="rounded-md border bg-muted/30 p-3 text-sm leading-6">{item}</div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PitchPanel(props: {
  closeDetail: () => void;
  detailJd?: JobDescriptionDraft;
  generatePitch: (jdId?: string) => void;
  generatingPitchId: string;
  jobDescriptions: JobDescriptionDraft[];
  openDetail: (jdId: string) => void;
}) {
  const analyzedJds = props.jobDescriptions.filter((jd) => jd.analysisStatus === "DONE" && jd.analysis);

  if (props.detailJd) {
    const isGenerating = props.generatingPitchId === props.detailJd.id;
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <Button className="mb-3" size="sm" variant="ghost" onClick={props.closeDetail}>
                <ArrowLeft className="size-4" />
                返回话术列表
              </Button>
              <CardTitle>话术详情</CardTitle>
              <CardDescription>
                {props.detailJd.company} · {props.detailJd.role}
                {props.detailJd.resumeTitle ? ` · ${props.detailJd.resumeTitle}` : ""}
              </CardDescription>
            </div>
            <Button onClick={() => props.generatePitch(props.detailJd?.id)} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {props.detailJd.pitch ? "重新生成" : "生成话术"}
            </Button>
          </CardHeader>
        </Card>

        {props.detailJd.pitchStatus === "GENERATING" ? (
          <Card>
            <CardContent className="space-y-4 py-8">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="size-4 animate-spin text-primary" />
                正在生成这条 JD 的定制话术
              </div>
              <Progress value={68} />
            </CardContent>
          </Card>
        ) : props.detailJd.pitch ? (
          <div className="columns-1 gap-4 xl:columns-2">
            <PitchCard title="自我介绍" items={[props.detailJd.pitch.intro]} />
            <PitchCard title="简历 Bullet" items={props.detailJd.pitch.resumeBullets} />
            <PitchCard title="项目话术" items={props.detailJd.pitch.projectTalkTrack} />
            <PitchCard title="风险追问准备" items={props.detailJd.pitch.riskNotes} />
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-4 py-10 text-sm text-muted-foreground">
              <p>这条 JD 还没有生成话术。生成后会绑定在这条分析记录下，不影响其他页面操作。</p>
              <div>
                <Button onClick={() => props.generatePitch(props.detailJd?.id)} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  生成话术
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>定制版面试材料</CardTitle>
          <CardDescription>每条话术都绑定一条 JD 分析记录，方便按岗位回看和重新生成。</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-3">
        {analyzedJds.length ? analyzedJds.map((jd) => {
          const isGenerating = props.generatingPitchId === jd.id || jd.pitchStatus === "GENERATING";
          return (
            <Card key={jd.id}>
              <CardContent className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{jd.company} · {jd.role}</p>
                    <Badge variant="outline">匹配 {jd.analysis?.matchScore ?? 0}%</Badge>
                    {jd.pitch ? <Badge variant="secondary">已生成</Badge> : <Badge variant="outline">未生成</Badge>}
                    {isGenerating ? <Badge variant="outline"><Loader2 className="size-3 animate-spin" />生成中</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {jd.resumeTitle ? `${jd.resumeTitle} · ` : ""}
                    {jd.pitchUpdatedAt ? `更新于 ${new Date(jd.pitchUpdatedAt).toLocaleString()}` : "尚未生成话术"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => props.openDetail(jd.id)}>
                    查看话术详情
                  </Button>
                  <Button size="sm" onClick={() => props.generatePitch(jd.id)} disabled={Boolean(isGenerating)}>
                    {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {jd.pitch ? "重新生成" : "生成话术"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }) : (
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              还没有可生成话术的 JD。先去 JD 分析页完成一次匹配分析。
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
