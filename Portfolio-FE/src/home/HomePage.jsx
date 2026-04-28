import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/react";
import { Link, useNavigate } from "react-router-dom";
import { usePublicPortfolioData } from "./usePublicPortfolioData";
import { createApiClient } from "../core/http/apiClient";
import { CareerAdvisorSection } from "./CareerAdvisorSection";
import { UserRoadmapPlannerSection } from "./UserRoadmapPlannerSection";

const contentByLanguage = {
  en: {
    brand: "Portfolio",
    nav: {
      about: "About",
      skills: "Skills",
      projects: "Projects",
      contact: "Contact"
    },
    eyebrow: "Software Engineer",
    heroTitle: "Hello, I am an IT developer focused on reliable and maintainable digital products.",
    heroDescription:
      "I build professional web systems with a clean and structured mindset. I prioritize code quality, clean architecture, and a polished user experience.",
    primaryAction: "View projects",
    secondaryAction: "Contact me",
    aboutTitle: "About Me",
    aboutDescription:
      "I am a software engineer who values discipline, clarity, and long-term maintainability. My goal is to deliver solutions that are practical, scalable, and dependable.",
    skillsTitle: "Core Skills",
    projectsTitle: "Selected Projects",
    projectsDescription: "Curated projects with context, role, stack, and measurable outcomes.",
    projectFilterLabel: "Filter by",
    projectViewLabel: "View",
    projectViewDetailed: "Detailed",
    projectViewCompact: "Compact",
    projectCaseStudyLabel: "Case Study",
    projectMetricsLabel: "Impact",
    projectLinks: {
      demo: "Live demo",
      source: "Source code"
    },
    servicesTitle: "What I Can Build",
    experienceTitle: "Experience",
    certificationsTitle: "Certifications",
    testimonialsTitle: "Testimonials",
    blogTitle: "Technical Writing",
    faqTitle: "FAQ",
    contactTitle: "Let's Work Together",
    contactDescription: "I am open to discussing projects, full-time roles, and long-term collaborations.",
    languageMode: "Language",
    auth: {
      signIn: "Sign in",
      signUp: "Sign up"
    },
    themeDark: "Dark",
    themeLight: "Light",
    contactFormTitle: "Send a quick message",
    contactFormFields: {
      name: "Name",
      email: "Email",
      message: "Message",
      submit: "Send message"
    },
    copyEmail: "Copy email",
    copiedEmail: "Email copied",
    backToTop: "Back to top",
    footerText: "Available for backend, full-stack, and system-focused roles."
  },
  vi: {
    brand: "Portfolio",
    nav: {
      about: "Giới thiệu",
      skills: "Kỹ năng",
      projects: "Dự án",
      contact: "Liên hệ"
    },
    eyebrow: "Kỹ sư phần mềm",
    heroTitle: "Xin chào, tôi là một lập trình viên IT tập trung vào sản phẩm bền vững và đáng tin cậy.",
    heroDescription:
      "Tôi xây dựng hệ thống web chuyên nghiệp với tư duy rõ ràng, có cấu trúc. Tôi ưu tiên chất lượng code, clean architecture và trải nghiệm người dùng chỉn chu.",
    primaryAction: "Xem dự án",
    secondaryAction: "Liên hệ",
    aboutTitle: "Về tôi",
    aboutDescription:
      "Tôi là kỹ sư phần mềm theo đuổi sự kỷ luật, minh bạch và khả năng bảo trì lâu dài. Mục tiêu của tôi là tạo ra giải pháp thực tế, dễ mở rộng và ổn định.",
    skillsTitle: "Kỹ năng cốt lõi",
    projectsTitle: "Dự án tiêu biểu",
    projectsDescription: "Các dự án được chọn lọc, có bối cảnh, vai trò, công nghệ và kết quả cụ thể.",
    projectFilterLabel: "Lọc theo",
    projectViewLabel: "Chế độ xem",
    projectViewDetailed: "Chi tiết",
    projectViewCompact: "Rút gọn",
    projectCaseStudyLabel: "Phân tích dự án",
    projectMetricsLabel: "Kết quả",
    projectLinks: {
      demo: "Bản chạy thử",
      source: "Mã nguồn"
    },
    servicesTitle: "Tôi có thể xây dựng",
    experienceTitle: "Kinh nghiệm",
    certificationsTitle: "Chứng chỉ",
    testimonialsTitle: "Đánh giá",
    blogTitle: "Bài viết kỹ thuật",
    faqTitle: "Câu hỏi thường gặp",
    contactTitle: "Hãy cùng hợp tác",
    contactDescription: "Tôi sẵn sàng trao đổi về dự án, vị trí full-time và cơ hội hợp tác dài hạn.",
    languageMode: "Ngôn ngữ",
    auth: {
      signIn: "Đăng nhập",
      signUp: "Đăng ký"
    },
    themeDark: "Tối",
    themeLight: "Sáng",
    contactFormTitle: "Gửi tin nhắn nhanh",
    contactFormFields: {
      name: "Họ và tên",
      email: "Email",
      message: "Nội dung",
      submit: "Gửi tin nhắn"
    },
    copyEmail: "Sao chép email",
    copiedEmail: "Đã sao chép email",
    backToTop: "Lên đầu trang",
    footerText: "Sẵn sàng cho các vai trò backend, full-stack và các dự án thiên về hệ thống."
  }
};

