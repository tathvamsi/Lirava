// Shared between the vakil runtime (server) and the UI (client).

// A Vakil is shown as a round "puffball" character: a soft body, stubby arms, big shiny eyes, blush, and chunky feet.
export const SHAPES = ["round", "chubby", "tall"] as const;
export const MATERIALS = ["soft", "glossy", "velvet", "toon"] as const;
export const EYES = ["classic", "happy", "wide", "wink"] as const;
export const ACCESSORIES = ["none", "bow", "cap", "antenna", "halo", "sprout", "headphones"] as const;
export type Shape = (typeof SHAPES)[number];
export type Material = (typeof MATERIALS)[number];
export type Eyes = (typeof EYES)[number];
export type Accessory = (typeof ACCESSORIES)[number];

export type Look = {
  shape: Shape;
  color: string; // body
  accent: string; // feet (and accessory trim)
  eyeColor: string;
  material: Material;
  eyes: Eyes;
  accessory: Accessory;
};

export type VakilStatus = "idle" | "working" | "waiting" | "paused";

export type Vakil = {
  id: string;
  name: string;
  purpose: string;
  instructions: string;
  look: Look;
  status: VakilStatus;
  activity: string | null; // e.g. "Searching the web"
  localAccess: boolean; // may this vakil run things on the user's own computer?
  model: string | null; // null = use the default model
  createdAt: number;
};

/** Agent is the preferred name; Vakil remains an alias while existing events migrate. */
export type Agent = Vakil;

export type MessageRole = "user" | "vakil" | "activity" | "card" | "system";

export type CardKind = "approval" | "question" | "connect";
export type CardStatus = "pending" | "approved" | "denied" | "answered" | "expired";

export type CardData = {
  kind: CardKind;
  status: CardStatus;
  title: string;
  detail?: string;
  tool?: string;
  options?: string[];
  answer?: string;
  ruleAction?: string; // natural-language action used if the user picks "Always allow"
  toolkit?: string; // connect cards: Composio toolkit slug
  url?: string; // connect cards: OAuth link
};

/** A file attached to a message (uploaded by the user or shared by a vakil). */
/** How well a document was read for search: ready, or why it is not searchable. */
export type DocumentIndex = { status: "ready" | "no_text" | "unsupported" | "failed"; pages: number; chunks: number; unit: "page" | "section"; note?: string };
export type Attachment = { id: string; name: string; mime: string; size: number; index?: DocumentIndex };

/** A source an answer drew on: a passage of the user's own document (with its page), or a statute provision. */
export type Citation =
  | { kind: "document"; label: string; fileId: string; name: string; page: number; unit: "page" | "section"; excerpt: string }
  | { kind: "statute"; label: string; title: string; act?: string; section?: string; source?: string };

export type ArtifactKind = "legal_paper" | "text" | "markdown" | "pdf" | "docx" | "contract" | "plan";

