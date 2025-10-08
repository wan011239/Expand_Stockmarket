//=============================================================================
// Expand_Stockmarket.js
//=============================================================================
/*
插件名：Expand_Stockmarket
用到的原生内容：扩展了Scene_Map.prototype.start（用alias）、Scene_Map.prototype.update（用alias）、DataManager.makeSaveContents（用alias）、DataManager.extractSaveContents（用alias）、DataManager.createGameObjects（用alias）、DataManager.loadGame（用alias）；注册了PluginManager.registerCommand命令。
*/
// 作者: 自定义 (优化版 by Grok, 合并版 by Grok)
// 版本: 1.0.24
// 描述: RPG Maker MZ 股市系统插件，支持账户管理、股票交易、价格动态更新，与Time_System时间插件绑定。
//       扩展: 新增合约功能，包括杠杆、多空方向、止损、爆仓、资金费率、委托单等。合约独立账户，从变量71开始，使用原股票价格，无休市限制。
//       合约核心: 杠杆(1-10x)、多空、止损/爆仓检查、资金费率扣取、委托单(市价/限价/止盈/止损)。
//       新增: 集成图形界面，提供可视化窗口操作，支持鼠标/键盘交互。通过插件指令 OpenStockWindow 调用。
//       其他功能不变。
// 使用条款: 仅限RPG Maker MZ项目使用，可自由修改。
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 股市系统，账户与股票交易 (增强版+合约扩展+图形界面)
 * @author 自定义
 *
 * @param variables
 * @text 1. 变量设置
 * @type struct<VariablesStruct>
 * @default {"timeSettings":"{\"yearVar\":\"23\",\"monthVar\":\"24\",\"dayVar\":\"25\",\"weekVar\":\"27\",\"periodVar\":\"28\",\"hourVar\":\"26\"}","stockAccountVar":"62","stockHoldingsVar":"63","stockPricesVar":"64","stockAvgBuyPricesVar":"65","tradeLogVar":"66","priceHistoryVar":"67","inputAmountVar":"69","inputCodeVar":"68","contractMarginVar":"71","contractPositionsVar":"72","contractInputLeverageVar":"75","contractInputStopLossVar":"76","contractInputTakeProfitVar":"77","contractOrdersVar":"73","contractHistoryVar":"78","contractLongFundingRateVar":"79","contractShortFundingRateVar":"80","cumulativeDepositVar":"83"}

 * @param volatility
 * @text 2. 涨跌设置
 * @type struct<VolatilityStruct>
 * @default {"updateCycle":"period","updateTrigger":"both","crossCycleRule":"sequential","globalUpProb":"50","maxUpAmp":"10","maxDownAmp":"10","historyPeriods":"30","stThreshold":"5"}

 * @param messages
 * @text 3. 文本设置
 * @type struct<MessagesStruct>
 * @default {"closedMessage":"当前时段休市，请在上午或下午再来","insufficientGold":"金币不足！您只有 %1 金币，无法存入 %2。","invalidAmount":"无效金额，请输入正数。","depositSuccess":"存入成功！资金账户余额：%1 金币。","depositExceed":"金币不足，只有 %1，已存入全部。","withdrawInsufficient":"账户余额不足！资金账户只有 %1 金币，无法取出 %2。","withdrawSuccess":"取出成功！玩家金币增加 %1。","withdrawExceed":"余额不足，只有 %1，已取出全部。","buyInsufficient":"账户余额或数量不足！","buySuccess":"购买成功！持有%1：%2股。","sellInsufficient":"持有数量不足！","sellSuccess":"出售成功！账户增加 %1 金币。","noHoldings":"您目前没有持有任何股票。","stockNotFound":"股票代码不存在，查询为空。","invalidStockCode":"无效股票代码！","stPrefix":"ST*","invalidQuantity":"选择正确的数量。","buyFeeInsufficient":"手续费不足！需额外 %1 金币。","buySuccessFee":"手续费：%1 金币。","sellSuccessFee":"（扣手续费 %1）。","feeRateMsg":"当前VIP等级：%1，手续费率：%2 (即%3%)。","marginInsufficient":"保证金不足！","marginTransferSuccess":"转入/转出成功！保证金余额：%1。","marginTransferFee":"手续费：%1。","openPositionSuccess":"开仓成功！方向：%1，数量：%2。","closePositionSuccess":"平仓成功！盈亏：%1。","stopLossTriggered":"止损触发，已自动平仓：%1。","liquidationTriggered":"爆仓强制平仓：%1，剩余保证金：%2。","fundingFeeDeducted":"扣取资金费率：%1。","invalidLeverage":"杠杆超出范围！使用默认值。","invalidPrice":"价格无效！","orderPlaced":"委托单已挂起：%1。","orderExecuted":"委托单执行：%1。","orderCancelled":"委托单取消：%1。","noPositions":"无持仓合约。","fundingRateMsg":"当前做多费率：%1，做空费率：%2。","stopLevelsSet":"止盈止损设置成功：止盈%1，止损%2。","noHistory":"无合约历史记录。","closedTradeMessage":"非营业时间，请开市再试！"}

 * @param business
 * @text 4. 营业设置
 * @type struct<BusinessStruct>
 * @default {"enableBusinessHours":"true","businessPeriods":"[\"2\",\"3\"]","businessWeeks":"[\"1\",\"2\",\"3\",\"4\",\"5\"]"}

 * @param stock1
 * @text 5. 代码001
 * @type struct<StockInfo>
 * @default {"code":"001","name":"正大科技","basePrice":"75","upProb":"0","upAmp":"10","downAmp":"10","periodBias":"none","cycleBias":"none","companyInfo":"","infoWidth":"25"}
 * @desc 固定代码1配置。

 * @param stock2
 * @text 6. 代码002
 * @type struct<StockInfo>
 * @default {"code":"002","name":"深红实业","basePrice":"155","upProb":"0","upAmp":"10","downAmp":"10","periodBias":"none","cycleBias":"none","companyInfo":"","infoWidth":"25"}
 * @desc 固定代码2配置。

 * @param stock3
 * @text 7. 代码003
 * @type struct<StockInfo>
 * @default {"code":"003","name":"东方制药","basePrice":"440","upProb":"0","upAmp":"10","downAmp":"10","periodBias":"none","cycleBias":"none","companyInfo":"","infoWidth":"25"}
 * @desc 固定代码3配置。

 * @param customStocks
 * @text 8. 自定义代码
 * @type struct<StockInfo>[]
 * @default []
 * @desc 添加额外股票。点击+添加新项，初始为空(填写code等)。

 * @param tradeSettings
 * @text 9. 交易设置
 * @type struct<TradeSettingsStruct>
 * @default {"vipVar":"74","feeRateVar":"70","thresholds":"{\"vip1\":\"500000\",\"vip2\":\"2000000\",\"vip3\":\"5000000\",\"vip4\":\"10000000\",\"vip5\":\"20000000\",\"vip6\":\"50000000\",\"vip7\":\"100000000\"}","feeRates":"{\"vip0\":\"0.005\",\"vip1\":\"0.004\",\"vip2\":\"0.003\",\"vip3\":\"0.001\",\"vip4\":\"0.0008\",\"vip5\":\"0.0005\",\"vip6\":\"0.0003\",\"vip7\":\"0.0001\"}"}

 * @param contractSettings
 * @text 10. 合约设置
 * @type struct<ContractSettingsStruct>
 * @default {"initialMargin":"0","defaultLeverage":"5","maxLeverage":"10","liquidationThreshold":"1.0","transactionFeeRate":"0.001","longFundingRate":"0.0001","shortFundingRate":"0.0001","useSaveObject":"true","debugLog":"false"}

 * @param menuCommandName
 * @text 菜单命令名称
 * @type string
 * @default 股市
 * @desc 在主菜单添加的命令名称。

 * @param enableMenuEntry
 * @text 启用菜单入口
 * @type boolean
 * @default true
 * @desc 是否在主菜单添加股市入口。

 * @param windowSettings
 * @text 窗口设置
 * @type struct<WindowSettingsStruct>
 * @default {"width":"800","height":"600","offsetX":"0","offsetY":"0"}

 * @param messageSettings
 * @text 消息窗口设置
 * @type struct<WindowSettingsStruct>
 * @default {"width":"600","height":"430","offsetX":"200","offsetY":"170"}

 * @param queryListSettings
 * @text 查询列表窗口设置
 * @type struct<WindowSettingsStruct>
 * @default {"width":"200","height":"430","offsetX":"0","offsetY":"170"}

 * @param stockListSettings
 * @text 股票列表窗口设置
 * @type struct<WindowSettingsStruct>
 * @default {"width":"600","height":"430","offsetX":"200","offsetY":"170"}

 * @param infoWindowSettings
 * @text 信息窗口设置
 * @type struct<WindowSettingsStruct>
 * @default {"width":"800","height":"170","offsetX":"0","offsetY":"0"}

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
 * @text 设置资金费率
 * @desc 调整做多和做空资金费率。
 * @arg longRate
 * @text 做多费率
 * @type number
 * @default 0.0001
 * @desc 新做多费率（小数，如0.0001=0.01%）。
 * @arg shortRate
 * @text 做空费率
 * @type number
 * @default 0.0001
 * @desc 新做空费率（小数，如0.0001=0.01%）。

 * @command QueryContractHistory
 * @text 查询合约历史
 * @desc 查询单个合约的OHLC历史。输入代码到68。
 * @arg numPeriods
 * @text 显示周期数
 * @type number
 * @default 10
 * @desc 显示最近N个周期的历史（默认10）。

 * @command OpenStockWindow
 * @text 打开股市窗口
 * @desc 事件中调用打开图形界面。

 * @help 使用说明：
 * - 需Time_System插件，变量ID匹配。
 * - 交易/更新仅营业时；ST: 价格<5加"ST*"前缀，>=5恢复。
 * - 代码列表: 固定3支，自定义点击+号添加空项，填写code/name等；"公司信息"为多行文本框，支持详细描述(输入时用Enter换行，游戏显示智能分行)；"信息设置"自定义每行字符数(默认25)。
 * - 存入/取出: 0或负用无效提示；>可用自动存/取全部，并用自定义消息。
 * - 购买/出售/个股查询/历史查询/公司信息: 用事件“数值输入”存代码到var68(3位，如001)，数量/天数到var69，再调用指令。
 * - 查询持仓: QueryAllHoldings(概览)，QuerySingleHolding(个股，输入code)。
 * - 查询费率: QueryFeeRate(显示VIP+费率，可存变量)；手续费率自动存入var70。
 * - 行情: GlobalMarket(全局)/SingleMarket(个股)，加成临时buff，持续年月日(总更新次数≈天数)。
 * - 读档: 自动init，时间回退重算delta；修复save失败导致0。
 * - 事件中时间变化后，用"CheckTimeUpdate"指令手动更新股价(或自动每秒检查)。
 * - 调试: F8查看日志(新增错误日志)。
 * - 新: 个股查询支持短代码(1→001)/存取优化/兼容性提升(独立save try)/读档修复/输入0提示/实时更新/持仓修复/循环时间修复/行情buff/持仓查询优化/VIP+手续费/费率查询/手续费变量/历史交易日优化/公司信息参数&指令(多行输入+智能分行+自定义宽度)。
 * - 合约扩展: 无休市限制，使用原股票价格。输入变量: 数量69、代码68、杠杆75。持仓/委托存变量73(或存档对象)。每小时检查止损/爆仓/费率/委托执行。
 * - 图形界面: 主菜单添加“股市”入口（可选关闭），或事件调用 OpenStockWindow。
 * - 界面: 信息面板（余额/VIP等），查询列表（账户/交易/查询/合约/退出），股票列表（点击操作）。
 * - 操作: 鼠标点击/键盘选择，数字输入窗口支持鼠标。
 * - 查询结果在专用消息窗口显示。
 * - 兼容: 不修改核心窗口，仅新增类。
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
 * @text 保证金账户
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
 * @default 10

 * @param maxDownAmp
 * @text 最大跌幅(%)
 * @type number
 * @min 1
 * @max 100
 * @default 10

 * @param historyPeriods
 * @text 历史保留(天)
 * @type number
 * @min 1
 * @max 100
 * @default 30

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
 * @default 转入/转出成功！保证金余额：%1。

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
 * @min 1
 * @max 100
 * @default 10

 * @param downAmp
 * @text 下跌幅度(%)
 * @type number
 * @min 1
 * @max 100
 * @default 10

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
 * @option 月首周上涨+30%
 * @value month_first_up30
 * @option 周末下跌+25%
 * @value week_last_down25
 * @default none

 */