const skills = {
  en: [
    { name: "Backend Development", description: "Build secure, scalable APIs and business services." },
    { name: "Frontend Engineering", description: "Create responsive UI with maintainable component structure." },
    { name: "System Design", description: "Design reliable architectures and clear service boundaries." },
    { name: "Clean Architecture", description: "Keep domain logic isolated and easy to extend." },
    { name: "SQL / NoSQL", description: "Model, query, and optimize data storage effectively." },
    { name: "DevOps Basics", description: "Use CI/CD and deployment basics for stable releases." }
  ],
  vi: [
    { name: "Phát triển Backend", description: "Xây dựng API bảo mật, mở rộng tốt và đúng nghiệp vụ." },
    { name: "Kỹ thuật Frontend", description: "Tạo giao diện responsive với cấu trúc component rõ ràng." },
    { name: "Thiết kế hệ thống", description: "Thiết kế kiến trúc ổn định và ranh giới dịch vụ mạch lạc." },
    { name: "Kiến trúc sạch", description: "Giữ logic nghiệp vụ tách biệt để dễ mở rộng." },
    { name: "SQL / NoSQL", description: "Mô hình dữ liệu, truy vấn và tối ưu lưu trữ hiệu quả." },
    { name: "Nền tảng DevOps", description: "Áp dụng CI/CD và triển khai cơ bản để release ổn định." }
  ]
};

const highlights = {
  en: [
    {
      title: "Professional Engineering",
      text: "Build systems with clarity, maintainability, and stability across environments."
    },
    {
      title: "Business-Oriented Mindset",
      text: "Connect technology decisions with business goals to deliver measurable value."
    },
    {
      title: "Disciplined Delivery",
      text: "Work with a defined process, clear priorities, and consistent output quality."
    }
  ],
  vi: [
    {
      title: "Tư duy kỹ thuật chuyên nghiệp",
      text: "Xây dựng hệ thống rõ ràng, dễ bảo trì và ổn định trên nhiều môi trường."
    },
    {
      title: "Định hướng theo giá trị kinh doanh",
      text: "Liên kết quyết định kỹ thuật với mục tiêu kinh doanh để tạo ra giá trị thực tế."
    },
    {
      title: "Kỷ luật trong triển khai",
      text: "Làm việc theo quy trình, ưu tiên rõ ràng và duy trì chất lượng đầu ra ổn định."
    }
  ]
};

const featuredProjects = {
  en: [
    {
      id: "p1",
      name: "Portfolio Platform",
      role: "Full-Stack Developer",
      category: "fullstack",
      summary: "A portfolio platform for individuals and teams, optimized for performance and usability.",
      caseStudy:
        "Designed modular APIs and reusable UI blocks to support multiple profile types with clean architecture boundaries.",
      impact: "Reduced page load by 42%, reached 98 Lighthouse performance score.",
      stack: "React, .NET, SQL Server",
      demoUrl: "#",
      sourceUrl: "#"
    },
    {
      id: "p2",
      name: "Internal Management Dashboard",
      role: "Backend Lead",
      category: "backend",
      summary: "Designed APIs and data workflows for an operations dashboard with security and scalability focus.",
      caseStudy:
        "Implemented role-based permissions, async job processing, and optimized relational queries for large data views.",
      impact: "Cut manual report time by 60% and improved API response time by 35%.",
      stack: ".NET, PostgreSQL, Redis",
      demoUrl: "#",
      sourceUrl: "#"
    },
    {
      id: "p3",
      name: "E-Learning Gateway",
      role: "Frontend Engineer",
      category: "frontend",
      summary: "Built responsive learning dashboards and lesson experience optimized for mobile users.",
      caseStudy:
        "Created component-driven UI patterns and accessibility-first navigation for dense educational workflows.",
      impact: "Increased weekly active learners by 24% after redesign rollout.",
      stack: "React, TypeScript, Vite",
      demoUrl: "#",
      sourceUrl: "#"
    }
  ],
  vi: [
    {
      id: "p1",
      name: "Nền tảng Portfolio",
      role: "Lập trình viên Full-Stack",
      category: "fullstack",
      summary: "Nền tảng portfolio cho cá nhân và đội nhóm, tối ưu hiệu năng và trải nghiệm sử dụng.",
      caseStudy:
        "Thiết kế API theo module và các khối UI tái sử dụng để hỗ trợ nhiều kiểu hồ sơ với ranh giới kiến trúc rõ ràng.",
      impact: "Giảm thời gian tải trang 42%, đạt 98 điểm hiệu năng Lighthouse.",
      stack: "React, .NET, SQL Server",
      demoUrl: "#",
      sourceUrl: "#"
    },
    {
      id: "p2",
      name: "Dashboard Quản trị Nội bộ",
      role: "Trưởng nhóm Backend",
      category: "backend",
      summary: "Thiết kế API và luồng dữ liệu cho dashboard vận hành, tập trung vào bảo mật và khả năng mở rộng.",
      caseStudy:
        "Triển khai phân quyền theo vai trò, xử lý tác vụ nền bất đồng bộ và tối ưu truy vấn quan hệ cho dữ liệu lớn.",
      impact: "Giảm 60% thời gian lập báo cáo thủ công và cải thiện 35% tốc độ phản hồi API.",
      stack: ".NET, PostgreSQL, Redis",
      demoUrl: "#",
      sourceUrl: "#"
    },
    {
      id: "p3",
      name: "Cổng Học trực tuyến",
      role: "Kỹ sư Frontend",
      category: "frontend",
      summary: "Xây dựng giao diện học tập responsive và tối ưu trải nghiệm bài học cho người dùng di động.",
      caseStudy:
        "Tạo bộ component có cấu trúc cùng điều hướng ưu tiên khả năng truy cập cho luồng học tập nhiều dữ liệu.",
      impact: "Tăng 24% người học hoạt động hằng tuần sau khi phát hành bản thiết kế mới.",
      stack: "React, TypeScript, Vite",
      demoUrl: "#",
      sourceUrl: "#"
    }
  ]
};

