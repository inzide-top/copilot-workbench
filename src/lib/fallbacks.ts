import type {
  InterviewScore,
  JdAnalysis,
  ProfileDraft,
  ProjectDraft,
} from "@/lib/types";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "are",
  "this",
  "that",
  "will",
  "岗位",
  "岗位职责",
  "工作职责",
  "职位描述",
  "工作内容",
  "职责描述",
  "任职要求",
  "岗位要求",
  "职位要求",
  "任职资格",
  "负责",
  "参与",
  "相关",
  "能力",
  "经验",
  "熟悉",
  "具备",
  "以及",
  "进行",
  "团队",
  "公司",
  "我们",
  "一起",
  "加入",
  "福利",
  "起步",
]);

const coreJdHeadingPattern =
  /(岗位职责|工作职责|职位描述|工作内容|职责描述|主要职责|任职要求|岗位要求|职位要求|任职资格|能力要求|技能要求|加分项|优先条件|Responsibilities|Requirements|Qualifications)/i;
const noiseHeadingPattern =
  /(关于我们|公司介绍|团队介绍|团队氛围|团队文化|业务介绍|产品介绍|福利待遇|薪资福利|工作地点|办公地点|招聘流程|面试流程|你将获得|我们提供|Why us|About us|Benefits|Location)/i;
const noiseLinePattern =
  /(团队刚刚起步|创业团队|扁平管理|氛围|福利|五险一金|下午茶|团建|弹性工作|薪资|年终奖|期权|办公地点|公司介绍|关于我们|加入我们|期待你|一起成长|快速发展|业务高速增长|行业领先|使命|愿景)/i;
const requirementSignalPattern =
  /(负责|参与|建设|设计|开发|维护|优化|落地|推动|实现|熟悉|掌握|精通|了解|具备|要求|经验|能力|优先|加分|React|Vue|TypeScript|JavaScript|Node|Next\.?js|前端|后端|全栈|工程化|组件|性能|小程序|H5|可视化|AI|LLM|SSE|ECharts)/i;

type RequirementRule = {
  label: string;
  jd: RegExp;
  candidate: RegExp[];
  suggestion?: string;
  vague?: boolean;
  weight: number;
};

const REQUIREMENT_RULES: RequirementRule[] = [
  {
    label: "本科及以上学历",
    jd: /(本科|学士|硕士|研究生).{0,8}(以上|及以上|学历)|学历.{0,8}(本科|学士|硕士|研究生)/i,
    candidate: [/本科|学士|硕士|研究生|计算机科学与技术本科/i],
    suggestion: "补充教育经历中的学历信息，或确认简历识别文本里保留了学校、专业、学历。",
    weight: 9,
  },
  {
    label: "计算机相关专业",
    jd: /(计算机|软件工程|电子信息|信息工程|自动化|通信).{0,10}(专业|相关)/i,
    candidate: [/计算机科学与技术|计算机|软件工程|电子信息|信息工程|自动化|通信/i],
    suggestion: "补充专业名称或相关课程背景，例如计算机科学与技术、软件工程、数据结构等。",
    weight: 9,
  },
  {
    label: "JavaScript/TypeScript",
    jd: /JavaScript|TypeScript|\bJS\b|\bTS\b/i,
    candidate: [/JavaScript|TypeScript|\bJS\b|\bTS\b/i],
    weight: 10,
  },
  {
    label: "React",
    jd: /React|React\.js|Hooks|Redux/i,
    candidate: [/React|React\.js|Hooks|Redux/i],
    weight: 9,
  },
  {
    label: "Vue",
    jd: /Vue|Vue3|Vue2|Pinia|Vue Router/i,
    candidate: [/Vue|Vue3|Vue2|Pinia|Vue Router/i],
    weight: 8,
  },
  {
    label: "HTML/CSS",
    jd: /HTML|CSS|Less|Sass|Tailwind/i,
    candidate: [/HTML|CSS|Less|Sass|Tailwind/i],
    weight: 7,
  },
  {
    label: "前端工程化",
    jd: /工程化|Webpack|Vite|构建|模块化|包管理|npm|pnpm/i,
    candidate: [/工程化|Webpack|Vite|构建|模块化|npm|pnpm|包管理/i],
    weight: 8,
  },
  {
    label: "组件化开发",
    jd: /组件|组件库|组件化|抽象|封装/i,
    candidate: [/组件|组件库|组件化|抽象|封装/i],
    weight: 7,
  },
  {
    label: "性能优化",
    jd: /性能|优化|加载|首屏|渲染|大数据量/i,
    candidate: [/性能|优化|加载|首屏|渲染|大数据量/i],
    weight: 7,
  },
  {
    label: "接口联调/跨端协作",
    jd: /接口|联调|协作|后端|服务端|API/i,
    candidate: [/接口|联调|协作|后端|服务端|API|Bridge|WebView/i],
    weight: 6,
  },
  {
    label: "AI 应用开发",
    jd: /\bAI\b|LLM|大模型|对话|智能体|Agent|Prompt|SSE/i,
    candidate: [/\bAI\b|LLM|大模型|对话|智能体|Agent|Prompt|SSE/i],
    weight: 7,
  },
  {
    label: "数据可视化",
    jd: /可视化|图表|ECharts|看板|Dashboard/i,
    candidate: [/可视化|图表|ECharts|看板|Dashboard/i],
    weight: 6,
  },
  {
    label: "计算机基础/编程能力",
    jd: /扎实.{0,6}(计算机基础|编程能力)|计算机基础|编程能力|数据结构|算法|操作系统|计算机网络/i,
    candidate: [/计算机科学与技术|本科|数据结构|算法|操作系统|计算机网络|JavaScript|TypeScript|项目经历|开发/i],
    vague: true,
    weight: 5,
  },
];