/*~struct~TradeSettingsStruct:
 * @param vipVar
 * @text VIP变量ID
 * @type variable
 * @default 74
 * @desc 存储当前VIP等级(0-5)。

 * @param feeRateVar
 * @text 手续费率变量ID
 * @type variable
 * @default 70
 * @desc 存储当前手续费率(小数，如0.008)。

 * @param thresholds
 * @text VIP阈值
 * @type string
 * @default {"vip1":500000,"vip2":2000000,"vip3":5000000,"vip4":10000000,"vip5":20000000,"vip6":50000000,"vip7":100000000}
 * @desc JSON: {vip1:500000, vip2:2000000, ...}，总资产超过即升级。

 * @param feeRates
 * @text 手续费率
 * @type string
 * @default {"vip0":0.005,"vip1":0.004,"vip2":0.003,"vip3":0.001,"vip4":0.0008,"vip5":0.0005,"vip6":0.0003,"vip7":0.0001}
 * @desc JSON: {vip0:0.005, vip1:0.004, ...}，小数形式(0.005=0.5%)。
 */

/*~struct~ContractSettingsStruct:
 * @param initialMargin
 * @text 初始保证金
 * @type number
 * @default 0

 * @param defaultLeverage
 * @text 默认杠杆
 * @type number
 * @default 5

 * @param maxLeverage
 * @text 最大杠杆
 * @type number
 * @default 10

 * @param liquidationThreshold
 * @text 爆仓阈值
 * @type number
 * @default 1.0

 * @param transactionFeeRate
 * @text 交易手续费率
 * @type number
 * @default 0.001

 * @param longFundingRate
 * @text 长仓费率
 * @type number
 * @default 0.0001

 * @param shortFundingRate
 * @text 短仓费率
 * @type number
 * @default 0.0001

 * @param useSaveObject
 * @text 使用存档对象
 * @type boolean
 * @default true

 * @param debugLog
 * @text 调试日志
 * @type boolean
 * @default false
 */

/*~struct~WindowSettingsStruct:
 * @param width
 * @text 窗口宽度
 * @type number
 * @min 100
 * @default 800

 * @param height
 * @text 窗口高度
 * @type number
 * @min 100
 * @default 600

 * @param offsetX
 * @text X轴偏移
 * @type number
 * @default 0

 * @param offsetY
 * @text Y轴偏移
 * @type number
 * @default 0
 */

