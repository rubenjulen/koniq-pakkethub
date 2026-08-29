// 中文 (Simplified Chinese). Basis = Engels (en); per sectie vertaald met `...en.section`
// zodat nog-niet-vertaalde diepe strings netjes op Engels terugvallen (geen kapotte UI).
import type { Messages } from "./nl";
import en from "./en";

const zh: Messages = {
  ...en,
  lang: { choose: "语言", current: "中文" },
  common: {
    ...en.common,
    login: "登录", logout: "退出", send_package: "寄送包裹", how_it_works: "如何运作",
    learn_more: "了解更多", back_to_site: "← 返回网站", get_started: "开始使用",
    fb_login: "使用 Facebook 登录", fb_signup: "使用 Facebook 注册", or: "或",
  },
  banner: {
    staging: "🚧 预览 — pakkethub.com 稍后启用。这是网站 + 应用的可用预览。",
  },
  nav: {
    how_it_works: "如何运作", send: "寄送", pricing: "价格", trust: "信任中心", track: "追踪查询",
  },
  footer: {
    ...en.footer,
    tagline: "一个受控走廊，连接寄件人、旅客、枢纽与物流伙伴。",
    services: "服务", svc_send: "寄送包裹", svc_travel: "旅行赚取", svc_pricing: "价格", svc_partner: "成为伙伴",
    trust_h: "信任", trust_center: "信任中心", goods_policy: "货物政策", payments: "支付", privacy: "隐私", entity: "主体",
  },
  home: {
    ...en.home,
    pilot_badge: "试点：荷兰 → 苏里南",
    h2_title: "寄送或捎带包裹 — 选择你的路线",
    h2_sub: "超过 {n} 条可用路线",
    opt_send: "我想寄一个包裹", opt_deliver: "我想捎带一个包裹",
    rs_from: "从", rs_to: "到", rs_depart: "出发日期", rs_return: "返回（可选）", rs_search: "查找路线",
    origin_line: "BugaWuga — 灵感来自把小东西装进育儿袋替别人捎带的袋鼠。",
    install_app: "在你的设备上安装应用",
    modes_title: "每次寄送，合适的方式", modes_sub: "我们不会一刀切。有意识地选择——或让应用来决定。",
    mode1_t: "寄送包裹", mode2_t: "旅行赚取", mode3_t: "枢纽与服务点", mode4_t: "专业货运",
    cta_title: "准备好寄出第一个包裹了吗？", cta_check: "检查并寄送", cta_partner: "成为伙伴",
  },
  dash: {
    ...en.dash,
    hello: "你好", friends_title: "好友即将出行", friends_sub: "你关注的、拥有可见路线的人",
    stat_shipments: "寄送", stat_delivered: "已送达", stat_review: "审核中", stat_corridor: "走廊",
  },
  login: {
    ...en.login,
    title: "登录", welcome: "欢迎回到 BugaWuga。", email: "电子邮件", password: "密码",
    demo_accounts: "演示账号（密码：demo12345）",
    role_sender: "寄件人", role_traveler: "旅客", role_hub: "枢纽 / 运营", role_admin: "平台管理",
    routes_found: "我们找到了很多路线", routes_found_sub: "有空余空间、随时可捎带的旅客。",
    fb_note: "模拟 — 正式上线时接入真正的 Facebook。",
  },
  register: {
    ...en.register,
    title: "创建账号", sub: "选择你的角色，一分钟内免费创建账号。",
    role_label: "我想…", as_sender: "寄送包裹", as_traveler: "旅行赚取",
    first_name: "名字", last_name: "姓氏", phone: "电话", email: "电子邮件", password: "密码",
    create: "创建账号", have_account: "已有账号？",
  },
  gate: {
    ...en.gate,
    badge: "预发布", title: "受邀测试环境", sub: "此环境仅限受邀者。请输入访问密码。",
    error: "密码不正确。", placeholder: "访问密码", submit: "进入",
  },
  send: {
    ...en.send,
    badge: "免费检查", title: "我的包裹可以由旅客捎带吗？",
    calc_corridor: "走廊", calc_weight: "重量（公斤）", calc_content: "内容", add_item: "+ 物品",
    desc_opt: "描述（可选）", value_t: "价值 €", estimate: "预估：", continue: "继续并创建寄送 →",
  },
  mkt2: {
    ...en.mkt2,
    title: "市场", tab_routes: "路线（旅客）", tab_requests: "请求（寄件人）",
    sub_routes: "有空余空间的旅客 — 选择一条路线", sub_requests: "想要寄东西的寄件人",
    filters: "筛选", f_from: "从", f_to: "到", f_verified: "仅已验证",
    f_price_max: "最高价格 €", f_size: "包裹尺寸", f_weight_max: "最大重量（公斤）", f_apply: "应用", f_clear: "清除", any: "全部",
    size_SMALL: "小", size_MEDIUM: "中", size_LARGE: "大", size_XLARGE: "特大",
    willing_pay: "愿付", service_price: "服务价格", capacity: "容量", depart: "出发", deadline: "截止",
    see_profile: "查看资料", react: "查看并出价", none_routes: "暂无可见路线。", none_requests: "暂无可见请求。",
    publish_route: "发布你的路线", publish_request: "让你的请求可见", free: "免费",
  },
  prof: {
    ...en.prof,
    member_since: "注册于", based_in: "所在地",
    rating_carrier: "作为旅客的评分", rating_client: "作为寄件人的评分",
    trips_n: "行程", shipments_n: "寄送",
    tab_carrier: "作为旅客", tab_client: "作为寄件人", tab_badges: "徽章",
    no_ratings: "暂无评价。", no_badges: "暂无徽章。",
    verified: "已验证会员", follow: "关注", following: "已关注", chat: "聊天", back: "← 返回",
    elite: "精英徽章", pro: "专业徽章", standard: "标准徽章", earned: "获得于",
  },
  status: {
    DRAFT: "草稿", SCREENING: "筛查中", QUOTED: "已收到报价", BOOKED: "已预订",
    INTAKE: "枢纽收件", SEALED: "已封装", IN_CUSTODY: "保管中", IN_TRANSIT: "运输中",
    CUSTOMS: "海关", READY: "可取件", DELIVERED: "已送达", RETURNED: "已退回", CLOSED: "已关闭",
  },
  elig: {
    ALLOW: "允许", STEP_UP: "需要验证", REVIEW: "人工审核",
    HOLD: "已冻结", FREIGHT_ONLY: "仅货运", REJECT: "已拒绝",
  },
  kyc: { VERIFIED: "✓ 已验证", PENDING: "验证中", UNVERIFIED: "未验证", REJECTED: "已拒绝" },
  wallet: {
    ...en.wallet,
    title: "钱包与支付", points: "BugaWuga 积分", threshold: "提现门槛",
    to_payout: "距离提现还差 {x}", payout_ready: "✓ 可以提现", coins: "币",
  },
  appnav: {
    ...en.appnav,
    overview: "概览", shipments: "我的寄送", marketplace: "市场", trips: "我的行程", messages: "消息",
    wallet: "钱包与支付", claims: "理赔与退货", shop: "代购请求", account: "账号", members: "成员", ads: "广告",
  },
};

export default zh;
