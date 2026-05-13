import { useMemo, useState } from "react";

const trackContent = {
  en: {
    title: "Career Direction Lab",
    description:
      "Choose a path and get AI-powered recommendations for learning roadmap, portfolio projects, and role preparation.",
    pickTrack: "Choose a direction",
    placeholders: {
      input: "Ask about roadmap, skills, projects, interview prep...",
      button: "Send question"
    },
    quickPrompts: [
      "I want to become a backend developer in 3 months. Where do I start?",
      "Compare frontend vs backend for beginners.",
      "Create a DevOps roadmap for someone who already knows Java."
    ],
    sourceLabel: "RAG sources",
    chatbotTitle: "IT Career AI Advisor",
    loading: "Thinking...",
    errorFallback: "Chatbot is temporarily unavailable. Please try again in a moment."
  },
  vi: {
    title: "Phòng Lab Định Hướng Nghề IT",
    description:
      "Chọn hướng đi và nhận tư vấn bằng AI về lộ trình học, dự án portfolio và cách chuẩn bị ứng tuyển.",
    pickTrack: "Chọn hướng đi",
    placeholders: {
      input: "Hỏi về roadmap, kỹ năng, dự án, chuẩn bị phỏng vấn...",
      button: "Gửi câu hỏi"
    },
    quickPrompts: [
      "Em muốn theo backend trong 3 tháng thì bắt đầu từ đâu?",
      "So sánh frontend và backend cho người mới.",
      "Tạo roadmap DevOps cho người đã biết Java."
    ],
    sourceLabel: "Nguồn tri thức RAG",
    chatbotTitle: "AI tư vấn nghề IT",
    loading: "AI đang phân tích...",
    errorFallback: "Chatbot tạm thời chưa sẵn sàng. Vui lòng thử lại sau."
  }
};

const tracks = {
  en: [
    { id: "backend", title: "Backend Engineer", summary: "APIs, databases, architecture, scalability." },
    { id: "frontend", title: "Frontend Engineer", summary: "UI/UX, React, performance, accessibility." },
    { id: "devops", title: "DevOps Engineer", summary: "Cloud, CI/CD, Docker, observability." },
    { id: "fullstack", title: "Full-Stack Engineer", summary: "End-to-end product delivery." }
  ],
  vi: [
    { id: "backend", title: "Backend Engineer", summary: "API, database, kiến trúc, tối ưu hệ thống." },
    { id: "frontend", title: "Frontend Engineer", summary: "UI/UX, React, hiệu năng, accessibility." },
    { id: "devops", title: "DevOps Engineer", summary: "Cloud, CI/CD, Docker, monitoring." },
    { id: "fullstack", title: "Full-Stack Engineer", summary: "Xây dựng sản phẩm end-to-end." }
  ]
};

export function CareerAdvisorSection({ language, apiClient }) {
  const content = trackContent[language];
  const trackList = tracks[language];
  const [selectedTrack, setSelectedTrack] = useState("backend");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        language === "vi"
          ? "Chào bạn! Chọn hướng đi ở bên trái rồi hỏi mình để nhận roadmap học tập và dự án gợi ý."
          : "Hi! Pick a track on the left and ask me for a tailored roadmap and project suggestions.",
      sources: []
    }
  ]);

  const activeTrack = useMemo(() => trackList.find((item) => item.id === selectedTrack) ?? trackList[0], [selectedTrack, trackList]);

  async function sendQuestion(questionText) {
    const trimmedMessage = questionText.trim();
    if (!trimmedMessage || isLoading) {
      return;
    }

    const newUserMessage = { role: "user", content: trimmedMessage, sources: [] };
    const nextMessages = [...messages, newUserMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const history = nextMessages.slice(-8).map((message) => ({
        role: message.role,
        content: message.content
      }));

      const response = await apiClient.postPublic(
        "/api/career/chat",
        {
          message: trimmedMessage,
          track: selectedTrack,
          history
        },
        { timeoutMs: 180_000 }
      );

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response?.answer ?? content.errorFallback,
          sources: Array.isArray(response?.sources) ? response.sources : []
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error?.message ?? content.errorFallback,
          sources: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    void sendQuestion(input);
  }

  return (
    <section className="section container career-section">
      <div className="career-header">
        <h2>{content.title}</h2>
        <p>{content.description}</p>
      </div>
      <div className="career-layout">
        <aside className="career-tracks">
          <p className="career-tracks__label">{content.pickTrack}</p>
          <div className="career-track-grid">
            {trackList.map((track) => (
              <button
                key={track.id}
                type="button"
                className={track.id === selectedTrack ? "career-track is-active" : "career-track"}
                onClick={() => setSelectedTrack(track.id)}
              >
                <strong>{track.title}</strong>
                <span>{track.summary}</span>
              </button>
            ))}
          </div>
        </aside>

        <article className="career-chatbot">
          <header className="career-chatbot__header">
            <h3>{content.chatbotTitle}</h3>
            <span>{activeTrack.title}</span>
          </header>

          <div className="career-chatbot__messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "chat-message chat-message--user" : "chat-message"}>
                <p>{message.content}</p>
                {message.role === "assistant" && message.sources.length > 0 ? (
                  <small>
                    {content.sourceLabel}: {message.sources.map((source) => source.title).join(", ")}
                  </small>
                ) : null}
              </div>
            ))}
            {isLoading ? <p className="career-chatbot__loading">{content.loading}</p> : null}
          </div>

          <div className="career-chatbot__quick">
            {content.quickPrompts.map((prompt) => (
              <button key={prompt} type="button" className="filter-chip" onClick={() => void sendQuestion(prompt)} disabled={isLoading}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="career-chatbot__form" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={content.placeholders.input}
              maxLength={2000}
              disabled={isLoading}
            />
            <button type="submit" className="button button--primary" disabled={isLoading || !input.trim()}>
              {content.placeholders.button}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