export type DocumentArtifact = {
  id: string;
  conversationId: string | null;
  vakilId: string;
  title: string;
  filename: string;
  kind: ArtifactKind;
  content: string;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
  fileId?: string | null;
  pdfFileId?: string | null;
  docxFileId?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type Message = {
  id: string;
  vakilId: string;
  role: MessageRole;
  text: string;
  title?: string | null;
  card?: CardData | null;
  from?: string | null; // "routine:<name>" | "vakil:<name>" | null
  attachments?: Attachment[] | null;
  citations?: Citation[] | null;
  artifactId?: string | null;
  channelId?: string | null; // set for messages in a group channel (vakilId is the author, or the lead for user posts)
  conversationId?: string | null;
  createdAt: number;
};

/** One chat thread with a vakil (like a ChatGPT conversation). Memory, skills and rules are shared across them. */
export type Conversation = { id: string; vakilId: string; matterId?: string | null; title: string; pinned?: boolean; archived?: boolean; createdAt: number; updatedAt: number };
export type MatterStage = "received" | "reviewing" | "drafting" | "review" | "closed";
export type MatterIntake = {
  brief: string;
  caseType: string;
  oppositeParty: string;
  keyDates: Array<{ label: string; date: string }>;
  outcome: string;
  urgency: "routine" | "soon" | "urgent";
  deadline: string;
};
export type CaseNodeKind = "section" | "party" | "fact" | "event" | "issue" | "law" | "argument" | "evidence" | "question" | "note";
export type CaseNodeStatus = "proposed" | "confirmed" | "disputed";
export type CaseNodeRelation = "supports" | "contradicts" | "cites";
/** One item of a matter's case knowledge tree. Sections are the top level; everything else hangs under one. */
export type CaseNode = {
  id: string;
  matterId: string;
  parentId: string | null;
  kind: CaseNodeKind;
  title: string;
  body: string;
  date: string | null;
  sources: Array<{ documentId?: string; name?: string; page?: number; quote?: string }>;
  links: Array<{ to: string; relation: CaseNodeRelation }>;
  status: CaseNodeStatus;
  origin: "lawyer" | "document";
  position: number;
  createdAt: number;
  updatedAt: number;
};
export type CaseNodeInput = Partial<Pick<CaseNode, "parentId" | "kind" | "title" | "body" | "date" | "status" | "links" | "sources">>;

export type Matter = { id: string; userId: string; title: string; client: string; court: string; status: "Active" | "On hold" | "Closed" | "Archived"; nextDate: string | null; notes: string; stage?: MatterStage; intake?: MatterIntake | null; handedOverAt?: number | null; createdAt: number; updatedAt: number };
/** One entry on a matter's timeline. Checkpoints wait for the person's approval. */
export type MatterEvent = {
  id: string;
  matterId: string;
  type: "stage" | "note" | "checkpoint" | "deliverable";
  stage: MatterStage | null;
  title: string;
  body: string;
  conversationId: string | null;
  artifactId: string | null;
  status: "open" | "approved" | "changes" | null;
  resolutionNote: string | null;
  createdAt: number;
  resolvedAt: number | null;
};

/** A group chat: the user talks to several vakils; the lead coordinates and delegates to members. */
export type Channel = { id: string; name: string; leadId: string; memberIds: string[]; createdAt: number };

export type RuleDecision = "allow" | "ask" | "never";
export type Rule = { id: string; vakilId: string | null; action: string; decision: RuleDecision; createdAt: number };
export type Memory = { id: string; vakilId: string; text: string; createdAt: number };
export type Skill = { id: string; vakilId: string; name: string; description: string; body: string; createdAt: number };
export type TriggerField = { name: string; type: string; title: string; description: string; required: boolean; enum?: string[]; default?: unknown };
export type AppTrigger = {
  id: string;
  vakilId: string;
  composioId: string;
  slug: string; // e.g. GMAIL_NEW_GMAIL_MESSAGE
  toolkit: string; // e.g. gmail
  name: string; // e.g. "New Gmail message"
  config: Record<string, unknown>;
  instruction: string;
  enabled: boolean;
  createdAt: number;
  lastFiredAt: number | null;
  lastError: string | null;
};

export type Routine = {
  id: string;
  vakilId: string;
  name: string;
  instruction: string;
  schedule: string; // cron expression
  enabled: boolean;
  lastRunAt: number | null;
  nextRunAt: number | null;
  createdAt: number;
};
export type PasswordEntry = { id: string; site: string; username: string; createdAt: number }; // secret never leaves the server

export type RunPhase = "queued" | "running";

/** Languages a document can be written in. The codes are the API's. */
export type DocumentLanguage = "en" | "hi" | "kn" | "ta" | "te" | "mr";

/** Per-user settings kept in PostgreSQL: when each Vakil was last read, the document preview width, and the document language. */
export type Preferences = { lastRead?: Record<string, number>; artifactBoardWidth?: number; documentLanguage?: DocumentLanguage };

/**
 * What the citation checker found for one citation in an answer. Mirrors the API's CiteVerdict
 * (lirava-api/src/services/library/types.ts). "verified" means the citation matches a record in the library; it does not mean
 * the case supports the point it is cited for.
 */
export type CiteStatus = "verified" | "partial" | "unverified";
export type CiteReason = "ok" | "not_in_library" | "not_covered" | "equivalence_mismatch" | "ambiguous" | "title_mismatch" | "quote_not_found" | "para_out_of_range" | "no_text";
export type CiteVerdict = {
  raw: string;
  span: [number, number];
  kind: "reporter" | "neutral" | "statute" | "para";
  status: CiteStatus;
  reason: CiteReason;
  level?: "citation" | "quote";
  library_title?: string;
  library_citation?: string;
  source_url?: string | null;
  warning?: string;
  /** Official translations of the judgment (language codes other than English). */
  translations?: string[];
};
export type CitationCheck = { messageId: string; verdicts: CiteVerdict[]; counts: Record<CiteStatus, number> };

export type Snapshot = {
  /** Chats with an answer being written (or waiting for a free slot) right now. */
  running?: Record<string, RunPhase>;
  preferences?: Preferences;
  vakils: Vakil[];
  messages: Message[];
  artifacts: DocumentArtifact[];
  routines: Routine[];
  triggers: AppTrigger[];
  rules: Rule[];
  memories: Memory[];
  skills: Skill[];
  passwords: PasswordEntry[];
  computer: ComputerInfo;
  apps: ToolkitState[];
  channels: Channel[];
  conversations: Conversation[];
};

/** A Composio app the user can connect (Gmail, Slack…). */
export type ToolkitState = { slug: string; name: string; logo?: string; connected: boolean; accountId?: string };

export type ComputerInfo = {
  mode: "cloud" | "docker" | "local"; // where vakils' computers run by default
  docker: boolean;
  image: string;
  model: string; // default model for vakils without their own choice
  models: string[]; // models the API key can use
  computerTool: string;
  hasKey: boolean;
  keySource: "env" | "settings" | null;
  cloudKey: "env" | "settings" | null; // E2B key for cloud computers
  openRouter: "env" | "settings" | null; // OpenRouter key for open models
  nvidia: "env" | "settings" | null; // NVIDIA key for NIM models
  groq: "env" | "settings" | null; // Groq key for fast inference models
  antigravity: "env" | "settings" | null; // Gemini key for Antigravity models
  triggersKey: "env" | "settings" | null; // Composio API key for triggers
  sky: boolean; // OpenAI's Sky computer-use runtime is installed on this Mac
  composio: boolean; // COMPOSIO_API_KEY is set
};

export type ServerEvent =
  | { type: "snapshot"; data: Snapshot }
  | { type: "vakil"; data: Vakil }
  | { type: "vakil_deleted"; id: string }
  | { type: "message"; data: Message }
  | { type: "message_delta"; id: string; vakilId: string; delta: string }
  | { type: "run_status"; conversationId: string; data: { status: "idle" | RunPhase } }
  | { type: "artifact"; data: DocumentArtifact }
  | { type: "artifact_deleted"; id: string }
  | { type: "routine"; data: Routine }
  | { type: "routine_deleted"; id: string }
  | { type: "trigger"; data: AppTrigger }
  | { type: "trigger_deleted"; id: string }
  | { type: "rule"; data: Rule }
  | { type: "rule_deleted"; id: string }
  | { type: "memory"; data: Memory }
  | { type: "memory_deleted"; id: string }
  | { type: "skill"; data: Skill }
  | { type: "skill_deleted"; id: string }
  | { type: "password"; data: PasswordEntry }
  | { type: "password_deleted"; id: string }
  | { type: "screen"; vakilId: string; at: number }
  | { type: "browser_url"; vakilId: string; url: string }
  | { type: "notify"; vakilId: string; title: string; body: string }
  | { type: "computer"; data: ComputerInfo }
  | { type: "composio"; data: ToolkitState[] }
  | { type: "channel"; data: Channel }
  | { type: "channel_deleted"; id: string }
  | { type: "conversation"; data: Conversation }
  | { type: "conversation_deleted"; id: string }
  | { type: "citation_check"; data: CitationCheck };
