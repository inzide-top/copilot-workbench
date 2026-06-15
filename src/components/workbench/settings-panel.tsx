import { Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { AiConfigDraft } from "@/lib/types";
import { aiProviderOptions } from "./constants";
import { Insight } from "./shared-fields";

export function SettingsPanel(props: {
  aiConfig: AiConfigDraft;
  aiConfigStatus: string;
  clearAiConfig: () => void;
  saveAiConfig: () => void;
  setAiConfig: (config: AiConfigDraft) => void;
}) {
  const hasKey = Boolean(props.aiConfig.apiKey.trim());
  const selectedProvider = aiProviderOptions.find((provider) => provider.id === props.aiConfig.provider) ?? aiProviderOptions[0];
  const modelOptions = Array.from(new Set([...selectedProvider.models, props.aiConfig.model].filter(Boolean)));

  function selectProvider(providerId: string) {
    const provider = aiProviderOptions.find((item) => item.id === providerId) ?? aiProviderOptions[0];
    props.setAiConfig({
      ...props.aiConfig,
      provider: provider.id,
      baseUrl: provider.baseUrl,
      model: provider.models[0] ?? props.aiConfig.model,
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>模型配置</CardTitle>
          <CardDescription>使用你自己的模型额度。支持 OpenAI 兼容接口，配置只保存在当前浏览器本地。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>模型供应商</Label>
            <Select value={props.aiConfig.provider} onValueChange={selectProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aiProviderOptions.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">{selectedProvider.description}</p>
          </div>
          <div className="grid gap-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={props.aiConfig.apiKey}
              onChange={(event) => props.setAiConfig({ ...props.aiConfig, apiKey: event.target.value })}
              placeholder="粘贴当前供应商的 API Key"
            />
          </div>
          <div className="grid gap-2">
            <Label>Base URL</Label>
            <Input
              value={props.aiConfig.baseUrl}
              onChange={(event) => props.setAiConfig({ ...props.aiConfig, baseUrl: event.target.value })}
              placeholder="OpenAI 官方接口可留空；兼容服务通常是 https://.../v1"
            />
          </div>
          <div className="grid gap-2">
            <Label>推荐模型</Label>
            <Select
              value={props.aiConfig.model}
              onValueChange={(model) => props.setAiConfig({ ...props.aiConfig, model })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((model) => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>自定义模型名</Label>
            <Input
              value={props.aiConfig.model}
              onChange={(event) => props.setAiConfig({ ...props.aiConfig, model: event.target.value })}
              placeholder="例如 deepseek-v4-flash、gemini-3.5-flash、qwen-plus"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={props.saveAiConfig}>
              <Save className="size-4" />
              保存配置
            </Button>
            <Button variant="outline" onClick={props.clearAiConfig}>
              清空配置
            </Button>
          </div>
          <div className={`rounded-md border px-3 py-2 text-sm ${hasKey ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : "border-amber-500/25 bg-amber-500/10 text-amber-200"}`}>
            {props.aiConfigStatus}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>生效范围</CardTitle>
          <CardDescription>保存后，以下能力会优先使用你的模型配置。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {aiProviderOptions
              .filter((provider) => provider.id !== "custom")
              .map((provider) => (
                <Badge key={provider.id} variant={provider.id === props.aiConfig.provider ? "secondary" : "outline"}>
                  {provider.label}
                </Badge>
              ))}
          </div>
          <Separator />
          {[
            "简历/项目导入后的结构化解析",
            "JD 匹配前的本地字段抽取",
            "JD 匹配度分析",
            "定制话术生成",
            "AI 模拟面试流式对话",
            "面试回答评分",
          ].map((item) => (
            <Insight key={item} text={item} />
          ))}
          <Separator />
          <p className="text-sm leading-6 text-muted-foreground">
            当前版本使用 OpenAI 兼容协议调用模型。Claude 原生接口这类非兼容协议，建议先通过 OpenRouter 等统一入口接入。
            API Key 不会写入数据库同步接口；它只存在于本机浏览器 localStorage。换浏览器或清空站点数据后需要重新填写。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
