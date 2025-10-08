//=============================================================================
// Expand_Stockmarket.js
//=============================================================================
/*
插件名：Expand_Stockmarket
用到的原生内容：扩展了Scene_Map.prototype.start（用alias）、Scene_Map.prototype.update（用alias）、DataManager.makeSaveContents（用alias）、DataManager.extractSaveContents（用alias）、DataManager.createGameObjects（用alias）、DataManager.loadGame（用alias）；注册了PluginManager.registerCommand命令。
冲突提示：若其他插件也修改了Scene_Map的start或update方法，请确保本插件在其之后加载；若其他插件修改DataManager的save/load，请检查兼容性；本插件依赖Time_System插件，确保变量ID匹配。
*/
// 作者: 自定义 (优化版 by Grok)
// 版本: 1.0.23
// 描述: RPG Maker MZ 股市系统插件，支持账户管理、股票交易、价格动态更新，与Time_System时间插件绑定。
//       扩展: 新增合约功能，包括杠杆、多空方向、止损、爆仓、资金费率、委托单等。合约独立账户，从变量71开始，使用原股票价格，无休市限制。
//       合约核心: 杠杆(1-10x)、多空、止损/爆仓检查、资金费率扣取、委托单(市价/限价/止盈/止损)。
//       其他功能不变。
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
 * @default {"timeSettings":"{\"yearVar\":\"23\",\"monthVar\":\"24\",\"dayVar\":\"25\",\"weekVar\":\"27\",\"periodVar\":\"28\",\"hourVar\":\"26\"}","stockAccountVar":"62","stockHoldingsVar":"63","stockPricesVar":"64","stockAvgBuyPricesVar":"65","tradeLogVar":"66","priceHistoryVar":"67","inputAmountVar":"69","inputCodeVar":"68","contractMarginVar":"71","contractPositionsVar":"72","contractInputLeverageVar":"75","contractInputStopLossVar":"76","contractInputTakeProfitVar":"77","contractOrdersVar":"56","contractHistoryVar":"78","contractLongFundingRateVar":"79","contractShortFundingRateVar":"80"}

 * @param volatility
 * @text 2. 涨跌设置
 * @type struct<VolatilityStruct>
 * @default {"updateCycle":"hour","updateTrigger":"both","crossCycleRule":"sequential","globalUpProb":"50","maxUpAmp":"10","maxDownAmp":"10","historyPeriods":"30","stThreshold":"5"}

 * @param messages
 * @text 3. 文本设置
 * @type struct<MessagesStruct>
 * @default {"closedMessage":"当前时段休市，请在上午或下午再来","insufficientGold":"金币不足！您只有 %1 金币，无法存入 %2。","invalidAmount":"无效金额，请输入正数。","depositSuccess":"存入成功！资金账户余额：%1 金币。","depositExceed":"金币不足，只有 %1，已存入全部。","withdrawInsufficient":"账户余额不足！资金账户只有 %1 金币，无法取出 %2。","withdrawSuccess":"取出成功！玩家金币增加 %1。","withdrawExceed":"余额不足，只有 %1，已取出全部。","buyInsufficient":"账户余额或数量不足！","buySuccess":"购买成功！持有%1：%2股。","sellInsufficient":"持有数量不足！","sellSuccess":"出售成功！账户增加 %1 金币。","noHoldings":"您目前没有持有任何股票。","stockNotFound":"股票代码不存在，查询为空。","invalidStockCode":"无效股票代码！","stPrefix":"ST*","invalidQuantity":"选择正确的数量。","buyFeeInsufficient":"手续费不足！需额外 %1 金币。","buySuccessFee":"手续费：%1 金币。","sellSuccessFee":"（扣手续费 %1）。","feeRateMsg":"当前VIP等级：%1，手续费率：%2 (即%3%)。","marginInsufficient":"保证金不足！","marginTransferSuccess":"转入/转出成功！保证金余额：%1。","marginTransferFee":"手续费：%1。","openPositionSuccess":"开仓成功！方向：%1，数量：%2。","closePositionSuccess":"平仓成功！盈亏：%1。","stopLossTriggered":"止损触发，已自动平仓：%1。","liquidationTriggered":"爆仓强制平仓：%1，剩余保证金：%2。","fundingFeeDeducted":"扣取资金费率：%1。","invalidLeverage":"杠杆超出范围！使用默认值。","invalidPrice":"价格无效！","orderPlaced":"委托单已挂起：%1。","orderExecuted":"委托单执行：%1。","orderCancelled":"委托单取消：%1。","noPositions":"无持仓合约。","fundingRateMsg":"当前做多费率：%1，做空费率：%2。","stopLevelsSet":"止盈止损设置成功：止盈%1，止损%2。","noHistory":"无合约历史记录。"}

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
 * @default {"vipVar":"81","feeRateVar":"82","thresholds":"{\"vip1\":\"500000\",\"vip2\":\"2000000\",\"vip3\":\"5000000\",\"vip4\":\"10000000\",\"vip5\":\"20000000\",\"vip6\":\"50000000\",\"vip7\":\"100000000\"}","feeRates":"{\"vip0\":\"0.005\",\"vip1\":\"0.004\",\"vip2\":\"0.003\",\"vip3\":\"0.001\",\"vip4\":\"0.0008\",\"vip5\":\"0.0005\",\"vip6\":\"0.0003\",\"vip7\":\"0.0001\"}"}

 * @param contractSettings
 * @text 10. 合约设置
 * @type struct<ContractSettingsStruct>
 * @default {"initialMargin":"0","defaultLeverage":"5","maxLeverage":"10","liquidationThreshold":"1.0","transactionFeeRate":"0.001","longFundingRate":"0.0001","shortFundingRate":"0.0001","useSaveObject":"true","debugLog":"false"}

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

 * @help 使用说明：
 * - 需Time_System插件，变量ID匹配。
 * - 交易/更新仅营业时；ST: 价格<5加"ST*"前缀，>=5恢复。
 * - 代码列表: 固定3支，自定义点击+号添加空项，填写code/name等；"公司信息"为多行文本框，支持详细描述(输入时用Enter换行，游戏显示智能分行)；"信息设置"自定义每行字符数(默认25)。
 * - 存入/取出: 0或负用无效提示；>可用自动存/取全部，并用自定义消息。
 * - 购买/出售/个股查询/历史查询/公司信息: 用事件“数值输入”存代码到var68(3位，如001)，数量/天数到var69，再调用指令。
 * - 查询持仓: QueryAllHoldings(概览)，QuerySingleHolding(个股，输入code)。
 * - 查询费率: QueryFeeRate(显示VIP+费率，可存变量)；手续费率自动存入var82。
 * - 行情: GlobalMarket(全局)/SingleMarket(个股)，加成临时buff，持续年月日(总更新次数≈天数)。
 * - 读档: 自动init，时间回退重算delta；修复save失败导致0。
 * - 事件中时间变化后，用"CheckTimeUpdate"指令手动更新股价(或自动每秒检查)。
 * - 调试: F8查看日志(新增错误日志)。
 * - 新: 个股查询支持短代码(1→001)/存取优化/兼容性提升(独立save try)/读档修复/输入0提示/实时更新/持仓修复/循环时间修复/行情buff/持仓查询优化/VIP+手续费/费率查询/手续费变量/历史交易日优化/公司信息参数&指令(多行输入+智能分行+自定义宽度)。
 * - 合约扩展: 无休市限制，使用原股票价格。输入变量: 数量69、代码68、杠杆75。持仓/委托存变量72/56(或存档对象)。每小时检查止损/爆仓/费率/委托执行。
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
 * @default 56

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
 * @default 81
 * @desc 存储当前VIP等级(0-5)。

 * @param feeRateVar
 * @text 手续费率变量ID
 * @type variable
 * @default 82
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