const categoryByLanguage = {
  en: [
    { id: "all", label: "All" },
    { id: "frontend", label: "Frontend" },
    { id: "backend", label: "Backend" },
    { id: "fullstack", label: "Full-Stack" }
  ],
  vi: [
    { id: "all", label: "Tất cả" },
    { id: "frontend", label: "Frontend" },
    { id: "backend", label: "Backend" },
    { id: "fullstack", label: "Full-Stack" }
  ]
};

const servicesByLanguage = {
  en: [
    "API architecture and backend implementation",
    "Admin dashboards and internal tooling",
    "Performance optimization and refactoring",
    "Codebase cleanup with clean architecture"
  ],
  vi: [
    "Thiết kế kiến trúc API và triển khai backend",
    "Dashboard quản trị và công cụ nội bộ",
    "Tối ưu hiệu năng và refactor hệ thống",
    "Làm sạch codebase theo clean architecture"
  ]
};

const experiencesByLanguage = {
  en: [
    {
      period: "2024 - Present",
      role: "Backend / Full-Stack Engineer",
      detail: "Building scalable business applications with .NET, React, and SQL-based systems."
    },
    {
      period: "2022 - 2024",
      role: "Software Developer",
      detail: "Delivered enterprise dashboards, APIs, and maintainable module-based architectures."
    }
  ],
  vi: [
    {
      period: "2024 - Nay",
      role: "Kỹ sư Backend / Full-Stack",
      detail: "Xây dựng ứng dụng doanh nghiệp có khả năng mở rộng với .NET, React và hệ quản trị SQL."
    },
    {
      period: "2022 - 2024",
      role: "Lập trình viên phần mềm",
      detail: "Triển khai dashboard doanh nghiệp, API và kiến trúc module dễ bảo trì."
    }
  ]
};

const certificationsByLanguage = {
  en: [
    "AWS Certified Cloud Practitioner",
    "Microsoft Azure Fundamentals",
    "Scrum Fundamentals Certified"
  ],
  vi: [
    "AWS Certified Cloud Practitioner",
    "Microsoft Azure Fundamentals",
    "Scrum Fundamentals Certified"
  ]
};

const testimonialsByLanguage = {
  en: [
    {
      quote:
        "He consistently turns complex requirements into clean, production-ready systems with solid architecture.",
      author: "Engineering Manager"
    },
    {
      quote: "Strong ownership mindset, excellent communication, and reliable delivery under tight deadlines.",
      author: "Product Lead"
    }
  ],
  vi: [
    {
      quote:
        "Anh ấy luôn biến các yêu cầu phức tạp thành hệ thống rõ ràng, sẵn sàng production với kiến trúc tốt.",
      author: "Quản lý kỹ thuật"
    },
    {
      quote: "Tinh thần ownership cao, giao tiếp tốt và đảm bảo tiến độ kể cả khi deadline gấp.",
      author: "Trưởng nhóm sản phẩm"
    }
  ]
};

const blogsByLanguage = {
  en: [
    "How I design API boundaries in clean architecture",
    "Practical SQL optimization for large business queries",
    "Frontend structure that scales beyond MVP"
  ],
  vi: [
    "Cách tôi thiết kế ranh giới API trong clean architecture",
    "Tối ưu SQL thực tế cho truy vấn nghiệp vụ lớn",
    "Cấu trúc frontend có thể mở rộng sau giai đoạn MVP"
  ]
};

