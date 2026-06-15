import type { ProjectDraft } from "@/lib/types";

export type ResumeParseResult = {
  name: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  summary: string;
  resumeText: string;
  projects: ProjectDraft[];
};

export type JdParseResult = {
  company: string;
  role: string;
  rawText: string;
  companyMissing: boolean;
};

const cityPattern = /北京|上海|广州|深圳|杭州|成都|南京|武汉|西安|苏州|重庆|天津|厦门|长沙|郑州/;
const projectHeadingPattern =
  /(项目经历|项目经验|项目实践|项目实战|项目作品|代表项目|核心项目|主要项目|Project Experience|Projects)/i;
const resumeSectionPattern =
  /(个人信息|求职意向|教育经历|工作经历|实习经历|校园经历|专业技能|技能清单|技能特长|证书|奖项|自我评价|个人优势|Education|Skills|Experience|Certificates|Awards)/i;
const jdBodyHeadingPattern =
  /(岗位职责|工作职责|职位描述|工作内容|职责描述|任职要求|岗位要求|职位要求|任职资格|加分项|你需要做什么|我们希望你|Responsibilities|Requirements|Qualifications)/i;
const projectTitlePattern =
  /(项目|系统|平台|应用|模板|工牌|游戏|小程序|App|Website|Dashboard|CRM|SaaS|管理端|商城|官网|工具|组件库|中台|后台|前台|客户端|服务端|插件|SDK|Portal|Console)/i;
const projectTitleWithDatePattern =
  /(?:19|20)\d{2}[./年-]\s*\d{1,2}?(?:\s*[-至~—–]\s*(?:(?:19|20)\d{2}[./年-]\s*)?\d{1,2}|至今|Now|Present)?\s+.*(?:前端|后端|全栈|客户端|服务端|开发|工程师|负责人|成员)/i;
const skillSectionPattern = /(专业技能|技能清单|技能特长|Skills)/i;
const techKeywords =
  /(JavaScript|TypeScript|React|Vue|Next\.?js|Node\.?js|Express|Nest|Java|Python|Go|MySQL|PostgreSQL|Redis|MongoDB|Docker|Kubernetes|Tailwind|Ant Design|Element|Webpack|Vite|Git|Linux|HTML|CSS|Sass|Less|UniApp|微信小程序|Prisma|Supabase)/i;
const projectLabels = [
  "项目名称",
  "项目",
  "项目背景",
  "业务背景",
  "需求背景",
  "背景",
  "项目描述",
  "项目简介",
  "项目介绍",
  "项目概述",
  "工作概述",
  "技术栈",
  "使用技术",
  "技术选型",
  "开发环境",
  "相关技术",
  "技术架构",
  "个人贡献",
  "项目职责",
  "主要职责",
  "负责内容",
  "工作内容",
  "本人职责",
  "核心工作",
  "职责描述",
  "我的工作",
  "主要工作",
  "项目成果",
  "业务成果",
  "成果",
  "结果",
  "项目亮点",
  "收益",
  "效果",
  "上线效果",
  "业务影响",
  "角色",
  "担任角色",
  "我的角色",
  "Role",
  "Tech Stack",
  "Impact",
];

function cleanLine(line: string) {
  return line
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\uF000-\uF8FF]/g, "")
    .replace(/^[\s\-—–*]+/, "")
    .replace(/[◆●■□▪▫◦·•★☆]/g, "")
    .replace(/[|｜]{2,}/g, "|")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([，。；：！？、,.!?;:])/g, "$1")
    .replace(/([（(])\s+/g, "$1")
    .replace(/\s+([）)])/g, "$1")
    .trim();
}

export function normalizeImportedText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/([\u4e00-\u9fa5])[ \t]+([\u4e00-\u9fa5])/g, "$1$2")
    .replace(/(项目经历|项目经验|项目实践|项目实战|项目作品|代表项目|核心项目|主要项目|Project Experience|Projects)[：:]?/gi, "\n$1\n")
    .replace(
      /([^\n])((?:项目名称|项目背景|业务背景|需求背景|项目描述|项目简介|项目介绍|技术栈|使用技术|技术选型|开发环境|相关技术|个人贡献|项目职责|负责内容|工作内容|主要职责|项目成果|业务成果|角色|担任角色)[：:])/g,
      "$1\n$2",
    )
    .split("\n")
    .map(cleanLine)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getLines(text: string) {
  return normalizeImportedText(text).split("\n").filter(Boolean);
}

function matchFirst(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern)?.[1]?.trim();
    if (match) return match.replace(/[，,。；;|]+$/, "");
  }

  return "";
}

