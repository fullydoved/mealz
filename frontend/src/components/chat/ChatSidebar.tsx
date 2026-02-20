import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  createChatSession,
  fetchChatMessages,
  streamChatMessage,
} from "../../api";
import type { ChatMessage as ChatMessageType } from "../../types";
import Button from "../ui/Button";
import ChatMessageBubble from "./ChatMessage";
import ChatInput from "./ChatInput";

interface Props {
  contextType?: string;
  weekPlanId?: number | null;
  recipeId?: number | null;
}

export default function ChatSidebar({
  contextType = "general",
  weekPlanId,
  recipeId,
}: Props) {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["chatMessages", sessionId],
    queryFn: () => fetchChatMessages(sessionId!),
    enabled: !!sessionId,
    refetchInterval: isStreaming ? false : undefined,
  });

  const startSession = useMutation({
    mutationFn: () =>
      createChatSession({
        context_type: contextType,
        week_plan_id: weekPlanId ?? undefined,
        recipe_id: recipeId ?? undefined,
      }),
    onSuccess: (session) => setSessionId(session.id),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, toolStatus, pendingUserMessage]);

  const handleSend = async (content: string) => {
    if (!sessionId) return;
    setPendingUserMessage(content);
    setIsStreaming(true);
    setStreamingContent("");
    setToolStatus(null);

    try {
      let accumulated = "";
      for await (const event of streamChatMessage(sessionId, content)) {
        switch (event.type) {
          case "text":
            accumulated += event.content;
            setStreamingContent(accumulated);
            break;
          case "tool_start":
            setToolStatus(event.label);
            break;
          case "tool_done":
            setToolStatus(null);
            if (event.tool === "create_recipe" || event.tool === "update_recipe") {
              queryClient.invalidateQueries({ queryKey: ["recipes"] });
              queryClient.invalidateQueries({ queryKey: ["recipe"] });
            } else if (event.tool === "add_to_plan") {
              queryClient.invalidateQueries({ queryKey: ["weekPlan"] });
            }
            break;
          case "tool_error":
            setToolStatus(null);
            break;
          case "done":
            break;
        }
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      setToolStatus(null);
      setPendingUserMessage(null);
      queryClient.invalidateQueries({ queryKey: ["chatMessages", sessionId] });
    }
  };

  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-stone-400 mb-4">
          Chat with your AI sous chef for meal ideas, recipe help, and cooking tips.
        </p>
        <Button onClick={() => startSession.mutate()}>
          Start Conversation
        </Button>
      </div>
    );
  }

  const quickActions = [
    "Suggest meals for this week",
    "What's a quick weeknight dinner?",
    "Help me use up leftovers",
  ];

  const showTypingIndicator = isStreaming && !streamingContent && !toolStatus;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
        {messages.length === 0 && !streamingContent && !pendingUserMessage && (
          <div className="space-y-2">
            <p className="text-sm text-stone-500 mb-3">Quick suggestions:</p>
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => handleSend(action)}
                disabled={isStreaming}
                className="block w-full text-left text-sm px-3 py-2 rounded-lg border border-stone-700 text-stone-300 hover:bg-amber-900/30 hover:border-amber-600 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}
        {pendingUserMessage && (
          <ChatMessageBubble
            message={
              {
                id: -2,
                session_id: sessionId,
                role: "user",
                content: pendingUserMessage,
                created_at: new Date().toISOString(),
              } as ChatMessageType
            }
          />
        )}
        {showTypingIndicator && (
          <div className="flex justify-start">
            <div className="bg-stone-800 rounded-lg px-4 py-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        {streamingContent && (
          <ChatMessageBubble
            message={
              {
                id: -1,
                session_id: sessionId,
                role: "assistant",
                content: streamingContent,
                created_at: new Date().toISOString(),
              } as ChatMessageType
            }
          />
        )}
        {toolStatus && (
          <div className="flex items-center gap-2 text-sm text-amber-400 px-3 py-2">
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {toolStatus}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
