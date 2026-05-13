import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    heroDescription: "Modern web delivery · clean architecture · UX that feels intentional.",
    primaryAction: "View projects",
    secondaryAction: "Contact me",
    aboutTitle: "About Me",
    aboutDescription:
      "Engineer with a product lens—shipping systems that stay readable as they grow.",
    skillsTitle: "Core Skills",
    projectsTitle: "Selected Projects",
    projectsDescription: "Role, stack, and outcomes—toggle detail when you want depth.",
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
    workspaceLabel: "Vault",
    workspaceHint: "Pick a board—scene shifts stay smooth, and you control how much text shows at once.",
    workspaceTabs: {
      intro: "Overview",
      work: "Build",
      path: "Journey",
      lab: "AI Lab",
      reach: "Connect"
    },
    skillsTapHint: "Tap a skill chip to expand its note.",
    vaultDockHelp: "Quick jump between boards",
    peekNotes: "Expand all notes",
    peekNotesClose: "Collapse notes",
    scrollProgressLabel: "Page scroll progress",
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
    heroDescription: "Web hiện đại · kiến trúc rõ · UX có chủ đích.",
    primaryAction: "Xem dự án",
    secondaryAction: "Liên hệ",
    aboutTitle: "Về tôi",
    aboutDescription: "Làm theo kiểu sản phẩm—ưu tiên hệ thống đọc được và mở rộng dễ.",
    skillsTitle: "Kỹ năng cốt lõi",
    projectsTitle: "Dự án tiêu biểu",
    projectsDescription: "Vai trò, stack, impact—bật chi tiết khi cần đào sâu.",
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
    workspaceLabel: "Vault",
    workspaceHint: "Chọn từng \"bảng\" để xem nội dung—chuyển cảnh mượt, không phải đọc tường chữ một lúc.",
    workspaceTabs: {
      intro: "Tổng quan",
      work: "Build",
      path: "Hành trình",
      lab: "AI Lab",
      reach: "Kết nối"
    },
    skillsTapHint: "Chạm chip kỹ năng để mở ghi chú ngắn.",
    vaultDockHelp: "Chuyển nhanh giữa các bảng",
    peekNotes: "Mở hết ghi chú",
    peekNotesClose: "Thu gọn ghi chú",
    scrollProgressLabel: "Tiến độ cuộn trang",
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