function stripLocationFromRole(role: string) {
  return role
    .replace(/(?:工作地点|办公地点|地点|城市|Base|Location)[：:\s]*[^\n\r，,。；;|]{2,30}/gi, "")
    .replace(/[｜|]\s*(?:北京|上海|广州|深圳|杭州|成都|南京|武汉|西安|苏州|重庆|天津|厦门|长沙|郑州).*$/, "")
    .replace(/[-—–]\s*(?:北京|上海|广州|深圳|杭州|成都|南京|武汉|西安|苏州|重庆|天津|厦门|长沙|郑州).*$/, "")
    .replace(cityPattern, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferName(lines: string[]) {
  const labelled = matchFirst(lines.join("\n"), [
    /(?:姓名|Name)[：:\s]+([^\n\r，,。；;|]{2,30})/i,
    /我是\s*([一-龥]{2,4})/,
  ]);
  if (labelled) return labelled;

  const topLines = lines.slice(0, 10);
  const ignored = /(个人简历|简历|Resume|Curriculum|Vitae|求职意向|应聘|邮箱|电话|手机|地址|现居|教育|工作|项目|技能|经验|@|\d{6,})/i;

  for (const line of topLines) {
    if (ignored.test(line)) continue;
    const candidates = line
      .split(/[|｜·•,，;；/]/)
      .map((item) => item.trim())
      .filter(Boolean);

    for (const candidate of candidates) {
      if (/^[一-龥]{2,4}$/.test(candidate)) return candidate;
      if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}$/.test(candidate)) return candidate;
    }
  }

  return "";
}