const careerObjectivesByLanguage = {
  en: {
    title: "Career Goals",
    summary:
      "I aim to become a senior product engineer who can lead architecture decisions, mentor teams, and deliver systems that create measurable business impact.",
    goals: [
      "Short-term (6-12 months): strengthen backend architecture and cloud deployment depth.",
      "Mid-term (1-2 years): lead cross-functional projects and own end-to-end delivery quality.",
      "Long-term (3+ years): build high-impact digital products with scalable engineering standards."
    ]
  },
  vi: {
    title: "Mục tiêu nghề nghiệp",
    summary:
      "Tôi hướng tới trở thành kỹ sư sản phẩm cấp cao có khả năng dẫn dắt quyết định kiến trúc, mentor đội ngũ và tạo ra hệ thống mang lại giá trị kinh doanh rõ ràng.",
    goals: [
      "Ngắn hạn (6-12 tháng): nâng sâu năng lực kiến trúc backend và triển khai cloud.",
      "Trung hạn (1-2 năm): dẫn dắt dự án liên phòng ban và chịu trách nhiệm chất lượng end-to-end.",
      "Dài hạn (3+ năm): xây dựng sản phẩm số có tác động lớn cùng chuẩn kỹ thuật bền vững."
    ]
  }
};

const achievementsByLanguage = {
  en: {
    title: "Achievements & Certifications",
    awardsTitle: "Selected Achievements",
    awards: [
      "Improved API response time by 35% in a production dashboard.",
      "Reduced manual reporting workload by 60% through automation.",
      "Maintained stable delivery with clean architecture conventions."
    ]
  },
  vi: {
    title: "Thành tựu & Chứng chỉ",
    awardsTitle: "Thành tựu tiêu biểu",
    awards: [
      "Cải thiện 35% thời gian phản hồi API trong hệ dashboard production.",
      "Giảm 60% khối lượng báo cáo thủ công nhờ tự động hóa.",
      "Duy trì tiến độ phát hành ổn định với chuẩn clean architecture."
    ]
  }
};

const ownershipByLanguage = {
  en: {
    title: "Ownership & IP",
    description:
      "I prioritize legal and ownership clarity in every project. Source code rights, deployment artifacts, and technical documentation are managed with transparent agreements.",
    assets: [
      "Source code repository ownership and access policy",
      "Deployment environments and CI/CD ownership",
      "Technical documentation and architecture decision records"
    ]
  },
  vi: {
    title: "Bản quyền & Quyền sở hữu",
    description:
      "Tôi ưu tiên tính minh bạch về pháp lý và quyền sở hữu trong từng dự án. Mã nguồn, hạ tầng triển khai và tài liệu kỹ thuật được quản lý bằng thỏa thuận rõ ràng.",
    assets: [
      "Quyền sở hữu repository mã nguồn và chính sách truy cập",
      "Quyền quản trị môi trường triển khai và CI/CD",
      "Quyền sở hữu tài liệu kỹ thuật và hồ sơ quyết định kiến trúc"
    ]
  }
};

const philosophyByLanguage = {
  en: {
    title: "Working Philosophy",
    principles: [
      "Clarity first: prefer simple and maintainable solutions.",
      "Ownership mindset: accountable for outcomes, not just tasks.",
      "Continuous improvement: iterate with feedback and metrics."
    ]
  },
  vi: {
    title: "Phương châm làm việc",
    principles: [
      "Ưu tiên sự rõ ràng: chọn giải pháp đơn giản, dễ bảo trì.",
      "Tinh thần ownership: chịu trách nhiệm về kết quả, không chỉ đầu việc.",
      "Cải tiến liên tục: tối ưu theo phản hồi và dữ liệu thực tế."
    ]
  }
};

const faqsByLanguage = {
  en: [
    {
      question: "What roles are you targeting?",
      answer: "I am targeting backend and full-stack software engineer roles focused on product quality."
    },
    {
      question: "Do you work freelance?",
      answer: "Yes. I am open to freelance and contract projects with clear scope and timeline."
    },
    {
      question: "Can you work with existing legacy systems?",
      answer: "Yes. I often refactor and modernize existing codebases without disrupting current operations."
    }
  ],
  vi: [
    {
      question: "Bạn đang hướng đến vị trí nào?",
      answer: "Tôi đang hướng đến các vị trí kỹ sư backend và full-stack tập trung vào chất lượng sản phẩm."
    },
    {
      question: "Bạn có nhận dự án freelance không?",
      answer: "Có. Tôi sẵn sàng nhận dự án freelance hoặc hợp đồng khi phạm vi và timeline rõ ràng."
    },
    {
      question: "Bạn có làm với hệ thống legacy không?",
      answer:
        "Có. Tôi thường refactor và hiện đại hóa codebase hiện có mà không làm gián đoạn hoạt động hiện tại."
    }
  ]
};

