//=============================================================================
// Expand_Stockmarket.js
//=============================================================================
/*
插件名：Expand_Stockmarket
用到的原生内容：扩展了Scene_Map.prototype.start（用alias）、Scene_Map.prototype.update（用alias）、DataManager.makeSaveContents（用alias）、DataManager.extractSaveContents（用alias）、DataManager.createGameObjects（用alias）、DataManager.loadGame（用alias）；注册了PluginManager.registerCommand命令。
冲突提示：若其他插件也修改了Scene_Map的start或update方法，请确保本插件在其之后加载；若其他插件修改DataManager的save/load，请检查兼容性；本插件依赖Time_System插件，确保变量ID匹配。
*/
// 作者: 自定义 (优化版 by Grok)
// 版本: 1.0.24 (优化版，修复价格暴涨问题)
// 描述: RPG Maker MZ 股市系统插件，支持账户管理、股票交易、价格动态更新，与Time_System时间插件绑定。
//       扩展: 新增合约功能，包括杠杆、多空方向、止损、爆仓、资金费率、委托单等。合约独立账户，从变量71开始，使用原股票价格，无休市限制。
//       优化: 修复初始化 esm_lastUpdate 避免 delta 过大；限制 delta 上限为 24（一天）；添加 delta 日志；优化日期差计算。
// 使用条款: 仅限RPG Maker MZ项目使用，可自由修改。
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 股市系统，账户与股票交易 (增强版+合约扩展)
 * @author 自定义
 *
 * @param variables
 * @text 1. 变量设置
 * @type struct<VariablesStruct>
 * @default {"timeSettings":"{\"yearVar\":\"23\",\"monthVar\":\"24\",\"dayVar\":\"25\",\"weekVar\":\"27\",\"periodVar\":\"28\",\"hourVar\":\"26\"}","stockAccountVar":"62","stockHoldingsVar":"63","stockPricesVar":"64","stockAvgBuyPricesVar":"65","tradeLogVar":"66","priceHistoryVar":"67","inputAmountVar":"69","inputCodeVar":"68","contractMarginVar":"71","contractPositionsVar":"72","contractInputLeverageVar":"75","contractInputStopLossVar":"76","contractInputTakeProfitVar":"77","contractOrdersVar":"73","contractHistoryVar":"78","contractLongFundingRateVar":"79","contractShortFundingRateVar":"80","cumulativeDepositVar":"83","contractLongFundingRateMinVar":"84","contractLongFundingRateMaxVar":"85","contractShortFundingRateMinVar":"86","contractShortFundingRateMaxVar":"87","contractFundingUpdateCycleVar":"88"}

 * @param volatility
 * @text 2. 涨跌设置
 * @type struct<VolatilityStruct>
 * @default {"updateCycle":"hour","updateTrigger":"both","crossCycleRule":"sequential","globalUpProb":"50","maxUpAmp":"1","maxDownAmp":"1","historyPeriods":"10","stThreshold":"5"}

 * @param messages
 * @text 3. 文本设置
 * @type struct<MessagesStruct>
 * @default {"closedMessage":"当前时段休市，请在上午或下午再来","insufficientGold":"金币不足！您只有 %1 金币，无法存入 %2。","invalidAmount":"无效金额，请输入正数。","depositSuccess":"存入成功！资金账户余额：%1 金币。","depositExceed":"金币不足，只有 %1，已存入全部。","withdrawInsufficient":"账户余额不足！资金账户只有 %1 金币，无法取出 %2。","withdrawSuccess":"取出成功！玩家金币增加 %1。","withdrawExceed":"余额不足，只有 %1，已取出全部。","buyInsufficient":"账户余额或数量不足！","buySuccess":"购买成功！持有%1：%2股。","sellInsufficient":"持有数量不足！","sellSuccess":"出售成功！账户增加 %1 金币。","noHoldings":"您目前没有持有任何股票。","stockNotFound":"股票代码不存在，查询为空。","invalidStockCode":"无效股票代码！","stPrefix":"ST*","invalidQuantity":"选择正确的数量。","buyFeeInsufficient":"手续费不足！需额外 %1 金币。","buySuccessFee":"手续费：%1 金币。","sellSuccessFee":"（扣手续费 %1）。","feeRateMsg":"当前VIP等级：%1，手续费率：%2 (即%3%)。","marginInsufficient":"保证金不足！","marginTransferSuccess":"转入/转出成功！合约账户余额：%1。","marginTransferFee":"手续费：%1。","openPositionSuccess":"开仓成功！方向：%1，数量：%2。","closePositionSuccess":"平仓成功！盈亏：%1。","stopLossTriggered":"止损触发，已自动平仓：%1。","liquidationTriggered":"爆仓强制平仓：%1，剩余保证金：%2。","fundingFeeDeducted":"扣取资金费率：%1。","invalidLeverage":"杠杆超出范围！使用默认值。","invalidPrice":"价格无效！","orderPlaced":"委托单已挂起：%1。","orderExecuted":"委托单执行：%1。","orderCancelled":"委托单取消：%1。","noPositions":"无持仓合约。","fundingRateMsg":"当前做多费率：%1。\n当前做空费率：%2。","stopLevelsSet":"止盈止损设置成功：止盈%1，止损%2。","noHistory":"无合约历史记录。","closedTradeMessage":"非营业时间，请开市再试！","invalidFundingRange":"费率范围无效，无法一正一负！"}

 * @param business
 * @text 4. 营业设置
 * @type struct<BusinessStruct>
 * @default {"enableBusinessHours":"true","businessPeriods":"[\"2\",\"3\"]","businessWeeks":"[\"1\",\"2\",\"3\",\"4\",\"5\"]"}

 * @param tradeSettings
 * @text 5. 交易设置
 * @type struct<TradeSettingsStruct>
 * @default {"vipVar":"74","feeRateVar":"70","thresholds":"{\"vip1\":\"500000\",\"vip2\":\"2000000\",\"vip3\":\"5000000\",\"vip4\":\"10000000\",\"vip5\":\"20000000\",\"vip6\":\"50000000\",\"vip7\":\"100000000\"}","feeRates":"{\"vip0\":\"0.005\",\"vip1\":\"0.004\",\"vip2\":\"0.003\",\"vip3\":\"0.001\",\"vip4\":\"0.0008\",\"vip5\":\"0.0005\",\"vip6\":\"0.0003\",\"vip7\":\"0.0001\"}"}

 * @param contractSettings
 * @text 6. 合约设置
 * @type struct<ContractSettingsStruct>
 * @default {"initialMargin":"0","defaultLeverage":"5","maxLeverage":"20","liquidationThreshold":"1.0","longFundingRateMin":"-0.0005","longFundingRateMax":"0.0005","shortFundingRateMin":"-0.0005","shortFundingRateMax":"0.0005","fundingRateUpdateCycle":"day","useSaveObject":"true","debugLog":"true"}

 * @param customStocks
 * @text 7. 自定义代码
 * @type struct<StockInfo>[]
 * @default []
 * @desc 添加额外股票。点击+添加新项，初始为空(填写code等)。

 * @param stock1
 * @text 8. 代码001
 * @type struct<StockInfo>
 * @default {"code":"001","name":"正大科技","basePrice":"175","upProb":"0","upAmp":"0","downAmp":"0","periodBias":"none","cycleBias":"none","companyInfo":"核心业务为台式机与局域网设备，年研发投入占比 8%。募集资金 1.5 亿元用于生产线扩建，合作客户含地方国企与重点中学，关联交易主要为高校设备采购。","infoWidth":"25"}
 * @desc 固定代码1配置。

 * @param stock2
 * @text 9. 代码002
 * @type struct<StockInfo>
 * @default {"code":"002","name":"深红实业","basePrice":"155","upProb":"0","upAmp":"0","downAmp":"0","periodBias":"none","cycleBias":"none","companyInfo":"主营耐高压无缝钢管与机械加工设备，国内石油管线配件市占率超 20%。第一大股东为地方国资，曾参与华北油田管线改造，为子公司提供 3000 万元借款担保。","infoWidth":"25"}
 * @desc 固定代码2配置。

 * @param stock3
 * @text 10. 代码003
 * @type struct<StockInfo>
 * @default {"code":"003","name":"东方制药","basePrice":"440","upProb":"0","upAmp":"0","downAmp":"0","periodBias":"none","cycleBias":"none","companyInfo":"深耕呼吸药与中药饮片，“东方感冒片” 居 OTC 前列。建有 GMP 认证车间，募集资金 2 亿元用于新药研发，与 1200 余家医院建立供应关系，高管 22 人年薪合计 82 万元。","infoWidth":"25"}
 * @desc 固定代码3配置。

 * @param stock4
 * @text 11. 代码004
 * @type struct<StockInfo>
 * @default {"code":"004","name":"泰瑞机械","basePrice":"240","upProb":"0","upAmp":"0","downAmp":"0","periodBias":"none","cycleBias":"none","companyInfo":"主营塔吊与混凝土搅拌机。全国设 20 余个售后网点，参与京沪高速建设，募集资金 1.2 亿元用于智能设备改造，前三大客户占营收 35%。","infoWidth":"25"}
 * @desc 固定代码4配置。

 * @param stock5
 * @text 12. 代码005
 * @type struct<StockInfo>
 * @default {"code":"005","name":"绿能光伏","basePrice":"810","upProb":"0","upAmp":"0","downAmp":"0","periodBias":"none","cycleBias":"none","companyInfo":"早期光伏企业，组件转换效率 14%。产品供西部离网电站，获新能源认证，募集资金 8000 万元扩大产能至 150MW，第一大股东为新能源投资基金。","infoWidth":"25"}
 * @desc 固定代码5配置。

 * @param stock6
 * @text 13. 代码006
 * @type struct<StockInfo>
 * @default {"code":"006","name":"德威电子","basePrice":"220","upProb":"0","upAmp":"0","downAmp":"0","periodBias":"none","cycleBias":"none","companyInfo":"专注电阻、电容及半导体封装，月产能 3 亿颗。拥有 30 项专利，客户含家电企业，募集资金 1 亿元用于封装生产线升级，关联交易为电子材料采购。","infoWidth":"25"}
 * @desc 固定代码6配置。

 * @param stock7
 * @text 14. 代码007
 * @type struct<StockInfo>
 * @default {"code":"007","name":"新海高科","basePrice":"1328","upProb":"0","upAmp":"0","downAmp":"0","periodBias":"none","cycleBias":"none","companyInfo":"主营服务器与存储设备。为 10 余家电信公司建机房，募集资金 1.3 亿元用于数据中心建设，研发投入占比 9%，多家国际资本持股。","infoWidth":"25"}
 * @desc 固定代码7配置。

 * @param stock8
 * @text 15. 代码008
 * @type struct<StockInfo>
 * @default {"code":"008","name":"瀚海地产","basePrice":"680","upProb":"0","upAmp":"0","downAmp":"0","periodBias":"none","cycleBias":"none","companyInfo":"开发住宅与商业广场，“瀚海广场” 为县级市核心。土地储备 1200 亩，募集资金 3 亿元用于新项目开发，物业管理服务业主超 2 万户，资产负债率 62%。","infoWidth":"25"}
 * @desc 固定代码8配置。

 * @param stock9
 * @text 16. 代码009
 * @type struct<StockInfo>
 * @default {"code":"009","name":"美邦国际","basePrice":"417","upProb":"0","upAmp":"0","downAmp":"0","periodBias":"none","cycleBias":"none","companyInfo":"主营机械与化工进出口。香港、新加坡设 3 家分支机构，代理进口精密机床，通过外贸公司物流对接，募集资金 8000 万元用于保税仓扩建。","infoWidth":"25"}
 * @desc 固定代码9配置。

 * @param stock10
 * @text 17. 代码010
 * @type struct<StockInfo>
 * @default {"code":"010","name":"长青保险","basePrice":"156","upProb":"0","upAmp":"0","downAmp":"0","periodBias":"none","cycleBias":"none","companyInfo":"专注健康与养老保险。与 80 余家医院合作，服务 50 万客户，理赔时效 3 个工作日。偿付能力充足率 180%，募集资金 2 亿元用于分支机构扩张。","infoWidth":"25"}
 * @desc 固定代码10配置。

 * @command DepositCash
 * @text 存入现金
 * @desc 事件中先用“数值输入处理”存入金额到变量69，然后调用(>可用自动存全部)。

 * @command WithdrawCash
 * @text 取出现金
 * @desc 同上，输入金额到69(>可用自动取全部)。

 * @command BuyStock
 * @text 购买股票
 * @desc 事件中输入代码到68，数量到69，然后调用(无效代码提示)。

 * @command SellStock
 * @text 出售股票
 * @desc 事件中输入代码到68，数量到69(0=全部)，调用部分/全部出售该股票(无效代码提示)。

 * @command ClearAllHoldings
 * @text 一键清仓
 * @desc 全部出售所有持仓股票。

 * @command QueryAllHoldings
 * @text 查询全部持仓
 * @desc 显示所有持仓概览(种类/总盈亏/收益率/列表)。

 * @command QuerySingleHolding
 * @text 查询个股持仓
 * @desc 事件中输入代码到68，显示个股详情(持股/成本/当前/盈亏/日周月涨跌)。

 * @command QueryStockPrice
 * @text 个股查询
 * @desc 事件中输入代码到68，显示价格(不存在提示空)。

 * @command QueryCompanyInfo
 * @text 公司信息
 * @desc 事件中输入代码到68，显示对应代码的公司信息(不存在提示空)。

 * @command QueryHistory
 * @text 历史查询
 * @desc 事件中先输入代码到68，再输入天数到69，显示指定股票最近N交易日价格变化(首末/平均)。

 * @command QueryFeeRate
 * @text 查询手续费率
 * @desc 显示当前VIP等级和手续费率（基于总资产）。
 * @arg outputVar
 * @text 输出变量ID(可选)
 * @type variable
 * @default 0
 * @desc 若>0，将费率(小数，如0.008)存入该变量；否则只显示消息。

 * @command UpdatePrice
 * @text 强制更新股价
 * @desc 忽略时间，更新一次。

 * @command CheckTimeUpdate
 * @text 检查时间更新
 * @desc 手动检查时间变化并更新股价(用于事件中时间变化后，提高兼容性)。

 * @command GlobalMarket
 * @text 全局行情
 * @desc 设置全局buff(牛熊市等)。
 * @arg prob
 * @text 概率加成(%)
 * @type number
 * @default 0
 * @arg upAmp
 * @text 上涨幅度加成(%)
 * @type number
 * @default 0
 * @arg downAmp
 * @text 下跌幅度加成(%)
 * @type number
 * @default 0
 * @arg durationYears
 * @text 持续年
 * @type number
 * @default 0
 * @arg durationMonths
 * @text 持续月
 * @type number
 * @default 0
 * @arg durationDays
 * @text 持续日
 * @type number
 * @default 1

 * @command SingleMarket
 * @text 个股行情
 * @desc 设置个股buff。
 * @arg code
 * @text 股票代码
 * @type string
 * @default 001
 * @arg prob
 * @text 概率加成(%)
 * @type number
 * @default 0
 * @arg upAmp
 * @text 上涨幅度加成(%)
 * @type number
 * @default 0
 * @arg downAmp
 * @text 下跌幅度加成(%)
 * @type number
 * @default 0
 * @arg durationYears
 * @text 持续年
 * @type number
 * @default 0
 * @arg durationMonths
 * @text 持续月
 * @type number
 * @default 0
 * @arg durationDays
 * @text 持续日
 * @type number
 * @default 1

 * @command DepositMargin
 * @text 转入保证金
 * @desc 从股市账户转入保证金到合约账户。输入金额到69。

 * @command WithdrawMargin
 * @text 转出保证金
 * @desc 从合约账户转出保证金到股市账户。输入金额到69。

 * @command OpenLong
 * @text 开多仓
 * @desc 开仓做多。输入代码到68，数量到69，杠杆到75。

 * @command OpenShort
 * @text 开空仓
 * @desc 开仓做空。输入代码到68，数量到69，杠杆到75。

 * @command ClosePosition
 * @text 平仓
 * @desc 平仓合约。输入代码到68，数量到69(0=全部)。

 * @command CloseAllPositions
 * @text 全部平仓
 * @desc 一键平仓所有合约持仓（无参数，直接执行）。

 * @command QueryPositions
 * @text 查询全部合约持仓
 * @desc 显示所有合约持仓概览。

 * @command QuerySinglePosition
 * @text 查询单个合约持仓
 * @desc 输入代码到68，显示详情。

 * @command PlaceOrder
 * @text 挂委托单
 * @desc 挂市价/限价/止盈/止损委托。
 * @arg orderType
 * @text 委托类型
 * @type select
 * @option 市价
 * @value market
 * @option 限价
 * @value limit
 * @option 止盈
 * @value takeProfit
 * @option 止损
 * @value stopLoss
 * @default market
 * @arg direction
 * @text 方向
 * @type select
 * @option 多
 * @value long
 * @option 空
 * @value short
 * @default long
 * @arg code
 * @text 代码
 * @type string
 * @default 001
 * @arg quantity
 * @text 数量
 * @type number
 * @default 1
 * @arg price
 * @text 委托价
 * @type number
 * @default 0
 * @desc 限价/止盈/止损需填，市价填0忽略。

 * @command CancelOrder
 * @text 撤销委托单
 * @desc 撤销指定委托单。
 * @arg orderId
 * @text 委托ID
 * @type number
 * @default 0
 * @desc 从查询中获取ID。

 * @command SetStopLevels
 * @text 设置止盈止损
 * @desc 为现有持仓设置止盈和/或止损价格（自动平仓）。
 * @arg code
 * @text 代码
 * @type string
 * @default 001
 * @arg direction
 * @text 方向
 * @type select
 * @option 多
 * @value long
 * @option 空
 * @value short
 * @default long
 * @arg takeProfitPrice
 * @text 止盈价
 * @type number
 * @default 0
 * @desc 价格达到时自动平仓（>0有效）。
 * @arg stopLossPrice
 * @text 止损价
 * @type number
 * @default 0
 * @desc 价格达到时自动平仓（>0有效）。

 * @command QueryFundingRate
 * @text 查询资金费率
 * @desc 显示当前做多和做空资金费率。
 * @arg outputLongVar
 * @text 输出做多费率变量ID(可选)
 * @type variable
 * @default 0
 * @desc 若>0，将做多费率存入该变量。
 * @arg outputShortVar
 * @text 输出做空费率变量ID(可选)
 * @type variable
 * @default 0
 * @desc 若>0，将做空费率存入该变量。

 * @command SetFundingRate
 * @text 设置资金费率范围
 * @desc 调整做多和做空资金费率上下限，并立即随机新费率。
 * @arg longMin
 * @text 做多费率下限
 * @type number
 * @default -0.0005
 * @desc 新做多费率下限（小数，如-0.0005）。
 * @arg longMax
 * @text 做多费率上限
 * @type number
 * @default 0.0005
 * @desc 新做多费率上限（小数，如0.0005）。
 * @arg shortMin
 * @text 做空费率下限
 * @type number
 * @default -0.0005
 * @desc 新做空费率下限（如-0.0005）。
 * @arg shortMax
 * @text 做空费率上限
 * @type number
 * @default 0.0005
 * @desc 新做空费率上限（小数，如0.0005）。

 * @command QueryContractHistory
 * @text 查询合约历史
 * @desc 查询单个合约的OHLC历史。输入代码到68。
 * @arg numPeriods
 * @text 显示周期数
 * @type number
 * @default 10
 * @desc 显示最近N个周期的历史（默认10）。

 * @help 使用说明：
 * - 需Time_System插件，变量ID匹配。
 * - 止盈止损设置：开仓成功后，使用条件分歧，脚本：let code = $gameVariables.value(68).toString().padStart(3, '0'); esm_manager.esm_positions[code] && esm_manager.esm_positions[code]['long'] && esm_manager.esm_positions[code]['long'].quantity > 0               value(68)为股票代码
 * - 交易/更新仅营业时；ST: 价格<5加"ST*"前缀，>=5恢复。
 * - 代码列表: 固定10支，自定义点击+号添加空项，填写code/name等；"公司信息"为多行文本框，支持详细描述(输入时用Enter换行，游戏显示智能分行)；"信息设置"自定义每行字符数(默认25)。
 * - 存入/取出: 0或负用无效提示；>可用自动存/取全部，并用自定义消息。
 * - 购买/出售/个股查询/历史查询/公司信息: 用事件“数值输入”存代码到var68(3位，如001)，数量/天数到var69，再调用指令。
 * - 查询持仓: QueryAllHoldings(概览)，QuerySingleHolding(个股，输入code)。
 * - 查询费率: QueryFeeRate(显示VIP+费率，可存变量)；手续费率自动存入var70。
 * - 行情: GlobalMarket(全局)/SingleMarket(个股)，加成临时buff，持续年月日(总更新次数≈天数)。
 * - 读档: 自动init，时间回退重算delta；修复save失败导致0。
 * - 事件中时间变化后，用"CheckTimeUpdate"指令手动更新股价(或自动每秒检查)。
 * - 调试: F8查看日志(新增错误日志，delta 调试)。
 * - 新: 个股查询支持短代码(1→001)/存取优化/兼容性提升(独立save try)/读档修复/输入0提示/实时更新/持仓修复/循环时间修复/行情buff/持仓查询优化/VIP+手续费/费率查询/手续费变量/历史交易日优化/公司信息参数&指令(多行输入+智能分行+自定义宽度)。
 * - 合约扩展: 无休市限制，使用原股票价格。输入变量: 数量69、代码68、杠杆75。持仓/委托存变量73(或存档对象)。每小时检查止损/爆仓/费率/委托执行。
 * - 优化: 修复初始化 esm_lastUpdate 避免 delta 过大；限制 delta 上限为 24（一天）；添加 delta 日志；优化日期差计算。
 */

