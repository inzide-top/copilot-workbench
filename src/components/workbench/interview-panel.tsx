import { ArrowLeft, ClipboardCheck, Loader2, MessageSquareText, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { InterviewMessageDraft, InterviewScore, JobDescriptionDraft } from "@/lib/types";
import { Insight } from "./shared-fields";

function ThinkingText() {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => setDots((current) => (current % 3) + 1), 450);
    return () => window.clearInterval(timer);
  }, []);

  return <span>正在思考{".".repeat(dots)}</span>;
}

export function InterviewPanel(props: {
  closeDetail: () => void;
  detailJd?: JobDescriptionDraft;
  input: string;
  isInterviewLoading: boolean;
  isScoreLoading: boolean;
  jobDescriptions: JobDescriptionDraft[];
  messages: InterviewMessageDraft[];
  openDetail: (jdId: string) => void;
  scoreConversation: () => void;
  scoreMessage: (messageId: string) => void;
  scorePanel: { title: string; score: InterviewScore } | null;
  scoringMessageId: string;
  sendInterviewMessage: () => void;
  setInput: (value: string) => void;
}) {
  const hasUserAnswers = props.messages.some((message) => message.role === "user" && message.content.trim());

  if (!props.detailJd) {
    const analyzedJds = props.jobDescriptions.filter((jd) => jd.analysisStatus === "DONE" && jd.analysis);
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>模拟面试</CardTitle>
            <CardDescription>每场模拟面试绑定一条 JD 分析记录，方便围绕目标岗位连续追问和评分。</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-3">
          {analyzedJds.length ? analyzedJds.map((jd) => {
            const userAnswers = jd.interview?.messages.filter((message) => message.role === "user").length ?? 0;
            return (
              <Card key={jd.id}>
                <CardContent className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{jd.company} · {jd.role}</p>
                      <Badge variant="outline">匹配 {jd.analysis?.matchScore ?? 0}%</Badge>
                      {userAnswers ? <Badge variant="secondary">{userAnswers} 条回答</Badge> : <Badge variant="outline">未开始</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {jd.resumeTitle ? `${jd.resumeTitle} · ` : ""}
                      {jd.interview?.updatedAt ? `更新于 ${new Date(jd.interview.updatedAt).toLocaleString()}` : "从自我介绍开始模拟"}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => props.openDetail(jd.id)}>
                    <MessageSquareText className="size-4" />
                    {userAnswers ? "继续模拟" : "开始模拟"}
                  </Button>
                </CardContent>
              </Card>
            );
          }) : (
            <Card>
              <CardContent className="py-10 text-sm text-muted-foreground">
                还没有可模拟的 JD。先去 JD 分析页完成一次匹配分析。
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Card className="h-[680px] min-h-0">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Button className="mb-3" size="sm" variant="ghost" onClick={props.closeDetail}>
              <ArrowLeft className="size-4" />
              返回面试列表
            </Button>
            <CardTitle>AI 模拟面试官</CardTitle>
            <CardDescription>
              {props.detailJd.company} · {props.detailJd.role}。支持流式追问，没有配置模型 key 时会使用本地模拟回复。
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex h-[520px] min-h-0 flex-col gap-4 pb-5">
          <ScrollArea className="min-h-0 flex-1 rounded-md border p-4">
            <div className="space-y-4">
              {props.messages.map((message) => (
                <div key={message.id} className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[82%] rounded-md border px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/45"}`}>
                    {message.content || (message.role === "assistant" ? <ThinkingText /> : null)}
                  </div>
                  {message.role === "user" && message.content.trim() ? (
                    <Button
                      className="mt-2 h-7 px-2 text-xs"
                      variant="outline"
                      onClick={() => props.scoreMessage(message.id)}
                      disabled={props.scoringMessageId === message.id}
                    >
                      {props.scoringMessageId === message.id ? <Loader2 className="size-3 animate-spin" /> : <ClipboardCheck className="size-3" />}
                      {message.score ? "查看评分" : "评分回答"}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="grid shrink-0 gap-2 pb-1">
            <Textarea className="max-h-28 min-h-20 resize-none" value={props.input} onChange={(event) => props.setInput(event.target.value)} placeholder="输入你的回答，面试官会继续追问..." />
            <div className="flex justify-between gap-2">
              {hasUserAnswers ? (
                <Button variant="outline" onClick={props.scoreConversation} disabled={props.isScoreLoading}>
                  {props.isScoreLoading ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}
                  对当前面试整体评分
                </Button>
              ) : <span />}
              <Button onClick={props.sendInterviewMessage} disabled={props.isInterviewLoading}>
                {props.isInterviewLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                发送
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{props.scorePanel?.title ?? "回答评分"}</CardTitle>
          <CardDescription>结构、技术深度、业务影响、风险意识。</CardDescription>
        </CardHeader>
        <CardContent>
          {props.scorePanel ? (
            <div className="space-y-4">
              {[
                ["结构", props.scorePanel.score.structure],
                ["技术深度", props.scorePanel.score.technicalDepth],
                ["业务影响", props.scorePanel.score.businessImpact],
                ["风险意识", props.scorePanel.score.riskAwareness],
                ["总分", props.scorePanel.score.overall],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-sm"><span>{label}</span><span>{value}</span></div>
                  <Progress value={Number(value)} />
                </div>
              ))}
              <Separator />
              {props.scorePanel.score.feedback.map((item) => <Insight key={item} text={item} />)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">发送回答后，可以对单条回答评分，也可以对当前面试整体评分。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
