export type ChatRow = { id: string; role: string; content: string };

export type ChatThreadSummary = {
  id: string;
  title: string;
  createdAt: string;
  archived: boolean;
};

export type ChatPanelState = {
  currentThreadId: string;
  threads: ChatThreadSummary[];
  messages: ChatRow[];
};