/*~struct~VariablesStruct:
 * @param timeSettings
 * @text 时间变量
 * @type string
 * @default {"yearVar":"23","monthVar":"24","dayVar":"25","weekVar":"27","periodVar":"28","hourVar":"26"}

 * @param stockAccountVar
 * @text 账户余额
 * @type variable
 * @default 62

 * @param stockHoldingsVar
 * @text 持有记录
 * @type variable
 * @default 63

 * @param stockPricesVar
 * @text 价格记录
 * @type variable
 * @default 64

 * @param stockAvgBuyPricesVar
 * @text 平均买价记录
 * @type variable
 * @default 65

 * @param tradeLogVar
 * @text 交易日志
 * @type variable
 * @default 66

 * @param priceHistoryVar
 * @text 价格历史
 * @type variable
 * @default 67

 * @param inputAmountVar
 * @text 输入数量/天数变量
 * @type variable
 * @default 69

 * @param inputCodeVar
 * @text 输入股票代码变量
 * @type variable
 * @default 68

 * @param contractMarginVar
 * @text 合约账户
 * @type variable
 * @default 71

 * @param contractPositionsVar
 * @text 合约持仓记录
 * @type variable
 * @default 72

 * @param contractInputLeverageVar
 * @text 合约输入杠杆
 * @type variable
 * @default 75

 * @param contractInputStopLossVar
 * @text 合约输入止损
 * @type variable
 * @default 76

 * @param contractInputTakeProfitVar
 * @text 合约输入止盈
 * @type variable
 * @default 77

 * @param contractOrdersVar
 * @text 合约委托单
 * @type variable
 * @default 73

 * @param contractHistoryVar
 * @text 合约OHLC历史
 * @type variable
 * @default 78

 * @param contractLongFundingRateVar
 * @text 做多资金费率
 * @type variable
 * @default 79

 * @param contractShortFundingRateVar
 * @text 做空资金费率
 * @type variable
 * @default 80

 * @param cumulativeDepositVar
 * @text 累计存款变量
 * @type variable
 * @default 83

 * @param contractLongFundingRateMinVar
 * @text 做多资金费率下限
 * @type variable
 * @default 84

 * @param contractLongFundingRateMaxVar
 * @text 做多资金费率上限
 * @type variable
 * @default 85

 * @param contractShortFundingRateMinVar
 * @text 做空费率下限
 * @type variable
 * @default 86

 * @param contractShortFundingRateMaxVar
 * @text 做空费率上限
 * @type variable
 * @default 87

 * @param contractFundingUpdateCycleVar
 * @text 资金费率更新周期
 * @type variable
 * @default 88
 */