/*~struct~ContractPositionStruct:
 * @param code
 * @text 代码
 * @type string

 * @param direction
 * @text 方向
 * @type select
 * @option long
 * @option short

 * @param quantity
 * @text 数量
 * @type number

 * @param entryPrice
 * @text 入场价
 * @type number

 * @param stopLoss
 * @text 止损价
 * @type number

 * @param openTime
 * @text 开仓时间
 * @type string

 * @param leverage
 * @text 杠杆
 * @type number

 * @param fundingPaid
 * @text 已扣费
 * @type number

 * @param marginUsed
 * @text 保证金占用
 * @type number
 */

/*~struct~ContractOrderStruct:
 * @param id
 * @text ID
 * @type number

 * @param type
 * @text 类型
 * @type select
 * @option market
 * @option limit
 * @option takeProfit
 * @option stopLoss

 * @param direction
 * @text 方向
 * @type select
 * @option long
 * @option short

 * @param code
 * @text 代码
 * @type string

 * @param quantity
 * @text 数量
 * @type number

 * @param price
 * @text 委托价
 * @type number

 * @param time
 * @text 时间
 * @type string

 * @param status
 * @text 状态
 * @type select
 * @option pending
 * @option executed
 * @option cancelled
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
    const esm_vipVar = Number(esm_tradeSettings.vipVar || 81);
    const esm_feeRateVar = Number(esm_tradeSettings.feeRateVar || 82);
    const esm_contractMarginVar = Number(esm_variables.contractMarginVar || 71);
    const esm_contractPositionsVar = Number(esm_variables.contractPositionsVar || 72);
    const esm_contractInputLeverageVar = Number(esm_variables.contractInputLeverageVar || 75);
    const esm_contractInputStopLossVar = Number(esm_variables.contractInputStopLossVar || 76);
    const esm_contractInputTakeProfitVar = Number(esm_variables.contractInputTakeProfitVar || 77);
    const esm_contractOrdersVar = Number(esm_variables.contractOrdersVar || 56);
    const esm_contractHistoryVar = Number(esm_variables.contractHistoryVar || 78);
    const esm_contractLongFundingRateVar = Number(esm_variables.contractLongFundingRateVar || 79);
    const esm_contractShortFundingRateVar = Number(esm_variables.contractShortFundingRateVar || 80);
    const esm_cumulativeDepositVar = 83;

    // 其他
    const esm_updateCycle = esm_volatility.updateCycle || 'hour';
    const esm_updateTrigger = esm_volatility.updateTrigger || 'both';
    const esm_crossCycleRule = esm_volatility.crossCycleRule || 'sequential';
    const esm_enableBusinessHours = esm_business.enableBusinessHours === 'true';
    const esm_businessPeriods = JSON.parse(esm_business.businessPeriods || '["1","2"]') .map(Number);
    const esm_businessWeeks = JSON.parse(esm_business.businessWeeks || '["1","2","3","4","5"]') .map(Number);
    const esm_globalUpProb = Number(esm_volatility.globalUpProb || 50);
    const esm_maxUpAmp = Number(esm_volatility.maxUpAmp || 50);
    const esm_maxDownAmp = Number(esm_volatility.maxDownAmp || 50);
    const esm_historyPeriods = Number(esm_volatility.historyPeriods || 30);
    const esm_stThreshold = Number(esm_volatility.stThreshold || 5);
    const esm_useSaveObject = esm_contractSettings.useSaveObject === 'true';
    const esm_debugLog = esm_contractSettings.debugLog === 'true';
    const esm_defaultLeverage = Number(esm_contractSettings.defaultLeverage || 5);
    const esm_maxLeverage = Number(esm_contractSettings.maxLeverage || 10);
    const esm_liquidationThreshold = Number(esm_contractSettings.liquidationThreshold || 1.0);
    const esm_transactionFeeRate = Number(esm_contractSettings.transactionFeeRate || 0.001);
    let esm_longFundingRate = Number(esm_contractSettings.longFundingRate || 0.0001);
    let esm_shortFundingRate = Number(esm_contractSettings.shortFundingRate || 0.0001);

    // VIP阈值和费率
    const esm_vipThresholds = safeJsonParse(esm_tradeSettings.thresholds || '{"vip1":500000,"vip2":2000000,"vip3":5000000,"vip4":10000000,"vip5":20000000,"vip6":50000000,"vip7":100000000}');
    const esm_feeRates = safeJsonParse(esm_tradeSettings.feeRates || '{"vip0":0.005,"vip1":0.004,"vip2":0.003,"vip3":0.001,"vip4":0.0008,"vip5":0.0005,"vip6":0.0003,"vip7":0.0001}');

    // 常量
    const esm_DAYS_PER_MONTH = 30;
    const esm_DAYS_PER_WEEK = 7;
    const esm_PERIODS_PER_DAY = 4;
    const esm_MAX_LOGS = 100;
    const esm_DAYS_PER_YEAR = 365;

    // 组合股票列表
    const esm_stockList = [esm_stock1, esm_stock2, esm_stock3, ...esm_customStocks].filter(stock => stock && stock.code);

    // 防御性: 安全的setValue包装
    function esm_safeSetValue(variableId, value) {
        try {
            esm_ensureChangedVariables();
            const originalSetValue = Game_Variables.prototype.setValue;
            if (typeof originalSetValue === 'function') {
                originalSetValue.call($gameVariables, variableId, value);
            } else {
                $gameVariables._data[variableId] = value;
            }
            esm_ensureChangedVariables();
            $gameVariables._changedVariables.add(variableId);
        } catch (e) {
            console.error('Expand_Stockmarket: safeSetValue failed for var', variableId, e);
            $gameVariables._data[variableId] = value;
            esm_ensureChangedVariables();
            $gameVariables._changedVariables.add(variableId);
        }
    }

    // 确保_changedVariables存在
    function esm_ensureChangedVariables() {
        if (!$gameVariables._changedVariables || typeof $gameVariables._changedVariables.add !== 'function') {
            console.warn('Expand_Stockmarket: _changedVariables issue, reinitializing...');
            $gameVariables._changedVariables = new Set();
        }
    }

    // ExpandStockManager类 (扩展合约功能)
    class ExpandStockManager {
        constructor() {
            this.esm_account = 0;
            this.esm_holdings = {};
            this.esm_prices = {};
            this.esm_avgBuyPrices = {};
            this.esm_history = {}; // {code: [{day: YYYY-MM-DD, prices: [], avg: num, change: '%'}]}
            this.esm_logs = [];
            this.esm_marketBuffs = { global: {prob: 0, upAmp: 0, downAmp: 0, remaining: 0}, singles: {} };
            this.esm_lastUpdate = { year: 0, month: 0, day: 0, week: 0, period: 0, hour: 0 };
            this.esm_trendCounters = {};
            this.esm_stStatus = {};
            // 合约扩展
            this.esm_margin = Number(esm_contractSettings.initialMargin) || 0;
            this.esm_positions = {}; // {code: {long: ContractPositionStruct, short: ContractPositionStruct}}
            this.esm_orders = []; // [ContractOrderStruct]
            this.esm_ohlcHistory = {}; // {code: [{period: stamp, open: num, high: num, low: num, close: num}]}
            this.esm_lastContractCheck = 0;
            this.esm_orderIdCounter = 0;
            this.esm_longFundingRate = esm_longFundingRate;
            this.esm_shortFundingRate = esm_shortFundingRate;
            this.esm_lastHour = 1;
            this.esm_lastCheckFrame = 0;
            this.esm_cumulativeDeposit = 0;
            this.esm_initStocks(esm_stockList);
        }

        esm_initStocks(list) {
            list.forEach(stock => {
                const code = stock.code;
                if (!code) return;
                stock.displayName = stock.name;
                if (this.esm_prices[code] === undefined) this.esm_prices[code] = Number(stock.basePrice);
                if (this.esm_holdings[code] === undefined) this.esm_holdings[code] = 0;
                if (this.esm_avgBuyPrices[code] === undefined) this.esm_avgBuyPrices[code] = 0;
                if (this.esm_history[code] === undefined) this.esm_history[code] = [];
                if (this.esm_trendCounters[code] === undefined) this.esm_trendCounters[code] = { up: 0, down: 0 };
                if (this.esm_stStatus[code] === undefined) this.esm_stStatus[code] = false;
                if (this.esm_marketBuffs.singles[code] === undefined) this.esm_marketBuffs.singles[code] = {prob: 0, upAmp: 0, downAmp: 0, remaining: 0};
                // 合约初始化
                if (this.esm_positions[code] === undefined) this.esm_positions[code] = { long: null, short: null };
                if (this.esm_ohlcHistory[code] === undefined) this.esm_ohlcHistory[code] = [];
            });
        }

        esm_initPositions(positions) {
            Object.keys(positions).forEach(code => {
                const pos = positions[code];
                ['long', 'short'].forEach(dir => {
                    if (pos[dir]) {
                        pos[dir].fundingPaid = pos[dir].fundingPaid || 0;
                        pos[dir].openTime = pos[dir].openTime || this.esm_getTimeStamp();
                        if (isNaN(pos[dir].stopLoss)) pos[dir].stopLoss = 0; // 0=无
                    }
                });
            });
            return positions;
        }

        esm_save() {
            let saveSuccess = true;
            const esm_saveVars = [
                { id: esm_stockAccountVar, value: this.esm_account },
                { id: esm_stockHoldingsVar, value: JSON.stringify(this.esm_holdings) },
                { id: esm_stockPricesVar, value: JSON.stringify(this.esm_prices) },
                { id: esm_stockAvgBuyPricesVar, value: JSON.stringify(this.esm_avgBuyPrices) },
                { id: esm_tradeLogVar, value: JSON.stringify(this.esm_logs) },
                { id: esm_priceHistoryVar, value: JSON.stringify(this.esm_history) },
                { id: esm_vipVar, value: this.esm_getCurrentVIP() },
                { id: esm_feeRateVar, value: this.esm_getCurrentFeeRate().rate },
                { id: esm_cumulativeDepositVar, value: this.esm_cumulativeDeposit },
                // 合约
                { id: esm_contractMarginVar, value: this.esm_margin },
                { id: esm_contractLongFundingRateVar, value: this.esm_longFundingRate },
                { id: esm_contractShortFundingRateVar, value: this.esm_shortFundingRate }
            ];
            if (!esm_useSaveObject) {
                esm_saveVars.push({ id: esm_contractPositionsVar, value: JSON.stringify(this.esm_positions) });
                esm_saveVars.push({ id: esm_contractOrdersVar, value: JSON.stringify(this.esm_orders) });
                esm_saveVars.push({ id: esm_contractHistoryVar, value: JSON.stringify(this.esm_ohlcHistory) });
            }
            esm_saveVars.forEach(({ id, value }) => {
                try {
                    esm_safeSetValue(id, value);
                } catch (e) {
                    console.error(`Expand_Stockmarket: Failed to save var ${id}:`, e);
                    saveSuccess = false;
                }
            });
            if (saveSuccess) {
                console.log('Expand_Stockmarket: Save successful.');
            } else {
                console.error('Expand_Stockmarket: Partial save failure.');
            }
        }

        esm_load() {
            try {
                this.esm_account = $gameVariables.value(esm_stockAccountVar) || 0;
                this.esm_holdings = safeJsonParse($gameVariables.value(esm_stockHoldingsVar)) || {};
                this.esm_prices = safeJsonParse($gameVariables.value(esm_stockPricesVar)) || {};
                this.esm_avgBuyPrices = safeJsonParse($gameVariables.value(esm_stockAvgBuyPricesVar)) || {};
                this.esm_logs = safeJsonParse($gameVariables.value(esm_tradeLogVar)) || [];
                this.esm_history = safeJsonParse($gameVariables.value(esm_priceHistoryVar)) || {};
                this.esm_marketBuffs = { global: {prob: 0, upAmp: 0, downAmp: 0, remaining: 0}, singles: {} };
                this.esm_lastUpdate = this.esm_getCurrentTime();
                this.esm_initStocks(esm_stockList);
                this.esm_logs = this.esm_logs.slice(0, esm_MAX_LOGS);
                this.esm_updateSTStatus();
                this.esm_cumulativeDeposit = $gameVariables.value(esm_cumulativeDepositVar) || 0;
                this.esm_calculateVIP();
                // 合约加载
                this.esm_margin = $gameVariables.value(esm_contractMarginVar) || Number(esm_contractSettings.initialMargin) || 0;
                this.esm_longFundingRate = $gameVariables.value(esm_contractLongFundingRateVar) || esm_longFundingRate;
                this.esm_shortFundingRate = $gameVariables.value(esm_contractShortFundingRateVar) || esm_shortFundingRate;
                if (esm_useSaveObject) {
                    // 从存档对象加载 (需在DataManager扩展)
                } else {
                    this.esm_positions = this.esm_initPositions(safeJsonParse($gameVariables.value(esm_contractPositionsVar)) || {});
                    this.esm_orders = safeJsonParse($gameVariables.value(esm_contractOrdersVar) || '[]');
                    this.esm_ohlcHistory = safeJsonParse($gameVariables.value(esm_contractHistoryVar)) || {};
                }
                this.esm_orderIdCounter = this.esm_orders.length > 0 ? Math.max(...this.esm_orders.map(o => o.id)) + 1 : 0;
                this.esm_lastHour = $gameVariables.value(esm_hourVar) || 1;
                console.log('Expand_Stockmarket: Load successful.');
            } catch (e) {
                console.error('Expand_Stockmarket: Load failed', e);
                this.esm_initStocks(esm_stockList);
                this.esm_cumulativeDeposit = 0;
                this.esm_calculateVIP();
                // 合约重置
                this.esm_margin = Number(esm_contractSettings.initialMargin) || 0;
                this.esm_positions = {};
                this.esm_orders = [];
                this.esm_ohlcHistory = {};
                this.esm_longFundingRate = esm_longFundingRate;
                this.esm_shortFundingRate = esm_shortFundingRate;
                this.esm_orderIdCounter = 0;
                this.esm_lastHour = 1;
                esm_stockList.forEach(stock => this.esm_positions[stock.code] = { long: null, short: null });
            }
        }

        esm_getCurrentTime() {
            return {
				year: $gameVariables.value(esm_yearVar),
				month: $gameVariables.value(esm_monthVar),
				day: $gameVariables.value(esm_dayVar),
				week: $gameVariables.value(esm_weekVar),
				period: $gameVariables.value(esm_periodVar),
				hour: $gameVariables.value(esm_hourVar)
            };
        }

        esm_getTimeStamp() {
            const t = this.esm_getCurrentTime();
            const periodNames = ['', '凌晨', '上午', '下午', '傍晚'];
            return `${t.year}-${t.month}-${t.day}${periodNames[t.period]}`;
        }

        esm_getDayStamp() {
            const t = this.esm_getCurrentTime();
            return `${t.year}-${t.month}-${t.day}`;
        }

        esm_isBusinessTime() {
            if (!esm_enableBusinessHours) return true;
            const t = this.esm_getCurrentTime();
            return esm_businessPeriods.includes(t.period) && esm_businessWeeks.includes(t.week);
        }

        esm_calcDelta(last, current, cycle) {
            let delta = 0;
            if (cycle === 'period') {
                const totalLast = last.day * esm_PERIODS_PER_DAY + last.period;
                const totalCurrent = current.day * esm_PERIODS_PER_DAY + current.period;
                delta = totalCurrent - totalLast;
                return Math.max(0, delta);
            }
            switch (cycle) {
					case 'day': delta = current.day - last.day; break;
					case 'week': delta = current.week - last.week; break;
					case 'month': delta = current.month - last.month; break;
					case 'hour': delta = current.hour - last.hour; break;
            }
            return Math.max(0, delta);
        }

        esm_checkAndUpdatePrices() {
            const current = this.esm_getCurrentTime();
            let delta = this.esm_calcDelta(this.esm_lastUpdate, current, esm_updateCycle);
            if (delta > 0 && this.esm_isBusinessTime()) {
                if (esm_crossCycleRule === 'final') delta = 1;
                this.esm_updateAllPrices(delta);
            }
            const currentHour = $gameVariables.value(esm_hourVar);
            if (currentHour !== this.esm_lastHour) {
                this.esm_checkContractConditions();
                this.esm_lastHour = currentHour;
            }
            this.esm_lastUpdate = current;
            return delta;
        }

        esm_updateSTStatus() {
            esm_stockList.forEach(stock => {
                const code = stock.code;
                const price = this.esm_prices[code];
                const isST = price < esm_stThreshold;
                if (isST !== this.esm_stStatus[code]) {
                    this.esm_stStatus[code] = isST;
                    stock.displayName = isST ? (esm_messages.stPrefix || 'ST*') + stock.name : stock.name;
                }
            });
        }

        esm_getMarketBuff(code) {
            const globalBuff = this.esm_marketBuffs.global;
            const singleBuff = this.esm_marketBuffs.singles[code] || {prob: 0, upAmp: 0, downAmp: 0, remaining: 0};
            return {
                prob: (globalBuff.remaining > 0 ? globalBuff.prob : 0) + (singleBuff.remaining > 0 ? singleBuff.prob : 0),
                upAmp: (globalBuff.remaining > 0 ? globalBuff.upAmp : 0) + (singleBuff.remaining > 0 ? singleBuff.upAmp : 0),
                downAmp: (globalBuff.remaining > 0 ? globalBuff.downAmp : 0) + (singleBuff.remaining > 0 ? singleBuff.downAmp : 0)
            };
        }

        esm_applyMarketBuffs(delta) {
            if (this.esm_marketBuffs.global.remaining > 0) {
                this.esm_marketBuffs.global.remaining -= delta;
                if (this.esm_marketBuffs.global.remaining <= 0) {
                    this.esm_marketBuffs.global = {prob: 0, upAmp: 0, downAmp: 0, remaining: 0};
                }
            }
            Object.keys(this.esm_marketBuffs.singles).forEach(code => {
                if (this.esm_marketBuffs.singles[code].remaining > 0) {
                    this.esm_marketBuffs.singles[code].remaining -= delta;
                    if (this.esm_marketBuffs.singles[code].remaining <= 0) {
                        this.esm_marketBuffs.singles[code] = {prob: 0, upAmp: 0, downAmp: 0, remaining: 0};
                    }
                }
            });
        }

        esm_calcUpProb(stock) {
            let prob = Number(stock.upProb) + esm_globalUpProb;
            const buff = this.esm_getMarketBuff(stock.code);
            prob += buff.prob;
            const t = this.esm_getCurrentTime();
            if (stock.periodBias === 'morning_up20' && t.period === 1) prob += 20;
            if (stock.periodBias === 'evening_down15' && t.period === 3) prob -= 15;
            if (stock.cycleBias === 'month_first_up30' && t.week === 1) prob += 30;
            if (stock.cycleBias === 'week_last_down25' && t.day === esm_DAYS_PER_MONTH) prob -= 25;
            const counters = this.esm_trendCounters[stock.code] || { up: 0, down: 0 };
            if (counters.down >= 3) prob += 30;
            if (counters.up >= 3) prob -= 30;
            return Math.max(0, Math.min(100, prob));
        }

        esm_updateStockPrice(stock, isForce = false) {
            if (!this.esm_isBusinessTime() && !isForce) return;
            const code = stock.code;
            let currentPrice = this.esm_prices[code];
            let newPrice = currentPrice;
            let changePct = 0;
            const counters = this.esm_trendCounters[code] || { up: 0, down: 0 };
            const buff = this.esm_getMarketBuff(code);

            const upProb = this.esm_calcUpProb(stock);
            const isUp = Math.random() * 100 < upProb;
            let changeAmp = Math.floor(Math.random() * (isUp ? Number(stock.upAmp) : Number(stock.downAmp))) + 1;
            changeAmp += isUp ? buff.upAmp : buff.downAmp;

            const change = Math.floor(currentPrice * (changeAmp / 100));
            if (isUp) {
                newPrice = Math.min(currentPrice + change, currentPrice * (1 + esm_maxUpAmp / 100));
                counters.up++;
                counters.down = 0;
            } else {
                newPrice = Math.max(currentPrice - change, currentPrice * (1 - esm_maxDownAmp / 100));
                counters.down++;
                counters.up = 0;
            }
            changePct = ((newPrice - currentPrice) / currentPrice * 100).toFixed(2);

            this.esm_prices[code] = newPrice;
            this.esm_trendCounters[code] = counters;

            // 历史: 按日聚合
            const dayStamp = this.esm_getDayStamp();
            let dayEntry = this.esm_history[code].find(e => e.day === dayStamp);
            if (!dayEntry) {
                dayEntry = { day: dayStamp, prices: [], avg: 0 };
                this.esm_history[code].unshift(dayEntry);
                if (this.esm_history[code].length > esm_historyPeriods) this.esm_history[code].pop();
            }
            dayEntry.prices.push(newPrice);
            dayEntry.avg = dayEntry.prices.reduce((a, b) => a + b, 0) / dayEntry.prices.length;
            dayEntry.change = changePct + '%';

            // OHLC历史 (合约)
            const periodStamp = this.esm_getTimeStamp();
            let ohlcEntry = this.esm_ohlcHistory[code].find(e => e.period === periodStamp);
            if (!ohlcEntry) {
                ohlcEntry = { period: periodStamp, open: currentPrice, high: currentPrice, low: currentPrice, close: newPrice };
                this.esm_ohlcHistory[code].unshift(ohlcEntry);
            } else {
                ohlcEntry.high = Math.max(ohlcEntry.high, newPrice);
                ohlcEntry.low = Math.min(ohlcEntry.low, newPrice);
                ohlcEntry.close = newPrice;
            }
        }

        esm_updateAllPrices(delta) {
            for (let i = 0; i < delta; i++) {
                esm_stockList.forEach(stock => this.esm_updateStockPrice(stock));
            }
            this.esm_applyMarketBuffs(delta);
            this.esm_updateSTStatus();
            this.esm_save();
        }

        esm_calculateVIP() {
            try {
                const cumulativeDeposit = this.esm_cumulativeDeposit;
                let vipLevel = 0;
                for (let level = 7; level >= 1; level--) {
                    const threshold = Number(esm_vipThresholds[`vip${level}`]) || Infinity;
                    if (cumulativeDeposit >= threshold) {
                        vipLevel = level;
                        break;
                    }
                }
                esm_safeSetValue(esm_vipVar, vipLevel);
                const rate = this.esm_getFeeRate(vipLevel);
                esm_safeSetValue(esm_feeRateVar, rate);
                return vipLevel;
            } catch (e) {
                console.error('Expand_Stockmarket: VIP calculation failed', e);
                esm_safeSetValue(esm_vipVar, 0);
                esm_safeSetValue(esm_feeRateVar, 0.005);
                return 0;
            }
        }

        esm_getCurrentVIP() {
            const vip = $gameVariables.value(esm_vipVar);
            return Math.max(0, Math.min(7, Number(vip) || this.esm_calculateVIP()));
        }

        esm_getFeeRate(vip) {
            const vipKey = `vip${vip}`;
            return Number(esm_feeRates[vipKey]) || 0.005;
        }

        esm_getCurrentFeeRate() {
            const vip = this.esm_getCurrentVIP();
            const rate = this.esm_getFeeRate(vip);
            return { vip, rate, percent: (rate * 100).toFixed(3) };
        }

        esm_queryFeeRate(outputVar = 0) {
            this.esm_calculateVIP();
            const { vip, rate, percent } = this.esm_getCurrentFeeRate();
            const msg = esm_messages.feeRateMsg.replace('%1', vip).replace('%2', rate).replace('%3', percent);
            $gameMessage.add(msg);
            if (outputVar > 0) {
                esm_safeSetValue(outputVar, rate);
                if (esm_debugLog) console.log('Expand_Stockmarket: Fee rate saved to var', outputVar, rate);
            }
        }

        esm_queryFundingRate(outputLongVar = 0, outputShortVar = 0) {
            const msg = esm_messages.fundingRateMsg.replace('%1', this.esm_longFundingRate).replace('%2', this.esm_shortFundingRate);
            $gameMessage.add(msg);
            if (outputLongVar > 0) {
                esm_safeSetValue(outputLongVar, this.esm_longFundingRate);
            }
            if (outputShortVar > 0) {
                esm_safeSetValue(outputShortVar, this.esm_shortFundingRate);
            }
            if (esm_debugLog) console.log('Expand_Stockmarket: Funding rates queried', this.esm_longFundingRate, this.esm_shortFundingRate);
        }

        esm_setFundingRate(longRate, shortRate) {
            this.esm_longFundingRate = Number(longRate) || this.esm_longFundingRate;
            this.esm_shortFundingRate = Number(shortRate) || this.esm_shortFundingRate;
            this.esm_save();
            if (esm_debugLog) console.log('Expand_Stockmarket: Funding rates set to', this.esm_longFundingRate, this.esm_shortFundingRate);
        }

        esm_calculateFee(amount, rate = this.esm_getCurrentFeeRate().rate) {
            return Math.floor(amount * rate);
        }

        esm_setGlobalMarket(prob, upAmp, downAmp, years, months, days) {
            const totalDays = years * esm_DAYS_PER_YEAR + months * esm_DAYS_PER_MONTH + days;
            this.esm_marketBuffs.global = { prob: Number(prob) || 0, upAmp: Number(upAmp) || 0, downAmp: Number(downAmp) || 0, remaining: totalDays };
            if (esm_debugLog) console.log('Expand_Stockmarket: Global buff applied, remaining days:', totalDays);
        }

        esm_setSingleMarket(code, prob, upAmp, downAmp, years, months, days) {
            const totalDays = years * esm_DAYS_PER_YEAR + months * esm_DAYS_PER_MONTH + days;
            this.esm_marketBuffs.singles[code] = { prob: Number(prob) || 0, upAmp: Number(upAmp) || 0, downAmp: Number(downAmp) || 0, remaining: totalDays };
            if (esm_debugLog) console.log('Expand_Stockmarket: Single buff applied for', code, 'remaining days:', totalDays);
        }

        esm_addLog(entry) {
            this.esm_logs.unshift(entry);
            if (this.esm_logs.length > esm_MAX_LOGS) this.esm_logs.pop();
        }

        esm_depositCash(amount) {
            if (!this.esm_isBusinessTime()) return $gameMessage.add(esm_messages.closedMessage);
            const gold = $gameParty.gold();
            if (isNaN(amount) || amount <= 0) return $gameMessage.add(esm_messages.invalidAmount);
            let actualAmount = amount;
            let isExceed = false;
            if (amount > gold) {
                actualAmount = gold;
                isExceed = true;
            }
            this.esm_account += actualAmount;
            this.esm_cumulativeDeposit += actualAmount;
            $gameParty.gainGold(-actualAmount);
            this.esm_addLog(`存入 ${actualAmount}金币`);
            this.esm_calculateVIP();
            this.esm_save();
            if (isExceed) {
                $gameMessage.add(esm_messages.depositExceed.replace('%1', actualAmount));
            } else {
                $gameMessage.add(esm_messages.depositSuccess.replace('%1', this.esm_account));
            }
        }

        esm_withdrawCash(amount) {
            if (!this.esm_isBusinessTime()) return $gameMessage.add(esm_messages.closedMessage);
            if (isNaN(amount) || amount <= 0) return $gameMessage.add(esm_messages.invalidAmount);
            let actualAmount = amount;
            let isExceed = false;
            if (amount > this.esm_account) {
                actualAmount = this.esm_account;
                isExceed = true;
            }
            this.esm_account -= actualAmount;
            $gameParty.gainGold(actualAmount);
            this.esm_addLog(`取出 ${actualAmount}金币`);
            this.esm_calculateVIP();
            this.esm_save();
            if (isExceed) {
                $gameMessage.add(esm_messages.withdrawExceed.replace('%1', actualAmount));
            } else {
                $gameMessage.add(esm_messages.withdrawSuccess.replace('%1', actualAmount));
            }
        }

        esm_buyStock(code, amount) {
            if (!this.esm_isBusinessTime()) return $gameMessage.add(esm_messages.closedMessage);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.invalidStockCode);
            if (isNaN(amount) || amount <= 0) return $gameMessage.add(esm_messages.invalidQuantity);
            const price = this.esm_prices[code];
            const vip = this.esm_calculateVIP();
            const baseAmount = Math.floor(amount * price);
            const fee = Math.floor(baseAmount * this.esm_getFeeRate(vip));
            const total = baseAmount + fee;
            if (total > this.esm_account) {
                const msg = esm_messages.buyInsufficient + esm_messages.buyFeeInsufficient.replace('%1', fee);
                return $gameMessage.add(msg);
            }
            const currHold = this.esm_holdings[code] || 0;
            const currAvg = this.esm_avgBuyPrices[code] || 0;
            const newHold = currHold + amount;
            this.esm_avgBuyPrices[code] = (currAvg * currHold + price * amount) / newHold;
            this.esm_account -= total;
            this.esm_holdings[code] = newHold;
            this.esm_addLog(`买入 ${stock.displayName} ${amount}股 @${price} (手续费${fee})`);
            this.esm_save();
            const successMsg = esm_messages.buySuccess.replace('%1', stock.displayName).replace('%2', newHold);
            $gameMessage.add(successMsg + esm_messages.buySuccessFee.replace('%1', fee));
        }

        esm_sellStock(code, amount = 0) {
            if (!this.esm_isBusinessTime()) return $gameMessage.add(esm_messages.closedMessage);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.invalidStockCode);
            let amt = amount;
            if (isNaN(amt) || amt < 0) return $gameMessage.add(esm_messages.invalidQuantity);
            const maxHold = this.esm_holdings[code] || 0;
            if (amt === 0) amt = maxHold;
            if (amt > maxHold || amt <= 0) return $gameMessage.add(esm_messages.sellInsufficient);
            const price = this.esm_prices[code];
            const vip = this.esm_calculateVIP();
            const baseAmount = Math.floor(amt * price);
            const fee = Math.floor(baseAmount * this.esm_getFeeRate(vip));
            const net = Math.max(0, baseAmount - fee);
            this.esm_account += net;
            this.esm_holdings[code] -= amt;
            if (this.esm_holdings[code] <= 0) {
                this.esm_holdings[code] = 0;
                this.esm_avgBuyPrices[code] = 0;
            }
            this.esm_addLog(`卖出 ${stock.displayName} ${amt}股 @${price} (手续费${fee})`);
            this.esm_save();
            const successMsg = esm_messages.sellSuccess.replace('%1', net);
            $gameMessage.add(successMsg + esm_messages.sellSuccessFee.replace('%1', fee));
        }

        esm_clearAllHoldings() {
            if (!this.esm_isBusinessTime()) return $gameMessage.add(esm_messages.closedMessage);
            let totalNet = 0;
            let totalFee = 0;
            const vip = this.esm_calculateVIP();
            esm_stockList.forEach(stock => {
                const code = stock.code;
                const amt = this.esm_holdings[code] || 0;
                if (amt > 0) {
                    const price = this.esm_prices[code];
                    const baseAmount = Math.floor(amt * price);
                    const fee = Math.floor(baseAmount * this.esm_getFeeRate(vip));
                    const net = Math.max(0, baseAmount - fee);
                    totalNet += net;
                    totalFee += fee;
                    this.esm_account += net;
                    this.esm_holdings[code] = 0;
                    this.esm_avgBuyPrices[code] = 0;
                    this.esm_addLog(`卖出 ${stock.displayName} ${amt}股 @${price} (手续费${fee})`);
                }
            });
            this.esm_calculateVIP();
            this.esm_save();
            this.esm_addLog(`一键清仓，总+${totalNet}金币 (总手续费${totalFee})`);
            $gameMessage.add(`清仓完成！总获利 ${totalNet}金币。（扣手续费 ${totalFee}）`);
        }

        esm_queryAllHoldings() {
            this.esm_calculateVIP();
            let totalTypes = 0;
            let totalPnl = 0;
            let totalCost = 0;
            let totalValue = 0;
            let listMsg = '';
            esm_stockList.forEach(stock => {
                const code = stock.code;
                const hold = this.esm_holdings[code] || 0;
                if (hold > 0) {
                    totalTypes++;
                    const avg = this.esm_avgBuyPrices[code] || 0;
                    const curr = this.esm_prices[code];
                    const pnl = (curr - avg) * hold;
                    const cost = avg * hold;
                    const value = curr * hold;
                    totalPnl += pnl;
                    totalCost += cost;
                    totalValue += value;
                    const pnlStr = pnl > 0 ? '+' + Math.floor(pnl) : pnl < 0 ? Math.floor(pnl) : '0';
                    listMsg += `代码：${code}。数量：${hold}。收益：${pnlStr}。\n`;
                }
            });
            if (totalTypes === 0) return $gameMessage.add(esm_messages.noHoldings);
            const yieldRateStr = totalCost > 0 ? (totalValue / totalCost - 1) * 100 : 0;
            const yieldFormatted = yieldRateStr > 0 ? '+' + yieldRateStr.toFixed(2) + '%' : yieldRateStr < 0 ? yieldRateStr.toFixed(2) + '%' : '0%';
            const totalPnlStr = totalPnl > 0 ? '+' + Math.floor(totalPnl) : totalPnl < 0 ? Math.floor(totalPnl) : '0';
            $gameMessage.add(`持仓数：${totalTypes}。总盈亏：${totalPnlStr}。收益率：${yieldFormatted}\n${listMsg}`);
        }

        esm_querySingleHolding() {
            this.esm_calculateVIP();
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
            // 日/周/月涨跌
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

        esm_daysDiff(day1, day2) {
            const d1 = new Date(day1.replace(/-/g, '/'));
            const d2 = new Date(day2.replace(/-/g, '/'));
            return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
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
            $gameMessage.add(`${stock.name}(${code})\n${info}`);
        }

        esm_queryHistory(days) {
            const rawCode = $gameVariables.value(esm_inputCodeVar);
            if (isNaN(rawCode)) return $gameMessage.add(esm_messages.invalidStockCode);
            const code = rawCode.toString().padStart(3, '0');
            if (code.length !== 3) return $gameMessage.add(esm_messages.invalidStockCode);
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return $gameMessage.add(esm_messages.stockNotFound);
            days = Math.min(Number(days) || 1, esm_historyPeriods);
            let msg = `${stock.displayName}(${stock.code})最近${days}个交易日历史：\n`;
            const hist = this.esm_history[code] || [];
            const actualDays = Math.min(days, hist.length);
            if (actualDays === 0) {
                $gameMessage.add(msg + '无历史数据。');
                return;
            }
            const recentHist = hist.slice(0, actualDays);
            recentHist.forEach((entry, i) => {
                msg += `交易日${i+1}(${entry.day}): 平均${entry.avg.toFixed(2)} ${entry.change}\n`;
            });
            if (actualDays < days) {
                msg += `\n历史数据不足，仅显示可用${actualDays}个交易日。`;
            }
            $gameMessage.add(msg);
        }

        // 合约功能
        esm_depositMargin(amount) {
            if (isNaN(amount) || amount <= 0) return $gameMessage.add(esm_messages.invalidAmount);
            if (amount > this.esm_account) return $gameMessage.add(esm_messages.marginInsufficient);
            const fee = this.esm_calculateFee(amount);
            this.esm_account -= amount;
            this.esm_margin += (amount - fee);
            this.esm_addLog(`转入保证金 ${amount} (手续费${fee})`);
            this.esm_save();
            $gameMessage.add(esm_messages.marginTransferSuccess.replace('%1', this.esm_margin) + esm_messages.marginTransferFee.replace('%1', fee));
        }

        esm_withdrawMargin(amount) {
            if (isNaN(amount) || amount <= 0) return $gameMessage.add(esm_messages.invalidAmount);
            if (amount > this.esm_margin) return $gameMessage.add(esm_messages.marginInsufficient);
            const fee = this.esm_calculateFee(amount);
            this.esm_margin -= amount;
            this.esm_account += (amount - fee);
            this.esm_addLog(`转出保证金 ${amount} (手续费${fee})`);
            this.esm_save();
            $gameMessage.add(esm_messages.marginTransferSuccess.replace('%1', this.esm_margin) + esm_messages.marginTransferFee.replace('%1', fee));
        }

        esm_openPosition(direction, code, quantity, leverage) {
            try {
                const stock = esm_stockList.find(s => s.code === code);
                if (!stock) return $gameMessage.add(esm_messages.invalidStockCode);
                quantity = Math.floor(quantity);
                if (quantity <= 0) return $gameMessage.add(esm_messages.invalidQuantity);
                leverage = Math.max(1, Math.min(esm_maxLeverage, Number(leverage) || esm_defaultLeverage));
                if (leverage !== Number($gameVariables.value(esm_contractInputLeverageVar))) $gameMessage.add(esm_messages.invalidLeverage);
                const price = this.esm_prices[code];
                const value = quantity * price;
                const marginRequired = Math.floor(value / leverage);
                const fee = this.esm_calculateFee(marginRequired);
                if (marginRequired + fee > this.esm_margin) return $gameMessage.add(esm_messages.marginInsufficient);
                // 处理反向仓位 (净仓模式, 可配置为对冲)
                const oppositeDir = direction === 'long' ? 'short' : 'long';
                if (this.esm_positions[code][oppositeDir]) {
                    // 净仓: 自动平仓反向
                    const oppPos = this.esm_positions[code][oppositeDir];
                    const closeQty = Math.min(quantity, oppPos.quantity);
                    this.esm_closePosition(code, closeQty, oppositeDir, true); // 内部调用, 无消息
                    if (oppPos.quantity === 0) this.esm_positions[code][oppositeDir] = null;
                    quantity -= closeQty;
                    if (quantity <= 0) return; // 全对冲
                }
                // 开新仓
                if (quantity > 0) {
                    const pos = this.esm_positions[code][direction] || {
                        code, direction, quantity: 0, entryPrice: 0, stopLoss: 0, openTime: this.esm_getTimeStamp(), leverage, fundingPaid: 0, marginUsed: 0
                    };
                    const newQty = pos.quantity + quantity;
                    pos.entryPrice = (pos.entryPrice * pos.quantity + price * quantity) / newQty; // 平均入场价
                    pos.quantity = newQty;
                    pos.stopLoss = 0;
                    pos.marginUsed += marginRequired;
                    this.esm_positions[code][direction] = pos;
                    this.esm_margin -= (marginRequired + fee);
                    this.esm_addLog(`开${direction}仓 ${code} ${quantity} @${price} (杠杆${leverage}, 手续费${fee})`);
                    $gameMessage.add(esm_messages.openPositionSuccess.replace('%1', direction).replace('%2', quantity));
                }
                this.esm_save();
            } catch (e) {
                console.error('Expand_Stockmarket: openPosition failed', e);
                $gameMessage.add('开仓失败！');
            }
        }

        esm_closePosition(code, quantity = 0, dir = null, internal = false) {
            try {
                const stock = esm_stockList.find(s => s.code === code);
                if (!stock) return $gameMessage.add(esm_messages.invalidStockCode);
                quantity = Math.floor(quantity);
                let pnl = 0;
                let releasedMargin = 0;
                let fee = 0;
                ['long', 'short'].forEach(direction => {
                    if (dir && direction !== dir) return;
                    const pos = this.esm_positions[code][direction];
                    if (!pos || pos.quantity <= 0) return;
                    let closeQty = quantity || pos.quantity;
                    if (closeQty > pos.quantity) closeQty = pos.quantity;
                    const price = this.esm_prices[code];
                    const basePnl = (price - pos.entryPrice) * closeQty * (direction === 'long' ? 1 : -1);
                    pnl += basePnl * pos.leverage;
                    releasedMargin += Math.floor((pos.marginUsed / pos.quantity) * closeQty);
                    fee += this.esm_calculateFee(Math.abs(pnl));
                    pos.quantity -= closeQty;
                    pos.marginUsed -= Math.floor((pos.marginUsed / (pos.quantity + closeQty)) * closeQty);
                    if (pos.quantity <= 0) this.esm_positions[code][direction] = null;
                    this.esm_addLog(`平${direction}仓 ${code} ${closeQty} @${price} (盈亏${Math.floor(pnl)})`);
                });
                this.esm_margin += (releasedMargin + Math.floor(pnl) - fee);
                this.esm_margin = Math.max(0, this.esm_margin);
                this.esm_save();
                if (!internal) {
                    $gameMessage.add(esm_messages.closePositionSuccess.replace('%1', Math.floor(pnl)));
                }
                return pnl;
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
                        this.esm_closePosition(code, pos.quantity, direction);
                        $gameMessage.add(esm_messages.liquidationTriggered.replace('%1', code).replace('%2', this.esm_margin));
                        if (esm_debugLog) console.log('Expand_Stockmarket: Liquidation triggered for', code, direction);
                    } else if (pos.stopLoss > 0) {
                        const trigger = direction === 'long' ? price <= pos.stopLoss : price >= pos.stopLoss;
                        if (trigger) {
                            this.esm_closePosition(code, pos.quantity, direction);
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
                        this.esm_closePosition(order.code, order.quantity, order.direction);
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

    // 暴露 esm_manager 到全局，以便其他插件访问
    window.esm_manager = esm_manager;
    window.esm_stockList = esm_stockList;
    window.esm_messages = esm_messages;

})();