const learningTracksByLanguage = {
  en: [
    {
      title: "Backend Journey (16 Weeks)",
      points: [
        "Weeks 1-4: HTTP, REST, C#, SQL basics",
        "Weeks 5-8: Build auth + CRUD API with role-based access",
        "Weeks 9-12: Caching, background jobs, performance profiling",
        "Weeks 13-16: Deploy to cloud + monitoring + portfolio documentation"
      ]
    },
    {
      title: "Frontend Journey (16 Weeks)",
      points: [
        "Weeks 1-4: JavaScript, DOM, responsive CSS",
        "Weeks 5-8: React components, routing, API integration",
        "Weeks 9-12: State patterns, UX polish, accessibility",
        "Weeks 13-16: Testing, optimization, and production deployment"
      ]
    },
    {
      title: "DevOps Journey (16 Weeks)",
      points: [
        "Weeks 1-4: Linux, networking, shell scripting",
        "Weeks 5-8: Docker and container-based workflows",
        "Weeks 9-12: CI/CD pipelines and release strategy",
        "Weeks 13-16: Azure deployment, monitoring, and incident response basics"
      ]
    }
  ],
  vi: [
    {
      title: "Lộ trình Backend (16 tuần)",
      points: [
        "Tuần 1-4: HTTP, REST, C#, SQL nền tảng",
        "Tuần 5-8: Xây API auth + CRUD + phân quyền role",
        "Tuần 9-12: Caching, background jobs, tối ưu hiệu năng",
        "Tuần 13-16: Deploy cloud + monitoring + viết tài liệu portfolio"
      ]
    },
    {
      title: "Lộ trình Frontend (16 tuần)",
      points: [
        "Tuần 1-4: JavaScript, DOM, responsive CSS",
        "Tuần 5-8: React component, routing, tích hợp API",
        "Tuần 9-12: State patterns, hoàn thiện UX, accessibility",
        "Tuần 13-16: Testing, tối ưu và triển khai production"
      ]
    },
    {
      title: "Lộ trình DevOps (16 tuần)",
      points: [
        "Tuần 1-4: Linux, networking, shell scripting",
        "Tuần 5-8: Docker và workflow theo container",
        "Tuần 9-12: CI/CD pipeline và chiến lược release",
        "Tuần 13-16: Deploy Azure, monitoring, xử lý sự cố cơ bản"
      ]
    }
  ]
};

function resolveColor(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized : undefined;
}