/*~struct~VolatilityStruct:
 * @param updateCycle
 * @text 更新周期
 * @type select
 * @option 每个时段
 * @value period
 * @option 每天
 * @value day
 * @option 每周
 * @value week
 * @option 每月
 * @value month
 * @option 每个小时
 * @value hour
 * @default hour

 * @param updateTrigger
 * @text 更新触发
 * @type select
 * @option 自动
 * @value auto
 * @option 手动
 * @value manual
 * @option 两者
 * @value both
 * @default both

 * @param crossCycleRule
 * @text 跨周期规则
 * @type select
 * @option 逐个更新
 * @value sequential
 * @option 最终状态
 * @value final
 * @default sequential

 * @param globalUpProb
 * @text 全局涨概率(%)
 * @type number
 * @min 0
 * @max 100
 * @default 50

 * @param maxUpAmp
 * @text 最大涨幅(%)
 * @type number
 * @min 1
 * @max 100
 * @default 1

 * @param maxDownAmp
 * @text 最大跌幅(%)
 * @type number
 * @min 1
 * @max 100
 * @default 1

 * @param historyPeriods
 * @text 历史保留(天)
 * @type number
 * @min 1
 * @max 100
 * @default 10

 * @param stThreshold
 * @text ST阈值(元)
 * @type number
 * @min 1
 * @max 100
 * @default 5
 */

/*~struct~MessagesStruct:
 * @param closedMessage
 * @text 休市提示
 * @type string
 * @default 当前时段休市，请在上午或下午再来

 * @param insufficientGold
 * @text 金币不足
 * @type string
 * @default 金币不足！您只有 %1 金币，无法存入 %2。

 * @param invalidAmount
 * @text 无效金额
 * @type string
 * @default 无效金额，请输入正数。

 * @param depositSuccess
 * @text 存入成功
 * @type string
 * @default 存入成功！资金账户余额：%1 金币。

 * @param depositExceed
 * @text 存入超额(自动全部)
 * @type string
 * @default 金币不足，只有 %1，已存入全部。

 * @param withdrawInsufficient
 * @text 取出不足
 * @type string
 * @default 账户余额不足！资金账户只有 %1 金币，无法取出 %2。

 * @param withdrawSuccess
 * @text 取出成功
 * @type string
 * @default 取出成功！玩家金币增加 %1。

 * @param withdrawExceed
 * @text 取出超额(自动全部)
 * @type string
 * @default 余额不足，只有 %1，已取出全部。

 * @param buyInsufficient
 * @text 购买不足
 * @type string
 * @default 账户余额或数量不足！

 * @param buySuccess
 * @text 购买成功
 * @type string
 * @default 购买成功！持有%1：%2股。

 * @param sellInsufficient
 * @text 出售不足
 * @type string
 * @default 持有数量不足！

 * @param sellSuccess
 * @text 出售成功
 * @type string
 * @default 出售成功！账户增加 %1 金币。

 * @param noHoldings
 * @text 无持仓
 * @type string
 * @default 您目前没有持有任何股票。

 * @param stockNotFound
 * @text 股票不存在
 * @type string
 * @default 股票代码不存在，查询为空。

 * @param invalidStockCode
 * @text 无效代码
 * @type string
 * @default 无效股票代码！

 * @param stPrefix
 * @text ST前缀
 * @type string
 * @default ST*

 * @param invalidQuantity
 * @text 无效数量
 * @type string
 * @default 选择正确的数量。

 * @param buyFeeInsufficient
 * @text 买入手续费不足
 * @type string
 * @default 手续费不足！需额外 %1 金币。

 * @param buySuccessFee
 * @text 买入成功手续费
 * @type string
 * @default 手续费：%1 金币。

 * @param sellSuccessFee
 * @text 卖出成功手续费
 * @type string
 * @default （扣手续费 %1）。

 * @param feeRateMsg
 * @text 手续费率消息
 * @type string
 * @default 当前VIP等级：%1，手续费率：%2 (即%3%)。

 * @param marginInsufficient
 * @text 保证金不足
 * @type string
 * @default 保证金不足！

 * @param marginTransferSuccess
 * @text 转入/转出成功
 * @type string
 * @default 转入/转出成功！合约账户余额：%1。

 * @param marginTransferFee
 * @text 转账手续费
 * @type string
 * @default 手续费：%1。

 * @param openPositionSuccess
 * @text 开仓成功
 * @type string
 * @default 开仓成功！方向：%1，数量：%2。

 * @param closePositionSuccess
 * @text 平仓成功
 * @type string
 * @default 平仓成功！盈亏：%1。

 * @param stopLossTriggered
 * @text 止损触发
 * @type string
 * @default 止损触发，已自动平仓：%1。

 * @param liquidationTriggered
 * @text 爆仓触发
 * @type string
 * @default 爆仓强制平仓：%1，剩余保证金：%2。

 * @param fundingFeeDeducted
 * @text 资金费扣取
 * @type string
 * @default 扣取资金费率：%1。

 * @param invalidLeverage
 * @text 无效杠杆
 * @type string
 * @default 杠杆超出范围！使用默认值。

 * @param invalidPrice
 * @text 无效价格
 * @type string
 * @default 价格无效！

 * @param orderPlaced
 * @text 委托挂起
 * @type string
 * @default 委托单已挂起：%1。

 * @param orderExecuted
 * @text 委托执行
 * @type string
 * @default 委托单执行：%1。

 * @param orderCancelled
 * @text 委托取消
 * @type string
 * @default 委托单取消：%1。

 * @param noPositions
 * @text 无合约持仓
 * @type string
 * @default 无持仓合约。

 * @param fundingRateMsg
 * @text 资金费率消息
 * @type string
 * @default 当前做多费率：%1，做空费率：%2。

 * @param stopLevelsSet
 * @text 止盈止损设置消息
 * @type string
 * @default 止盈止损设置成功：止盈%1，止损%2。

 * @param noHistory
 * @text 无历史
 * @type string
 * @default 无合约历史记录。

 * @param closedTradeMessage
 * @text 非营业交易提示
 * @type string
 * @default 非营业时间，请开市再试！

 * @param invalidFundingRange
 * @text 无效费率范围
 * @type string
 * @default 费率范围无效，无法一正一负！
 */

/*~struct~BusinessStruct:
 * @param enableBusinessHours
 * @text 启用营业限制
 * @type boolean
 * @default true

 * @param businessPeriods
 * @text 营业时段
 * @type select[]
 * @option 凌晨(1)
 * @value 1
 * @option 上午(2)
 * @value 2
 * @option 下午(3)
 * @value 3
 * @option 傍晚(4)
 * @value 4
 * @default ["2","3"]

 * @param businessWeeks
 * @text 营业星期
 * @type select[]
 * @option 周一(1)
 * @value 1
 * @option 周二(2)
 * @value 2
 * @option 周三(3)
 * @value 3
 * @option 周四(4)
 * @value 4
 * @option 周五(5)
 * @value 5
 * @option 周六(6)
 * @value 6
 * @option 周日(7)
 * @value 7
 * @default ["1","2","3","4","5"]
 */

/*~struct~StockInfo:
 * @param code
 * @text 代码
 * @type string
 * @default 001

 * @param name
 * @text 名称
 * @type string
 * @default 股票新增

 * @param companyInfo
 * @text 公司信息
 * @type note
 * @default 
 * @desc 公司描述文本，用于查询显示（多行支持，用Enter换行，游戏自动优化分行）。

 * @param infoWidth
 * @text 信息设置
 * @type number
 * @min 1
 * @max 50
 * @default 25
 * @desc 每行最大字符数（默认25，适合消息框宽度，可自定义）。

 * @param basePrice
 * @text 标准价格
 * @type number
 * @default 100

 * @param upProb
 * @text 额外涨概率(%)
 * @type number
 * @min 0
 * @max 100
 * @default 0

 * @param upAmp
 * @text 上涨幅度(%)
 * @type number
 * @min 0
 * @max 100
 * @default 0

 * @param downAmp
 * @text 下跌幅度(%)
 * @type number
 * @min 0
 * @max 100
 * @default 0

 * @param periodBias
 * @text 时段偏好
 * @type select
 * @option 无
 * @value none
 * @option 晨上涨+20%
 * @value morning_up20
 * @option 晚下跌+15%
 * @value evening_down15
 * @default none

 * @param cycleBias
 * @text 周期偏好
 * @type select
 * @option 无
 * @value none
 * @option 周初涨+20%
 * @value week_start_up20
 * @option 月末跌+15%
 * @value month_end_down15
 * @default none
 */

