export type ImportKind = "resume" | "jd";

export type ImportResult = {
  text: string;
  source: "text" | "word" | "pdf" | "image";
};

export type ImportProgress = {
  stage: string;
  progress: number;
};

const imageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"]);

function shouldJoinWithoutSpace(previous: string, next: string) {
  return /[\u4e00-\u9fa5]$/.test(previous) && /^[\u4e00-\u9fa5]/.test(next);
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\uF000-\uF8FF]/g, "")
    .replace(/[◆●■□▪▫◦·•★☆]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/([\u4e00-\u9fa5])[ \t]+([\u4e00-\u9fa5])/g, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type PdfTextItem = {
  str: string;
  transform?: number[];
  hasEOL?: boolean;
};

function textFromPdfItems(items: unknown[]) {
  let pageText = "";
  let previousY: number | null = null;
  let previousX: number | null = null;

  for (const rawItem of items) {
    const item = rawItem as Partial<PdfTextItem>;
    if (typeof item.str !== "string") continue;

    const token = item.str.trim();
    if (!token) continue;

    const x = item.transform?.[4] ?? null;
    const y = item.transform?.[5] ?? null;
    const movedToNewLine =
      previousY !== null &&
      y !== null &&
      (Math.abs(previousY - y) > 2 || (previousX !== null && x !== null && x + 8 < previousX));

    if (pageText && (movedToNewLine || pageText.endsWith("\n"))) {
      if (!pageText.endsWith("\n")) pageText += "\n";
    } else if (pageText && !shouldJoinWithoutSpace(pageText, token)) {
      pageText += " ";
    }

    pageText += token;
    if (item.hasEOL) pageText += "\n";

    previousX = x;
    previousY = y;
  }

  return normalizeExtractedText(pageText);
}

export function getSupportedImportAccept(kind: ImportKind) {
  const textTypes = ".txt,.md,text/plain,text/markdown";
  const docs = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,application/pdf";
  const images = "image/png,image/jpeg,image/webp,image/gif,image/bmp";

  return kind === "resume" ? `${textTypes},${docs},${images}` : `${textTypes},.pdf,application/pdf,${images}`;
}

function reportProgress(onProgress: ((progress: ImportProgress) => void) | undefined, stage: string, progress: number) {
  onProgress?.({ stage, progress: Math.max(0, Math.min(100, Math.round(progress))) });
}

async function createSilentTesseractWorkerPath() {
  if (typeof window === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") return null;

  const workerPath = new URL("tesseract.js/dist/worker.min.js", import.meta.url).toString();
  const response = await fetch(workerPath);
  if (!response.ok) return null;

  const workerCode = await response.text();
  const consolePatch = `
const __tesseractWarn = console.warn.bind(console);
const __tesseractError = console.error.bind(console);
const __isTesseractNoise = (...args) => args.map(String).join(" ").includes("Warning: Parameter not found:");
console.warn = (...args) => { if (!__isTesseractNoise(...args)) __tesseractWarn(...args); };
console.error = (...args) => { if (!__isTesseractNoise(...args)) __tesseractError(...args); };
`;

  return URL.createObjectURL(new Blob([consolePatch, workerCode], { type: "application/javascript" }));
}

export async function extractTextFromFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void,
): Promise<ImportResult> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  reportProgress(onProgress, "读取文件", 5);

  if (file.type.startsWith("text/") || ["txt", "md"].includes(extension)) {
    const text = await file.text();
    reportProgress(onProgress, "清洗文本", 90);
    return { text: normalizeExtractedText(text), source: "text" };
  }

  if (
    extension === "docx" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    reportProgress(onProgress, "解析 Word", 25);
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    reportProgress(onProgress, "清洗文本", 90);
    return { text: normalizeExtractedText(result.value), source: "word" };
  }

  if (extension === "pdf" || file.type === "application/pdf") {
    reportProgress(onProgress, "解析 PDF", 15);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    }).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = textFromPdfItems(content.items);
      if (pageText) pages.push(pageText);
      reportProgress(onProgress, `解析 PDF ${pageNumber}/${pdf.numPages}`, 15 + (pageNumber / pdf.numPages) * 70);
    }

    reportProgress(onProgress, "清洗文本", 92);
    return { text: normalizeExtractedText(pages.join("\n\n")), source: "pdf" };
  }

  if (file.type.startsWith("image/") || imageTypes.has(file.type)) {
    const { createWorker, setLogging } = await import("tesseract.js");
    setLogging(false);
    const originalWarn = console.warn;
    const originalError = console.error;
    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    let silentWorkerPath: string | null = null;

    const filterTesseractNoise = (...args: unknown[]) => {
      const message = args.map(String).join(" ");
      return message.includes("Warning:") && message.includes("Parameter not found:");
    };

    console.warn = (...args) => {
      if (filterTesseractNoise(...args)) return;
      originalWarn(...args);
    };
    console.error = (...args) => {
      if (filterTesseractNoise(...args)) return;
      originalError(...args);
    };

    try {
      reportProgress(onProgress, "初始化 OCR", 10);
      silentWorkerPath = await createSilentTesseractWorkerPath();
      worker = await createWorker("chi_sim+eng", 1, {
        ...(silentWorkerPath ? { workerPath: silentWorkerPath, workerBlobURL: false } : {}),
        logger: (message) => {
          if (typeof message.progress === "number") {
            reportProgress(onProgress, message.status || "OCR 识别中", 15 + message.progress * 70);
          }
        },
        errorHandler: () => undefined,
      });
      reportProgress(onProgress, "OCR 识别中", 25);
      const result = await worker.recognize(file);
      reportProgress(onProgress, "清洗文本", 92);
      return { text: normalizeExtractedText(result.data.text), source: "image" };
    } finally {
      if (worker) await worker.terminate();
      if (silentWorkerPath) URL.revokeObjectURL(silentWorkerPath);
      console.warn = originalWarn;
      console.error = originalError;
    }
  }

  throw new Error("暂不支持这个文件类型，请使用 txt、md、docx、pdf 或常见图片格式。");
}

export function guessCompanyFromJd(text: string) {
  const patterns = [
    /公司(?:名称)?[：:\s]+([^\n\r，,。；;]{2,40})/,
    /企业(?:名称)?[：:\s]+([^\n\r，,。；;]{2,40})/,
    /Company[：:\s]+([^\n\r,;]{2,60})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern)?.[1]?.trim();
    if (match) return match;
  }

  return "";
}
