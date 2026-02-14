const SHANGHAI_TIMEZONE = 'Asia/Shanghai';

// 增强版：赛道/板块关键词映射规则
const SECTOR_RULES = [
  { label: '新能源', keywords: ['新能源', '光伏', '电池', '低碳', '环保', '智能汽车', '宁德', '隆基', '比亚迪'] },
  { label: '半导体', keywords: ['半导体', '芯片', '集成电路', '电子', '信息', '卓胜微', '中芯', '韦尔'] },
  { label: '医疗医药', keywords: ['医药', '医疗', '健康', '生物', '药', '创新药', '葛兰', '药明', '恒瑞'] },
  { label: '白酒消费', keywords: ['消费', '白酒', '内需', '食品', '饮料', '酒', '茅台', '五粮液'] },
  { label: '军工高端制造', keywords: ['军工', '高端制造', '航天', '国防', '装备', '航空', '船舶'] },
  { label: '金融地产', keywords: ['银行', '地产', '金融', '证券', '保险', '非银', '信托'] },
  { label: '互联网/AI', keywords: ['互联网', '软件', '人工智能', '计算机', '传媒', '游戏', '云计算', 'AI', '科技'] },
  { label: 'QDII/海外', keywords: ['纳斯达克', '标普', '恒生', '美股', '越南', '海外', 'QDII', '标普500'] },
  { label: '债券/固收', keywords: ['债券', '固收', '双利', '纯债', '添利', '信用债', '可转债'] },
  { label: '红利', keywords: ['红利', '股息', '红利etf', '高股息'] },
  { label: '上证50', keywords: ['上证50', '50etf'] },
  { label: '沪深300', keywords: ['沪深300', 'hs300', '300etf'] },
  { label: '中证500', keywords: ['中证500', 'zz500', '500etf'] },
  { label: '中证1000', keywords: ['中证1000', '1000etf'] },
  { label: '创业板', keywords: ['创业板', '创业板指', '创业50', '创业板etf'] },
  { label: '科创', keywords: ['科创', '科创50', '科创50etf'] },
  { label: '黄金', keywords: ['黄金', '有色', '黄金etf'] }
];

// 基于重仓股的板块识别（增强版）
const HOLDINGS_SECTOR_MAP = {
  // 白酒消费
  '贵州茅台': '白酒消费',
  '五粮液': '白酒消费',
  '泸州老窖': '白酒消费',
  '山西汾酒': '白酒消费',
  '洋河股份': '白酒消费',
  '古井贡酒': '白酒消费',
  '今世缘': '白酒消费',
  '伊利股份': '白酒消费',
  '海天味业': '白酒消费',
  '美的集团': '白酒消费',
  '格力电器': '白酒消费',
  '海尔智家': '白酒消费',
  '中国中免': '白酒消费',
  '牧原股份': '白酒消费',
  
  // 医疗医药
  '药明康德': '医疗医药',
  '药明生物': '医疗医药',
  '恒瑞医药': '医疗医药',
  '迈瑞医疗': '医疗医药',
  '爱尔眼科': '医疗医药',
  '长春高新': '医疗医药',
  '智飞生物': '医疗医药',
  '沃森生物': '医疗医药',
  '康泰生物': '医疗医药',
  '华兰生物': '医疗医药',
  '片仔癀': '医疗医药',
  '云南白药': '医疗医药',
  '同仁堂': '医疗医药',
  
  // 新能源
  '宁德时代': '新能源',
  '隆基绿能': '新能源',
  '比亚迪': '新能源',
  '阳光电源': '新能源',
  '通威股份': '新能源',
  'TCL中环': '新能源',
  '晶澳科技': '新能源',
  '天合光能': '新能源',
  '亿纬锂能': '新能源',
  '恩捷股份': '新能源',
  '璞泰来': '新能源',
  '天赐材料': '新能源',
  '德方纳米': '新能源',
  '容百科技': '新能源',
  '当升科技': '新能源',
  
  // 半导体
  '中芯国际': '半导体',
  '韦尔股份': '半导体',
  '卓胜微': '半导体',
  '北方华创': '半导体',
  '兆易创新': '半导体',
  '澜起科技': '半导体',
  '长电科技': '半导体',
  '通富微电': '半导体',
  '华天科技': '半导体',
  '中微公司': '半导体',
  '拓荆科技': '半导体',
  
  // 军工
  '航发动力': '军工高端制造',
  '中航沈飞': '军工高端制造',
  '中航西飞': '军工高端制造',
  '中航光电': '军工高端制造',
  '中航重机': '军工高端制造',
  '航天电器': '军工高端制造',
  '紫光国微': '军工高端制造',
  '中兵红箭': '军工高端制造',
  
  // 金融
  '招商银行': '金融地产',
  '中国平安': '金融地产',
  '中信证券': '金融地产',
  '东方财富': '金融地产',
  '工商银行': '金融地产',
  '建设银行': '金融地产',
  '中国银行': '金融地产',
  '农业银行': '金融地产',
  '兴业银行': '金融地产',
  '浦发银行': '金融地产',
  '平安银行': '金融地产',
  '宁波银行': '金融地产',
  '华泰证券': '金融地产',
  '国泰君安': '金融地产',
  '广发证券': '金融地产',
  '海通证券': '金融地产',
  
  // 互联网/AI
  '腾讯控股': '互联网/AI',
  '阿里巴巴': '互联网/AI',
  '美团': '互联网/AI',
  '拼多多': '互联网/AI',
  '快手': '互联网/AI',
  '京东集团': '互联网/AI',
  '网易': '互联网/AI',
  '百度': '互联网/AI',
  '三六零': '互联网/AI',
  '科大讯飞': '互联网/AI',
  '金山办公': '互联网/AI',
  '中际旭创': '互联网/AI',
  '新易盛': '互联网/AI',
  
  // 传统能源
  '中国石油': '传统能源',
  '中国石化': '传统能源',
  '中国神华': '传统能源',
  '陕西煤业': '传统能源',
  '兖矿能源': '传统能源',
  '中国海油': '传统能源',
  
  // 有色/黄金
  '紫金矿业': '黄金',
  '山东黄金': '黄金',
  '中金黄金': '黄金',
  '江西铜业': '黄金',
  '云南铜业': '黄金',
  '洛阳钼业': '黄金',
  
  // 钢铁
  '宝钢股份': '钢铁',
  '华菱钢铁': '钢铁',
  '新钢股份': '钢铁',
  
  // 化工
  '万华化学': '化工',
  '华鲁恒升': '化工',
  '龙佰集团': '化工',
  
  // 汽车
  '上汽集团': '汽车',
  '长城汽车': '汽车',
  '吉利汽车': '汽车',
  '长安汽车': '汽车',
  '广汽集团': '汽车',
  '赛力斯': '汽车'
};