(function() {
    'use strict';

    // 解析参数
    const parameters = PluginManager.parameters('Expand_Stockmarket');
    function safeJsonParse(str) {
        try { return JSON.parse(str); } catch (e) { console.error('Expand_Stockmarket: JSON parse failed:', e); return {}; }
    }

    const esm_variables = safeJsonParse(parameters['variables']);
    const esm_timeSettings = safeJsonParse(esm_variables.timeSettings || '{}');
    const esm_yearVar = Number(esm_timeSettings.yearVar || 23);
    const esm_monthVar = Number(esm_timeSettings.monthVar || 24);
    const esm_dayVar = Number(esm_timeSettings.dayVar || 25);
    const esm_weekVar = Number(esm_timeSettings.weekVar || 27);
    const esm_periodVar = Number(esm_timeSettings.periodVar || 28);
    const esm_hourVar = Number(esm_timeSettings.hourVar || 26);
    const esm_stockAccountVar = Number(esm_variables.stockAccountVar || 62);
    const esm_stockHoldingsVar = Number(esm_variables.stockHoldingsVar || 63);
    const esm_stockPricesVar = Number(esm_variables.stockPricesVar || 64);
    const esm_stockAvgBuyPricesVar = Number(esm_variables.stockAvgBuyPricesVar || 65);
    const esm_tradeLogVar = Number(esm_variables.tradeLogVar || 66);
    const esm_priceHistoryVar = Number(esm_variables.priceHistoryVar || 67);
    const esm_inputAmountVar = Number(esm_variables.inputAmountVar || 69);
    const esm_inputCodeVar = Number(esm_variables.inputCodeVar || 68);
    const esm_contractMarginVar = Number(esm_variables.contractMarginVar || 71);
    const esm_contractPositionsVar = Number(esm_variables.contractPositionsVar || 72);
    const esm_contractInputLeverageVar = Number(esm_variables.contractInputLeverageVar || 75);
    const esm_contractInputStopLossVar = Number(esm_variables.contractInputStopLossVar || 76);
    const esm_contractInputTakeProfitVar = Number(esm_variables.contractInputTakeProfitVar || 77);
    const esm_contractOrdersVar = Number(esm_variables.contractOrdersVar || 73);
    const esm_contractHistoryVar = Number(esm_variables.contractHistoryVar || 78);
    const esm_contractLongFundingRateVar = Number(esm_variables.contractLongFundingRateVar || 79);
    const esm_contractShortFundingRateVar = Number(esm_variables.contractShortFundingRateVar || 80);
    const esm_cumulativeDepositVar = Number(esm_variables.cumulativeDepositVar || 83);
    const esm_contractLongFundingRateMinVar = Number(esm_variables.contractLongFundingRateMinVar || 84);
    const esm_contractLongFundingRateMaxVar = Number(esm_variables.contractLongFundingRateMaxVar || 85);
    const esm_contractShortFundingRateMinVar = Number(esm_variables.contractShortFundingRateMinVar || 86);
    const esm_contractShortFundingRateMaxVar = Number(esm_variables.contractShortFundingRateMaxVar || 87);
    const esm_contractFundingUpdateCycleVar = Number(esm_variables.contractFundingUpdateCycleVar || 88);

    const esm_volatility = safeJsonParse(parameters['volatility']);
    const esm_updateCycle = esm_volatility.updateCycle || 'hour';
    const esm_updateTrigger = esm_volatility.updateTrigger || 'both';
    const esm_crossCycleRule = esm_volatility.crossCycleRule || 'sequential';
    const esm_globalUpProb = Number(esm_volatility.globalUpProb || 50);
    const esm_maxUpAmp = Number(esm_volatility.maxUpAmp || 1);
    const esm_maxDownAmp = Number(esm_volatility.maxDownAmp || 1);
    const esm_historyPeriods = Number(esm_volatility.historyPeriods || 10);
    const esm_stThreshold = Number(esm_volatility.stThreshold || 5);

    const esm_messages = safeJsonParse(parameters['messages']);
    const esm_business = safeJsonParse(parameters['business']);
    const esm_enableBusinessHours = esm_business.enableBusinessHours === 'true';
    const esm_businessPeriods = safeJsonParse(esm_business.businessPeriods || '["2","3"]').map(Number);
    const esm_businessWeeks = safeJsonParse(esm_business.businessWeeks || '["1","2","3","4","5"]').map(Number);

    const esm_tradeSettings = safeJsonParse(parameters['tradeSettings']);
    const esm_vipVar = Number(esm_tradeSettings.vipVar || 74);
    const esm_feeRateVar = Number(esm_tradeSettings.feeRateVar || 70);
    const esm_thresholds = safeJsonParse(esm_tradeSettings.thresholds || '{}');
    const esm_feeRates = safeJsonParse(esm_tradeSettings.feeRates || '{}');

    const esm_contractSettings = safeJsonParse(parameters['contractSettings']);
    const esm_initialMargin = Number(esm_contractSettings.initialMargin || 0);
    const esm_defaultLeverage = Number(esm_contractSettings.defaultLeverage || 5);
    const esm_maxLeverage = Number(esm_contractSettings.maxLeverage || 20);
    const esm_liquidationThreshold = Number(esm_contractSettings.liquidationThreshold || 1.0);
    const esm_longFundingRateMin = Number(esm_contractSettings.longFundingRateMin || -0.0005);
    const esm_longFundingRateMax = Number(esm_contractSettings.longFundingRateMax || 0.0005);
    const esm_shortFundingRateMin = Number(esm_contractSettings.shortFundingRateMin || -0.0005);
    const esm_shortFundingRateMax = Number(esm_contractSettings.shortFundingRateMax || 0.0005);
    const esm_fundingRateUpdateCycle = esm_contractSettings.fundingRateUpdateCycle || 'day';
    const esm_useSaveObject = esm_contractSettings.useSaveObject === 'true';
    const esm_debugLog = esm_contractSettings.debugLog === 'true';

    const esm_customStocks = safeJsonParse(parameters['customStocks'] || '[]');
    const esm_stockList = [];
    for (let i = 1; i <= 10; i++) {
        const stock = safeJsonParse(parameters[`stock${i}`] || '{}');
        if (stock.code) esm_stockList.push(stock);
    }
    esm_stockList.push(...esm_customStocks);

    // 处理股票代码规范化
    esm_stockList.forEach(stock => {
        stock.code = stock.code.padStart(3, '0');
        stock.basePrice = Number(stock.basePrice || 100);
        stock.upProb = Number(stock.upProb || 0);
        stock.upAmp = Number(stock.upAmp || 0);
        stock.downAmp = Number(stock.downAmp || 0);
        stock.periodBias = stock.periodBias || 'none';
        stock.cycleBias = stock.cycleBias || 'none';
        stock.infoWidth = Number(stock.infoWidth || 25);
        stock.displayName = stock.name;
    });

    function esm_ensureChangedVariables() {
        try {
            if (!$gameVariables.value(esm_stockAccountVar)) $gameVariables.setValue(esm_stockAccountVar, 0);
            if (!$gameVariables.value(esm_stockHoldingsVar)) $gameVariables.setValue(esm_stockHoldingsVar, '{}');
            if (!$gameVariables.value(esm_stockPricesVar)) $gameVariables.setValue(esm_stockPricesVar, '{}');
            if (!$gameVariables.value(esm_stockAvgBuyPricesVar)) $gameVariables.setValue(esm_stockAvgBuyPricesVar, '{}');
            if (!$gameVariables.value(esm_tradeLogVar)) $gameVariables.setValue(esm_tradeLogVar, '[]');
            if (!$gameVariables.value(esm_priceHistoryVar)) $gameVariables.setValue(esm_priceHistoryVar, '{}');
            if (!$gameVariables.value(esm_contractMarginVar)) $gameVariables.setValue(esm_contractMarginVar, esm_initialMargin);
            if (!$gameVariables.value(esm_contractPositionsVar)) $gameVariables.setValue(esm_contractPositionsVar, '{}');
            if (!$gameVariables.value(esm_contractOrdersVar)) $gameVariables.setValue(esm_contractOrdersVar, '[]');
            if (!$gameVariables.value(esm_contractHistoryVar)) $gameVariables.setValue(esm_contractHistoryVar, '{}');
            if (!$gameVariables.value(esm_contractLongFundingRateVar)) $gameVariables.setValue(esm_contractLongFundingRateVar, esm_longFundingRateMin);
            if (!$gameVariables.value(esm_contractShortFundingRateVar)) $gameVariables.setValue(esm_contractShortFundingRateVar, esm_shortFundingRateMin);
            if (!$gameVariables.value(esm_cumulativeDepositVar)) $gameVariables.setValue(esm_cumulativeDepositVar, 0);
            if (!$gameVariables.value(esm_contractLongFundingRateMinVar)) $gameVariables.setValue(esm_contractLongFundingRateMinVar, esm_longFundingRateMin);
            if (!$gameVariables.value(esm_contractLongFundingRateMaxVar)) $gameVariables.setValue(esm_contractLongFundingRateMaxVar, esm_longFundingRateMax);
            if (!$gameVariables.value(esm_contractShortFundingRateMinVar)) $gameVariables.setValue(esm_contractShortFundingRateMinVar, esm_shortFundingRateMin);
            if (!$gameVariables.value(esm_contractShortFundingRateMaxVar)) $gameVariables.setValue(esm_contractShortFundingRateMaxVar, esm_shortFundingRateMax);
            if (!$gameVariables.value(esm_contractFundingUpdateCycleVar)) $gameVariables.setValue(esm_contractFundingUpdateCycleVar, esm_fundingRateUpdateCycle);
        } catch (e) {
            console.error('Expand_Stockmarket: ensureChangedVariables failed', e);
        }
    }

    class ExpandStockManager {
        constructor() {
            this.esm_account = 0;
            this.esm_holdings = {};
            this.esm_prices = {};
            this.esm_avgBuyPrices = {};
            this.esm_history = {};
            this.esm_tradeLog = [];
            this.esm_margin = esm_initialMargin;
            this.esm_positions = {};
            this.esm_orders = [];
            this.esm_ohlcHistory = {};
            this.esm_lastUpdate = null;
            this.esm_globalMarketBuff = { prob: 0, upAmp: 0, downAmp: 0, endTime: null };
            this.esm_singleMarketBuffs = {};
            this.esm_trendCounters = {};
            this.esm_orderIdCounter = 0;
            this.esm_longFundingRate = esm_longFundingRateMin;
            this.esm_shortFundingRate = esm_shortFundingRateMin;
            this.esm_lastFundingUpdate = null;
            this.esm_cumulativeDeposit = 0;
        }

        esm_getCurrentTime() {
            return {
                year: $gameVariables.value(esm_yearVar) || 0,
                month: $gameVariables.value(esm_monthVar) || 0,
                day: $gameVariables.value(esm_dayVar) || 0,
                week: $gameVariables.value(esm_weekVar) || 0,
                period: $gameVariables.value(esm_periodVar) || 0,
                hour: $gameVariables.value(esm_hourVar) || 0
            };
        }

        esm_getTimeStamp() {
            const time = this.esm_getCurrentTime();
            const periodStr = time.period === 1 ? '凌晨' : time.period === 2 ? '上午' : time.period === 3 ? '下午' : '傍晚';
            return `${time.year}/${time.month}/${time.day} ${periodStr}`;
        }

        esm_getTimeStampObj() {
            return this.esm_getCurrentTime();
        }

        esm_isBusinessTime() {
            if (!esm_enableBusinessHours) return true;
            const time = this.esm_getCurrentTime();
            return esm_businessPeriods.includes(time.period) && esm_businessWeeks.includes(time.week);
        }

        esm_daysDiff(day1, day2) {
            return Math.abs(day1 - day2);
        }

        esm_calcDelta(last, current, cycle) {
            let delta = 0;
            try {
                // 优化：使用 JS Date 对象计算小时差，避免每月30天假设
                const lastDate = new Date(last.year || 2000, (last.month || 1) - 1, last.day || 1, last.hour || 0);
                const currentDate = new Date(current.year || 2000, (current.month || 1) - 1, current.day || 1, current.hour || 0);
                const timeDiff = currentDate - lastDate; // 毫秒差
                switch (cycle) {
                    case 'hour':
                        delta = Math.floor(timeDiff / (1000 * 60 * 60)); // 毫秒转小时
                        break;
                    case 'period':
                        delta = Math.floor(timeDiff / (1000 * 60 * 60 * 6)); // 假设6小时一个时段
                        break;
                    case 'day':
                        delta = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                        break;
                    case 'week':
                        delta = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));
                        break;
                    case 'month':
                        delta = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 30));
                        break;
                }
                // 确保 delta 非负
                delta = Math.max(0, delta);
            } catch (e) {
                console.error('Expand_Stockmarket: calcDelta failed', e);
                delta = 0;
            }
            return delta;
        }

        esm_checkAndUpdatePrices() {
            if (esm_updateTrigger === 'manual' && !$gameTemp.esm_manualUpdate) return;
            const currentTime = this.esm_getCurrentTime();
            if (!this.esm_lastUpdate) {
                this.esm_lastUpdate = currentTime; // 初始化为当前时间
                if (esm_debugLog) console.log('Expand_Stockmarket: Initialized esm_lastUpdate to current time:', currentTime);
                return;
            }
            // 添加调试日志
            if (esm_debugLog) {
                console.log('Expand_Stockmarket: Current Time:', currentTime);
                console.log('Expand_Stockmarket: Last Update:', this.esm_lastUpdate);
            }
            const delta = this.esm_calcDelta(this.esm_lastUpdate, currentTime, esm_updateCycle);
            // 优化：限制 delta 上限为一天（24小时）
            const maxDelta = 24;
            const limitedDelta = Math.min(Math.max(delta, 0), maxDelta);
            if (delta > maxDelta && esm_debugLog) {
                console.log('Expand_Stockmarket: Delta too large (' + delta + '), limited to ' + maxDelta);
            }
            if (limitedDelta > 0) {
                if (esm_debugLog) console.log('Expand_Stockmarket: Calculated Delta:', limitedDelta);
                this.esm_updateAllPrices(limitedDelta);
                this.esm_lastUpdate = currentTime;
                this.esm_save();
            }
        }

        esm_updateAllPrices(delta) {
            esm_stockList.forEach(stock => {
                const code = stock.code;
                if (!this.esm_prices[code]) this.esm_prices[code] = stock.basePrice;
                if (!this.esm_history[code]) this.esm_history[code] = [];
                if (!this.esm_ohlcHistory[code]) this.esm_ohlcHistory[code] = [];
                if (!this.esm_trendCounters[code]) this.esm_trendCounters[code] = { up: 0, down: 0 };
                if (esm_crossCycleRule === 'sequential') {
                    for (let i = 0; i < delta; i++) {
                        if (!this.esm_isBusinessTime()) continue;
                        this.esm_updateSinglePrice(code);
                    }
                } else {
                    this.esm_updateSinglePrice(code);
                }
                this.esm_executeOrders(code, this.esm_prices[code]);
                this.esm_checkLiquidation(code);
            });
        }

        esm_updateSinglePrice(code) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return;
            const currPrice = this.esm_prices[code] || stock.basePrice;
            const globalBuff = this.esm_globalMarketBuff.endTime && this.esm_daysDiff(this.esm_getCurrentTime().day, this.esm_globalMarketBuff.endTime.day) <= 0 ? this.esm_globalMarketBuff : { prob: 0, upAmp: 0, downAmp: 0 };
            const singleBuff = this.esm_singleMarketBuffs[code] && this.esm_singleMarketBuffs[code].endTime && this.esm_daysDiff(this.esm_getCurrentTime().day, this.esm_singleMarketBuffs[code].endTime.day) <= 0 ? this.esm_singleMarketBuffs[code] : { prob: 0, upAmp: 0, downAmp: 0 };
            let upProb = esm_globalUpProb + stock.upProb + globalBuff.prob + singleBuff.prob;
            let upAmp = esm_maxUpAmp + stock.upAmp + globalBuff.upAmp + singleBuff.upAmp;
            let downAmp = esm_maxDownAmp + stock.downAmp + globalBuff.downAmp + singleBuff.downAmp;
            const periodBias = stock.periodBias;
            const cycleBias = stock.cycleBias;
            const time = this.esm_getCurrentTime();
            if (periodBias === 'morning_up20' && time.period === 2) upProb += 20;
            if (periodBias === 'evening_down15' && time.period === 4) upProb -= 15;
            if (cycleBias === 'week_start_up20' && time.week === 1) upProb += 20;
            if (cycleBias === 'month_end_down15' && time.day >= 25) upProb -= 15;
            upProb = Math.max(0, Math.min(100, upProb));
            const isUp = Math.random() * 100 < upProb;
            const amp = isUp ? Math.random() * upAmp : -Math.random() * downAmp;
            const change = Math.floor(currPrice * (amp / 100));
            const newPrice = Math.max(1, currPrice + change);
            this.esm_prices[code] = newPrice;
            const today = this.esm_getTimeStamp();
            let hist = this.esm_history[code];
            if (hist.length === 0 || hist[0].day !== today) {
                hist.unshift({ day: today, sum: newPrice, count: 1, avg: newPrice });
            } else {
                hist[0].sum += newPrice;
                hist[0].count += 1;
                hist[0].avg = hist[0].sum / hist[0].count;
            }
            if (hist.length > esm_historyPeriods) hist.pop();
            let ohlcHist = this.esm_ohlcHistory[code];
            if (ohlcHist.length === 0 || ohlcHist[0].period !== today) {
                ohlcHist.unshift({ period: today, open: currPrice, high: newPrice, low: newPrice, close: newPrice });
            } else {
                ohlcHist[0].high = Math.max(ohlcHist[0].high, newPrice);
                ohlcHist[0].low = Math.min(ohlcHist[0].low, newPrice);
                ohlcHist[0].close = newPrice;
            }
            if (ohlcHist.length > esm_historyPeriods) ohlcHist.pop();
            if (newPrice < esm_stThreshold) {
                stock.displayName = esm_messages.stPrefix + stock.name;
            } else {
                stock.displayName = stock.name;
            }
            this.esm_trendCounters[code][isUp ? 'up' : 'down']++;
            if (esm_debugLog) console.log('Expand_Stockmarket: Updated price for', code, 'to', newPrice);
        }

        esm_load() {
            try {
                this.esm_account = $gameVariables.value(esm_stockAccountVar) || 0;
                this.esm_holdings = safeJsonParse($gameVariables.value(esm_stockHoldingsVar) || '{}');
                this.esm_prices = safeJsonParse($gameVariables.value(esm_stockPricesVar) || '{}');
                this.esm_avgBuyPrices = safeJsonParse($gameVariables.value(esm_stockAvgBuyPricesVar) || '{}');
                this.esm_tradeLog = safeJsonParse($gameVariables.value(esm_tradeLogVar) || '[]');
                this.esm_history = safeJsonParse($gameVariables.value(esm_priceHistoryVar) || '{}');
                this.esm_margin = $gameVariables.value(esm_contractMarginVar) || esm_initialMargin;
                this.esm_positions = this.esm_initPositions(safeJsonParse($gameVariables.value(esm_contractPositionsVar) || '{}'));
                this.esm_orders = safeJsonParse($gameVariables.value(esm_contractOrdersVar) || '[]');
                this.esm_ohlcHistory = safeJsonParse($gameVariables.value(esm_contractHistoryVar) || '{}');
                this.esm_longFundingRate = $gameVariables.value(esm_contractLongFundingRateVar) || esm_longFundingRateMin;
                this.esm_shortFundingRate = $gameVariables.value(esm_contractShortFundingRateVar) || esm_shortFundingRateMin;
                this.esm_cumulativeDeposit = $gameVariables.value(esm_cumulativeDepositVar) || 0;
                this.esm_lastUpdate = this.esm_getTimeStampObj() || {year:0, month:0, day:0, week:0, period:0, hour:0};
                // 优化：如果 lastUpdate 是默认“零时间”，设为当前时间
                if (this.esm_lastUpdate.year === 0 && this.esm_lastUpdate.month === 0 && this.esm_lastUpdate.day === 0) {
                    this.esm_lastUpdate = this.esm_getCurrentTime();
                    if (esm_debugLog) console.log('Expand_Stockmarket: Initialized esm_lastUpdate to current time:', this.esm_lastUpdate);
                }
                this.esm_lastFundingUpdate = this.esm_getTimeStampObj() || {year:0, month:0, day:0, week:0, period:0, hour:0};
                if (this.esm_lastFundingUpdate.year === 0) {
                    this.esm_lastFundingUpdate = this.esm_getCurrentTime();
                }
                esm_stockList.forEach(stock => {
                    const code = stock.code;
                    if (!this.esm_holdings[code]) this.esm_holdings[code] = 0;
                    if (!this.esm_prices[code]) this.esm_prices[code] = stock.basePrice;
                    if (!this.esm_avgBuyPrices[code]) this.esm_avgBuyPrices[code] = 0;
                    if (!this.esm_history[code]) this.esm_history[code] = [];
                    if (!this.esm_ohlcHistory[code]) this.esm_ohlcHistory[code] = [];
                    if (!this.esm_trendCounters[code]) this.esm_trendCounters[code] = { up: 0, down: 0 };
                });
                this.esm_orderIdCounter = this.esm_orders.length > 0 ? Math.max(...this.esm_orders.map(o => o.id)) + 1 : 0;
            } catch (e) {
                console.error('Expand_Stockmarket: Load failed', e);
                this.esm_account = 0;
                this.esm_holdings = {};
                this.esm_prices = {};
                this.esm_avgBuyPrices = {};
                this.esm_tradeLog = [];
                this.esm_margin = esm_initialMargin;
                this.esm_positions = {};
                this.esm_orders = [];
                this.esm_ohlcHistory = {};
                this.esm_orderIdCounter = 0;
            }
        }

        esm_save() {
            try {
                $gameVariables.setValue(esm_stockAccountVar, this.esm_account);
                $gameVariables.setValue(esm_stockHoldingsVar, JSON.stringify(this.esm_holdings));
                $gameVariables.setValue(esm_stockPricesVar, JSON.stringify(this.esm_prices));
                $gameVariables.setValue(esm_stockAvgBuyPricesVar, JSON.stringify(this.esm_avgBuyPrices));
                $gameVariables.setValue(esm_tradeLogVar, JSON.stringify(this.esm_tradeLog));
                $gameVariables.setValue(esm_priceHistoryVar, JSON.stringify(this.esm_history));
                $gameVariables.setValue(esm_contractMarginVar, this.esm_margin);
                $gameVariables.setValue(esm_contractPositionsVar, JSON.stringify(this.esm_positions));
                $gameVariables.setValue(esm_contractOrdersVar, JSON.stringify(this.esm_orders));
                $gameVariables.setValue(esm_contractHistoryVar, JSON.stringify(this.esm_ohlcHistory));
                $gameVariables.setValue(esm_contractLongFundingRateVar, this.esm_longFundingRate);
                $gameVariables.setValue(esm_contractShortFundingRateVar, this.esm_shortFundingRate);
                $gameVariables.setValue(esm_cumulativeDepositVar, this.esm_cumulativeDeposit);
            } catch (e) {
                console.error('Expand_Stockmarket: Save failed', e);
            }
        }

        esm_initPositions(positions) {
            const result = {};
            esm_stockList.forEach(stock => {
                const code = stock.code;
                result[code] = positions[code] || { long: { quantity: 0, entryPrice: 0, leverage: esm_defaultLeverage, openTime: '', marginUsed: 0, fundingPaid: 0 }, short: { quantity: 0, entryPrice: 0, leverage: esm_defaultLeverage, openTime: '', marginUsed: 0, fundingPaid: 0 } };
            });
            return result;
        }

        esm_calculateVIP() {
            let totalValue = this.esm_account;
            for (let code in this.esm_holdings) {
                totalValue += (this.esm_holdings[code] || 0) * (this.esm_prices[code] || 0);
            }
            totalValue += this.esm_cumulativeDeposit;
            let vipLevel = 0;
            if (totalValue >= esm_thresholds.vip7) vipLevel = 7;
            else if (totalValue >= esm_thresholds.vip6) vipLevel = 6;
            else if (totalValue >= esm_thresholds.vip5) vipLevel = 5;
            else if (totalValue >= esm_thresholds.vip4) vipLevel = 4;
            else if (totalValue >= esm_thresholds.vip3) vipLevel = 3;
            else if (totalValue >= esm_thresholds.vip2) vipLevel = 2;
            else if (totalValue >= esm_thresholds.vip1) vipLevel = 1;
            $gameVariables.setValue(esm_vipVar, vipLevel);
            const rate = esm_feeRates[`vip${vipLevel}`] || esm_feeRates.vip0;
            $gameVariables.setValue(esm_feeRateVar, rate);
            return { level: vipLevel, rate: rate };
        }

        esm_getCurrentVIP() {
            return $gameVariables.value(esm_vipVar) || 0;
        }

        esm_getCurrentFeeRate() {
            return { level: this.esm_getCurrentVIP(), rate: $gameVariables.value(esm_feeRateVar) || esm_feeRates.vip0 };
        }

        esm_calculateFee(amount) {
            const rate = this.esm_getCurrentFeeRate().rate;
            return Math.floor(amount * rate);
        }

        esm_depositCash(amount) {
            if (!this.esm_isBusinessTime()) return $gameMessage.add(esm_messages.closedTradeMessage);
            amount = Number(amount);
            if (amount <= 0) {
                amount = $gameParty.gold();
            }
            if ($gameParty.gold() < amount) {
                $gameMessage.add(esm_messages.depositExceed.replace('%1', $gameParty.gold()));
                amount = $gameParty.gold();
            }
            if (amount <= 0) return $gameMessage.add(esm_messages.invalidAmount);
            this.esm_account += amount;
            $gameParty.loseGold(amount);
            this.esm_cumulativeDeposit += amount;
            $gameVariables.setValue(esm_cumulativeDepositVar, this.esm_cumulativeDeposit);
            $gameMessage.add(esm_messages.depositSuccess.replace('%1', this.esm_account));
            this.esm_save();
            if (esm_debugLog) console.log('Expand_Stockmarket: Deposited', amount);
        }

        esm_withdrawCash(amount) {
            if (!this.esm_isBusinessTime()) return $gameMessage.add(esm_messages.closedTradeMessage);
            amount = Number(amount);
            if (amount <= 0) {
                amount = this.esm_account;
            }
            if (this.esm_account < amount) {
                $gameMessage.add(esm_messages.withdrawExceed.replace('%1', this.esm_account));
                amount = this.esm_account;
            }
            if (amount <= 0) return $gameMessage.add(esm_messages.invalidAmount);
            this.esm_account -= amount;
            $gameParty.gainGold(amount);
            $gameMessage.add(esm_messages.withdrawSuccess.replace('%1', amount));
            this.esm_save();
            if (esm_debugLog) console.log('Expand_Stockmarket: Withdrawn', amount);
        }

        esm_buyStock(code, quantity) {
            if (!this.esm_isBusinessTime()) return $gameMessage.add(esm_messages.closedTradeMessage);
            quantity = Number(quantity);
            if (quantity <= 0) return $gameMessage.add(esm_messages.invalidQuantity);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.invalidStockCode);
            const price = this.esm_prices[code] || stock.basePrice;
            const cost = price * quantity;
            const fee = this.esm_calculateFee(cost);
            const totalCost = cost + fee;
            if (this.esm_account < totalCost) {
                $gameMessage.add(esm_messages.buyFeeInsufficient.replace('%1', totalCost - this.esm_account));
                return;
            }
            this.esm_account -= totalCost;
            this.esm_holdings[code] = (this.esm_holdings[code] || 0) + quantity;
            const oldAvg = this.esm_avgBuyPrices[code] || price;
            const oldQuantity = (this.esm_holdings[code] || 0) - quantity;
            this.esm_avgBuyPrices[code] = oldQuantity > 0 ? (oldAvg * oldQuantity + price * quantity) / this.esm_holdings[code] : price;
            this.esm_tradeLog.push({ time: this.esm_getTimeStamp(), code, quantity, price, type: 'buy' });
            $gameMessage.add(esm_messages.buySuccess.replace('%1', stock.displayName).replace('%2', this.esm_holdings[code]));
            $gameMessage.add(esm_messages.buySuccessFee.replace('%1', fee));
            this.esm_save();
            if (esm_debugLog) console.log('Expand_Stockmarket: Bought', quantity, 'of', code, 'at', price);
        }

        esm_sellStock(code, quantity) {
            if (!this.esm_isBusinessTime()) return $gameMessage.add(esm_messages.closedTradeMessage);
            quantity = Number(quantity);
            if (quantity <= 0) {
                quantity = this.esm_holdings[code] || 0;
            }
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.invalidStockCode);
            if (!this.esm_holdings[code] || this.esm_holdings[code] < quantity) return $gameMessage.add(esm_messages.sellInsufficient);
            const price = this.esm_prices[code] || stock.basePrice;
            const revenue = price * quantity;
            const fee = this.esm_calculateFee(revenue);
            const netRevenue = revenue - fee;
            this.esm_account += netRevenue;
            this.esm_holdings[code] -= quantity;
            if (this.esm_holdings[code] === 0) {
                delete this.esm_holdings[code];
                delete this.esm_avgBuyPrices[code];
            }
            this.esm_tradeLog.push({ time: this.esm_getTimeStamp(), code, quantity, price, type: 'sell' });
            $gameMessage.add(esm_messages.sellSuccess.replace('%1', netRevenue));
            $gameMessage.add(esm_messages.sellSuccessFee.replace('%1', fee));
            this.esm_save();
            if (esm_debugLog) console.log('Expand_Stockmarket: Sold', quantity, 'of', code, 'at', price);
        }

        esm_clearAllHoldings() {
            if (!this.esm_isBusinessTime()) return $gameMessage.add(esm_messages.closedTradeMessage);
            for (let code in this.esm_holdings) {
                this.esm_sellStock(code, this.esm_holdings[code]);
            }
        }

        esm_queryAllHoldings() {
            let listMsg = '';
            let totalTypes = 0;
            let totalValue = 0;
            let totalCost = 0;
            let totalPnl = 0;
            esm_stockList.forEach(stock => {
                const code = stock.code;
                const hold = this.esm_holdings[code] || 0;
                if (hold > 0) {
                    totalTypes++;
                    const avg = this.esm_avgBuyPrices[code] || 0;
                    const curr = this.esm_prices[code] || 0;
                    const pnl = (curr - avg) * hold;
                    totalPnl += pnl;
                    totalValue += curr * hold;
                    totalCost += avg * hold;
                    const pnlStr = pnl > 0 ? '+' + Math.floor(pnl) : Math.floor(pnl);
                    listMsg += `${stock.displayName}(${code}): ${hold}。收益：${pnlStr}。\n`;
                }
            });
            if (totalTypes === 0) return $gameMessage.add(esm_messages.noHoldings);
            const yieldRateStr = totalCost > 0 ? (totalValue / totalCost - 1) * 100 : 0;
            const yieldFormatted = yieldRateStr > 0 ? '+' + yieldRateStr.toFixed(2) + '%' : yieldRateStr.toFixed(2) + '%';
            const totalPnlStr = totalPnl > 0 ? '+' + Math.floor(totalPnl) : Math.floor(totalPnl);
            $gameMessage.add(`持仓数：${totalTypes}。总盈亏：${totalPnlStr}。收益率：${yieldFormatted}\n${listMsg}`);
        }

        esm_querySingleHolding() {
            const rawCode = $gameVariables.value(esm_inputCodeVar);
            if (isNaN(rawCode)) return $gameMessage.add(esm_messages.invalidStockCode);
            const code = rawCode.toString().padStart(3, '0');
            if (code.length !== 3) return $gameMessage.add(esm_messages.invalidStockCode);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.stockNotFound);
            const hold = this.esm_holdings[code] || 0;
            if (hold === 0) return $gameMessage.add(`${stock.displayName} 无持仓。`);
            const avg = this.esm_avgBuyPrices[code] || 0;
            const curr = this.esm_prices[code] || 0;
            const pnl = (curr - avg) * hold;
            const hist = this.esm_history[code] || [];
            const currentDayEntry = hist[0];
            let dayChange = '0%';
            let weekChange = '0%';
            let monthChange = '0%';
            if (currentDayEntry) {
                const currentAvg = currentDayEntry.avg || 0;
                const prevDayEntry = hist[1];
                if (prevDayEntry) dayChange = ((currentAvg - prevDayEntry.avg) / prevDayEntry.avg * 100).toFixed(2) + '%';
                const weekAgo = hist.find(e => this.esm_daysDiff(currentDayEntry.day, e.day) >= 7);
                if (weekAgo) weekChange = ((currentAvg - weekAgo.avg) / weekAgo.avg * 100).toFixed(2) + '%';
                const monthAgo = hist.find(e => this.esm_daysDiff(currentDayEntry.day, e.day) >= 30);
                if (monthAgo) monthChange = ((currentAvg - monthAgo.avg) / monthAgo.avg * 100).toFixed(2) + '%';
            }
            $gameMessage.add(`${stock.displayName}(${code})\n持股数:${hold} 总盈亏:${Math.floor(pnl)}\n成本价:${avg.toFixed(2)} 当前价:${curr.toFixed(2)} \n日涨跌:${dayChange} 周涨跌:${weekChange} 月涨跌:${monthChange}`);
        }

        esm_queryStockPrice() {
            const rawCode = $gameVariables.value(esm_inputCodeVar);
            if (isNaN(rawCode)) return $gameMessage.add(esm_messages.invalidStockCode);
            const code = rawCode.toString().padStart(3, '0');
            if (code.length !== 3) return $gameMessage.add(esm_messages.invalidStockCode);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.stockNotFound);
            const price = this.esm_prices[stock.code] || stock.basePrice;
            $gameMessage.add(`${stock.displayName} 当前价格: ${price.toFixed(2)}元`);
        }

        esm_queryCompanyInfo() {
            const rawCode = $gameVariables.value(esm_inputCodeVar);
            if (isNaN(rawCode)) return $gameMessage.add(esm_messages.invalidStockCode);
            const code = rawCode.toString().padStart(3, '0');
            if (code.length !== 3) return $gameMessage.add(esm_messages.invalidStockCode);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.stockNotFound);
            let info = stock.companyInfo || '无公司信息。';
            const width = stock.infoWidth;
            let formatted = '';
            let current = '';
            for (let char of info) {
                const test = current + char;
                if (this.textWidth(test) > width * 12) {
                    formatted += current + '\n';
                    current = char;
                } else {
                    current = test;
                }
            }
            if (current) formatted += current;
            $gameMessage.add(`${stock.name}(${code})\n${formatted}`);
        }

        esm_queryHistory(numDays) {
            const rawCode = $gameVariables.value(esm_inputCodeVar);
            if (isNaN(rawCode)) return $gameMessage.add(esm_messages.invalidStockCode);
            const code = rawCode.toString().padStart(3, '0');
            if (code.length !== 3) return $gameMessage.add(esm_messages.invalidStockCode);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.stockNotFound);
            const hist = this.esm_history[code] || [];
            if (hist.length === 0) return $gameMessage.add('无历史记录。');
            numDays = Math.min(Number(numDays) || esm_historyPeriods, hist.length);
            let firstPrice = hist[0].avg || 0;
            let lastPrice = hist[numDays - 1] ? hist[numDays - 1].avg : firstPrice;
            let sumPrice = 0;
            for (let i = 0; i < numDays; i++) {
                sumPrice += hist[i].avg || 0;
            }
            const avgPrice = numDays > 0 ? sumPrice / numDays : 0;
            $gameMessage.add(`${stock.displayName}(${code})\n最近${numDays}交易日：\n首日均价:${firstPrice.toFixed(2)}\n末日均价:${lastPrice.toFixed(2)}\n平均:${avgPrice.toFixed(2)}`);
        }

        esm_queryFeeRate(outputVar) {
            this.esm_calculateVIP();
            const vip = this.esm_getCurrentVIP();
            const rate = this.esm_getCurrentFeeRate().rate;
            const ratePercent = (rate * 100).toFixed(2);
            $gameMessage.add(esm_messages.feeRateMsg.replace('%1', vip).replace('%2', rate).replace('%3', ratePercent));
            if (outputVar > 0) $gameVariables.setValue(outputVar, rate);
        }

        esm_setGlobalMarket(prob, upAmp, downAmp, durationYears, durationMonths, durationDays) {
            const time = this.esm_getCurrentTime();
            const totalDays = Number(durationYears) * 365 + Number(durationMonths) * 30 + Number(durationDays);
            const endTime = { day: time.day + totalDays };
            this.esm_globalMarketBuff = { prob: Number(prob), upAmp: Number(upAmp), downAmp: Number(downAmp), endTime };
            if (esm_debugLog) console.log('Expand_Stockmarket: Global market buff set', this.esm_globalMarketBuff);
        }

        esm_setSingleMarket(code, prob, upAmp, downAmp, durationYears, durationMonths, durationDays) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.invalidStockCode);
            const time = this.esm_getCurrentTime();
            const totalDays = Number(durationYears) * 365 + Number(durationMonths) * 30 + Number(durationDays);
            const endTime = { day: time.day + totalDays };
            this.esm_singleMarketBuffs[code] = { prob: Number(prob), upAmp: Number(upAmp), downAmp: Number(downAmp), endTime };
            if (esm_debugLog) console.log('Expand_Stockmarket: Single market buff set for', code, this.esm_singleMarketBuffs[code]);
        }

        esm_depositMargin(amount) {
            amount = Number(amount);
            if (amount <= 0) {
                amount = this.esm_account;
            }
            if (this.esm_account < amount) {
                $gameMessage.add(esm_messages.marginInsufficient);
                amount = this.esm_account;
            }
            if (amount <= 0) return $gameMessage.add(esm_messages.invalidAmount);
            const fee = this.esm_calculateFee(amount);
            if (this.esm_account < amount + fee) {
                $gameMessage.add(esm_messages.buyFeeInsufficient.replace('%1', amount + fee - this.esm_account));
                return;
            }
            this.esm_account -= (amount + fee);
            this.esm_margin += amount;
            $gameMessage.add(esm_messages.marginTransferSuccess.replace('%1', this.esm_margin));
            $gameMessage.add(esm_messages.marginTransferFee.replace('%1', fee));
            this.esm_save();
            if (esm_debugLog) console.log('Expand_Stockmarket: Deposited margin', amount);
        }

        esm_withdrawMargin(amount) {
            amount = Number(amount);
            if (amount <= 0) {
                amount = this.esm_margin;
            }
            if (this.esm_margin < amount) {
                $gameMessage.add(esm_messages.marginInsufficient);
                amount = this.esm_margin;
            }
            if (amount <= 0) return $gameMessage.add(esm_messages.invalidAmount);
            const fee = this.esm_calculateFee(amount);
            if (this.esm_margin < amount + fee) {
                $gameMessage.add(esm_messages.buyFeeInsufficient.replace('%1', amount + fee - this.esm_margin));
                return;
            }
            this.esm_margin -= (amount + fee);
            this.esm_account += amount;
            $gameMessage.add(esm_messages.marginTransferSuccess.replace('%1', this.esm_margin));
            $gameMessage.add(esm_messages.marginTransferFee.replace('%1', fee));
            this.esm_save();
            if (esm_debugLog) console.log('Expand_Stockmarket: Withdrawn margin', amount);
        }

        esm_checkAndUpdateFundingRates() {
            const currentTime = this.esm_getCurrentTime();
            if (!this.esm_lastFundingUpdate) {
                this.esm_lastFundingUpdate = currentTime;
                return;
            }
            const delta = this.esm_calcDelta(this.esm_lastFundingUpdate, currentTime, esm_fundingRateUpdateCycle);
            if (delta > 0) {
                this.esm_longFundingRate = esm_longFundingRateMin + Math.random() * (esm_longFundingRateMax - esm_longFundingRateMin);
                this.esm_shortFundingRate = esm_shortFundingRateMin + Math.random() * (esm_shortFundingRateMax - esm_shortFundingRateMin);
                $gameVariables.setValue(esm_contractLongFundingRateVar, this.esm_longFundingRate);
                $gameVariables.setValue(esm_contractShortFundingRateVar, this.esm_shortFundingRate);
                this.esm_lastFundingUpdate = currentTime;
                this.esm_save();
                if (esm_debugLog) console.log('Expand_Stockmarket: Funding rates updated', this.esm_longFundingRate, this.esm_shortFundingRate);
            }
        }

        esm_setFundingRateBounds(longMin, longMax, shortMin, shortMax) {
            if ((longMin < 0 && longMax > 0) || (shortMin < 0 && shortMax > 0)) {
                return $gameMessage.add(esm_messages.invalidFundingRange);
            }
            $gameVariables.setValue(esm_contractLongFundingRateMinVar, longMin);
            $gameVariables.setValue(esm_contractLongFundingRateMaxVar, longMax);
            $gameVariables.setValue(esm_contractShortFundingRateMinVar, shortMin);
            $gameVariables.setValue(esm_contractShortFundingRateMaxVar, shortMax);
            this.esm_longFundingRate = longMin + Math.random() * (longMax - longMin);
            this.esm_shortFundingRate = shortMin + Math.random() * (shortMax - shortMin);
            $gameVariables.setValue(esm_contractLongFundingRateVar, this.esm_longFundingRate);
            $gameVariables.setValue(esm_contractShortFundingRateVar, this.esm_shortFundingRate);
            this.esm_save();
            if (esm_debugLog) console.log('Expand_Stockmarket: Funding rate bounds set', longMin, longMax, shortMin, shortMax);
        }

        esm_openPosition(direction, code, quantity, leverage) {
            quantity = Number(quantity);
            leverage = Number(leverage) || esm_defaultLeverage;
            if (leverage < 1 || leverage > esm_maxLeverage) {
                leverage = esm_defaultLeverage;
                $gameMessage.add(esm_messages.invalidLeverage);
            }
            if (quantity <= 0) return $gameMessage.add(esm_messages.invalidQuantity);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.invalidStockCode);
            const price = this.esm_prices[code] || stock.basePrice;
            const marginRequired = price * quantity / leverage;
            if (this.esm_margin < marginRequired) {
                $gameMessage.add(esm_messages.marginInsufficient);
                return;
            }
            this.esm_margin -= marginRequired;
            if (!this.esm_positions[code]) this.esm_positions[code] = { long: { quantity: 0, entryPrice: 0, leverage: esm_defaultLeverage, openTime: '', marginUsed: 0, fundingPaid: 0 }, short: { quantity: 0, entryPrice: 0, leverage: esm_defaultLeverage, openTime: '', marginUsed: 0, fundingPaid: 0 } };
            const pos = this.esm_positions[code][direction];
            const oldQuantity = pos.quantity;
            const oldMargin = pos.marginUsed;
            pos.quantity += quantity;
            pos.entryPrice = oldQuantity > 0 ? (pos.entryPrice * oldQuantity + price * quantity) / pos.quantity : price;
            pos.leverage = leverage;
            pos.openTime = this.esm_getTimeStamp();
            pos.marginUsed = oldMargin + marginRequired;
            $gameMessage.add(esm_messages.openPositionSuccess.replace('%1', direction === 'long' ? '多' : '空').replace('%2', quantity));
            this.esm_save();
            if (esm_debugLog) console.log('Expand_Stockmarket: Opened', direction, 'position for', code, quantity, 'at', price);
        }

        esm_closePosition(code, quantity, direction = null, force = false) {
            quantity = Number(quantity);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.invalidStockCode);
            if (!this.esm_positions[code]) return $gameMessage.add(esm_messages.noPositions);
            if (!direction) {
                ['long', 'short'].forEach(dir => {
                    this.esm_closePosition(code, quantity, dir, force);
                });
                return;
            }
            const pos = this.esm_positions[code][direction];
            if (!pos || pos.quantity === 0) return $gameMessage.add(esm_messages.noPositions);
            if (quantity <= 0 || force) quantity = pos.quantity;
            if (pos.quantity < quantity) return $gameMessage.add(esm_messages.invalidQuantity);
            const price = this.esm_prices[code] || stock.basePrice;
            const basePnl = (price - pos.entryPrice) * quantity * (direction === 'long' ? 1 : -1);
            const pnl = basePnl * pos.leverage;
            const fee = this.esm_calculateFee(Math.abs(pnl));
            const netPnl = pnl - fee;
            this.esm_margin += netPnl + (pos.marginUsed * quantity / pos.quantity);
            pos.quantity -= quantity;
            pos.marginUsed = pos.quantity > 0 ? pos.marginUsed * (pos.quantity / (pos.quantity + quantity)) : 0;
            if (pos.quantity === 0) {
                pos.entryPrice = 0;
                pos.leverage = esm_defaultLeverage;
                pos.openTime = '';
                pos.fundingPaid = 0;
            }
            this.esm_orders = this.esm_orders.filter(o => o.code !== code || o.direction !== direction || o.status !== 'pending');
            $gameMessage.add(esm_messages.closePositionSuccess.replace('%1', Math.floor(netPnl)));
            this.esm_save();
            if (esm_debugLog) console.log('Expand_Stockmarket: Closed', direction, 'position for', code, quantity, 'pnl', netPnl);
            return netPnl;
        }

        esm_checkLiquidation(code) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock || !this.esm_positions[code]) return;
            const price = this.esm_prices[code] || stock.basePrice;
            ['long', 'short'].forEach(direction => {
                const pos = this.esm_positions[code][direction];
                if (!pos || pos.quantity <= 0) return;
                const basePnl = (price - pos.entryPrice) * pos.quantity * (direction === 'long' ? 1 : -1);
                const equity = pos.marginUsed + basePnl * pos.leverage;
                if (equity <= pos.marginUsed * esm_liquidationThreshold) {
                    const pnl = this.esm_closePosition(code, pos.quantity, direction, true);
                    $gameMessage.add(esm_messages.liquidationTriggered.replace('%1', code).replace('%2', this.esm_margin));
                    if (esm_debugLog) console.log('Expand_Stockmarket: Liquidation triggered for', code, direction);
                }
            });
        }

        esm_deductFundingFee(code) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock || !this.esm_positions[code]) return;
            const price = this.esm_prices[code] || stock.basePrice;
            ['long', 'short'].forEach(direction => {
                const pos = this.esm_positions[code][direction];
                if (!pos || pos.quantity <= 0) return;
                const fee = (direction === 'long' ? this.esm_longFundingRate : this.esm_shortFundingRate) * price * pos.quantity;
                pos.fundingPaid += fee;
                this.esm_margin -= fee;
                this.esm_margin = Math.max(0, this.esm_margin);
                if (fee > 0) {
                    $gameMessage.add(esm_messages.fundingFeeDeducted.replace('%1', fee));
                    if (esm_debugLog) console.log('Expand_Stockmarket: Funding deducted for', code, direction, fee);
                }
            });
        }

        esm_placeOrder(type, direction, code, quantity, price = 0) {
            if (quantity <= 0) return $gameMessage.add(esm_messages.invalidQuantity);
            if ((type === 'limit' || type === 'takeProfit' || type === 'stopLoss') && price <= 0) return $gameMessage.add(esm_messages.invalidPrice);
            const order = {
                id: this.esm_orderIdCounter++,
                type,
                direction,
                code,
                quantity,
                price,
                time: this.esm_getTimeStamp(),
                status: 'pending'
            };
            this.esm_orders.push(order);
            $gameMessage.add(esm_messages.orderPlaced.replace('%1', type));
            this.esm_save();
            if (esm_debugLog) console.log('Expand_Stockmarket: Order placed', order);
        }

        esm_cancelOrder(id) {
            const index = this.esm_orders.findIndex(o => o.id === id && o.status === 'pending');
            if (index === -1) return $gameMessage.add('无此委托单！');
            this.esm_orders[index].status = 'cancelled';
            $gameMessage.add(esm_messages.orderCancelled.replace('%1', id));
            this.esm_save();
            if (esm_debugLog) console.log('Expand_Stockmarket: Order cancelled', id);
        }

        esm_executeOrders(code, currentPrice) {
            this.esm_orders = this.esm_orders.filter(order => {
                if (order.code !== code || order.status !== 'pending') return true;
                let execute = false;
                switch (order.type) {
                    case 'market':
                        execute = true;
                        break;
                    case 'limit':
                        execute = (order.direction === 'long' ? currentPrice <= order.price : currentPrice >= order.price);
                        break;
                    case 'takeProfit':
                        execute = (order.direction === 'long' ? currentPrice >= order.price : currentPrice <= order.price);
                        break;
                    case 'stopLoss':
                        execute = (order.direction === 'long' ? currentPrice <= order.price : currentPrice >= order.price);
                        break;
                }
                if (execute) {
                    if (order.type === 'takeProfit' || order.type === 'stopLoss') {
                        this.esm_closePosition(order.code, order.quantity, order.direction);
                    } else {
                        this.esm_openPosition(order.direction, order.code, order.quantity, esm_defaultLeverage);
                    }
                    order.status = 'executed';
                    $gameMessage.add(esm_messages.orderExecuted.replace('%1', order.id));
                    if (esm_debugLog) console.log('Expand_Stockmarket: Order executed', order);
                    return false;
                }
                return true;
            });
        }

        esm_queryPositions() {
            let msg = '';
            let hasPositions = false;
            esm_stockList.forEach(stock => {
                const code = stock.code;
                ['long', 'short'].forEach(direction => {
                    const pos = this.esm_positions[code][direction];
                    if (pos && pos.quantity > 0) {
                        hasPositions = true;
                        const price = this.esm_prices[code];
                        const basePnl = (price - pos.entryPrice) * pos.quantity * (direction === 'long' ? 1 : -1);
                        const pnl = basePnl * pos.leverage;
                        let stopLossPrice = '无';
                        let takeProfitPrice = '无';
                        this.esm_orders.forEach(order => {
                            if (order.code === code && order.direction === direction && order.status === 'pending') {
                                if (order.type === 'stopLoss') stopLossPrice = order.price;
                                if (order.type === 'takeProfit') takeProfitPrice = order.price;
                            }
                        });
                        msg += `${code} ${direction}: 数量${pos.quantity}, 入场${pos.entryPrice.toFixed(2)}, 当前${price.toFixed(2)}, 盈亏${Math.floor(pnl)}, 止损${stopLossPrice}, 止盈${takeProfitPrice}, 杠杆${pos.leverage}\n`;
                    }
                });
            });
            if (!hasPositions) return $gameMessage.add(esm_messages.noPositions);
            $gameMessage.add(msg);
        }

        esm_querySinglePosition() {
            const rawCode = $gameVariables.value(esm_inputCodeVar);
            if (isNaN(rawCode)) return $gameMessage.add(esm_messages.invalidStockCode);
            const code = rawCode.toString().padStart(3, '0');
            if (code.length !== 3) return $gameMessage.add(esm_messages.invalidStockCode);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.stockNotFound);
            let msg = `${stock.displayName}(${code})\n`;
            let hasPos = false;
            ['long', 'short'].forEach(direction => {
                const pos = this.esm_positions[code][direction];
                if (pos && pos.quantity > 0) {
                    hasPos = true;
                    const price = this.esm_prices[code];
                    const basePnl = (price - pos.entryPrice) * pos.quantity * (direction === 'long' ? 1 : -1);
                    const pnl = basePnl;
                    const estClosePnl = pnl - this.esm_calculateFee(Math.abs(pnl));
                    msg += `${direction}: 开仓时间${pos.openTime}, 已扣费${pos.fundingPaid}, 保证金占用${pos.marginUsed}, 平仓预估盈亏${Math.floor(estClosePnl)}\n`;
                }
            });
            if (!hasPos) return $gameMessage.add('无持仓。');
            $gameMessage.add(msg);
        }

        esm_setStopLevels(code, direction, takeProfitPrice, stopLossPrice) {
            try {
                const pos = this.esm_positions[code][direction];
                if (!pos || pos.quantity <= 0) return $gameMessage.add('无该持仓！');
                this.esm_orders.forEach(order => {
                    if (order.code === code && order.direction === direction && order.status === 'pending') {
                        if (takeProfitPrice > 0 && order.type === 'takeProfit') this.esm_cancelOrder(order.id);
                        if (stopLossPrice > 0 && order.type === 'stopLoss') this.esm_cancelOrder(order.id);
                    }
                });
                let tpSet = false;
                let slSet = false;
                if (takeProfitPrice > 0) {
                    this.esm_placeOrder('takeProfit', direction, code, pos.quantity, takeProfitPrice);
                    tpSet = true;
                }
                if (stopLossPrice > 0) {
                    this.esm_placeOrder('stopLoss', direction, code, pos.quantity, stopLossPrice);
                    slSet = true;
                }
                if (tpSet || slSet) {
                    $gameMessage.add(esm_messages.stopLevelsSet.replace('%1', takeProfitPrice || '无').replace('%2', stopLossPrice || '无'));
                    if (esm_debugLog) console.log('Expand_Stockmarket: Stop levels set for', code, direction, takeProfitPrice, stopLossPrice);
                } else {
                    $gameMessage.add(esm_messages.invalidPrice);
                }
            } catch (e) {
                console.error('Expand_Stockmarket: setStopLevels failed', e);
                $gameMessage.add('止盈止损设置失败！');
            }
        }

        esm_queryContractHistory(numPeriods = 10) {
            const rawCode = $gameVariables.value(esm_inputCodeVar);
            if (isNaN(rawCode)) return $gameMessage.add(esm_messages.invalidStockCode);
            const code = rawCode.toString().padStart(3, '0');
            if (code.length !== 3) return $gameMessage.add(esm_messages.invalidStockCode);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.stockNotFound);
            const hist = this.esm_ohlcHistory[code] || [];
            if (hist.length === 0) return $gameMessage.add(esm_messages.noHistory);
            numPeriods = Math.min(numPeriods, hist.length);
            let msg = `${stock.displayName}(${code})最近${numPeriods}周期OHLC历史：\n`;
            const recentHist = hist.slice(0, numPeriods);
            recentHist.forEach(entry => {
                msg += `日期${entry.period}: 开${entry.open.toFixed(2)} 高${entry.high.toFixed(2)} 低${entry.low.toFixed(2)} 收${entry.close.toFixed(2)}\n`;
            });
            $gameMessage.add(msg);
        }

        esm_closeAllPositions() {
            try {
                let totalPnl = 0;
                let pnlMsg = '';
                let hasPositions = false;
                esm_stockList.forEach(stock => {
                    const code = stock.code;
                    ['long', 'short'].forEach(direction => {
                        const pos = this.esm_positions[code][direction];
                        if (pos && pos.quantity > 0) {
                            hasPositions = true;
                            const pnl = this.esm_closePosition(code, pos.quantity, direction, true);
                            if (pnl !== null) {
                                totalPnl += pnl;
                                const pnlStr = pnl > 0 ? '+' + Math.floor(pnl) : Math.floor(pnl);
                                pnlMsg += `${code} ${direction}: 盈亏 ${pnlStr}\n`;
                            }
                        }
                    });
                });
                this.esm_save();
                if (hasPositions) {
                    const totalPnlStr = totalPnl > 0 ? '+' + Math.floor(totalPnl) : Math.floor(totalPnl);
                    $gameMessage.add(`所有合约已平仓！\n平仓详情：\n${pnlMsg}总盈亏: ${totalPnlStr}`);
                } else {
                    $gameMessage.add('无合约可平仓！');
                }
            } catch (e) {
                console.error('Expand_Stockmarket: closeAllPositions failed', e);
                $gameMessage.add('全部平仓失败！');
            }
        }

        esm_execCommand(cmd, args) {
            switch (cmd) {
                case 'DepositCash': this.esm_depositCash($gameVariables.value(esm_inputAmountVar)); break;
                case 'WithdrawCash': this.esm_withdrawCash($gameVariables.value(esm_inputAmountVar)); break;
                case 'BuyStock': 
                    const buyRawCode = $gameVariables.value(esm_inputCodeVar);
                    const buyCode = buyRawCode.toString().padStart(3, '0');
                    this.esm_buyStock(buyCode, $gameVariables.value(esm_inputAmountVar)); 
                    break;
                case 'SellStock': 
                    const sellRawCode = $gameVariables.value(esm_inputCodeVar);
                    const sellCode = sellRawCode.toString().padStart(3, '0');
                    this.esm_sellStock(sellCode, $gameVariables.value(esm_inputAmountVar)); 
                    break;
                case 'ClearAllHoldings': this.esm_clearAllHoldings(); break;
                case 'QueryAllHoldings': this.esm_queryAllHoldings(); break;
                case 'QuerySingleHolding': this.esm_querySingleHolding(); break;
                case 'QueryStockPrice': this.esm_queryStockPrice(); break;
                case 'QueryCompanyInfo': this.esm_queryCompanyInfo(); break;
                case 'QueryHistory': this.esm_queryHistory($gameVariables.value(esm_inputAmountVar)); break;
                case 'QueryFeeRate':
                    const output = Number(args.outputVar || 0);
                    this.esm_queryFeeRate(output);
                    break;
                case 'UpdatePrice': this.esm_updateAllPrices(1); break;
                case 'CheckTimeUpdate': this.esm_checkAndUpdatePrices(); break;
                case 'GlobalMarket':
                    this.esm_setGlobalMarket(args.prob, args.upAmp, args.downAmp, args.durationYears, args.durationMonths, args.durationDays);
                    break;
                case 'SingleMarket':
                    this.esm_setSingleMarket(args.code, args.prob, args.upAmp, args.downAmp, args.durationYears, args.durationMonths, args.durationDays);
                    break;
                case 'DepositMargin': this.esm_depositMargin($gameVariables.value(esm_inputAmountVar)); break;
                case 'WithdrawMargin': this.esm_withdrawMargin($gameVariables.value(esm_inputAmountVar)); break;
                case 'OpenLong': 
                    const longCode = $gameVariables.value(esm_inputCodeVar).toString().padStart(3, '0');
                    this.esm_openPosition('long', longCode, $gameVariables.value(esm_inputAmountVar), $gameVariables.value(esm_contractInputLeverageVar)); 
                    break;
                case 'OpenShort': 
                    const shortCode = $gameVariables.value(esm_inputCodeVar).toString().padStart(3, '0');
                    this.esm_openPosition('short', shortCode, $gameVariables.value(esm_inputAmountVar), $gameVariables.value(esm_contractInputLeverageVar)); 
                    break;
                case 'ClosePosition': 
                    const closeCode = $gameVariables.value(esm_inputCodeVar).toString().padStart(3, '0');
                    this.esm_closePosition(closeCode, $gameVariables.value(esm_inputAmountVar)); 
                    break;
                case 'CloseAllPositions': this.esm_closeAllPositions(); break;
                case 'QueryPositions': this.esm_queryPositions(); break;
                case 'QuerySinglePosition': this.esm_querySinglePosition(); break;
                case 'PlaceOrder': 
                    this.esm_placeOrder(args.orderType, args.direction, args.code, Number(args.quantity), Number(args.price)); 
                    break;
                case 'CancelOrder': this.esm_cancelOrder(Number(args.orderId)); break;
                case 'SetStopLevels':
                    const tpCode = String(args.code || $gameVariables.value(esm_inputCodeVar)).padStart(3, '0');
                    const tpDirection = args.direction;
                    const tpPrice = Number($gameVariables.value(esm_contractInputTakeProfitVar)) || Number(args.takeProfitPrice) || 0;
                    const slPrice = Number($gameVariables.value(esm_contractInputStopLossVar)) || Number(args.stopLossPrice) || 0;
                    this.esm_setStopLevels(tpCode, tpDirection, tpPrice, slPrice);
                    break;
                case 'QueryFundingRate':
                    const outputLong = Number(args.outputLongVar || 0);
                    const outputShort = Number(args.outputShortVar || 0);
                    this.esm_queryFundingRate(outputLong, outputShort);
                    break;
                case 'SetFundingRate':
                    this.esm_setFundingRateBounds(args.longMin, args.longMax, args.shortMin, args.shortMax);
                    break;
                case 'QueryContractHistory':
                    const num = Number(args.numPeriods || 10);
                    this.esm_queryContractHistory(num);
                    break;
            }
        }

        esm_queryFundingRate(outputLongVar, outputShortVar) {
            this.esm_checkAndUpdateFundingRates();
            const longRate = this.esm_longFundingRate || 0;
            const shortRate = this.esm_shortFundingRate || 0;
            $gameMessage.add(esm_messages.fundingRateMsg.replace('%1', longRate.toFixed(5)).replace('%2', shortRate.toFixed(5)));
            if (outputLongVar > 0) $gameVariables.setValue(outputLongVar, longRate);
            if (outputShortVar > 0) $gameVariables.setValue(outputShortVar, shortRate);
        }

        // 辅助方法：计算文本宽度（用于公司信息分行）
        textWidth(text) {
            const context = document.createElement('canvas').getContext('2d');
            context.font = '24px ' + $gameSystem.mainFontFace();
            return context.measureText(text).width;
        }
    }

    const esm_manager = new ExpandStockManager();

    // 指令注册
    PluginManager.registerCommand('Expand_Stockmarket', 'DepositCash', () => esm_manager.esm_execCommand('DepositCash'));
    PluginManager.registerCommand('Expand_Stockmarket', 'WithdrawCash', () => esm_manager.esm_execCommand('WithdrawCash'));
    PluginManager.registerCommand('Expand_Stockmarket', 'BuyStock', () => esm_manager.esm_execCommand('BuyStock'));
    PluginManager.registerCommand('Expand_Stockmarket', 'SellStock', () => esm_manager.esm_execCommand('SellStock'));
    PluginManager.registerCommand('Expand_Stockmarket', 'ClearAllHoldings', () => esm_manager.esm_execCommand('ClearAllHoldings'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryAllHoldings', () => esm_manager.esm_execCommand('QueryAllHoldings'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QuerySingleHolding', () => esm_manager.esm_execCommand('QuerySingleHolding'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryStockPrice', () => esm_manager.esm_execCommand('QueryStockPrice'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryCompanyInfo', () => esm_manager.esm_execCommand('QueryCompanyInfo'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryHistory', () => esm_manager.esm_execCommand('QueryHistory'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryFeeRate', args => esm_manager.esm_execCommand('QueryFeeRate', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'UpdatePrice', () => esm_manager.esm_execCommand('UpdatePrice'));
    PluginManager.registerCommand('Expand_Stockmarket', 'CheckTimeUpdate', () => esm_manager.esm_execCommand('CheckTimeUpdate'));
    PluginManager.registerCommand('Expand_Stockmarket', 'GlobalMarket', args => esm_manager.esm_execCommand('GlobalMarket', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'SingleMarket', args => esm_manager.esm_execCommand('SingleMarket', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'DepositMargin', () => esm_manager.esm_execCommand('DepositMargin'));
    PluginManager.registerCommand('Expand_Stockmarket', 'WithdrawMargin', () => esm_manager.esm_execCommand('WithdrawMargin'));
    PluginManager.registerCommand('Expand_Stockmarket', 'OpenLong', () => esm_manager.esm_execCommand('OpenLong'));
    PluginManager.registerCommand('Expand_Stockmarket', 'OpenShort', () => esm_manager.esm_execCommand('OpenShort'));
    PluginManager.registerCommand('Expand_Stockmarket', 'ClosePosition', () => esm_manager.esm_execCommand('ClosePosition'));
    PluginManager.registerCommand('Expand_Stockmarket', 'CloseAllPositions', () => esm_manager.esm_execCommand('CloseAllPositions'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryPositions', () => esm_manager.esm_execCommand('QueryPositions'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QuerySinglePosition', () => esm_manager.esm_execCommand('QuerySinglePosition'));
    PluginManager.registerCommand('Expand_Stockmarket', 'PlaceOrder', args => esm_manager.esm_execCommand('PlaceOrder', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'CancelOrder', args => esm_manager.esm_execCommand('CancelOrder', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'SetStopLevels', args => esm_manager.esm_execCommand('SetStopLevels', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryFundingRate', args => esm_manager.esm_execCommand('QueryFundingRate', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'SetFundingRate', args => esm_manager.esm_execCommand('SetFundingRate', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryContractHistory', args => esm_manager.esm_execCommand('QueryContractHistory', args));

    // 存档扩展
    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        if (esm_useSaveObject) {
            contents.esm_stockmarket = {
                positions: esm_manager.esm_positions,
                orders: esm_manager.esm_orders,
                ohlcHistory: esm_manager.esm_ohlcHistory
            };
        }
        return contents;
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        if (esm_useSaveObject && contents.esm_stockmarket) {
            esm_manager.esm_positions = esm_manager.esm_initPositions(contents.esm_stockmarket.positions || {});
            esm_manager.esm_orders = contents.esm_stockmarket.orders || [];
            esm_manager.esm_ohlcHistory = contents.esm_stockmarket.ohlcHistory || {};
            esm_manager.esm_orderIdCounter = esm_manager.esm_orders.length > 0 ? Math.max(...esm_manager.esm_orders.map(o => o.id)) + 1 : 0;
        }
    };

    // 初始化
    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        esm_ensureChangedVariables();
        esm_manager.esm_load();
        esm_manager.esm_save();
        if (esm_debugLog) console.log('Expand_Stockmarket: Game objects created, manager loaded.');
    };

    const _DataManager_loadGame = DataManager.loadGame;
    DataManager.loadGame = function(savefileId) {
        const result = _DataManager_loadGame.call(this, savefileId);
        if (result) {
            setTimeout(() => {
                esm_ensureChangedVariables();
                esm_manager.esm_load();
                esm_manager.esm_save();
                if (esm_debugLog) console.log('Expand_Stockmarket: Post-load save ensured.');
            }, 0);
        }
        return result;
    };

    // 地图钩子
    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        if (esm_updateTrigger === 'auto' || esm_updateTrigger === 'both') {
            esm_manager.esm_checkAndUpdatePrices();
            esm_manager.esm_checkAndUpdateFundingRates();
            if (esm_debugLog) console.log('Expand_Stockmarket: Scene_Map start triggered price/funding update.');
        }
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (esm_updateTrigger === 'auto' || esm_updateTrigger === 'both') {
            esm_manager.esm_checkAndUpdatePrices();
            esm_manager.esm_checkAndUpdateFundingRates();
            if (esm_debugLog) console.log('Expand_Stockmarket: Scene_Map update triggered price/funding update.');
        }
    };

    // 暴露 esm_manager 到全局
    window.esm_manager = esm_manager;
    window.esm_stockList = esm_stockList;
    window.esm_messages = esm_messages;

})();
