import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createApiClient } from "../core/http/apiClient";
import "./BlogPage.css";

function useLanguage() {
  return useMemo(() => {
    try {
      return localStorage.getItem("portfolio-language") === "vi" ? "vi" : "en";
    } catch {
      return "en";
    }
  }, []);
}

function useThemeFromStorage() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem("portfolio-theme");
      document.documentElement.setAttribute("data-theme", saved === "light" ? "light" : "dark");
    } catch {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);
}

function BlogTopbar({ language }) {
  return (
    <header className="blog-topbar">
      <div className="container blog-topbar__inner">
        <Link to="/" className="blog-brand">📝 Blog</Link>
        <Link to="/" className="blog-back">← {language === "vi" ? "Về trang chủ" : "Back to home"}</Link>
      </div>
    </header>
  );
}

export function BlogPage() {
  const language = useLanguage();
  useThemeFromStorage();
  const apiClient = useMemo(() => createApiClient(async () => null), []);
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiClient
      .getPublic("/api/articles")
      .then((result) => {
        if (active) setArticles(Array.isArray(result) ? result : []);
      })
      .catch(() => {
        if (active) setArticles([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiClient]);

  return (
    <main className="blog-page">
      <BlogTopbar language={language} />
      <section className="container blog-hero">
        <h1>{language === "vi" ? "Bài viết kỹ thuật" : "Technical Writing"}</h1>
        <p>{language === "vi" ? "Ghi chép về kỹ thuật, kiến trúc và bài học dự án." : "Notes on engineering, architecture, and project lessons."}</p>
      </section>

      <section className="container blog-list">
        {isLoading ? <p>{language === "vi" ? "Đang tải..." : "Loading..."}</p> : null}
        {!isLoading && articles.length === 0 ? (
          <p>{language === "vi" ? "Chưa có bài viết nào." : "No articles yet."}</p>
        ) : null}
        {articles.map((article) => (
          <article key={article.id ?? article.slug} className="blog-card">
            <h2>
              <Link to={`/blog/${article.slug}`}>{article.title}</Link>
            </h2>
            {article.summary ? <p>{article.summary}</p> : null}
            <Link to={`/blog/${article.slug}`} className="blog-card__more">
              {language === "vi" ? "Đọc tiếp →" : "Read more →"}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

export function BlogPostPage() {
  const language = useLanguage();
  useThemeFromStorage();
  const { slug } = useParams();
  const apiClient = useMemo(() => createApiClient(async () => null), []);
  const [article, setArticle] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    apiClient
      .getPublic(`/api/articles/${slug}`)
      .then((result) => {
        if (!active) return;
        if (result) {
          setArticle(result);
          setStatus("ok");
        } else {
          setStatus("notfound");
        }
      })
      .catch(() => {
        if (active) setStatus("notfound");
      });
    return () => {
      active = false;
    };
  }, [apiClient, slug]);

  return (
    <main className="blog-page">
      <BlogTopbar language={language} />
      <article className="container blog-post">
        {status === "loading" ? <p>{language === "vi" ? "Đang tải..." : "Loading..."}</p> : null}
        {status === "notfound" ? (
          <>
            <h1>{language === "vi" ? "Không tìm thấy bài viết" : "Article not found"}</h1>
            <Link to="/blog" className="button button--ghost">{language === "vi" ? "Tất cả bài viết" : "All articles"}</Link>
          </>
        ) : null}
        {status === "ok" && article ? (
          <>
            <h1>{article.title}</h1>
            {article.summary ? <p className="blog-post__summary">{article.summary}</p> : null}
            <div className="blog-post__content">{article.content}</div>
            <Link to="/blog" className="blog-back">← {language === "vi" ? "Tất cả bài viết" : "All articles"}</Link>
          </>
        ) : null}
      </article>
    </main>
  );
}