(function() {
    'use strict';

    // 解析参数
    const parameters = PluginManager.parameters('Expand_Stockmarket');
    let esm_variables = safeJsonParse(parameters['variables'] || '{}');
    let esm_volatility = safeJsonParse(parameters['volatility'] || '{}');
    let esm_messages = safeJsonParse(parameters['messages'] || '{}');
    let esm_business = safeJsonParse(parameters['business'] || '{}');
    let esm_stock1 = safeJsonParse(parameters['stock1'] || '{}');
    let esm_stock2 = safeJsonParse(parameters['stock2'] || '{}');
    let esm_stock3 = safeJsonParse(parameters['stock3'] || '{}');
    let esm_customStocks = (JSON.parse(parameters['customStocks'] || '[]') || []).map(safeJsonParse);
    let esm_tradeSettings = safeJsonParse(parameters['tradeSettings'] || '{}');
    let esm_contractSettings = safeJsonParse(parameters['contractSettings'] || '{}');

    const esmw_menuCommandName = parameters['menuCommandName'] || '股市';
    const esmw_enableMenuEntry = parameters['enableMenuEntry'] === 'true';
    const windowSettings = JSON.parse(parameters['windowSettings'] || '{"width":"800","height":"600","offsetX":"0","offsetY":"0"}');
    const messageSettings = JSON.parse(parameters['messageSettings'] || '{"width":"600","height":"430","offsetX":"200","offsetY":"170"}');
    const sceneWidth = Number(windowSettings.width) || 800;
    const sceneHeight = Number(windowSettings.height) || 600;
    const offsetX = Number(windowSettings.offsetX) || 0;
    const offsetY = Number(windowSettings.offsetY) || 0;
    const msgWidth = Number(messageSettings.width) || 600;
    const msgHeight = Number(messageSettings.height) || 430;
    const msgOffsetX = Number(messageSettings.offsetX) || 200;
    const msgOffsetY = Number(messageSettings.offsetY) || 170;

    // 新增参数解析
    const queryListSettings = JSON.parse(parameters['queryListSettings'] || '{"width":"200","height":"430","offsetX":"0","offsetY":"170"}');
    const qlWidth = Number(queryListSettings.width) || 200;
    const qlHeight = Number(queryListSettings.height) || 430;
    const qlOffsetX = Number(queryListSettings.offsetX) || 0;
    const qlOffsetY = Number(queryListSettings.offsetY) || 170;

    const stockListSettings = JSON.parse(parameters['stockListSettings'] || '{"width":"600","height":"430","offsetX":"200","offsetY":"170"}');
    const slWidth = Number(stockListSettings.width) || 600;
    const slHeight = Number(stockListSettings.height) || 430;
    const slOffsetX = Number(stockListSettings.offsetX) || 200;
    const slOffsetY = Number(stockListSettings.offsetY) || 170;

    const infoWindowSettings = JSON.parse(parameters['infoWindowSettings'] || '{"width":"800","height":"170","offsetX":"0","offsetY":"0"}');
    const infoWidth = Number(infoWindowSettings.width) || 800;
    const infoHeight = Number(infoWindowSettings.height) || 170;
    const infoOffsetX = Number(infoWindowSettings.offsetX) || 0;
    const infoOffsetY = Number(infoWindowSettings.offsetY) || 0;

    // 安全JSON解析
    function safeJsonParse(str) {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.warn('Expand_Stockmarket: Invalid JSON, using default.', e);
            return {};
        }
    }

    // 时间设置
    const esm_timeSettings = safeJsonParse(esm_variables.timeSettings || '{}');
    const esm_yearVar = Number(esm_timeSettings.yearVar || 23);
    const esm_monthVar = Number(esm_timeSettings.monthVar || 24);
    const esm_dayVar = Number(esm_timeSettings.dayVar || 25);
    const esm_weekVar = Number(esm_timeSettings.weekVar || 27);
    const esm_periodVar = Number(esm_timeSettings.periodVar || 28);
    const esm_hourVar = Number(esm_timeSettings.hourVar || 26);

    // 变量ID
    const esm_stockAccountVar = Number(esm_variables.stockAccountVar || 62);
    const esm_stockHoldingsVar = Number(esm_variables.stockHoldingsVar || 63);
    const esm_stockPricesVar = Number(esm_variables.stockPricesVar || 64);
    const esm_stockAvgBuyPricesVar = Number(esm_variables.stockAvgBuyPricesVar || 65);
    const esm_tradeLogVar = Number(esm_variables.tradeLogVar || 66);
    const esm_priceHistoryVar = Number(esm_variables.priceHistoryVar || 67);
    const esm_inputAmountVar = Number(esm_variables.inputAmountVar || 69);
    const esm_inputCodeVar = Number(esm_variables.inputCodeVar || 68);
    const esm_vipVar = Number(esm_tradeSettings.vipVar || 74);
    const esm_feeRateVar = Number(esm_tradeSettings.feeRateVar || 70);
    const esm_cumulativeDepositVar = Number(esm_variables.cumulativeDepositVar || 83);

    // 合约变量
    const esm_marginVar = Number(esm_variables.contractMarginVar || 71);
    const esm_positionsVar = Number(esm_variables.contractPositionsVar || 72);
    const esm_contractInputLeverageVar = Number(esm_variables.contractInputLeverageVar || 75);
    const esm_contractInputStopLossVar = Number(esm_variables.contractInputStopLossVar || 76);
    const esm_contractInputTakeProfitVar = Number(esm_variables.contractInputTakeProfitVar || 77);
    const esm_ordersVar = Number(esm_variables.contractOrdersVar || 73);
    const esm_ohlcHistoryVar = Number(esm_variables.contractHistoryVar || 78);
    const esm_longFundingRateVar = Number(esm_variables.contractLongFundingRateVar || 79);
    const esm_shortFundingRateVar = Number(esm_variables.contractShortFundingRateVar || 80);

    // 涨跌设置
    const esm_updateCycle = esm_volatility.updateCycle || 'period';
    const esm_updateTrigger = esm_volatility.updateTrigger || 'both';
    const esm_crossCycleRule = esm_volatility.crossCycleRule || 'sequential';
    const esm_globalUpProb = Number(esm_volatility.globalUpProb || 50);
    const esm_maxUpAmp = Number(esm_volatility.maxUpAmp || 10);
    const esm_maxDownAmp = Number(esm_volatility.maxDownAmp || 10);
    const esm_historyPeriods = Number(esm_volatility.historyPeriods || 30);
    const esm_stThreshold = Number(esm_volatility.stThreshold || 5);

    // 营业设置
    const esm_enableBusinessHours = esm_business.enableBusinessHours === 'true';
    const esm_businessPeriods = JSON.parse(esm_business.businessPeriods || '[]').map(String);
    const esm_businessWeeks = JSON.parse(esm_business.businessWeeks || '[]').map(String);

    // VIP与手续费
    const esm_vipThresholds = safeJsonParse(esm_tradeSettings.thresholds || '{}');
    const esm_feeRates = safeJsonParse(esm_tradeSettings.feeRates || '{}');

    // 合约设置
    const esm_initialMargin = Number(esm_contractSettings.initialMargin || 0);
    const esm_defaultLeverage = Number(esm_contractSettings.defaultLeverage || 5);
    const esm_maxLeverage = Number(esm_contractSettings.maxLeverage || 10);
    const esm_liquidationThreshold = Number(esm_contractSettings.liquidationThreshold || 1.0);
    const esm_transactionFeeRate = Number(esm_contractSettings.transactionFeeRate || 0.001);
    const esm_longFundingRateInit = Number(esm_contractSettings.longFundingRate || 0.0001);
    const esm_shortFundingRateInit = Number(esm_contractSettings.shortFundingRate || 0.0001);
    const esm_useSaveObject = esm_contractSettings.useSaveObject === 'true';
    const esm_debugLog = esm_contractSettings.debugLog === 'true';

    // 股票列表
    const esm_stockList = [esm_stock1, esm_stock2, esm_stock3, ...esm_customStocks].filter(stock => stock.code && stock.name && stock.basePrice);
    esm_stockList.forEach(stock => {
        stock.code = stock.code.padStart(3, '0');
        stock.basePrice = Number(stock.basePrice || 100);
        stock.upProb = Number(stock.upProb || 0);
        stock.upAmp = Number(stock.upAmp || esm_maxUpAmp);
        stock.downAmp = Number(stock.downAmp || esm_maxDownAmp);
        stock.periodBias = stock.periodBias || 'none';
        stock.cycleBias = stock.cycleBias || 'none';
        stock.displayName = stock.name;
        stock.companyInfo = stock.companyInfo || '';
        stock.infoWidth = Number(stock.infoWidth || 25);
    });

    // 全局行情buff
    let esm_globalMarketBuff = { prob: 0, upAmp: 0, downAmp: 0, remainingUpdates: 0 };

    // 个股行情buff
    let esm_singleMarketBuffs = {};

    // 确保变量变化时更新
    function esm_ensureChangedVariables() {
        esm_stockList.forEach(stock => {
            const code = stock.code;
            const price = esm_manager.esm_prices[code];
            if (price < esm_stThreshold) {
                if (!stock.displayName.startsWith(esm_messages.stPrefix)) {
                    stock.displayName = esm_messages.stPrefix + stock.name;
                }
            } else {
                if (stock.displayName.startsWith(esm_messages.stPrefix)) {
                    stock.displayName = stock.name;
                }
            }
        });
    }

    class ExpandStockManager {
        constructor() {
            this.esm_account = 0;
            this.esm_holdings = {};
            this.esm_prices = {};
            this.esm_avgBuyPrices = {};
            this.esm_tradeLog = [];
            this.esm_history = {};
            this.esm_lastTime = { year: 0, month: 0, day: 0, week: 0, period: 0, hour: 0 };
            this.esm_lastUpdateTime = null;
            this.esm_vip = 0;
            this.esm_feeRate = esm_feeRates.vip0 || 0.005;
            this.esm_cumulativeDeposit = 0;
            this.esm_margin = esm_initialMargin;
            this.esm_positions = this.esm_initPositions();
            this.esm_orders = [];
            this.esm_orderIdCounter = 0;
            this.esm_ohlcHistory = {};
            this.esm_longFundingRate = esm_longFundingRateInit;
            this.esm_shortFundingRate = esm_shortFundingRateInit;
        }

        esm_initPositions(positions = {}) {
            const init = {};
            esm_stockList.forEach(stock => {
                init[stock.code] = { long: { quantity: 0 }, short: { quantity: 0 } };
            });
            Object.keys(positions).forEach(code => {
                if (init[code]) {
                    init[code].long = positions[code].long || { quantity: 0 };
                    init[code].short = positions[code].short || { quantity: 0 };
                }
            });
            return init;
        }

        esm_load() {
            try {
                this.esm_account = Number($gameVariables.value(esm_stockAccountVar)) || 0;
                this.esm_holdings = safeJsonParse($gameVariables.value(esm_stockHoldingsVar) || '{}');
                this.esm_prices = safeJsonParse($gameVariables.value(esm_stockPricesVar) || '{}');
                this.esm_avgBuyPrices = safeJsonParse($gameVariables.value(esm_stockAvgBuyPricesVar) || '{}');
                this.esm_tradeLog = safeJsonParse($gameVariables.value(esm_tradeLogVar) || '[]');
                this.esm_history = safeJsonParse($gameVariables.value(esm_priceHistoryVar) || '{}');
                this.esm_cumulativeDeposit = Number($gameVariables.value(esm_cumulativeDepositVar)) || 0;
                this.esm_margin = Number($gameVariables.value(esm_marginVar)) || esm_initialMargin;
                if (!esm_useSaveObject) {
                    this.esm_positions = safeJsonParse($gameVariables.value(esm_positionsVar) || '{}');
                    this.esm_orders = safeJsonParse($gameVariables.value(esm_ordersVar) || '[]');
                    this.esm_ohlcHistory = safeJsonParse($gameVariables.value(esm_ohlcHistoryVar) || '{}');
                }
                this.esm_longFundingRate = Number($gameVariables.value(esm_longFundingRateVar)) || esm_longFundingRateInit;
                this.esm_shortFundingRate = Number($gameVariables.value(esm_shortFundingRateVar)) || esm_shortFundingRateInit;
                this.esm_positions = this.esm_initPositions(this.esm_positions);
                this.esm_orderIdCounter = this.esm_orders.length > 0 ? Math.max(...this.esm_orders.map(o => o.id)) + 1 : 0;
                esm_stockList.forEach(stock => {
                    const code = stock.code;
                    if (!this.esm_prices[code]) this.esm_prices[code] = stock.basePrice;
                    if (!this.esm_history[code]) this.esm_history[code] = [];
                    if (!this.esm_ohlcHistory[code]) this.esm_ohlcHistory[code] = [];
                });
                this.esm_lastTime = this.esm_getCurrentTime();
                this.esm_lastUpdateTime = this.esm_getTimeStamp();
                this.esm_calculateVIP();
                $gameVariables.setValue(esm_vipVar, this.esm_vip);
                $gameVariables.setValue(esm_feeRateVar, this.esm_feeRate);
                if (esm_debugLog) console.log('Expand_Stockmarket: Loaded data.');
            } catch (e) {
                console.error('Expand_Stockmarket: Load failed', e);
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
                $gameVariables.setValue(esm_cumulativeDepositVar, this.esm_cumulativeDeposit);
                $gameVariables.setValue(esm_marginVar, this.esm_margin);
                if (!esm_useSaveObject) {
                    $gameVariables.setValue(esm_positionsVar, JSON.stringify(this.esm_positions));
                    $gameVariables.setValue(esm_ordersVar, JSON.stringify(this.esm_orders));
                    $gameVariables.setValue(esm_ohlcHistoryVar, JSON.stringify(this.esm_ohlcHistory));
                }
                $gameVariables.setValue(esm_longFundingRateVar, this.esm_longFundingRate);
                $gameVariables.setValue(esm_shortFundingRateVar, this.esm_shortFundingRate);
                if (esm_debugLog) console.log('Expand_Stockmarket: Saved data.');
            } catch (e) {
                console.error('Expand_Stockmarket: Save failed', e);
            }
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
            return `${time.year}-${time.month.toString().padStart(2, '0')}-${time.day.toString().padStart(2, '0')} 时段${time.period} 小时${time.hour}`;
        }

        esm_isBusinessHour() {
            if (!esm_enableBusinessHours) return true;
            const currentPeriod = $gameVariables.value(esm_periodVar).toString();
            const currentWeek = $gameVariables.value(esm_weekVar).toString();
            return esm_businessPeriods.includes(currentPeriod) && esm_businessWeeks.includes(currentWeek);
        }

        esm_checkAndUpdatePrices() {
            const currentTime = this.esm_getCurrentTime();
            let delta = this.esm_calculateDelta(this.esm_lastTime, currentTime);
            if (delta > 0) {
                this.esm_updateAllPrices(delta);
                this.esm_lastTime = currentTime;
                this.esm_lastUpdateTime = this.esm_getTimeStamp();
                this.esm_checkContractConditions();
            }
        }

        esm_calculateDelta(prev, curr) {
            let delta = 0;
            switch (esm_updateCycle) {
                case 'hour':
                    delta = this.esm_hoursDiff(prev, curr);
                    break;
                case 'period':
                    delta = this.esm_periodsDiff(prev, curr);
                    break;
                case 'day':
                    delta = this.esm_daysDiff(prev.day, curr.day) + this.esm_monthsDiff(prev.month, curr.month) * 30 + this.esm_yearsDiff(prev.year, curr.year) * 360;
                    break;
                case 'week':
                    delta = this.esm_weeksDiff(prev, curr);
                    break;
                case 'month':
                    delta = this.esm_monthsDiff(prev.month, curr.month) + this.esm_yearsDiff(prev.year, curr.year) * 12;
                    break;
            }
            return Math.max(0, delta);
        }

        esm_hoursDiff(prev, curr) {
            let diff = 0;
            diff += this.esm_daysDiff(prev.day, curr.day) * 24;
            diff += this.esm_monthsDiff(prev.month, curr.month) * 720; // 30*24
            diff += this.esm_yearsDiff(prev.year, curr.year) * 8640; // 360*24
            diff += (curr.period - prev.period) * 6; // 假设每个时段6小时
            diff += curr.hour - prev.hour;
            return diff;
        }

        esm_periodsDiff(prev, curr) {
            let diff = 0;
            diff += this.esm_daysDiff(prev.day, curr.day) * 4; // 假设一天4时段
            diff += this.esm_monthsDiff(prev.month, curr.month) * 120; // 30*4
            diff += this.esm_yearsDiff(prev.year, curr.year) * 1440; // 360*4
            diff += curr.period - prev.period;
            return diff;
        }

        esm_daysDiff(prevDay, currDay) {
            return currDay - prevDay;
        }

        esm_monthsDiff(prevMonth, currMonth) {
            return currMonth - prevMonth;
        }

        esm_yearsDiff(prevYear, currYear) {
            return currYear - prevYear;
        }

        esm_weeksDiff(prev, curr) {
            let daysDiff = this.esm_daysDiff(prev.day, curr.day) + this.esm_monthsDiff(prev.month, curr.month) * 30 + this.esm_yearsDiff(prev.year, curr.year) * 360;
            return Math.floor(daysDiff / 7);
        }

        esm_updateAllPrices(delta) {
            esm_stockList.forEach(stock => {
                const code = stock.code;
                let price = this.esm_prices[code];
                for (let i = 0; i < delta; i++) {
                    price = this.esm_updatePrice(stock, price);
                    this.esm_updateHistory(code, price);
                    this.esm_updateOHLC(code, price);
                }
                this.esm_prices[code] = price;
            });
            this.esm_save();
        }

        esm_updatePrice(stock, currentPrice) {
            let upProb = esm_globalUpProb + stock.upProb + esm_globalMarketBuff.prob;
            const singleBuff = esm_singleMarketBuffs[stock.code] || { prob: 0, upAmp: 0, downAmp: 0 };
            upProb += singleBuff.prob;
            const upAmp = Math.min(100, esm_maxUpAmp + stock.upAmp + esm_globalMarketBuff.upAmp + singleBuff.upAmp);
            const downAmp = Math.min(100, esm_maxDownAmp + stock.downAmp + esm_globalMarketBuff.downAmp + singleBuff.downAmp);
            const isUp = Math.random() * 100 < upProb;
            const amp = isUp ? Math.random() * upAmp : Math.random() * downAmp;
            let newPrice = currentPrice * (1 + (isUp ? amp : -amp) / 100);
            newPrice = Math.max(0.01, Math.floor(newPrice * 100) / 100);
            return newPrice;
        }

        esm_updateHistory(code, price) {
            if (!this.esm_history[code]) this.esm_history[code] = [];
            const hist = this.esm_history[code];
            const currentDay = this.esm_getCurrentTime().day;
            if (hist.length === 0 || hist[0].day !== currentDay) {
                hist.unshift({ day: currentDay, open: price, close: price, avg: price });
            } else {
                hist[0].close = price;
                hist[0].avg = (hist[0].open + price) / 2;
            }
            if (hist.length > esm_historyPeriods) hist.pop();
        }

        esm_updateOHLC(code, price) {
            if (!this.esm_ohlcHistory[code]) this.esm_ohlcHistory[code] = [];
            const ohlc = this.esm_ohlcHistory[code];
            const currentPeriod = this.esm_getTimeStamp();
            if (ohlc.length === 0 || ohlc[0].period !== currentPeriod) {
                ohlc.unshift({ period: currentPeriod, open: price, high: price, low: price, close: price });
            } else {
                ohlc[0].high = Math.max(ohlc[0].high, price);
                ohlc[0].low = Math.min(ohlc[0].low, price);
                ohlc[0].close = price;
            }
            if (ohlc.length > esm_historyPeriods) ohlc.pop();
        }

        esm_setGlobalMarket(prob, upAmp, downAmp, years, months, days) {
            const updates = years * 1440 + months * 120 + days * 4; // 假设一天4更新
            esm_globalMarketBuff = { prob: Number(prob), upAmp: Number(upAmp), downAmp: Number(downAmp), remainingUpdates: updates };
        }

        esm_setSingleMarket(code, prob, upAmp, downAmp, years, months, days) {
            const updates = years * 1440 + months * 120 + days * 4;
            esm_singleMarketBuffs[code] = { prob: Number(prob), upAmp: Number(upAmp), downAmp: Number(downAmp), remainingUpdates: updates };
        }

        esm_calculateVIP() {
            let totalAssets = this.esm_account;
            Object.keys(this.esm_holdings).forEach(code => {
                totalAssets += this.esm_holdings[code] * this.esm_prices[code];
            });
            this.esm_vip = 0;
            for (let level = 1; level <= 7; level++) {
                const threshold = esm_vipThresholds[`vip${level}`] || Infinity;
                if (totalAssets >= threshold) this.esm_vip = level;
            }
            this.esm_feeRate = esm_feeRates[`vip${this.esm_vip}`] || esm_feeRates.vip0;
            $gameVariables.setValue(esm_vipVar, this.esm_vip);
            $gameVariables.setValue(esm_feeRateVar, this.esm_feeRate);
        }

        esm_getCurrentVIP() {
            return this.esm_vip;
        }

        esm_getCurrentFeeRate() {
            return { rate: this.esm_feeRate, percent: (this.esm_feeRate * 100).toFixed(2) };
        }

        esm_calculateFee(amount) {
            return Math.floor(amount * this.esm_feeRate);
        }

        esm_depositCash(amount) {
            if (amount <= 0) return $gameMessage.add(esm_messages.invalidAmount);
            const gold = $gameParty.gold();
            if (amount > gold) {
                amount = gold;
                $gameMessage.add(esm_messages.depositExceed.replace('%1', gold));
            }
            $gameParty.loseGold(amount);
            this.esm_account += amount;
            this.esm_cumulativeDeposit += amount;
            this.esm_save();
            $gameMessage.add(esm_messages.depositSuccess.replace('%1', this.esm_account));
            this.esm_calculateVIP();
        }

        esm_withdrawCash(amount) {
            if (amount <= 0) return $gameMessage.add(esm_messages.invalidAmount);
            if (amount > this.esm_account) {
                amount = this.esm_account;
                $gameMessage.add(esm_messages.withdrawExceed.replace('%1', this.esm_account));
            }
            this.esm_account -= amount;
            $gameParty.gainGold(amount);
            this.esm_save();
            $gameMessage.add(esm_messages.withdrawSuccess.replace('%1', amount));
            this.esm_calculateVIP();
        }

        esm_buyStock(code, quantity) {
            if (!this.esm_isBusinessHour()) return $gameMessage.add(esm_messages.closedMessage);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.invalidStockCode);
            if (quantity <= 0) return $gameMessage.add(esm_messages.invalidQuantity);
            const cost = quantity * this.esm_prices[code];
            const fee = this.esm_calculateFee(cost);
            const totalCost = cost + fee;
            if (totalCost > this.esm_account) return $gameMessage.add(esm_messages.buyInsufficient);
            this.esm_account -= totalCost;
            const prevHold = this.esm_holdings[code] || 0;
            const prevAvg = this.esm_avgBuyPrices[code] || 0;
            this.esm_holdings[code] = prevHold + quantity;
            this.esm_avgBuyPrices[code] = (prevAvg * prevHold + cost) / this.esm_holdings[code];
            this.esm_tradeLog.push({ type: 'buy', code, quantity, price: this.esm_prices[code], time: this.esm_getTimeStamp() });
            this.esm_save();
            $gameMessage.add(esm_messages.buySuccess.replace('%1', stock.displayName).replace('%2', this.esm_holdings[code]));
            $gameMessage.add(esm_messages.buySuccessFee.replace('%1', fee));
            this.esm_calculateVIP();
        }

        esm_sellStock(code, quantity) {
            if (!this.esm_isBusinessHour()) return $gameMessage.add(esm_messages.closedMessage);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.invalidStockCode);
            const hold = this.esm_holdings[code] || 0;
            if (quantity <= 0) return $gameMessage.add(esm_messages.invalidQuantity);
            if (quantity > hold) quantity = hold;
            const revenue = quantity * this.esm_prices[code];
            const fee = this.esm_calculateFee(revenue);
            const netRevenue = revenue - fee;
            this.esm_holdings[code] -= quantity;
            if (this.esm_holdings[code] === 0) {
                delete this.esm_holdings[code];
                delete this.esm_avgBuyPrices[code];
            }
            this.esm_account += netRevenue;
            this.esm_tradeLog.push({ type: 'sell', code, quantity, price: this.esm_prices[code], time: this.esm_getTimeStamp() });
            this.esm_save();
            $gameMessage.add(esm_messages.sellSuccess.replace('%1', netRevenue));
            $gameMessage.add(esm_messages.sellSuccessFee.replace('%1', fee));
            this.esm_calculateVIP();
        }

        esm_clearAllHoldings() {
            if (!this.esm_isBusinessHour()) return $gameMessage.add(esm_messages.closedMessage);
            Object.keys(this.esm_holdings).forEach(code => this.esm_sellStock(code, this.esm_holdings[code]));
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
                    const curr = this.esm_prices[code];
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
            const yieldFormatted = yieldRateStr > 0 ? '+' + yieldRateStr.toFixed(2) + '%' : yieldRateStr < 0 ? yieldRateStr.toFixed(2) + '%' : '0%';
            const totalPnlStr = totalPnl > 0 ? '+' + Math.floor(totalPnl) : totalPnl < 0 ? Math.floor(totalPnl) : '0';
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
            const curr = this.esm_prices[code];
            const pnl = (curr - avg) * hold;
            const hist = this.esm_history[code] || [];
            const currentDayEntry = hist[0];
            let dayChange = '0%';
            let weekChange = '0%';
            let monthChange = '0%';
            if (currentDayEntry) {
                const currentAvg = currentDayEntry.avg;
                const prevDayEntry = hist[1];
                if (prevDayEntry) dayChange = ((currentAvg - prevDayEntry.avg) / prevDayEntry.avg * 100).toFixed(2) + '%';
                const weekAgo = hist.find(e => this.esm_daysDiff(currentDayEntry.day, e.day) >= 7);
                if (weekAgo) weekChange = ((currentAvg - weekAgo.avg) / weekAgo.avg * 100).toFixed(2) + '%';
                const monthAgo = hist.find(e => this.esm_daysDiff(currentDayEntry.day, e.day) >= 30);
                if (monthAgo) monthChange = ((currentAvg - monthAgo.avg) / monthAgo.avg * 100).toFixed(2) + '%';
            }
            $gameMessage.add(`${stock.displayName}(${code})\n持股数:${hold} 总盈亏:${Math.floor(pnl)}\n成本价:${avg.toFixed(2)}当前价:${curr.toFixed(2)} \n日涨跌:${dayChange} 周涨跌:${weekChange} 月涨跌:${monthChange}`);
        }

        esm_queryStockPrice() {
            const rawCode = $gameVariables.value(esm_inputCodeVar);
            if (isNaN(rawCode)) return $gameMessage.add(esm_messages.invalidStockCode);
            const code = rawCode.toString().padStart(3, '0');
            if (code.length !== 3) return $gameMessage.add(esm_messages.invalidStockCode);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.stockNotFound);
            const price = this.esm_prices[stock.code].toFixed(2);
            $gameMessage.add(`${stock.displayName} 当前价格: ${price}元`);
        }

        esm_queryCompanyInfo() {
            const rawCode = $gameVariables.value(esm_inputCodeVar);
            if (isNaN(rawCode)) return $gameMessage.add(esm_messages.invalidStockCode);
            const code = rawCode.toString().padStart(3, '0');
            if (code.length !== 3) return $gameMessage.add(esm_messages.invalidStockCode);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.stockNotFound);
            let info = stock.companyInfo || '无公司信息。';
            const maxWidth = stock.infoWidth;
            const lines = info.split('\n');
            let wrappedInfo = '';
            lines.forEach(line => {
                let currentLine = '';
                for (let i = 0; i < line.length; i++) {
                    currentLine += line[i];
                    if (currentLine.length >= maxWidth && i < line.length - 1) {
                        wrappedInfo += currentLine + '\n';
                        currentLine = '';
                    }
                }
                if (currentLine) wrappedInfo += currentLine + '\n';
            });
            info = wrappedInfo.trim();
            $gameMessage.add(`${stock.name}(${code})\n${info}`);
        }

        esm_queryHistory(numDays) {
            const rawCode = $gameVariables.value(esm_inputCodeVar);
            if (isNaN(rawCode)) return $gameMessage.add(esm_messages.invalidStockCode);
            const code = rawCode.toString().padStart(3, '0');
            if (code.length !== 3) return $gameMessage.add(esm_messages.invalidStockCode);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.stockNotFound);
            const hist = this.esm_history[code] || [];
            numDays = Math.min(numDays || esm_historyPeriods, hist.length);
            let msg = `${stock.displayName}(${code})最近${numDays}交易日历史：\n`;
            const recentHist = hist.slice(0, numDays);
            recentHist.forEach(entry => {
                msg += `日期${entry.day}: 开${entry.open.toFixed(2)} 收${entry.close.toFixed(2)} 平均${entry.avg.toFixed(2)}\n`;
            });
            $gameMessage.add(msg);
        }

        esm_queryFeeRate(outputVar = 0) {
            this.esm_calculateVIP();
            const msg = esm_messages.feeRateMsg.replace('%1', this.esm_vip).replace('%2', this.esm_feeRate).replace('%3', (this.esm_feeRate * 100).toFixed(2));
            $gameMessage.add(msg);
            if (outputVar > 0) $gameVariables.setValue(outputVar, this.esm_feeRate);
        }

        esm_depositMargin(amount) {
            if (amount <= 0) return $gameMessage.add(esm_messages.invalidAmount);
            if (amount > this.esm_account) return $gameMessage.add(esm_messages.marginInsufficient);
            const fee = this.esm_calculateFee(amount);
            this.esm_account -= (amount + fee);
            this.esm_margin += amount;
            this.esm_save();
            $gameMessage.add(esm_messages.marginTransferSuccess.replace('%1', this.esm_margin));
            $gameMessage.add(esm_messages.marginTransferFee.replace('%1', fee));
        }

        esm_withdrawMargin(amount) {
            if (amount <= 0) return $gameMessage.add(esm_messages.invalidAmount);
            if (amount > this.esm_margin) return $gameMessage.add(esm_messages.marginInsufficient);
            const fee = this.esm_calculateFee(amount);
            this.esm_margin -= (amount + fee);
            this.esm_account += amount;
            this.esm_save();
            $gameMessage.add(esm_messages.marginTransferSuccess.replace('%1', this.esm_margin));
            $gameMessage.add(esm_messages.marginTransferFee.replace('%1', fee));
        }

        esm_openPosition(direction, code, quantity, leverage) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.invalidStockCode);
            if (quantity <= 0) return $gameMessage.add(esm_messages.invalidQuantity);
            leverage = leverage || esm_defaultLeverage;
            if (leverage < 1 || leverage > esm_maxLeverage) {
                leverage = esm_defaultLeverage;
                $gameMessage.add(esm_messages.invalidLeverage);
            }
            const price = this.esm_prices[code];
            const marginRequired = (quantity * price) / leverage;
            if (marginRequired > this.esm_margin) return $gameMessage.add(esm_messages.marginInsufficient);
            const fee = this.esm_calculateFee(marginRequired);
            this.esm_margin -= (marginRequired + fee);
            const pos = this.esm_positions[code][direction];
            pos.quantity += quantity;
            pos.entryPrice = price;
            pos.stopLoss = 0; // 默认无止损
            pos.openTime = this.esm_getTimeStamp();
            pos.leverage = leverage;
            pos.fundingPaid = 0;
            pos.marginUsed = marginRequired;
            this.esm_save();
            $gameMessage.add(esm_messages.openPositionSuccess.replace('%1', direction).replace('%2', quantity));
        }

        esm_closePosition(code, quantity = 0, direction = '', internal = false) {
            try {
                const stock = esm_stockList.find(s => s.code === code);
                if (!stock) return $gameMessage.add(esm_messages.invalidStockCode);
                if (!direction) {
                    // 如果未指定方向，假设关闭所有
                    ['long', 'short'].forEach(dir => this.esm_closePosition(code, 0, dir, internal));
                    return;
                }
                const pos = this.esm_positions[code][direction];
                if (!pos || pos.quantity <= 0) return $gameMessage.add(esm_messages.noPositions);
                if (quantity <= 0 || quantity > pos.quantity) quantity = pos.quantity;
                const price = this.esm_prices[code];
                const basePnl = (price - pos.entryPrice) * quantity * (direction === 'long' ? 1 : -1);
                const pnl = basePnl * pos.leverage;
                const fee = this.esm_calculateFee(Math.abs(pnl));
                const netPnl = pnl - fee;
                this.esm_margin += netPnl + (pos.marginUsed * quantity / pos.quantity);
                pos.quantity -= quantity;
                if (pos.quantity <= 0) pos.quantity = 0;
                this.esm_margin = Math.max(0, this.esm_margin);
                this.esm_save();
                if (!internal) {
                    $gameMessage.add(esm_messages.closePositionSuccess.replace('%1', Math.floor(netPnl)));
                }
                return netPnl;
            } catch (e) {
                console.error('Expand_Stockmarket: closePosition failed', e);
                if (!internal) $gameMessage.add('平仓失败！');
            }
        }

        esm_checkContractConditions() {
            esm_stockList.forEach(stock => {
                const code = stock.code;
                const price = this.esm_prices[code];
                // 止损/爆仓
                ['long', 'short'].forEach(direction => {
                    const pos = this.esm_positions[code][direction];
                    if (!pos || pos.quantity <= 0) return;
                    const basePnl = (price - pos.entryPrice) * pos.quantity * (direction === 'long' ? 1 : -1);
                    const pnl = basePnl * pos.leverage;
                    const lossRatio = pnl < 0 ? -pnl / pos.marginUsed : 0;
                    if (lossRatio >= esm_liquidationThreshold) {
                        this.esm_closePosition(code, pos.quantity, direction, true);
                        $gameMessage.add(esm_messages.liquidationTriggered.replace('%1', code).replace('%2', this.esm_margin));
                        if (esm_debugLog) console.log('Expand_Stockmarket: Liquidation triggered for', code, direction);
                    } else if (pos.stopLoss > 0) {
                        const trigger = direction === 'long' ? price <= pos.stopLoss : price >= pos.stopLoss;
                        if (trigger) {
                            this.esm_closePosition(code, pos.quantity, direction, true);
                            $gameMessage.add(esm_messages.stopLossTriggered.replace('%1', code));
                            if (esm_debugLog) console.log('Expand_Stockmarket: Stop loss triggered for', code, direction);
                        }
                    }
                });
                // 资金费率
                this.esm_deductFunding(code);
                // 委托单执行
                this.esm_executeOrders(code, price);
            });
            this.esm_save();
        }

        esm_deductFunding(code) {
            ['long', 'short'].forEach(direction => {
                const pos = this.esm_positions[code][direction];
                if (!pos || pos.quantity <= 0) return;
                const rate = direction === 'long' ? this.esm_longFundingRate : this.esm_shortFundingRate;
                const fee = Math.floor(pos.marginUsed * rate);
                pos.fundingPaid += fee;
                this.esm_margin -= fee;
                this.esm_margin = Math.max(0, this.esm_margin);
                if (fee > 0) {
                    // $gameMessage.add(esm_messages.fundingFeeDeducted.replace('%1', fee));  // 注释掉，屏蔽消息
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
                        // 平仓
                        this.esm_closePosition(order.code, order.quantity, order.direction, true);
                    } else {
                        // 开仓
                        this.esm_openPosition(order.direction, order.code, order.quantity, esm_defaultLeverage);
                    }
                    order.status = 'executed';
                    $gameMessage.add(esm_messages.orderExecuted.replace('%1', order.id));
                    if (esm_debugLog) console.log('Expand_Stockmarket: Order executed', order);
                    return false; // 移除已执行
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
                        msg += `${code} ${direction}: 数量${pos.quantity}, 入场${pos.entryPrice.toFixed(2)}, 当前${price.toFixed(2)}, 盈亏${Math.floor(pnl)}, 止损${pos.stopLoss || '无'}, 杠杆${pos.leverage}\n`;
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
                    const pnl = basePnl * pos.leverage;
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
                // 覆盖旧委托: 查找并取消相同类型/方向/代码的委托
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

        esm_queryFundingRate(outputLongVar = 0, outputShortVar = 0) {
            const msg = esm_messages.fundingRateMsg.replace('%1', this.esm_longFundingRate).replace('%2', this.esm_shortFundingRate);
            $gameMessage.add(msg);
            if (outputLongVar > 0) $gameVariables.setValue(outputLongVar, this.esm_longFundingRate);
            if (outputShortVar > 0) $gameVariables.setValue(outputShortVar, this.esm_shortFundingRate);
        }

        esm_setFundingRate(longRate, shortRate) {
            this.esm_longFundingRate = Number(longRate);
            this.esm_shortFundingRate = Number(shortRate);
            this.esm_save();
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
                // 合约命令
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
                case 'QueryPositions': this.esm_queryPositions(); break;
                case 'QuerySinglePosition': this.esm_querySinglePosition(); break;
                case 'PlaceOrder': 
                    this.esm_placeOrder(args.orderType, args.direction, args.code, Number(args.quantity), Number(args.price)); 
                    break;
                case 'CancelOrder': this.esm_cancelOrder(Number(args.orderId)); break;
                case 'SetStopLevels':
                    const tpCode = args.code.padStart(3, '0');
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
                    this.esm_setFundingRate(args.longRate, args.shortRate);
                    break;
                case 'QueryContractHistory':
                    const num = Number(args.numPeriods || 10);
                    this.esm_queryContractHistory(num);
                    break;
                case 'OpenStockWindow':
                    SceneManager.push(Scene_StockmarketWindow);
                    break;
            }
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
    // 合约
    PluginManager.registerCommand('Expand_Stockmarket', 'DepositMargin', () => esm_manager.esm_execCommand('DepositMargin'));
    PluginManager.registerCommand('Expand_Stockmarket', 'WithdrawMargin', () => esm_manager.esm_execCommand('WithdrawMargin'));
    PluginManager.registerCommand('Expand_Stockmarket', 'OpenLong', () => esm_manager.esm_execCommand('OpenLong'));
    PluginManager.registerCommand('Expand_Stockmarket', 'OpenShort', () => esm_manager.esm_execCommand('OpenShort'));
    PluginManager.registerCommand('Expand_Stockmarket', 'ClosePosition', () => esm_manager.esm_execCommand('ClosePosition'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryPositions', () => esm_manager.esm_execCommand('QueryPositions'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QuerySinglePosition', () => esm_manager.esm_execCommand('QuerySinglePosition'));
    PluginManager.registerCommand('Expand_Stockmarket', 'PlaceOrder', args => esm_manager.esm_execCommand('PlaceOrder', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'CancelOrder', args => esm_manager.esm_execCommand('CancelOrder', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'SetStopLevels', args => esm_manager.esm_execCommand('SetStopLevels', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryFundingRate', args => esm_manager.esm_execCommand('QueryFundingRate', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'SetFundingRate', args => esm_manager.esm_execCommand('SetFundingRate', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryContractHistory', args => esm_manager.esm_execCommand('QueryContractHistory', args));
    PluginManager.registerCommand('Expand_Stockmarket', 'OpenStockWindow', () => esm_manager.esm_execCommand('OpenStockWindow'));

    // 存档扩展 (useSaveObject)
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
    };

    const _DataManager_loadGame = DataManager.loadGame;
    DataManager.loadGame = function(savefileId) {
        const result = _DataManager_loadGame.call(this, savefileId);
        if (result) {
            setTimeout(() => {
                esm_ensureChangedVariables();
                esm_manager.esm_load();
                esm_manager.esm_save();
                console.log('Expand_Stockmarket: Post-load save ensured.');
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
        }
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (esm_updateTrigger === 'auto' || esm_updateTrigger === 'both') {
            esm_manager.esm_checkAndUpdatePrices();
        }
    };

    // 新窗口类: 信息显示窗口
    class Window_StockInfo extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this.refresh();
        }

		refresh() {
    this.contents.clear();
    esm_manager.esm_calculateVIP(); // 确保最新
    const account = esm_manager.esm_account || 0;
    const margin = esm_manager.esm_margin || 0;
    const vip = esm_manager.esm_getCurrentVIP() || 0;
    const feeRate = esm_manager.esm_getCurrentFeeRate().percent + '%' || '0%';
    let time = esm_manager.esm_getTimeStamp() || '未知';
    
    // 添加星期显示（变量ID 27: 1=周一 ... 7=周日）
    const weekValue = $gameVariables.value(27);
    let weekDay = '未知';
    switch (weekValue) {
        case 1: weekDay = '周一'; break;
        case 2: weekDay = '周二'; break;
        case 3: weekDay = '周三'; break;
        case 4: weekDay = '周四'; break;
        case 5: weekDay = '周五'; break;
        case 6: weekDay = '周六'; break;
        case 7: weekDay = '周日'; break;
    }
    
    // 新增：映射时段到文字（假设1=凌晨,2=上午,3=下午,4=傍晚，根据你的插件设置调整）
    const periodValue = $gameVariables.value(esm_periodVar); // esm_periodVar 是时段变量ID，通常为28
    let periodText = '未知';
    switch (periodValue) {
        case 1: periodText = '凌晨'; break;
        case 2: periodText = '上午'; break;
        case 3: periodText = '下午'; break;
        case 4: periodText = '傍晚'; break;
    }
    
    // 修改时间格式：从 esm_getTimeStamp() 获取年月日，并重组
    const [yearMonthDay] = time.split(' '); // 分割原 time 为 '2001-01-04' 和其余
    const hour = $gameVariables.value(esm_hourVar); // esm_hourVar 是小时变量ID，通常为26
    const formattedTime = `${yearMonthDay} ${weekDay} ${periodText} ${hour}时`;
    
    this.drawText(`账户余额: ${account} 金币`, 0, 0, this.width - this.padding * 2, 'center');
    this.drawText(`保证金: ${margin} 金币`, 0, this.lineHeight(), this.width - this.padding * 2, 'center');
    this.drawText(`VIP等级: ${vip} 手续费: ${feeRate}`, 0, this.lineHeight() * 2, this.width - this.padding * 2, 'center');
    this.drawText(`当前时间: ${formattedTime}`, 0, this.lineHeight() * 3, this.width - this.padding * 2, 'center');
	}
			}

    // 新窗口类: 股票列表窗口（用于个股查询）
    class Window_StockList extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this._data = esm_stockList || [];
            this.refresh();
        }

        maxItems() {
            return this._data.length;
        }

        drawItem(index) {
            const stock = this._data[index];
            if (!stock) return;
            const code = stock.code || '未知';
            const name = stock.displayName || stock.name || '未知';
            const price = esm_manager.esm_prices[code] || 0;
            const hist = esm_manager.esm_history[code] || [];
            let change = '0%';
            if (hist.length > 1) {
                const currAvg = hist[0].avg || 0;
                const prevAvg = hist[1].avg || 0;
                change = prevAvg > 0 ? ((currAvg - prevAvg) / prevAvg * 100).toFixed(2) + '%' : '0%';
            }
            const rect = this.itemLineRect(index);
            this.drawText(`${code} ${name} ${price} (${change})`, rect.x, rect.y, rect.width);
        }

        currentStock() {
            return this._data[this.index()] || null;
        }
    }

    // 修改: 操作结果/查询消息窗口（继承 Window_Selectable 以支持交互和滚动）
    class Window_StockMessage extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this._allTextLines = [];
            this.refresh();
        }

        maxItems() {
            return this._allTextLines.length;
        }

        itemHeight() {
            return this.lineHeight();
        }

        updateCursor() {
            this.setCursorRect(0, 0, 0, 0);  // 隐藏光标
        }

        drawItem(index) {
            const rect = this.itemLineRect(index);
            this.drawText(this._allTextLines[index], rect.x, rect.y, rect.width);
        }

        wrapText(text) {
            const maxWidth = this.contentsWidth();
            const buffer = this.textWidth('中中');  // 估算两个中文字符的宽度，作为提前换行的缓冲空间
            const lines = text.split('\n');
            const result = [];
            for (let line of lines) {
                let current = '';
                for (let char of line) {
                    const test = current + char;
                    if (this.textWidth(test) > maxWidth - buffer) {
                        result.push(current);
                        current = char;
                    } else {
                        current = test;
                    }
                }
                if (current) {
                    result.push(current);
                }
            }
            return result;
        }

        setText(text) {
            this._allTextLines = this.wrapText(text || '无信息');
            this.refresh();
        }

        refresh() {
            this.contents.clear();
            this.drawAllItems();
        }

        processWheel() {
            if (this.isWheelScrollEnabled()) {
                const threshold = 20;
                if (TouchInput.wheelY >= threshold) {
                    this.smoothSelect(Math.min(this.index() + 1, this.maxItems() - 1));
                }
                if (TouchInput.wheelY <= -threshold) {
                    this.smoothSelect(Math.max(this.index() - 1, 0));
                }
            }
        }

        isWheelScrollEnabled() {
            return this.active;
        }

        update() {
            super.update();
            this.processWheel();
        }
    }

    // 修改：使用 Window_SubCommand 作为查询选项固定窗口（原用于子命令，现在用于固定查询列表）
    class Window_SubCommand extends Window_Command {
        constructor(rect, commands) {
            super(rect);
            this._commands = commands || []; // 修复警告：默认空数组
            this.refresh();  // 立即刷新
        }

        makeCommandList() {
            if (!this._commands || !Array.isArray(this._commands)) {
                console.warn('Window_SubCommand: _commands is undefined or not array, using empty array.');
                this._commands = [];  // 强制默认
            }
            this._commands.forEach(cmd => {
                if (cmd && cmd.name && cmd.symbol) {
                    this.addCommand(cmd.name, cmd.symbol);
                }
            });
        }
    }

    // 修改：新场景 Scene_StockmarketWindow（移除左侧主命令窗口，只保留查询相关）
    class Scene_StockmarketWindow extends Scene_MenuBase {
        create() {
            super.create();
            this._windowContainer = new Sprite(); // 用于居中
            this.addChild(this._windowContainer);
            this._windowContainer.x = (Graphics.boxWidth - sceneWidth) / 2 + offsetX;
            this._windowContainer.y = (Graphics.boxHeight - sceneHeight) / 2 + offsetY;
            this.createInfoWindow();  // 保留信息窗口
            this.createQueryListWindow();  // 新增：固定查询选项窗口，放在信息窗口下面
            this.createStockListWindow();  // 保留股票列表（用于个股查询）
            this.createMessageWindow();  // 保留消息窗口（显示查询结果）

            // 隐藏返回按钮
            if (this._cancelButton) this._cancelButton.visible = false;

            // 修改：场景启动时激活查询列表窗口（固定显示）
            this._queryListWindow.activate();
        }

        createBackground() {
            super.createBackground();
        }

        // 修改：信息窗口位置调整到 x=0，全宽
        createInfoWindow() {
            const rect = new Rectangle(infoOffsetX, infoOffsetY, infoWidth, infoHeight);
            this._infoWindow = new Window_StockInfo(rect);
            this._windowContainer.addChild(this._infoWindow);
        }

        // 新增：创建固定查询列表窗口（使用原查询命令，放在信息窗口下面）
        createQueryListWindow() {
            const rect = new Rectangle(qlOffsetX, qlOffsetY, qlWidth, qlHeight);
            const queryCommands = [
                { name: '股票持仓', symbol: 'allHoldings' },
                { name: '单独股票', symbol: 'singleHolding' },
                { name: '股票价格', symbol: 'stockPrice' },
                { name: '公司信息', symbol: 'companyInfo' },
                { name: '合约持仓', symbol: 'positions' },
                { name: '单独合约', symbol: 'singlePosition' },
                { name: '资金费率', symbol: 'fundingRate' },
                { name: '合约历史', symbol: 'contractHistory' }  // 新增合约历史查询
            ];
            this._queryListWindow = new Window_SubCommand(rect, queryCommands);
            this._queryListWindow.setHandler('ok', this.onQuerySub.bind(this));
            this._queryListWindow.setHandler('cancel', this.popScene.bind(this));  // 取消退出场景
            this._windowContainer.addChild(this._queryListWindow);
        }

        // 修改：股票列表窗口位置调整到 x=0（需要时覆盖查询列表）
        createStockListWindow() {
            const rect = new Rectangle(slOffsetX, slOffsetY, slWidth, slHeight);
            this._stockListWindow = new Window_StockList(rect);
            this._stockListWindow.setHandler('ok', this.onStockSelect.bind(this));
            this._stockListWindow.setHandler('cancel', this.onStockCancel.bind(this));
            this._stockListWindow.deactivate();
            this._stockListWindow.hide();
            this._windowContainer.addChild(this._stockListWindow);
        }

        createMessageWindow() {
            const rect = new Rectangle(msgOffsetX, msgOffsetY, msgWidth, msgHeight);
            this._messageWindow = new Window_StockMessage(rect);
            this._messageWindow.setHandler('ok', this.onMessageClose.bind(this));
            this._messageWindow.setHandler('cancel', this.onMessageClose.bind(this));
            this._messageWindow.hide();
            this._windowContainer.addChild(this._messageWindow);
        }

        start() {
            super.start();
            esm_manager.esm_checkAndUpdatePrices();
            this._infoWindow.refresh();
            this._stockListWindow.refresh();
            this._queryListWindow.refresh();  // 新增：刷新查询列表
        }

        update() {
            super.update();
            if (Input.isTriggered('refresh')) {
                esm_manager.esm_checkAndUpdatePrices();
                this._infoWindow.refresh();
                this._stockListWindow.refresh();
            }
        }

        // 修改：查询子选项处理（现在从固定查询列表调用）
        onQuerySub() {
            const symbol = this._queryListWindow.currentSymbol();  // 修改：从查询列表获取
            this._currentAction = symbol;
            this._inputValues = {};
            if (symbol === 'allHoldings' || symbol === 'positions' || symbol === 'fundingRate') {
                const text = this.getQueryText(symbol);
                this._queryListWindow.deactivate();  // 停用查询列表
                this._messageWindow.setText(text);
                this._messageWindow.show();
                this._messageWindow.activate();  // 激活消息窗口
                this._messageWindow.select(0);
            } else {
                // 需要个股的查询，显示股票列表（包括新增的 'contractHistory'）
                this._queryListWindow.deactivate();  // 停用查询列表
                this._stockListWindow.show();
                this._stockListWindow.activate();
            }
        }

        // 保留：股票选择处理（用于个股查询）
        onStockSelect() {
            const stock = this._stockListWindow.currentStock();
            if (!stock) return;
            this._selectedCode = stock.code;
            $gameVariables.setValue(esm_inputCodeVar, parseInt(stock.code));
            this._stockListWindow.hide();
            this._stockListWindow.deactivate();
            const symbol = this._currentAction;

            let text = '';
            switch (symbol) {
                case 'singleHolding':
                    esm_manager.esm_querySingleHolding();
                    text = this.getSingleHoldingText(this._selectedCode);
                    break;
                case 'stockPrice':
                    text = this.getStockPriceText(this._selectedCode);
                    break;
                case 'companyInfo':
                    text = this.getCompanyInfoText(this._selectedCode);
                    break;
                case 'singlePosition':
                    text = this.getSinglePositionText(this._selectedCode);
                    break;
                case 'contractHistory':  // 新增: 处理合约历史查询
                    text = this.getContractHistoryText(this._selectedCode);
                    break;
            }
            this._queryListWindow.deactivate();  // 停用查询列表（虽然已停用，但确保）
            this._messageWindow.setText(text);
            this._messageWindow.show();
            this._messageWindow.activate();
            this._messageWindow.select(0);
        }

        onStockCancel() {
            this._stockListWindow.hide();
            this._stockListWindow.deactivate();
            this._queryListWindow.activate();  // 返回查询列表
        }

        // 新增：消息窗口关闭处理（OK 或取消）
        onMessageClose() {
            this._messageWindow.hide();
            this._messageWindow.deactivate();
            this._queryListWindow.activate();  // 返回查询列表
        }

        // 保留：查询文本获取函数
        getQueryText(type) {
            let text = '';
            switch (type) {
                case 'allHoldings':
                    text = esm_manager.esm_queryAllHoldings(); // 用主插件函数，但它用消息框，这里返回文本
                    // 由于主插件用 $gameMessage.add，需改成返回字符串
                    let listMsg = '';
                    let totalTypes = 0;
                    let totalValue = 0;
                    let totalCost = 0;
                    let totalPnl = 0;
                    esm_stockList.forEach(stock => {
                        const code = stock.code;
                        const hold = esm_manager.esm_holdings[code] || 0;
                        if (hold > 0) {
                            totalTypes++;
                            const avg = esm_manager.esm_avgBuyPrices[code] || 0;
                            const curr = esm_manager.esm_prices[code];
                            const pnl = (curr - avg) * hold;
                            totalPnl += pnl;
                            totalValue += curr * hold;
                            totalCost += avg * hold;
                            const pnlStr = pnl > 0 ? '+' + Math.floor(pnl) : Math.floor(pnl);
                            listMsg += `${stock.displayName}(${code}): ${hold}。收益：${pnlStr}。\n`;
                        }
                    });
                    if (totalTypes === 0) return esm_messages.noHoldings || '您目前没有持有任何股票。';
                    const yieldRateStr = totalCost > 0 ? (totalValue / totalCost - 1) * 100 : 0;
                    const yieldFormatted = yieldRateStr > 0 ? '+' + yieldRateStr.toFixed(2) + '%' : yieldRateStr < 0 ? yieldRateStr.toFixed(2) + '%' : '0%';
                    const totalPnlStr = totalPnl > 0 ? '+' + Math.floor(totalPnl) : totalPnl < 0 ? Math.floor(totalPnl) : '0';
                    text = `持仓数：${totalTypes}。总盈亏：${totalPnlStr}。收益率：${yieldFormatted}\n${listMsg}`;
                    break;
                case 'positions':
                    let msg = '';
                    let hasPositions = false;
                    esm_stockList.forEach(stock => {
                        const code = stock.code;
                        ['long', 'short'].forEach(direction => {
                            const pos = esm_manager.esm_positions[code][direction];
                            if (pos && pos.quantity > 0) {
                                hasPositions = true;
                                const price = esm_manager.esm_prices[code];
                                const basePnl = (price - pos.entryPrice) * pos.quantity * (direction === 'long' ? 1 : -1);
                                const pnl = basePnl * pos.leverage;
                                msg += `${code} ${direction}: 数量${pos.quantity}, 入场${pos.entryPrice.toFixed(2)}, 当前${price.toFixed(2)}, 盈亏${Math.floor(pnl)}, 止损${pos.stopLoss || '无'}, 杠杆${pos.leverage}\n`;
                            }
                        });
                    });
                    text = hasPositions ? msg : esm_messages.noPositions || '无持仓合约。';
                    break;
                case 'fundingRate':
                    text = esm_messages.fundingRateMsg.replace('%1', esm_manager.esm_longFundingRate).replace('%2', esm_manager.esm_shortFundingRate) || '当前做多费率：0.0001，做空费率：0.0001。';
                    break;
            }
            return text;
        }

        getSingleHoldingText(code) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return esm_messages.stockNotFound || '股票代码不存在，查询为空。';
            const hold = esm_manager.esm_holdings[code] || 0;
            if (hold === 0) return `${stock.displayName} 无持仓。`;
            const avg = esm_manager.esm_avgBuyPrices[code] || 0;
            const curr = esm_manager.esm_prices[code];
            const pnl = (curr - avg) * hold;
            const hist = esm_manager.esm_history[code] || [];
            const currentDayEntry = hist[0];
            let dayChange = '0%';
            let weekChange = '0%';
            let monthChange = '0%';
            if (currentDayEntry) {
                const currentAvg = currentDayEntry.avg;
                const prevDayEntry = hist[1];
                if (prevDayEntry) dayChange = ((currentAvg - prevDayEntry.avg) / prevDayEntry.avg * 100).toFixed(2) + '%';
                const weekAgo = hist.find(e => esm_manager.esm_daysDiff(currentDayEntry.day, e.day) >= 7);
                if (weekAgo) weekChange = ((currentAvg - weekAgo.avg) / weekAgo.avg * 100).toFixed(2) + '%';
                const monthAgo = hist.find(e => esm_manager.esm_daysDiff(currentDayEntry.day, e.day) >= 30);
                if (monthAgo) monthChange = ((currentAvg - monthAgo.avg) / monthAgo.avg * 100).toFixed(2) + '%';
            }
            return `${stock.displayName}(${code})\n持股数:${hold} 总盈亏:${Math.floor(pnl)}\n成本价:${avg.toFixed(2)}当前价:${curr.toFixed(2)} \n日涨跌:${dayChange} 周涨跌:${weekChange} 月涨跌:${monthChange}`;
        }

        getStockPriceText(code) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return esm_messages.stockNotFound || '股票代码不存在，查询为空。';
            const price = esm_manager.esm_prices[stock.code].toFixed(2);
            return `${stock.displayName} 当前价格: ${price}元`;
        }

        getCompanyInfoText(code) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return esm_messages.stockNotFound || '股票代码不存在，查询为空。';
            let info = stock.companyInfo || '无公司信息。';
            const maxWidth = Number(stock.infoWidth) || 25;
            const lines = info.split('\n');
            let wrappedInfo = '';
            lines.forEach(line => {
                let currentLine = '';
                for (let i = 0; i < line.length; i++) {
                    currentLine += line[i];
                    if (currentLine.length >= maxWidth && i < line.length - 1) {
                        wrappedInfo += currentLine + '\n';
                        currentLine = '';
                    }
                }
                if (currentLine) wrappedInfo += currentLine + '\n';
            });
            info = wrappedInfo.trim();
            return `${stock.name}(${code})\n${info}`;
        }

        getSinglePositionText(code) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return esm_messages.stockNotFound || '股票代码不存在，查询为空。';
            let msg = `${stock.displayName}(${code})\n`;
            let hasPos = false;
            ['long', 'short'].forEach(direction => {
                const pos = esm_manager.esm_positions[code][direction];
                if (pos && pos.quantity > 0) {
                    hasPos = true;
                    const price = esm_manager.esm_prices[code];
                    const basePnl = (price - pos.entryPrice) * pos.quantity * (direction === 'long' ? 1 : -1);
                    const pnl = basePnl * pos.leverage;
                    const estClosePnl = pnl - esm_manager.esm_calculateFee(Math.abs(pnl));
                    msg += `${direction}: 开仓时间${pos.openTime}, 已扣费${pos.fundingPaid}, 保证金占用${pos.marginUsed}, 平仓预估盈亏${Math.floor(estClosePnl)}\n`;
                }
            });
            return hasPos ? msg : esm_messages.noPositions || '无持仓合约。';
        }

        // 新增：获取合约历史文本（复制主插件逻辑，返回字符串，默认10周期）
        getContractHistoryText(code) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return esm_messages.stockNotFound || '股票代码不存在，查询为空。';
            const hist = esm_manager.esm_ohlcHistory[code] || [];
            const numPeriods = 10;  // 默认10周期，与主插件一致
            if (hist.length === 0) return esm_messages.noHistory || '无合约历史记录。';
            const effectivePeriods = Math.min(numPeriods, hist.length);
            let text = `${stock.displayName}(${code})最近${effectivePeriods}周期OHLC历史：\n`;
            const recentHist = hist.slice(0, effectivePeriods);
            recentHist.forEach(entry => {
                text += `日期${entry.period}: 开${entry.open.toFixed(2)} 高${entry.high.toFixed(2)} 低${entry.low.toFixed(2)} 收${entry.close.toFixed(2)}\n`;
            });
            return text;
        }
    }

    // 添加到主菜单（如果启用）
    if (esmw_enableMenuEntry) {
        const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
        Scene_Menu.prototype.createCommandWindow = function() {
            _Scene_Menu_createCommandWindow.call(this);
            this._commandWindow.setHandler('stockmarket', this.commandStockmarket.bind(this));
        };

        const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
        Window_MenuCommand.prototype.makeCommandList = function() {
            _Window_MenuCommand_makeCommandList.call(this);
            this.addCommand(esmw_menuCommandName, 'stockmarket');
        };

        Scene_Menu.prototype.commandStockmarket = function() {
            SceneManager.push(Scene_StockmarketWindow);
        };
    }

})();