export function HomePage() {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { isSignedIn, getToken } = useAuth();
  const { page, contact, articles, skills: apiSkills, projects: apiProjects } = usePublicPortfolioData();
  const apiClient = useMemo(() => createApiClient(getToken), [getToken]);
  const displayEmail = contact?.email || "your-email@example.com";
  const [language, setLanguage] = useState("en");
  const [projectCategory, setProjectCategory] = useState("all");
  const [projectView, setProjectView] = useState("detailed");
  const [theme, setTheme] = useState("dark");
  const [openedFaqIndex, setOpenedFaqIndex] = useState(0);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [typedHeroTitle, setTypedHeroTitle] = useState("");
  const userMenuRef = useRef(null);
  const content = contentByLanguage[language];
  const resolvedHeroTitle = page?.heroTitle || content.heroTitle;
  const typingSpeedMs = Math.min(120, Math.max(10, Number(page?.heroTypingSpeedMs) || 28));
  const heroTitleColor = resolveColor(page?.heroTitleColor);
  const heroDescriptionColor = resolveColor(page?.heroDescriptionColor);
  const aboutTitleColor = resolveColor(page?.aboutTitleColor);
  const aboutDescriptionColor = resolveColor(page?.aboutDescriptionColor);
  const skillsTitleColor = resolveColor(page?.skillsTitleColor);
  const skillsDescriptionColor = resolveColor(page?.skillsDescriptionColor);
  const projectsTitleColor = resolveColor(page?.projectsTitleColor);
  const projectsDescriptionColor = resolveColor(page?.projectsDescriptionColor);
  const contactTitleColor = resolveColor(page?.contactTitleColor);
  const contactDescriptionColor = resolveColor(page?.contactDescriptionColor);
  const localizedSkills = useMemo(() => skills[language], [language]);
  const displayedSkills = useMemo(() => {
    if (Array.isArray(apiSkills) && apiSkills.length > 0) {
      return apiSkills.map((skill) => ({
        name: skill.name,
        description: skill.description
      }));
    }

    return localizedSkills;
  }, [apiSkills, localizedSkills]);
  const localizedHighlights = useMemo(() => highlights[language], [language]);
  const localizedProjects = useMemo(() => {
    if (Array.isArray(apiProjects) && apiProjects.length > 0) {
      return apiProjects.map((project) => ({
        id: project.id,
        name: project.title,
        role: project.role || (language === "vi" ? "Lập trình viên" : "Developer"),
        category: project.category || "fullstack",
        summary: project.summary || "",
        caseStudy: project.caseStudy || "",
        impact: project.impact || "",
        stack: project.stack || "",
        demoUrl: project.demoUrl || "#",
        sourceUrl: project.repositoryUrl || "#"
      }));
    }

    return featuredProjects[language];
  }, [apiProjects, language]);
  const localizedCategories = useMemo(() => categoryByLanguage[language], [language]);
  const localizedServices = useMemo(() => servicesByLanguage[language], [language]);
  const localizedExperiences = useMemo(() => experiencesByLanguage[language], [language]);
  const localizedCertifications = useMemo(() => certificationsByLanguage[language], [language]);
  const localizedTestimonials = useMemo(() => testimonialsByLanguage[language], [language]);
  const localizedBlogs = useMemo(() => blogsByLanguage[language], [language]);
  const localizedCareerObjectives = useMemo(() => careerObjectivesByLanguage[language], [language]);
  const localizedAchievements = useMemo(() => achievementsByLanguage[language], [language]);
  const localizedOwnership = useMemo(() => ownershipByLanguage[language], [language]);
  const localizedPhilosophy = useMemo(() => philosophyByLanguage[language], [language]);
  const localizedFaqs = useMemo(() => faqsByLanguage[language], [language]);
  const localizedLearningTracks = useMemo(() => learningTracksByLanguage[language], [language]);
  const filteredProjects = useMemo(
    () => localizedProjects.filter((project) => projectCategory === "all" || project.category === projectCategory),
    [localizedProjects, projectCategory]
  );

  useEffect(() => {
    const savedLanguage = localStorage.getItem("portfolio-language");
    const savedCategory = localStorage.getItem("portfolio-project-category");
    const savedView = localStorage.getItem("portfolio-project-view");
    const savedTheme = localStorage.getItem("portfolio-theme");

    if (savedLanguage === "en" || savedLanguage === "vi") {
      setLanguage(savedLanguage);
    }
    if (savedCategory) {
      setProjectCategory(savedCategory);
    }
    if (savedView === "compact" || savedView === "detailed") {
      setProjectView(savedView);
    }
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("portfolio-language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("portfolio-project-category", projectCategory);
  }, [projectCategory]);

  useEffect(() => {
    localStorage.setItem("portfolio-project-view", projectView);
  }, [projectView]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("portfolio-theme", theme);
  }, [theme]);

  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > 420);
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!copiedEmail) {
      return undefined;
    }

    const timeoutId = setTimeout(() => setCopiedEmail(false), 2000);
    return () => clearTimeout(timeoutId);
  }, [copiedEmail]);

  useEffect(() => {
    async function trackPageView() {
      try {
        await apiClient.postPublic("/api/analytics/page-view");
      } catch {
        // Ignore analytics errors on public page.
      }
    }

    trackPageView();
  }, [apiClient]);

  useEffect(() => {
    async function trackLogin() {
      if (!isSignedIn) {
        setIsAdminUser(false);
        return;
      }

      const trackerKey = "portfolio-login-tracked";

      try {
        const me = await apiClient.getProtected("/api/auth/me");
        setIsAdminUser(me?.user?.role === "Admin");
        if (sessionStorage.getItem(trackerKey) === "1") {
          return;
        }
        await apiClient.postProtected("/api/analytics/login", {});
        sessionStorage.setItem(trackerKey, "1");
      } catch {
        // Ignore analytics errors for auth flow.
      }
    }

    trackLogin();
  }, [apiClient, isSignedIn]);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return undefined;
    }

    function handleOutsideClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    const fullText = resolvedHeroTitle ?? "";
    if (!fullText) {
      setTypedHeroTitle("");
      return undefined;
    }

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reduceMotion) {
      setTypedHeroTitle(fullText);
      return undefined;
    }

    setTypedHeroTitle("");
    let index = 0;
    const intervalId = window.setInterval(() => {
      index += 1;
      setTypedHeroTitle(fullText.slice(0, index));
      if (index >= fullText.length) {
        window.clearInterval(intervalId);
      }
    }, typingSpeedMs);

    return () => window.clearInterval(intervalId);
  }, [resolvedHeroTitle, typingSpeedMs]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(displayEmail);
      setCopiedEmail(true);
    } catch {
      setCopiedEmail(false);
    }
  };

  return (
    <main className="site">
      <div className="glitch-grid" aria-hidden="true" />
      <header className="topbar">
        <div className="container topbar__content">
          <span className="brand">
            <img src="/logo-mark.svg" alt="HienNT logo" className="brand__logo" />
            <span>{content.brand}</span>
          </span>
          <div className="topbar__actions">
            <nav className="nav">
              <a href="#about">{content.nav.about}</a>
              <a href="#skills">{content.nav.skills}</a>
              <a href="#projects">{content.nav.projects}</a>
              <a href="#contact">{content.nav.contact}</a>
            </nav>
            <div className="auth-actions">
              <button
                type="button"
                className="theme-toggle"
                aria-label="Toggle color theme"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              >
                <span className="theme-toggle__thumb" />
                <span className="theme-toggle__text">{theme === "dark" ? content.themeDark : content.themeLight}</span>
              </button>
              {!isSignedIn ? (
                <>
                  <button
                    type="button"
                    className="button button--ghost button--small auth-button auth-button--signin"
                    onClick={() => navigate("/auth?mode=sign-in")}
                  >
                    {content.auth.signIn}
                  </button>
                  <button
                    type="button"
                    className="button button--primary button--small auth-button auth-button--signup"
                    onClick={() => navigate("/auth?mode=sign-up")}
                  >
                    {content.auth.signUp}
                  </button>
                </>
              ) : null}
              {isSignedIn ? (
                <div className="user-menu" ref={userMenuRef}>
                  <button
                    type="button"
                    className="button button--ghost button--small user-menu__trigger"
                    onClick={() => setIsUserMenuOpen((current) => !current)}
                    aria-haspopup="menu"
                    aria-expanded={isUserMenuOpen}
                  >
                    Profile
                  </button>
                  {isUserMenuOpen ? (
                    <div className="user-menu__dropdown" role="menu">
                      <Link to="/profile" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                        Hồ sơ
                      </Link>
                      {isAdminUser ? (
                        <Link to="/admin" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                          Dashboard
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        className="user-menu__signout"
                        role="menuitem"
                        onClick={async () => {
                          setIsUserMenuOpen(false);
                          await signOut({ redirectUrl: "/" });
                        }}
                      >
                        Đăng xuất
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="lang-switch" aria-label={content.languageMode}>
              <button
                type="button"
                className={language === "en" ? "lang-switch__button is-active" : "lang-switch__button"}
                onClick={() => {
                  setLanguage("en");
                  setOpenedFaqIndex(0);
                }}
              >
                EN
              </button>
              <button
                type="button"
                className={language === "vi" ? "lang-switch__button is-active" : "lang-switch__button"}
                onClick={() => {
                  setLanguage("vi");
                  setOpenedFaqIndex(0);
                }}
              >
                VI
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="hero container">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 className="hero__typing" style={heroTitleColor ? { color: heroTitleColor } : undefined}>
          {typedHeroTitle}
          <span className="hero__cursor" aria-hidden="true" />
        </h1>
        <p className="hero__description" style={heroDescriptionColor ? { color: heroDescriptionColor } : undefined}>
          {page?.heroDescription || content.heroDescription}
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href="#projects">
            {content.primaryAction}
          </a>
          <a className="button button--ghost" href="#contact">
            {content.secondaryAction}
          </a>
        </div>
      </section>

      <section id="about" className="section container">
        <h2 style={aboutTitleColor ? { color: aboutTitleColor } : undefined}>{page?.aboutTitle || content.aboutTitle}</h2>
        <p style={aboutDescriptionColor ? { color: aboutDescriptionColor } : undefined}>{page?.aboutDescription || content.aboutDescription}</p>
        <div className="highlight-grid">
          {localizedHighlights.map((item) => (
            <article key={item.title} className="card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <h2>{localizedCareerObjectives.title}</h2>
          <p>{localizedCareerObjectives.summary}</p>
          <ul className="bullet-list">
            {localizedCareerObjectives.goals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="skills" className="section section--alt">
        <div className="container">
          <h2 style={skillsTitleColor ? { color: skillsTitleColor } : undefined}>{content.skillsTitle}</h2>
          <div className="skill-list">
            {displayedSkills.map((skill) => (
              <article key={skill.name} className="skill-item">
                <h3>{skill.name}</h3>
                <p>{skill.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="projects" className="section container">
        <h2 style={projectsTitleColor ? { color: projectsTitleColor } : undefined}>{content.projectsTitle}</h2>
        <p style={projectsDescriptionColor ? { color: projectsDescriptionColor } : undefined}>{content.projectsDescription}</p>
        <div className="project-filter">
          <span>{content.projectFilterLabel}</span>
          <div className="project-filter__chips">
            {localizedCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={projectCategory === category.id ? "filter-chip is-active" : "filter-chip"}
                onClick={() => setProjectCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>
          <span>{content.projectViewLabel}</span>
          <div className="project-filter__chips">
            <button
              type="button"
              className={projectView === "detailed" ? "filter-chip is-active" : "filter-chip"}
              onClick={() => setProjectView("detailed")}
            >
              {content.projectViewDetailed}
            </button>
            <button
              type="button"
              className={projectView === "compact" ? "filter-chip is-active" : "filter-chip"}
              onClick={() => setProjectView("compact")}
            >
              {content.projectViewCompact}
            </button>
          </div>
        </div>
        <div className="project-list">
          {filteredProjects.map((project) => (
            <article className="card card--project" key={project.id}>
              <p className="project-role">{project.role}</p>
              <h3>{project.name}</h3>
              <p>{project.summary}</p>
              <p className="project-stack">{project.stack}</p>
              {projectView === "detailed" ? (
                <>
                  <h4>{content.projectCaseStudyLabel}</h4>
                  <p>{project.caseStudy}</p>
                  <h4>{content.projectMetricsLabel}</h4>
                  <p>{project.impact}</p>
                </>
              ) : null}
              <div className="card__links">
                <a href={project.demoUrl}>{content.projectLinks.demo}</a>
                <a href={project.sourceUrl}>{content.projectLinks.source}</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <h2>{language === "vi" ? "Lộ trình học theo hướng nghề" : "Role-Based Learning Roadmaps"}</h2>
          <p>
            {language === "vi"
              ? "Các lộ trình này giúp bạn học tập có trọng tâm, xây project đúng mục tiêu tuyển dụng."
              : "These guided journeys help you learn with focus and build projects aligned with hiring needs."}
          </p>
          <div className="highlight-grid">
            {localizedLearningTracks.map((track) => (
              <article key={track.title} className="card">
                <h3>{track.title}</h3>
                <ul className="bullet-list">
                  {track.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CareerAdvisorSection language={language} apiClient={apiClient} />
      <UserRoadmapPlannerSection language={language} isSignedIn={isSignedIn} apiClient={apiClient} />

      <section className="section section--alt">
        <div className="container">
          <h2>{content.servicesTitle}</h2>
          <ul className="bullet-list">
            {localizedServices.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section container">
        <h2>{content.experienceTitle}</h2>
        <div className="timeline">
          {localizedExperiences.map((experience) => (
            <article key={experience.period} className="timeline__item">
              <p className="timeline__period">{experience.period}</p>
              <h3>{experience.role}</h3>
              <p>{experience.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <div className="container split-grid">
          <div>
            <h2>{localizedAchievements.title}</h2>
            <ul className="bullet-list">
              {localizedCertifications.map((cert) => (
                <li key={cert}>{cert}</li>
              ))}
            </ul>
            <h3>{localizedAchievements.awardsTitle}</h3>
            <ul className="bullet-list">
              {localizedAchievements.awards.map((award) => (
                <li key={award}>{award}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2>{content.blogTitle}</h2>
            <ul className="bullet-list">
              {(articles.length > 0 ? articles.map((article) => article.title) : localizedBlogs).map((blog) => (
                <li key={blog}>{blog}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="split-grid">
          <article className="card">
            <h3>{localizedOwnership.title}</h3>
            <p>{localizedOwnership.description}</p>
            <ul className="bullet-list">
              {localizedOwnership.assets.map((asset) => (
                <li key={asset}>{asset}</li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h3>{localizedPhilosophy.title}</h3>
            <ul className="bullet-list">
              {localizedPhilosophy.principles.map((principle) => (
                <li key={principle}>{principle}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="section container">
        <h2>{content.testimonialsTitle}</h2>
        <div className="highlight-grid">
          {localizedTestimonials.map((testimonial) => (
            <article key={testimonial.author} className="card">
              <p>"{testimonial.quote}"</p>
              <p className="testimonial-author">- {testimonial.author}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <h2>{content.faqTitle}</h2>
          <div className="faq-list">
            {localizedFaqs.map((faq, index) => {
              const isOpen = openedFaqIndex === index;
              return (
                <article key={faq.question} className="faq-item">
                  <button
                    type="button"
                    className="faq-item__question"
                    onClick={() => setOpenedFaqIndex(isOpen ? -1 : index)}
                  >
                    {faq.question}
                  </button>
                  {isOpen ? <p className="faq-item__answer">{faq.answer}</p> : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="contact" className="section section--alt">
        <div className="container contact">
          <h2 style={contactTitleColor ? { color: contactTitleColor } : undefined}>{content.contactTitle}</h2>
          <p style={contactDescriptionColor ? { color: contactDescriptionColor } : undefined}>{content.contactDescription}</p>
          <a className="button button--primary" href={`mailto:${displayEmail}`}>
            {displayEmail}
          </a>
          <button type="button" className="button button--ghost" onClick={handleCopyEmail}>
            {copiedEmail ? content.copiedEmail : content.copyEmail}
          </button>
          <div className="social-links">
            <a href={contact?.githubUrl || "#"}>GitHub</a>
            <a href={contact?.linkedInUrl || "#"}>LinkedIn</a>
            <a href="#">Resume</a>
          </div>
          <article className="contact-form">
            <h3>{content.contactFormTitle}</h3>
            <form>
              <label>
                {content.contactFormFields.name}
                <input type="text" placeholder={content.contactFormFields.name} />
              </label>
              <label>
                {content.contactFormFields.email}
                <input type="email" placeholder={content.contactFormFields.email} />
              </label>
              <label>
                {content.contactFormFields.message}
                <textarea rows={4} placeholder={content.contactFormFields.message} />
              </label>
              <button type="button" className="button button--primary">
                {content.contactFormFields.submit}
              </button>
            </form>
          </article>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer__inner">
          <div>
            <p className="footer__brand">Portfolio</p>
            <p>{content.footerText}</p>
          </div>
          <div className="footer__links">
            <a href={contact?.githubUrl || "#"}>GitHub</a>
            <a href={contact?.linkedInUrl || "#"}>LinkedIn</a>
            <a href={`mailto:${displayEmail}`}>Email</a>
          </div>
        </div>
      </footer>

      {showBackToTop ? (
        <button
          type="button"
          className="back-to-top"
          aria-label={content.backToTop}
          title={content.backToTop}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ↑
        </button>
      ) : null}
    </main>
  );
}