const toMinuteOfDay = (hour, minute) => (hour * 60) + minute;

const parseShanghaiTime = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SHANGHAI_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);

  const readPart = (type) => parts.find((item) => item.type === type)?.value || '';
  const weekday = readPart('weekday');
  const hour = Number.parseInt(readPart('hour'), 10);
  const minute = Number.parseInt(readPart('minute'), 10);

  return {
    weekday,
    minuteOfDay: Number.isFinite(hour) && Number.isFinite(minute) ? toMinuteOfDay(hour, minute) : null
  };
};

export const getMarketStatusTag = (now = new Date()) => {
  const { weekday, minuteOfDay } = parseShanghaiTime(now);
  if (!Number.isFinite(minuteOfDay)) {
    return { label: '状态未知', tone: 'neutral' };
  }

  if (weekday === 'Sat' || weekday === 'Sun') {
    return { label: '已休市', tone: 'closed' };
  }

  const preOpen = toMinuteOfDay(9, 30);
  const morningClose = toMinuteOfDay(11, 30);
  const afternoonOpen = toMinuteOfDay(13, 0);
  const dayClose = toMinuteOfDay(15, 0);

  if (minuteOfDay < preOpen) {
    return { label: '待开盘', tone: 'pending' };
  }
  if (minuteOfDay >= preOpen && minuteOfDay < morningClose) {
    return { label: '交易中', tone: 'open' };
  }
  if (minuteOfDay >= morningClose && minuteOfDay < afternoonOpen) {
    return { label: '午间休市', tone: 'break' };
  }
  if (minuteOfDay >= afternoonOpen && minuteOfDay < dayClose) {
    return { label: '交易中', tone: 'open' };
  }

  return { label: '已休市', tone: 'closed' };
};

export const getFundLabel = (fund) => {
  if (!fund) return '其他';
  
  // 1. 优先匹配重仓股（如果已加载重仓股，这是最准的）
  if (fund.holdings && fund.holdings.length > 0) {
    // 统计前三大重仓股的板块分布
    const sectorCount = {};
    const topHoldings = fund.holdings.slice(0, 3); // 只看前三大重仓股
    
    for (const stock of topHoldings) {
      if (stock.name && HOLDINGS_SECTOR_MAP[stock.name]) {
        const sector = HOLDINGS_SECTOR_MAP[stock.name];
        sectorCount[sector] = (sectorCount[sector] || 0) + 1;
      }
    }
    
    // 如果有明确的重仓股板块倾向，返回出现最多的板块
    if (Object.keys(sectorCount).length > 0) {
      const topSector = Object.entries(sectorCount)
        .sort((a, b) => b[1] - a[1])[0][0];
      return topSector;
    }
  }

  // 2. 匹配基金名称
  const name = (fund.name || '').toUpperCase();
  for (const rule of SECTOR_RULES) {
    if (rule.keywords.some(kw => name.includes(kw.toUpperCase()))) {
      return rule.label;
    }
  }

  // 3. 兜底官方分类
  const type = fund.fundType || '';
  if (type.includes('指数')) return '指数型';
  if (type.includes('债券')) return '债券型';
  if (type.includes('货币')) return '货币型';
  
  return '混合/其他'; // 归类剩余项
};

// 保留原有的 resolveFundSectorTag 作为别名，向后兼容
export const resolveFundSectorTag = getFundLabel;