const VAULT_TAB_ORDER = ["intro", "work", "path", "lab", "reach"];
const VAULT_TAB_ICONS = {
  intro: "◈",
  work: "◆",
  path: "↗",
  lab: "✦",
  reach: "◇"
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
  const [workspaceTab, setWorkspaceTab] = useState("intro");
  const [expandedSkill, setExpandedSkill] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [notesPeeked, setNotesPeeked] = useState(false);
  const siteRef = useRef(null);
  const cursorMoveRaf = useRef(0);
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

  const selectVaultTab = useCallback((tab) => {
    setNotesPeeked(false);
    setWorkspaceTab(tab);
  }, []);

  useEffect(() => {
    setExpandedSkill(null);
  }, [language]);

  useEffect(() => {
    function syncVaultFromHash() {
      const key = window.location.hash.replace(/^#/, "").trim().toLowerCase();
      if (!key) {
        return;
      }

      const map = {
        workspace: { tab: "intro", scrollId: "workspace" },
        about: { tab: "intro", scrollId: "about" },
        skills: { tab: "work", scrollId: "skills" },
        projects: { tab: "work", scrollId: "projects" },
        contact: { tab: "reach", scrollId: "contact" }
      };

      const target = map[key];
      if (!target) {
        return;
      }

      selectVaultTab(target.tab);
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document.getElementById(target.scrollId)?.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start"
          });
        });
      });
    }

    syncVaultFromHash();
    window.addEventListener("hashchange", syncVaultFromHash);
    return () => window.removeEventListener("hashchange", syncVaultFromHash);
  }, [selectVaultTab]);

  useEffect(() => {
    const scrollRoot = document.getElementById("root");
    if (!scrollRoot) {
      return undefined;
    }

    function onRootScroll() {
      const max = scrollRoot.scrollHeight - scrollRoot.clientHeight;
      const p = max > 0 ? scrollRoot.scrollTop / max : 0;
      setScrollProgress(Math.min(1, Math.max(0, p)));
      setShowBackToTop(scrollRoot.scrollTop > 420);
    }

    onRootScroll();
    scrollRoot.addEventListener("scroll", onRootScroll, { passive: true });
    return () => scrollRoot.removeEventListener("scroll", onRootScroll);
  }, []);

  useEffect(() => {
    const el = siteRef.current;
    if (theme === "light") {
      if (el) {
        el.style.setProperty("--mx", "50%");
        el.style.setProperty("--my", "42%");
      }
      return undefined;
    }

    function onPointerMove(event) {
      const root = siteRef.current;
      if (!root) {
        return;
      }
      if (cursorMoveRaf.current) {
        cancelAnimationFrame(cursorMoveRaf.current);
      }
      cursorMoveRaf.current = requestAnimationFrame(() => {
        cursorMoveRaf.current = 0;
        const x = (event.clientX / Math.max(window.innerWidth, 1)) * 100;
        const y = (event.clientY / Math.max(window.innerHeight, 1)) * 100;
        root.style.setProperty("--mx", `${x}%`);
        root.style.setProperty("--my", `${y}%`);
      });
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (cursorMoveRaf.current) {
        cancelAnimationFrame(cursorMoveRaf.current);
      }
    };
  }, [theme]);

  useEffect(() => {
    const deck = siteRef.current?.querySelector(".vault-slide-deck");
    if (!deck) {
      return undefined;
    }

    deck.querySelectorAll(".vault-note").forEach((el) => {
      if (notesPeeked) {
        el.setAttribute("open", "");
      } else {
        el.removeAttribute("open");
      }
    });

    return undefined;
  }, [notesPeeked, workspaceTab]);

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

  const focusWorkspace = (tab) => {
    selectVaultTab(tab);
    window.requestAnimationFrame(() => {
      document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <main ref={siteRef} className="site">
      <div
        className="scroll-progress"
        style={{ transform: `scaleX(${scrollProgress})` }}
        role="progressbar"
        aria-valuenow={Math.round(scrollProgress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={content.scrollProgressLabel}
      />
      <div className="galaxy-layer" aria-hidden="true" />
      <div className="shard-layer" aria-hidden="true" />
      <div className="cursor-glow" aria-hidden="true" />
      <div className="glitch-grid" aria-hidden="true" />
      <header className="topbar">
        <div className="container topbar__content">
          <Link
            to="/"
            className="brand"
            aria-label="Go to homepage"
            onClick={() => {
              selectVaultTab("intro");
              setExpandedSkill(null);
            }}
          >
            <img src="/logo-mark.svg" alt="HienNT logo" className="brand__logo" />
            <span>{content.brand}</span>
          </Link>
          <div className="topbar__actions">
            <nav className="nav">
              <a
                href="#workspace"
                onClick={(event) => {
                  event.preventDefault();
                  focusWorkspace("intro");
                }}
              >
                {content.nav.about}
              </a>
              <a
                href="#workspace"
                onClick={(event) => {
                  event.preventDefault();
                  focusWorkspace("work");
                }}
              >
                {content.nav.skills}
              </a>
              <a
                href="#workspace"
                onClick={(event) => {
                  event.preventDefault();
                  focusWorkspace("work");
                }}
              >
                {content.nav.projects}
              </a>
              <a
                href="#workspace"
                onClick={(event) => {
                  event.preventDefault();
                  focusWorkspace("reach");
                }}
              >
                {content.nav.contact}
              </a>
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
          <button type="button" className="button button--primary" onClick={() => focusWorkspace("work")}>
            {content.primaryAction}
          </button>
          <button type="button" className="button button--ghost" onClick={() => focusWorkspace("reach")}>
            {content.secondaryAction}
          </button>
        </div>
      </section>

      <section id="workspace" className="vault-wrap">
        <div className="container vault-head">
          <p className="vault-eyebrow">{content.workspaceLabel}</p>
          <p className="vault-hint">{content.workspaceHint}</p>
          <div className="vault-tabs" role="tablist" aria-label={content.workspaceLabel}>
            {VAULT_TAB_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={workspaceTab === id}
                className={workspaceTab === id ? "vault-tab is-active" : "vault-tab"}
                onClick={() => selectVaultTab(id)}
              >
                {content.workspaceTabs[id]}
              </button>
            ))}
          </div>
          <div className="vault-dock" role="toolbar" aria-label={content.vaultDockHelp}>
            {VAULT_TAB_ORDER.map((id) => (
              <button
                key={`dock-${id}`}
                type="button"
                className={workspaceTab === id ? "vault-dock__btn is-active" : "vault-dock__btn"}
                onClick={() => selectVaultTab(id)}
                aria-label={content.workspaceTabs[id]}
                title={content.workspaceTabs[id]}
              >
                <span className="vault-dock__glyph" aria-hidden="true">
                  {VAULT_TAB_ICONS[id]}
                </span>
              </button>
            ))}
            <button
              type="button"
              className={`vault-dock__peek ${notesPeeked ? "is-active" : ""}`}
              onClick={() => setNotesPeeked((open) => !open)}
              aria-pressed={notesPeeked}
            >
              {notesPeeked ? content.peekNotesClose : content.peekNotes}
            </button>
          </div>
        </div>

        <div className="vault-canvas container vault-canvas--deck">
          <div className="vault-slide-deck">
            <div
              className={workspaceTab === "intro" ? "vault-slide is-active" : "vault-slide"}
              aria-hidden={workspaceTab !== "intro"}
            >
              <div className="vault-panel">
              <section id="about" className="vault-section">
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

              <details className="vault-note">
                <summary>{localizedCareerObjectives.title}</summary>
                <p>{localizedCareerObjectives.summary}</p>
                <ul className="bullet-list">
                  {localizedCareerObjectives.goals.map((goal) => (
                    <li key={goal}>{goal}</li>
                  ))}
                </ul>
              </details>
            </div>
            </div>

            <div
              className={workspaceTab === "work" ? "vault-slide is-active" : "vault-slide"}
              aria-hidden={workspaceTab !== "work"}
            >
              <div className="vault-panel">
              <section id="skills" className="vault-section">
                <h2 style={skillsTitleColor ? { color: skillsTitleColor } : undefined}>{content.skillsTitle}</h2>
                <div className="skill-chips" role="list">
                  {displayedSkills.map((skill) => {
                    const isOpen = expandedSkill === skill.name;
                    return (
                      <button
                        key={skill.name}
                        type="button"
                        role="listitem"
                        className={isOpen ? "skill-chip is-active" : "skill-chip"}
                        aria-expanded={isOpen}
                        onClick={() => setExpandedSkill(isOpen ? null : skill.name)}
                      >
                        <span className="skill-chip__name">{skill.name}</span>
                        {isOpen ? <span className="skill-chip__desc">{skill.description}</span> : null}
                      </button>
                    );
                  })}
                </div>
                <p className="skill-chips-hint">{content.skillsTapHint}</p>
              </section>

              <section id="projects" className="vault-section">
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
            </div>
            </div>

            <div
              className={workspaceTab === "path" ? "vault-slide is-active" : "vault-slide"}
              aria-hidden={workspaceTab !== "path"}
            >
              <div className="vault-panel">
              <section className="vault-section">
                <h2>{language === "vi" ? "Lộ trình theo vai trò" : "Role roadmaps"}</h2>
                <p className="vault-hint" style={{ marginTop: 0 }}>
                  {language === "vi"
                    ? "Bấm từng ghi chú để bung chi tiết tuần — gọn hơn một lườn thẳng."
                    : "Open each note to unpack weekly milestones without a wall of bullets."}
                </p>
                <div>
                  {localizedLearningTracks.map((track) => (
                    <details key={track.title} className="vault-note">
                      <summary>{track.title}</summary>
                      <ul className="bullet-list">
                        {track.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </section>

              <section className="vault-section">
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

              <section className="vault-section">
                <div className="split-grid">
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
            </div>
            </div>

            <div
              className={workspaceTab === "lab" ? "vault-slide is-active" : "vault-slide"}
              aria-hidden={workspaceTab !== "lab"}
            >
            <div className="vault-panel vault-panel--lab">
              <CareerAdvisorSection language={language} apiClient={apiClient} />
              <UserRoadmapPlannerSection language={language} isSignedIn={isSignedIn} apiClient={apiClient} />
            </div>
            </div>

            <div
              className={workspaceTab === "reach" ? "vault-slide is-active" : "vault-slide"}
              aria-hidden={workspaceTab !== "reach"}
            >
              <div className="vault-panel">
              <section className="vault-section">
                <h2>{content.servicesTitle}</h2>
                <div className="service-pills">
                  {localizedServices.map((service) => (
                    <span key={service} className="service-pill">
                      {service}
                    </span>
                  ))}
                </div>
              </section>

              <section className="vault-section">
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

              <section className="vault-section">
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

              <section className="vault-section">
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
              </section>

              <section id="contact" className="vault-section contact">
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
              </section>
            </div>
            </div>
          </div>
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
          className="back-to-top portfolio-back-to-top"
          aria-label={content.backToTop}
          title={content.backToTop}
          onClick={() => document.getElementById("root")?.scrollTo({ top: 0, behavior: "smooth" })}
        />
      ) : null}
    </main>
  );
}