function normalizeJdLines(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/^[\s\-—–*•●◆\d.、)）]+/, "")
        .replace(/[ \t]+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

export function extractCoreJdForMatching(text: string) {
  const lines = normalizeJdLines(text);
  const selected: string[] = [];
  let inCoreSection = false;
  let hasExplicitCoreSection = false;

  for (const line of lines) {
    if (noiseHeadingPattern.test(line)) {
      if (inCoreSection) inCoreSection = false;
      continue;
    }
    if (noiseLinePattern.test(line) && !coreJdHeadingPattern.test(line)) continue;

    if (coreJdHeadingPattern.test(line)) {
      inCoreSection = true;
      hasExplicitCoreSection = true;
      selected.push(line);
      continue;
    }

    if (inCoreSection) {
      selected.push(line);
    }
  }

  const sourceLines = hasExplicitCoreSection ? selected : lines.filter((line) => requirementSignalPattern.test(line));
  const filtered = sourceLines.filter((line) => {
    if (noiseHeadingPattern.test(line) || noiseLinePattern.test(line)) return false;
    if (line.length > 140 && !requirementSignalPattern.test(line)) return false;
    return true;
  });

  return (filtered.length ? filtered : lines)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractKeywords(text: string, limit = 14) {
  const normalized = text.toLowerCase();
  const words = normalized.match(/[a-z][a-z0-9+#.-]{1,}|[\u4e00-\u9fa5]{2,}/g) ?? [];
  const counts = new Map<string, number>();

  for (const word of words) {
    if (STOP_WORDS.has(word) || word.length < 2) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function isLowSignalKeyword(keyword: string) {
  return /扎实|精通|熟练|熟悉|掌握|了解|具备|能力|基础|其它|其他|相关|以上|学历|专业|要求/.test(keyword);
}

function normalizeKeyword(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, "");
}

function isCoveredByRuleLabel(keyword: string, rules: RequirementRule[]) {
  const normalizedKeyword = normalizeKeyword(keyword);
  if (!normalizedKeyword) return true;
  return rules.some((rule) => normalizeKeyword(rule.label).includes(normalizedKeyword));
}

function candidateText(params: { profile: ProfileDraft; projects: ProjectDraft[] }) {
  return [
    params.profile.name,
    params.profile.headline,
    params.profile.summary,
    params.profile.resumeText,
    ...params.projects.flatMap((project) => [
      project.title,
      project.role,
      project.stack,
      project.challenge,
      project.actions,
      project.impact,
      project.talkingPoints,
    ]),
  ].join("\n");
}

function findEvidence(text: string, patterns: RegExp[]) {
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const pattern of patterns) {
    const line = lines.find((item) => pattern.test(item));
    if (line) return line.length > 72 ? `${line.slice(0, 72)}...` : line;
  }

  return "";
}

function extractRuleMatches(coreJd: string, params: { profile: ProfileDraft; projects: ProjectDraft[] }) {
  const corpus = candidateText(params);
  const presentRules = REQUIREMENT_RULES.filter((rule) => rule.jd.test(coreJd));
  const matched = presentRules.filter((rule) => rule.candidate.some((pattern) => pattern.test(corpus)));
  const missing = presentRules.filter(
    (rule) => !rule.vague && !rule.candidate.some((pattern) => pattern.test(corpus)),
  );

  return { corpus, presentRules, matched, missing };
}

export function analyzeJdFallback(params: {
  jd: string;
  profile: ProfileDraft;
  projects: ProjectDraft[];
}): JdAnalysis {
  const coreJd = extractCoreJdForMatching(params.jd);
  const { corpus, presentRules, matched, missing } = extractRuleMatches(coreJd, params);
  const jdKeywords = extractKeywords(coreJd).filter(
    (keyword) => !isLowSignalKeyword(keyword) && !isCoveredByRuleLabel(keyword, presentRules),
  );
  const extraMatched = jdKeywords.filter((keyword) => corpus.toLowerCase().includes(keyword.toLowerCase()));
  const extraMissing = jdKeywords
    .filter((keyword) => !corpus.toLowerCase().includes(keyword.toLowerCase()))
    .filter((keyword) => !/扎实|精通|能力|基础|其它|其他|相关|以上|学历|专业/.test(keyword))
    .slice(0, Math.max(0, 6 - missing.length));
  const totalWeight = Math.max(1, presentRules.reduce((sum, rule) => sum + rule.weight, 0) + jdKeywords.length * 2);
  const matchedWeight = matched.reduce((sum, rule) => sum + rule.weight, 0) + extraMatched.length * 2;
  const matchScore = Math.min(94, Math.max(38, Math.round((matchedWeight / totalWeight) * 82 + 12)));
  const keywords = [...new Set([...presentRules.map((rule) => rule.label), ...jdKeywords])].slice(0, 14);
  const gaps = [...missing.map((rule) => rule.label), ...extraMissing].slice(0, 6);

  return {
    matchScore,
    keywords,
    gaps,
    strengths: matched.slice(0, 6).map((rule) => {
      const evidence = findEvidence(corpus, rule.candidate);
      return evidence ? `已覆盖 ${rule.label}：${evidence}` : `已覆盖 ${rule.label}，可在面试中主动展开。`;
    }),
    suggestions: gaps.length
      ? gaps.map((gap) => {
          const rule = missing.find((item) => item.label === gap);
          return rule?.suggestion || `补充一条能直接证明「${gap}」的项目经历、技术细节或量化结果。`;
        })
      : ["当前关键词覆盖较好，建议补充量化业务影响和技术取舍。"],
    summary:
      "这是本地启发式分析结果。配置 OPENAI_API_KEY 后会升级为模型分析，返回更细的匹配理由、缺口和优化建议。",
  };
}

export function pitchFallback(params: {
  profile: ProfileDraft;
  projects: ProjectDraft[];
  jdRole: string;
  jdCompany: string;
  jdText?: string;
  keywords: string[];
}) {
  const topProjects = params.projects.filter((project) => project.title || project.actions || project.impact).slice(0, 2);
  const keywordLine = params.keywords.slice(0, 5).join("、") || "前端工程化、复杂交互、业务交付";
  const primaryProject = topProjects[0];
  const name = params.profile.name || "候选人";
  const direction = params.profile.headline || params.profile.summary || "前端开发";
  const role = params.jdRole || "目标岗位";
  const company = params.jdCompany || "贵公司";

  return {
    intro: `您好，我叫${name}，目前主要方向是${direction}。我过去的经历集中在移动端 H5、复杂业务后台和 AI 能力接入，比较擅长把业务需求拆成可落地的前端方案，并在交互体验、工程效率和稳定性之间做取舍。针对${company}的${role}，我理解岗位比较关注${keywordLine}。这部分和我在${primaryProject?.title || "核心项目"}中的经验比较匹配：我参与过从需求拆解、技术选型、页面实现到上线走查的完整流程，也处理过多端适配、状态管理、性能和异常监控等问题。如果有机会加入，我希望能用比较强的前端交付能力，快速承担业务模块，同时把项目里的可复用能力和质量保障继续沉淀下来。`,
    resumeBullets: topProjects.length
      ? topProjects.map(
          (project) =>
            `负责${project.title || "核心项目"}中${project.role || "前端核心模块"}的开发与迭代，基于${project.stack || "Vue/React、TypeScript、工程化工具"}完成${project.actions || "业务流程拆解、组件封装、状态管理和多端适配"}，最终${project.impact || "提升页面交付效率、复用能力和线上稳定性"}。`,
        )
      : [
          `围绕${role}要求，沉淀前端页面开发、组件拆分、状态管理、接口联调和上线排查能力，能够独立推进业务模块从需求到发布。`,
        ],
    projectTalkTrack: topProjects.length
      ? topProjects.map(
          (project) =>
            `${project.title || "这个项目"}的背景是${project.challenge || "业务需要在较短周期内完成稳定交付"}。我主要负责${project.role || "前端核心开发"}，重点做了${project.actions || "需求拆解、页面实现、组件抽象、接口联调和问题排查"}。技术上使用${project.stack || "前端主流技术栈"}，我的关注点不是只把页面做出来，而是把公共能力、异常情况和后续复用一起考虑。最终结果是${project.impact || "项目按期上线，并提升了后续类似需求的交付效率"}。如果面试官继续追问，我会重点展开其中的技术取舍、复杂状态处理和上线稳定性保障。`,
        )
      : [
          `可以选择一个最完整的项目按“背景、目标、我的职责、关键方案、结果、复盘”来讲，重点突出你亲自负责的模块、遇到的难点、如何验证方案，以及最后对业务或团队效率产生的影响。`,
        ],
    riskNotes: [
      `如果被问“为什么适合${role}”，回答时不要只说会技术栈，要把 JD 里的${keywordLine}对应到具体项目证据。`,
      "如果被追问技术深度，可以准备一个具体模块展开：数据流怎么设计、组件怎么拆、异常怎么兜底、上线后怎么监控。",
      "如果被问项目不足，可以承认当时的约束，再补充如果重做会在测试、监控、性能预算或可配置能力上怎么改。",
    ],
  };
}

export function scoreFallback(answer: string): InterviewScore {
  const lengthScore = answer.length > 450 ? 82 : answer.length > 220 ? 74 : 62;
  const hasMetrics = /\d|%|提升|降低|增长|减少|ms|秒|分钟/.test(answer);
  const hasTradeoff = /取舍|风险|缺点|边界|监控|回滚|兼容|成本/.test(answer);
  const hasStructure = /背景|目标|方案|结果|复盘|首先|然后|最后/.test(answer);

  return {
    structure: Math.min(92, lengthScore + (hasStructure ? 8 : 0)),
    technicalDepth: Math.min(90, lengthScore + (/架构|接口|缓存|性能|数据库|并发|状态|组件/.test(answer) ? 8 : 0)),
    businessImpact: Math.min(90, lengthScore + (hasMetrics ? 10 : 0)),
    riskAwareness: Math.min(88, lengthScore + (hasTradeoff ? 12 : 0)),
    overall: Math.min(90, lengthScore + (hasStructure ? 4 : 0) + (hasMetrics ? 4 : 0) + (hasTradeoff ? 4 : 0)),
    feedback: [
      hasStructure ? "结构较清晰，可以继续保持 STAR/背景-方案-结果表达。" : "建议先给一句结论，再按背景、方案、结果展开。",
      hasMetrics ? "已经有量化表达，面试里会更可信。" : "建议补充明确指标，例如性能、效率、转化率或节省时间。",
      hasTradeoff ? "有风险意识，适合追问技术取舍。" : "建议补充方案边界、风险、监控或回滚策略。",
    ],
  };
}