function inferSummary(lines: string[], name: string, phone: string) {
  const joined = lines.join("\n");
  const labelled = matchFirst(joined, [/(?:个人优势|个人简介|自我评价|Summary)[：:\s]+([^\n\r]{10,260})/i]);
  if (labelled) return labelled;

  return (
    lines
      .filter((line) => line !== name && !line.includes("@") && !line.includes(phone))
      .find((line) => line.length >= 24 && line.length <= 180 && !resumeSectionPattern.test(line)) || ""
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isProjectHeadingLine(line: string) {
  return line.length <= 40 && projectHeadingPattern.test(line);
}

function isResumeSectionLine(line: string) {
  return line.length <= 42 && resumeSectionPattern.test(line);
}

function isSkillSectionLine(line: string) {
  return line.length <= 42 && skillSectionPattern.test(line);
}

function getLabelValue(line: string, labels: string[]) {
  const label = labels.map(escapeRegExp).join("|");
  const match = line.match(new RegExp(`^(?:${label})[：:\\s]+(.+)$`, "i"));
  return match?.[1]?.trim() ?? "";
}

function isProjectLabelLine(line: string) {
  return Boolean(getLabelValue(line, projectLabels)) || new RegExp(`^(?:${projectLabels.map(escapeRegExp).join("|")})[：:]?$`, "i").test(line);
}

function isSkillLikeLine(line: string) {
  if (/^(熟悉|熟练|掌握|了解|精通|具备|能够|擅长)/.test(line)) return true;
  if (/^(前端|后端|数据库|开发工具|编程语言|语言|框架|工程化|工具|其他)[：:]/.test(line)) return true;

  const techHits = line.match(new RegExp(techKeywords.source, "gi"))?.length ?? 0;
  const delimiterHits = line.match(/[、,，/|｜;]/g)?.length ?? 0;
  return techHits >= 3 && delimiterHits >= 2 && !projectTitlePattern.test(line);
}

function hasProjectDetailsNearby(lines: string[]) {
  return /(技术栈|使用技术|开发环境|项目背景|业务背景|项目描述|项目简介|个人贡献|项目职责|负责|主要职责|工作内容|项目成果|业务成果|成果|结果)/.test(
    lines.join("\n"),
  );
}

function stripProjectTitle(line: string) {
  const labelledTitle = getLabelValue(line, ["项目名称", "项目"]);
  return (labelledTitle || line)
    .replace(/^[\d一二三四五六七八九十]+[、.．]\s*/, "")
    .replace(/^(?:项目名称|项目)[：:\s]+/, "")
    .replace(/\s+(?:19|20)\d{2}[./年-]\s*\d{1,2}?(?:\s*[-至~—–]\s*(?:(?:19|20)\d{2}[./年-]\s*)?\d{1,2}|至今|Now|Present)?.*$/, "")
    .replace(/[|｜]\s*(?:\d{4}[./年-].*|20\d{2}.*)$/, "")
    .replace(/(?:项目周期|项目时间|时间|日期)[：:].*$/, "")
    .replace(/\s*[（(](?:前端|后端|全栈|客户端|服务端)?(?:开发|负责人|成员|组长|工程师)[）)]$/, "")
    .trim();
}

function extractRoleFromTitle(line: string) {
  return line.match(/(?:19|20)\d{2}[./年-]\s*\d{1,2}?(?:\s*[-至~—–]\s*(?:(?:19|20)\d{2}[./年-]\s*)?\d{1,2}|至今|Now|Present)?\s+(.+)$/i)?.[1]?.trim() ?? "";
}

function isLikelyProjectTitle(line: string, nextLines: string[], requireStrongSignal: boolean) {
  const explicitTitle = Boolean(getLabelValue(line, ["项目名称", "项目"]));
  if (!line || line.length > 100 || isSkillLikeLine(line)) return false;
  if (explicitTitle) return true;
  if (isProjectLabelLine(line)) return false;
  if (/(负责|参与|实现|设计|封装|搭建|接入|推进|优化|提升|降低|使用|成果|贡献|背景|任职|教育|电话|邮箱|@)/.test(line)) return false;
  if (/^[、，。；;:：]/.test(line) || /[，。；;:：、]$/.test(line)) return false;
  if (/[，。；;:：、]/.test(line) && !projectTitleWithDatePattern.test(line)) return false;

  const hasProjectNoun = projectTitlePattern.test(line);
  const hasDetails = hasProjectDetailsNearby(nextLines);
  const hasDateAndRole = projectTitleWithDatePattern.test(line);
  const conciseTitle = line.length <= 64 || hasDateAndRole;

  if (requireStrongSignal) return conciseTitle && (hasProjectNoun || hasDateAndRole) && hasDetails;
  return conciseTitle && (hasProjectNoun || hasDateAndRole);
}

function splitProjectBlocks(lines: string[]) {
  const startIndex = lines.findIndex((line) => projectHeadingPattern.test(line));
  const hasProjectSection = startIndex >= 0;
  const sectionStart = hasProjectSection ? startIndex + 1 : 0;
  const sectionEnd = hasProjectSection
    ? lines.findIndex((line, index) => index > sectionStart && isResumeSectionLine(line) && !isProjectHeadingLine(line))
    : -1;
  const projectLines = lines.slice(sectionStart, sectionEnd >= 0 ? sectionEnd : undefined);
  const blocks: string[][] = [];
  let current: string[] = [];
  let insideSkippedSection = false;

  for (let index = 0; index < projectLines.length; index += 1) {
    const line = projectLines[index];
    if (isProjectHeadingLine(line)) continue;

    if (!hasProjectSection && isResumeSectionLine(line)) {
      insideSkippedSection = isSkillSectionLine(line) || !/(工作经历|实习经历|Experience)/i.test(line);
      if (current.length) {
        blocks.push(current);
        current = [];
      }
      continue;
    }

    if (insideSkippedSection) continue;

    const nextLines = projectLines.slice(index + 1, index + 8);
    const looksLikeProjectTitle = isLikelyProjectTitle(line, nextLines, !hasProjectSection);

    if (looksLikeProjectTitle && current.length) {
      blocks.push(current);
      current = [line];
    } else if (looksLikeProjectTitle || current.length) {
      current.push(line);
    }
  }

  if (current.length) blocks.push(current);
  return blocks.slice(0, 6);
}

function extractAfterLabel(block: string[], labels: string[]) {
  for (let index = 0; index < block.length; index += 1) {
    const line = block[index];
    const firstValue = getLabelValue(line, labels);
    const isBareLabel = new RegExp(`^(?:${labels.map(escapeRegExp).join("|")})[：:]?$`, "i").test(line);
    if (!firstValue && !isBareLabel) continue;

    const valueLines = firstValue ? [firstValue] : [];
    for (let nextIndex = index + 1; nextIndex < block.length; nextIndex += 1) {
      const nextLine = block[nextIndex];
      const followingLines = block.slice(nextIndex + 1, nextIndex + 6);
      if (isProjectLabelLine(nextLine)) break;
      if (isResumeSectionLine(nextLine)) break;
      if (isLikelyProjectTitle(nextLine, followingLines, false)) break;
      valueLines.push(nextLine);
    }

    return valueLines.join("\n").trim();
  }

  return "";
}

function parseProjects(lines: string[]): ProjectDraft[] {
  return splitProjectBlocks(lines)
    .map((block) => {
      const [titleLine = "", ...rest] = block;
      const title = stripProjectTitle(titleLine);
      const stack = extractAfterLabel(block, ["技术栈", "使用技术", "技术选型", "开发环境", "相关技术", "技术架构", "Tech Stack"]);
      const role = extractAfterLabel(block, ["角色", "担任角色", "我的角色", "Role"]) || extractRoleFromTitle(titleLine);
      const challenge =
        extractAfterLabel(block, ["项目背景", "业务背景", "需求背景", "背景", "项目描述", "项目简介", "项目介绍", "项目概述", "工作概述", "难点"]) ||
        rest.find((line) => /(背景|目标|问题|难点|需求)/.test(line)) ||
        "";
      const actions =
        extractAfterLabel(block, ["个人贡献", "项目职责", "主要职责", "负责内容", "工作内容", "本人职责", "核心工作", "职责描述", "我的工作", "主要工作"]) ||
        rest.filter((line) => /(负责|参与|实现|设计|优化|封装|接入|搭建|推进)/.test(line)).join("\n");
      const impact = extractAfterLabel(block, [
        "项目成果",
        "业务成果",
        "成果",
        "结果",
        "项目亮点",
        "收益",
        "效果",
        "上线效果",
        "业务影响",
        "Impact",
      ]);

      return {
        id: crypto.randomUUID(),
        title,
        role,
        stack,
        challenge,
        actions,
        impact,
        talkingPoints: "",
      };
    })
    .filter((project) => {
      if (!project.title || isSkillLikeLine(project.title)) return false;
      if (project.stack || project.challenge || project.actions || project.impact) return true;
      return projectTitlePattern.test(project.title);
    });
}

function extractJdBody(lines: string[]) {
  const start = lines.findIndex((line) => jdBodyHeadingPattern.test(line));
  const bodyLines = start >= 0 ? lines.slice(start) : lines;
  const filtered = bodyLines.filter((line) => {
    if (/^(薪资|待遇|福利|投递|联系人|联系方式|地址|工作地点|办公地点|发布时间|来源)[：:]/.test(line)) return false;
    if (/^\W{1,4}$/.test(line)) return false;
    return true;
  });

  return filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function parseResumeFallback(text: string): ResumeParseResult {
  const normalized = normalizeImportedText(text);
  const lines = getLines(normalized);
  const email = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone =
    normalized.match(/(?:\+?86[-\s]?)?1[3-9]\d{9}/)?.[0] ??
    normalized.match(/(?:电话|手机|Phone|Tel)[：:\s]+([+\d][\d\s-]{6,20})/i)?.[1]?.trim() ??
    "";
  const name = inferName(lines);
  const location =
    matchFirst(normalized, [/(?:城市|所在地|现居|Location)[：:\s]+([^\n\r，,。；;|]{2,30})/i]) ||
    (normalized.match(cityPattern)?.[0] ?? "");
  const headline = stripLocationFromRole(
    matchFirst(normalized, [/(?:求职意向|目标岗位|应聘岗位|职业定位|岗位)[：:\s]+([^\n\r]{2,60})/i]) ||
      lines.find((line) => /(前端|后端|全栈|算法|数据|产品|设计|工程师|开发|React|Next\.js|Node)/i.test(line)) ||
      "",
  );
  const summary = inferSummary(lines, name, phone);

  return {
    name,
    headline,
    location,
    email,
    phone,
    summary,
    resumeText: normalized,
    projects: parseProjects(lines),
  };
}

export function parseJdFallback(text: string): JdParseResult {
  const normalized = normalizeImportedText(text);
  const lines = getLines(normalized);
  const company = matchFirst(normalized, [
    /公司(?:名称)?[：:\s]+([^\n\r，,。；;|]{2,50})/,
    /企业(?:名称)?[：:\s]+([^\n\r，,。；;|]{2,50})/,
    /Company[：:\s]+([^\n\r,;|]{2,60})/i,
  ]);
  const role = stripLocationFromRole(
    matchFirst(normalized, [
      /(?:岗位名称|职位名称|招聘岗位|应聘岗位|职位|岗位|Role|Position)[：:\s]+([^\n\r，,。；;|]{2,80})/i,
    ]) ||
      lines.find((line) => /(前端|后端|全栈|算法|数据|产品|设计|工程师|开发|React|Next\.js|Node|实习)/i.test(line)) ||
      "",
  );

  return {
    company,
    role,
    rawText: extractJdBody(lines) || normalized,
    companyMissing: !company,
  };
}
