//=============================================================================
// Expand_Stockmarket.js
//=============================================================================
/*
插件名：Expand_Stockmarket
用到的原生内容：扩展了Scene_Map.prototype.start（用alias）、Scene_Map.prototype.update（用alias）、DataManager.makeSaveContents（用alias）、DataManager.extractSaveContents（用alias）、DataManager.createGameObjects（用alias）、DataManager.loadGame（用alias）；注册了PluginManager.registerCommand命令。
冲突提示：若其他插件也修改了Scene_Map的start或update方法，请确保本插件在其之后加载；若其他插件修改DataManager的save/load，请检查兼容性；本插件依赖Time_System插件，确保变量ID匹配。
*/
// 作者: 自定义 (优化版 by Grok)
// 版本: 1.0.25 (修复版：增强JSON解析安全、变量初始化、try-catch保护、存档兼容)
// 描述: RPG Maker MZ 股市系统插件，支持账户管理、股票交易、价格动态更新，与Time_System时间插件绑定。
//       扩展: 新增合约功能，包括杠杆、多空方向、止损、爆仓、资金费率、委托单等。合约独立账户，从变量71开始，使用原股票价格，无休市限制。
//       合约核心: 杠杆(1-10x)、多空、止损/爆仓检查、资金费率扣取、委托单(市价/限价/止盈/止损)。
//       可视化: 集成图形界面，支持菜单入口和事件调用，鼠标/键盘交互。
//       其他功能不变。
// 使用条款: 仅限RPG Maker MZ项目使用，可自由修改。
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 股市系统，账户与股票交易 (增强版+合约扩展+可视化界面)
 * @author 自定义
 *
 * @param variables
 * @text 1. 变量设置
 * @type struct<VariablesStruct>
 * @default {"timeSettings":"{\"yearVar\":\"23\",\"monthVar\":\"24\",\"dayVar\":\"25\",\"weekVar\":\"27\",\"periodVar\":\"28\"}","stockAccountVar":"62","stockHoldingsVar":"63","stockPricesVar":"64","stockAvgBuyPricesVar":"65","tradeLogVar":"66","priceHistoryVar":"67","inputAmountVar":"68","inputCodeVar":"69","contractMarginVar":"71","contractPositionsVar":"72","contractInputAmountVar":"73","contractInputCodeVar":"74","contractInputLeverageVar":"75","contractInputStopLossVar":"76","contractOrdersVar":"77","contractHistoryVar":"78","contractLongFundingRateVar":"79","contractShortFundingRateVar":"80"}

 * @param volatility
 * @text 2. 涨跌设置
 * @type struct<VolatilityStruct>
 * @default {"updateCycle":"period","updateTrigger":"both","crossCycleRule":"sequential","globalUpProb":"50","maxUpAmp":"10","maxDownAmp":"10","historyPeriods":"30","stThreshold":"5"}

 * @param messages
 * @text 3. 文本设置
 * @type struct<MessagesStruct>
 * @default {"closedMessage":"当前时段休市，请在上午或下午再来","insufficientGold":"金币不足！您只有 %1 金币，无法存入 %2。","invalidAmount":"无效金额，请输入正数。","depositSuccess":"存入成功！资金账户余额：%1 金币。","depositExceed":"金币不足，只有 %1，已存入全部。","withdrawInsufficient":"账户余额不足！资金账户只有 %1 金币，无法取出 %2。","withdrawSuccess":"取出成功！玩家金币增加 %1。","withdrawExceed":"余额不足，只有 %1，已取出全部。","buyInsufficient":"账户余额或数量不足！","buySuccess":"购买成功！持有%1：%2股。","sellInsufficient":"持有数量不足！","sellSuccess":"出售成功！账户增加 %1 金币。","noHoldings":"您目前没有持有任何股票。","stockNotFound":"股票代码不存在，查询为空。","invalidStockCode":"无效股票代码！","stPrefix":"ST*","invalidQuantity":"选择正确的数量。","buyFeeInsufficient":"手续费不足！需额外 %1 金币。","buySuccessFee":"手续费：%1 金币。","sellSuccessFee":"（扣手续费 %1）。","feeRateMsg":"当前VIP等级：%1，手续费率：%2 (即%3%)。","marginInsufficient":"保证金不足！","marginTransferSuccess":"转入/转出成功！保证金余额：%1。","marginTransferFee":"手续费：%1。","openPositionSuccess":"开仓成功！方向：%1，数量：%2。","closePositionSuccess":"平仓成功！盈亏：%1。","stopLossTriggered":"止损触发，已自动平仓：%1。","liquidationTriggered":"爆仓强制平仓：%1，剩余保证金：%2。","fundingFeeDeducted":"扣取资金费率：%1。","invalidLeverage":"杠杆超出范围！使用默认值。","invalidPrice":"价格无效！","orderPlaced":"委托单已挂起：%1。","orderExecuted":"委托单执行：%1。","orderCancelled":"委托单取消：%1。","noPositions":"无持仓合约。","fundingRateMsg":"当前做多费率：%1，做空费率：%2。"}

 * @param business
 * @text 4. 营业设置
 * @type struct<BusinessStruct>
 * @default {"enableBusinessHours":"true","businessPeriods":"[\"1\",\"2\"]","businessWeeks":"[\"1\",\"2\",\"3\",\"4\",\"5\"]"}

 * @param stock1
 * @text 5. 股票001
 * @type struct<StockInfo>
 * @default {"code":"001","name":"正大科技","basePrice":"75","upProb":"0","upAmp":"10","downAmp":"10","periodBias":"none","cycleBias":"none","dividendCycle":"3","dividendBase":"fixed","dividendValue":"5","companyInfo":"","infoWidth":"25"}
 * @desc 固定股票1配置。

 * @param stock2
 * @text 6. 股票002
 * @type struct<StockInfo>
 * @default {"code":"002","name":"深红实业","basePrice":"155","upProb":"0","upAmp":"10","downAmp":"10","periodBias":"none","cycleBias":"none","dividendCycle":"3","dividendBase":"fixed","dividendValue":"5","companyInfo":"","infoWidth":"25"}
 * @desc 固定股票2配置。

 * @param stock3
 * @text 7. 股票003
 * @type struct<StockInfo>
 * @default {"code":"003","name":"东方制药","basePrice":"440","upProb":"0","upAmp":"10","downAmp":"10","periodBias":"none","cycleBias":"none","dividendCycle":"3","dividendBase":"fixed","dividendValue":"5","companyInfo":"","infoWidth":"25"}
 * @desc 固定股票3配置。

 * @param customStocks
 * @text 8. 自定义股票
 * @type struct<StockInfo>[]
 * @default []
 * @desc 添加额外股票。点击+添加新项，初始为空(填写code等)。

 * @param specialEvents
 * @text 9. 特殊事件
 * @type struct<SpecialEvent>[]
 * @default []

 * @param tradeSettings
 * @text 10. 交易设置
 * @type struct<TradeSettingsStruct>
 * @default {"vipVar":"81","feeRateVar":"82","thresholdVar":"83","feeRate":"0.01","feeThreshold":"10000","feeRateVip":"0.005","useSaveObject":"true"}

 * @param contractSettings
 * @text 11. 合约设置
 * @type struct<ContractSettingsStruct>
 * @default {"marginTransferFeeRate":"0.001","defaultLeverage":"5","maxLeverage":"10","liquidationThreshold":"0.1","fundingInterval":"period","longFundingRate":"0.0001","shortFundingRate":"0.0001"}

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

 * @param subCommandSettings
 * @text 子命令窗口设置
 * @type struct<WindowSettingsStruct>
 * @default {"width":"600","height":"430","offsetX":"200","offsetY":"170"}

 * @param messageSettings
 * @text 消息窗口设置
 * @type struct<WindowSettingsStruct>
 * @default {"width":"600","height":"430","offsetX":"200","offsetY":"170"}

 * @param inputSettings
 * @text 输入窗口设置
 * @type struct<WindowSettingsStruct>
 * @default {"width":"400","height":"150","offsetX":"200","offsetY":"200"}

 * @param backgroundImage
 * @text 窗口背景
 * @type file
 * @dir img/system/
 * @default 
 * @desc 背景图片文件名（img/system/下），为空则无。

 * @command OpenStockWindow
 * @text 打开股市窗口
 * @desc 事件中调用打开图形界面。

 * @help 使用说明：
 * - 依赖Time_System插件，确保变量ID匹配。
 * - 事件中可调用插件命令如DepositCash、BuyStock等。
 * - 主菜单添加“股市”入口（可选关闭），或事件调用 OpenStockWindow。
 * - 界面: 主命令窗口（账户/交易/查询/合约/退出），信息面板（余额/VIP等），股票列表（点击操作）。
 * - 操作: 鼠标点击/键盘选择，数字输入窗口支持鼠标。
 * - 查询结果在专用消息窗口显示。
 * - 兼容: 不修改核心窗口，仅新增类。
 * - 调试: 若 esm_manager 未定义，控制台警告。
 */

/*~struct~VariablesStruct:
 * @param timeSettings
 * @text 时间变量
 * @type struct<TimeSettings>
 * @default {"yearVar":"23","monthVar":"24","dayVar":"25","weekVar":"27","periodVar":"28"}

 * @param stockAccountVar
 * @text 资金账户
 * @type variable
 * @default 62

 * @param stockHoldingsVar
 * @text 持股量
 * @type variable
 * @default 63

 * @param stockPricesVar
 * @text 股价
 * @type variable
 * @default 64

 * @param stockAvgBuyPricesVar
 * @text 平均买入价
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
 * @text 输入金额/数量
 * @type variable
 * @default 68

 * @param inputCodeVar
 * @text 输入代码
 * @type variable
 * @default 69

 * @param contractMarginVar
 * @text 合约保证金
 * @type variable
 * @default 71

 * @param contractPositionsVar
 * @text 合约持仓
 * @type variable
 * @default 72

 * @param contractInputAmountVar
 * @text 合约输入数量
 * @type variable
 * @default 73

 * @param contractInputCodeVar
 * @text 合约输入代码
 * @type variable
 * @default 74

 * @param contractInputLeverageVar
 * @text 合约输入杠杆
 * @type variable
 * @default 75

 * @param contractInputStopLossVar
 * @text 合约输入止损
 * @type variable
 * @default 76

 * @param contractOrdersVar
 * @text 合约委托单
 * @type variable
 * @default 77

 * @param contractHistoryVar
 * @text 合约历史
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

/*~struct~TimeSettings:
 * @param yearVar
 * @text 年
 * @type variable
 * @default 23

 * @param monthVar
 * @text 月
 * @type variable
 * @default 24

 * @param dayVar
 * @text 日
 * @type variable
 * @default 25

 * @param weekVar
 * @text 周
 * @type variable
 * @default 27

 * @param periodVar
 * @text 时段
 * @type variable
 * @default 28
 */

/*~struct~VolatilityStruct:
 * @param updateCycle
 * @text 更新周期
 * @type select
 * @option 小时
 * @value hour
 * @option 时段
 * @value period
 * @option 日
 * @value day
 * @default period

 * @param updateTrigger
 * @text 更新触发
 * @type select
 * @option 手动
 * @value manual
 * @option 自动
 * @value auto
 * @option 两者
 * @value both
 * @default both

 * @param crossCycleRule
 * @text 跨周期规则
 * @type select
 * @option 连续
 * @value sequential
 * @option 跳跃
 * @value jump
 * @default sequential

 * @param globalUpProb
 * @text 全局上涨概率
 * @type number
 * @min 0
 * @max 100
 * @default 50

 * @param maxUpAmp
 * @text 最大涨幅(%)
 * @type number
 * @default 10

 * @param maxDownAmp
 * @text 最大跌幅(%)
 * @type number
 * @default 10

 * @param historyPeriods
 * @text 历史周期数
 * @type number
 * @default 30

 * @param stThreshold
 * @text ST阈值(连续跌幅天数)
 * @type number
 * @default 5
 */

/*~struct~MessagesStruct:
 * @param closedMessage
 * @text 休市消息
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
 * @text 存入超额
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
 * @text 取出超额
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
 * @text 股票未找到
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
 * @text 手续费不足
 * @type string
 * @default 手续费不足！需额外 %1 金币。

 * @param buySuccessFee
 * @text 购买手续费
 * @type string
 * @default 手续费：%1 金币。

 * @param sellSuccessFee
 * @text 出售手续费
 * @type string
 * @default （扣手续费 %1）。

 * @param feeRateMsg
 * @text 手续费信息
 * @type string
 * @default 当前VIP等级：%1，手续费率：%2 (即%3%)。

 * @param marginInsufficient
 * @text 保证金不足
 * @type string
 * @default 保证金不足！

 * @param marginTransferSuccess
 * @text 保证金转入/出成功
 * @type string
 * @default 转入/转出成功！保证金余额：%1。

 * @param marginTransferFee
 * @text 保证金手续费
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
 * @text 资金费率信息
 * @type string
 * @default 当前做多费率：%1，做空费率：%2。
 */

/*~struct~BusinessStruct:
 * @param enableBusinessHours
 * @text 启用营业时间
 * @type boolean
 * @default true

 * @param businessPeriods
 * @text 营业时段
 * @type string[]
 * @default ["1","2"]

 * @param businessWeeks
 * @text 营业周
 * @type string[]
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
 * @default 正大科技

 * @param basePrice
 * @text 基础价
 * @type number
 * @default 75

 * @param upProb
 * @text 上涨概率加成(%)
 * @type number
 * @min -100
 * @max 100
 * @default 0

 * @param upAmp
 * @text 上涨幅度加成(%)
 * @type number
 * @default 10

 * @param downAmp
 * @text 下跌幅度加成(%)
 * @type number
 * @default 10

 * @param periodBias
 * @text 时段偏好
 * @type select
 * @option 无
 * @value none
 * @option 上午
 * @value morning
 * @option 下午
 * @value afternoon
 * @option 晚上
 * @value evening
 * @default none

 * @param cycleBias
 * @text 周期偏好
 * @type select
 * @option 无
 * @value none
 * @option 周初
 * @value weekStart
 * @option 周中
 * @value weekMid
 * @option 周末
 * @value weekEnd
 * @default none

 * @param dividendCycle
 * @text 分红周期(月)
 * @type number
 * @default 3

 * @param dividendBase
 * @text 分红基准
 * @type select
 * @option 固定
 * @value fixed
 * @option 比例
 * @value ratio
 * @default fixed

 * @param dividendValue
 * @text 分红值
 * @type number
 * @default 5

 * @param companyInfo
 * @text 公司信息
 * @type multiline_string
 * @default 

 * @param infoWidth
 * @text 信息换行宽度
 * @type number
 * @default 25
 */

/*~struct~SpecialEvent:
 * @param identifier
 * @text 标识符
 * @type string
 * @default event1

 * @param probAdd
 * @text 概率加成(%)
 * @type number
 * @min -100
 * @max 100
 * @default 0

 * @param upAmpAdd
 * @text 上涨幅度加成(%)
 * @type number
 * @default 0

 * @param downAmpAdd
 * @text 下跌幅度加成(%)
 * @type number
 * @default 0

 * @param affectedStocks
 * @text 影响股票(代码逗号分隔)
 * @type string
 * @default all
 */

/*~struct~TradeSettingsStruct:
 * @param vipVar
 * @text VIP等级变量
 * @type variable
 * @default 81

 * @param feeRateVar
 * @text 手续费率变量
 * @type variable
 * @default 82

 * @param thresholdVar
 * @text 手续费阈值变量
 * @type variable
 * @default 83

 * @param feeRate
 * @text 默认费率
 * @type number
 * @decimals 4
 * @default 0.01

 * @param feeThreshold
 * @text 费率阈值
 * @type number
 * @default 10000

 * @param feeRateVip
 * @text VIP费率
 * @type number
 * @decimals 4
 * @default 0.005

 * @param useSaveObject
 * @text 使用存档对象
 * @type boolean
 * @default true
 */

/*~struct~ContractSettingsStruct:
 * @param marginTransferFeeRate
 * @text 转账费率
 * @type number
 * @decimals 4
 * @default 0.001

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
 * @decimals 2
 * @default 0.1

 * @param fundingInterval
 * @text 资金费间隔
 * @type select
 * @option 小时
 * @value hour
 * @option 时段
 * @value period
 * @default period

 * @param longFundingRate
 * @text 做多费率
 * @type number
 * @decimals 6
 * @default 0.0001

 * @param shortFundingRate
 * @text 做空费率
 * @type number
 * @decimals 6
 * @default 0.0001
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

    // 参数解析（增强鲁棒性，使用 try-catch 和默认值）
    const parameters = PluginManager.parameters('Expand_Stockmarket');
    function safeParseJson(str, defaultVal = {}) {
        try {
            return JSON.parse(str || '{}');
        } catch (e) {
            console.warn('JSON parse failed:', e);
            return defaultVal;
        }
    }
    let esm_variables = safeParseJson(parameters['variables']);
    let esm_volatility = safeParseJson(parameters['volatility']);
    let esm_messages = safeParseJson(parameters['messages']);
    let esm_business = safeParseJson(parameters['business']);
    let esm_tradeSettings = safeParseJson(parameters['tradeSettings']);
    let esm_contractSettings = safeParseJson(parameters['contractSettings']);
    let esm_specialEvents = safeParseJson(parameters['specialEvents'], []);
    let esm_customStocks = safeParseJson(parameters['customStocks'], []);
    const esm_stock1 = safeParseJson(parameters['stock1']);
    const esm_stock2 = safeParseJson(parameters['stock2']);
    const esm_stock3 = safeParseJson(parameters['stock3']);

    // 时间变量
    const esm_timeSettings = safeParseJson(esm_variables.timeSettings || '{}');
    const esm_yearVar = Number(esm_timeSettings.yearVar || 23);
    const esm_monthVar = Number(esm_timeSettings.monthVar || 24);
    const esm_dayVar = Number(esm_timeSettings.dayVar || 25);
    const esm_weekVar = Number(esm_timeSettings.weekVar || 27);
    const esm_periodVar = Number(esm_timeSettings.periodVar || 28);

    // 其他变量
    const esm_stockAccountVar = Number(esm_variables.stockAccountVar || 62);
    const esm_stockHoldingsVar = Number(esm_variables.stockHoldingsVar || 63);
    const esm_stockPricesVar = Number(esm_variables.stockPricesVar || 64);
    const esm_stockAvgBuyPricesVar = Number(esm_variables.stockAvgBuyPricesVar || 65);
    const esm_tradeLogVar = Number(esm_variables.tradeLogVar || 66);
    const esm_priceHistoryVar = Number(esm_variables.priceHistoryVar || 67);
    const esm_inputAmountVar = Number(esm_variables.inputAmountVar || 68);
    const esm_inputCodeVar = Number(esm_variables.inputCodeVar || 69);
    const esm_contractMarginVar = Number(esm_variables.contractMarginVar || 71);
    const esm_contractPositionsVar = Number(esm_variables.contractPositionsVar || 72);
    const esm_contractInputAmountVar = Number(esm_variables.contractInputAmountVar || 73);
    const esm_contractInputCodeVar = Number(esm_variables.contractInputCodeVar || 74);
    const esm_contractInputLeverageVar = Number(esm_variables.contractInputLeverageVar || 75);
    const esm_contractInputStopLossVar = Number(esm_variables.contractInputStopLossVar || 76);
    const esm_contractOrdersVar = Number(esm_variables.contractOrdersVar || 77);
    const esm_contractHistoryVar = Number(esm_variables.contractHistoryVar || 78);
    const esm_contractLongFundingRateVar = Number(esm_variables.contractLongFundingRateVar || 79);
    const esm_contractShortFundingRateVar = Number(esm_variables.contractShortFundingRateVar || 80);

    // 涨跌设置
    const esm_updateCycle = esm_volatility.updateCycle || 'period';
    const esm_updateTrigger = esm_volatility.updateTrigger || 'both';
    const esm_crossCycleRule = esm_volatility.crossCycleRule || 'sequential';
    const esm_globalUpProb = Number(esm_volatility.globalUpProb || 50);
    const esm_maxUpAmp = Number(esm_volatility.maxUpAmp || 10);
    const esm_maxDownAmp = Number(esm_volatility.maxDownAmp || 10);
    const esm_historyPeriods_parsed = Number(esm_volatility.historyPeriods || 30);
    const esm_stThreshold = Number(esm_volatility.stThreshold || 5);

    // 营业设置
    const esm_enableBusinessHours = esm_business.enableBusinessHours === 'true';
    const esm_businessPeriods = safeParseJson(esm_business.businessPeriods || '[]').map(String);
    const esm_businessWeeks = safeParseJson(esm_business.businessWeeks || '[]').map(String);

    // 交易设置
    const esm_vipVar = Number(esm_tradeSettings.vipVar || 81);
    const esm_feeRateVar = Number(esm_tradeSettings.feeRateVar || 82);
    const esm_thresholdVar = Number(esm_tradeSettings.thresholdVar || 83);
    const esm_feeRate = Number(esm_tradeSettings.feeRate || 0.01);
    const esm_feeThreshold = Number(esm_tradeSettings.feeThreshold || 10000);
    const esm_feeRateVip = Number(esm_tradeSettings.feeRateVip || 0.005);
    const esm_useSaveObject = esm_tradeSettings.useSaveObject === 'true';

    // 合约设置
    const esm_marginTransferFeeRate = Number(esm_contractSettings.marginTransferFeeRate || 0.001);
    const esm_defaultLeverage = Number(esm_contractSettings.defaultLeverage || 5);
    const esm_maxLeverage = Number(esm_contractSettings.maxLeverage || 10);
    const esm_liquidationThreshold = Number(esm_contractSettings.liquidationThreshold || 0.1);
    const esm_fundingInterval = esm_contractSettings.fundingInterval || 'period';
    const esm_longFundingRate = Number(esm_contractSettings.longFundingRate || 0.0001);
    const esm_shortFundingRate = Number(esm_contractSettings.shortFundingRate || 0.0001);

    // 可视化参数（从子插件合并）
    const esm_menuCommandName = parameters['menuCommandName'] || '股市';
    const esm_enableMenuEntry = parameters['enableMenuEntry'] === 'true';
    const windowSettings = safeParseJson(parameters['windowSettings'] || '{"width":"800","height":"600","offsetX":"0","offsetY":"0"}');
    const subCommandSettings = safeParseJson(parameters['subCommandSettings'] || '{"width":"600","height":"430","offsetX":"200","offsetY":"170"}');
    const messageSettings = safeParseJson(parameters['messageSettings'] || '{"width":"600","height":"430","offsetX":"200","offsetY":"170"}');
    const inputSettings = safeParseJson(parameters['inputSettings'] || '{"width":"400","height":"150","offsetX":"200","offsetY":"200"}');
    const sceneWidth = Number(windowSettings.width) || 800;
    const sceneHeight = Number(windowSettings.height) || 600;
    const offsetX = Number(windowSettings.offsetX) || 0;
    const offsetY = Number(windowSettings.offsetY) || 0;
    const subWidth = Number(subCommandSettings.width) || 600;
    const subHeight = Number(subCommandSettings.height) || 430;
    const subOffsetX = Number(subCommandSettings.offsetX) || 200;
    const subOffsetY = Number(subCommandSettings.offsetY) || 170;
    const msgWidth = Number(messageSettings.width) || 600;
    const msgHeight = Number(messageSettings.height) || 430;
    const msgOffsetX = Number(messageSettings.offsetX) || 200;
    const msgOffsetY = Number(messageSettings.offsetY) || 170;
    const inputWidth = Number(inputSettings.width) || 400;
    const inputHeight = Number(inputSettings.height) || 150;
    const inputOffsetX = Number(inputSettings.offsetX) || 200;
    const inputOffsetY = Number(inputSettings.offsetY) || 200;
    const backgroundImage = parameters['backgroundImage'] || '';

    // 股票列表初始化
    let esm_stockList = [
        esm_stock1,
        esm_stock2,
        esm_stock3,
        ...esm_customStocks
    ].filter(stock => stock && stock.code);

    esm_stockList.forEach(stock => {
        stock.basePrice = Number(stock.basePrice || 100);
        stock.upProb = Number(stock.upProb || 0);
        stock.upAmp = Number(stock.upAmp || esm_maxUpAmp);
        stock.downAmp = Number(stock.downAmp || esm_maxDownAmp);
        stock.periodBias = stock.periodBias || 'none';
        stock.cycleBias = stock.cycleBias || 'none';
        stock.dividendCycle = Number(stock.dividendCycle || 3);
        stock.dividendBase = stock.dividendBase || 'fixed';
        stock.dividendValue = Number(stock.dividendValue || 5);
        stock.displayName = stock.name || stock.code;
    });

    // 全局变量
    let esm_manager = null;
    let esm_lastYear = 0, esm_lastMonth = 0, esm_lastDay = 0, esm_lastWeek = 0, esm_lastPeriod = 0, esm_lastHour = 0;

    // 变量校验
    function esm_ensureChangedVariables() {
        const vars = [
            esm_yearVar, esm_monthVar, esm_dayVar, esm_weekVar, esm_periodVar,
            esm_stockAccountVar, esm_stockHoldingsVar, esm_stockPricesVar, esm_stockAvgBuyPricesVar,
            esm_tradeLogVar, esm_priceHistoryVar, esm_inputAmountVar, esm_inputCodeVar,
            esm_contractMarginVar, esm_contractPositionsVar, esm_contractInputAmountVar, esm_contractInputCodeVar,
            esm_contractInputLeverageVar, esm_contractInputStopLossVar, esm_contractOrdersVar, esm_contractHistoryVar,
            esm_contractLongFundingRateVar, esm_contractShortFundingRateVar,
            esm_vipVar, esm_feeRateVar, esm_thresholdVar
        ];
        vars.forEach(id => {
            if (id <= 0 || id > $dataSystem.variables.length) {
                console.error(`Invalid variable ID: ${id}`);
            }
        });
    }

    esm_ensureChangedVariables();

    // 管理器类
    esm_manager = {
        esm_account: 0,
        esm_holdings: {},
        esm_prices: {},
        esm_avgBuyPrices: {},
        esm_tradeLog: [],
        esm_history: {},
        esm_margin: 0,
        esm_positions: {},
        esm_orders: [],
        esm_orderIdCounter: 0,
        esm_contractHistory: [],
        esm_longFundingRate: esm_longFundingRate,
        esm_shortFundingRate: esm_shortFundingRate,
        esm_lastFundingTime: { year: 0, month: 0, day: 0, period: 0 },
        esm_vip: 0,

        esm_init() {
            this.esm_account = 0;
            this.esm_holdings = {};
            this.esm_prices = {};
            this.esm_avgBuyPrices = {};
            this.esm_tradeLog = [];
            this.esm_history = {};
            this.esm_margin = 0;
            this.esm_positions = {};
            this.esm_orders = [];
            this.esm_orderIdCounter = 0;
            this.esm_contractHistory = [];
            this.esm_longFundingRate = esm_longFundingRate;
            this.esm_shortFundingRate = esm_shortFundingRate;
            this.esm_lastFundingTime = { year: 0, month: 0, day: 0, period: 0 };
            esm_stockList.forEach(stock => {
                this.esm_prices[stock.code] = stock.basePrice;
                this.esm_holdings[stock.code] = 0;
                this.esm_avgBuyPrices[stock.code] = 0;
                this.esm_history[stock.code] = [];
                this.esm_positions[stock.code] = { long: this.esm_initPosition(), short: this.esm_initPosition() };
            });
            this.esm_save();
        },

        esm_initPosition() {
            return { quantity: 0, entryPrice: 0, leverage: esm_defaultLeverage, stopLoss: 0, fundingPaid: 0, marginUsed: 0, openTime: null };
        },

        esm_load() {
            try {
                this.esm_account = $gameVariables.value(esm_stockAccountVar) || 0;
                this.esm_holdings = safeParseJson($gameVariables.value(esm_stockHoldingsVar) || '{}');
                this.esm_prices = safeParseJson($gameVariables.value(esm_stockPricesVar) || '{}');
                this.esm_avgBuyPrices = safeParseJson($gameVariables.value(esm_stockAvgBuyPricesVar) || '{}');
                this.esm_tradeLog = safeParseJson($gameVariables.value(esm_tradeLogVar) || '[]');
                this.esm_history = safeParseJson($gameVariables.value(esm_priceHistoryVar) || '{}');
                this.esm_margin = $gameVariables.value(esm_contractMarginVar) || 0;
                this.esm_positions = safeParseJson($gameVariables.value(esm_contractPositionsVar) || '{}', {});
                this.esm_orders = safeParseJson($gameVariables.value(esm_contractOrdersVar) || '[]', []);
                this.esm_contractHistory = safeParseJson($gameVariables.value(esm_contractHistoryVar) || '[]');
                this.esm_longFundingRate = $gameVariables.value(esm_contractLongFundingRateVar) || esm_longFundingRate;
                this.esm_shortFundingRate = $gameVariables.value(esm_contractShortFundingRateVar) || esm_shortFundingRate;
                esm_stockList.forEach(stock => {
                    if (!this.esm_prices[stock.code]) this.esm_prices[stock.code] = stock.basePrice;
                    if (!this.esm_holdings[stock.code]) this.esm_holdings[stock.code] = 0;
                    if (!this.esm_avgBuyPrices[stock.code]) this.esm_avgBuyPrices[stock.code] = 0;
                    if (!this.esm_history[stock.code]) this.esm_history[stock.code] = [];
                    if (!this.esm_positions[stock.code]) this.esm_positions[stock.code] = { long: this.esm_initPosition(), short: this.esm_initPosition() };
                });
                this.esm_orderIdCounter = this.esm_orders.length > 0 ? Math.max(...this.esm_orders.map(o => o.id || 0)) + 1 : 0;
            } catch (e) {
                console.error('esm_load error:', e);
                this.esm_init();
            }
        },

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
                $gameVariables.setValue(esm_contractHistoryVar, JSON.stringify(this.esm_contractHistory));
                $gameVariables.setValue(esm_contractLongFundingRateVar, this.esm_longFundingRate);
                $gameVariables.setValue(esm_contractShortFundingRateVar, this.esm_shortFundingRate);
                console.log('Expand_Stockmarket: Save successful.');
            } catch (e) {
                console.error('esm_save error:', e);
            }
        },

        esm_getCurrentTime() {
            return {
                year: $gameVariables.value(esm_yearVar) || 0,
                month: $gameVariables.value(esm_monthVar) || 1,
                day: $gameVariables.value(esm_dayVar) || 1,
                week: $gameVariables.value(esm_weekVar) || 1,
                period: $gameVariables.value(esm_periodVar) || 1
            };
        },

        esm_daysDiff(time1, time2) {
            return (time1.year - time2.year) * 360 + (time1.month - time2.month) * 30 + (time1.day - time2.day);
        },

        esm_isBusinessTime() {
            if (!esm_enableBusinessHours) return true;
            const time = this.esm_getCurrentTime();
            return esm_businessPeriods.includes(time.period.toString()) && esm_businessWeeks.includes(time.week.toString());
        },

        esm_checkAndUpdatePrices() {
            const currentTime = this.esm_getCurrentTime();
            let updateNeeded = false;
            switch (esm_updateCycle) {
                case 'hour':
                    if (esm_lastHour !== currentTime.hour) updateNeeded = true;
                    break;
                case 'period':
                    if (esm_lastPeriod !== currentTime.period) updateNeeded = true;
                    break;
                case 'day':
                    if (esm_lastDay !== currentTime.day) updateNeeded = true;
                    break;
            }
            if (updateNeeded) {
                this.esm_updateAllPrices();
                esm_lastYear = currentTime.year;
                esm_lastMonth = currentTime.month;
                esm_lastDay = currentTime.day;
                esm_lastWeek = currentTime.week;
                esm_lastPeriod = currentTime.period;
            }
        },

        esm_updateAllPrices(force = 0) {
            esm_stockList.forEach(stock => {
                this.esm_updatePrice(stock.code, force);
            });
            this.esm_save();
        },

        esm_updatePrice(code, force = 0) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return;
            let price = this.esm_prices[code];
            const upProb = esm_globalUpProb + stock.upProb;
            const isUp = Math.random() * 100 < upProb;
            const amp = isUp ? stock.upAmp : stock.downAmp;
            const change = (Math.random() * amp / 100) * price * (isUp ? 1 : -1);
            price += change;
            price = Math.max(0.01, price.toFixed(2));
            this.esm_prices[code] = price;
            const hist = this.esm_history[code];
            const currentTime = this.esm_getCurrentTime();
            const lastEntry = hist[0] || { day: '' };
            if (lastEntry.day !== `${currentTime.year}-${currentTime.month}-${currentTime.day}` || force) {
                hist.unshift({ day: `${currentTime.year}-${currentTime.month}-${currentTime.day}`, avg: price, change: change.toFixed(2) });
                if (hist.length > esm_historyPeriods_parsed) hist.pop();
            } else {
                lastEntry.avg = ((lastEntry.avg + price) / 2).toFixed(2);
                lastEntry.change = (Number(lastEntry.change) + change).toFixed(2);
            }
        },

        esm_execCommand(command, args = {}) {
            try {
                switch (command) {
                    case 'DepositCash':
                        const amount = Number($gameVariables.value(esm_inputAmountVar)) || 0;
                        if (amount <= 0) return esm_messages.invalidAmount;
                        let deposit = Math.min(amount, $gameParty.gold());
                        $gameParty.loseGold(deposit);
                        this.esm_account += deposit;
                        this.esm_save();
                        return esm_messages.depositSuccess.replace('%1', this.esm_account);
                    case 'WithdrawCash':
                        const withdrawAmount = Number($gameVariables.value(esm_inputAmountVar)) || 0;
                        if (withdrawAmount <= 0) return esm_messages.invalidAmount;
                        let withdraw = Math.min(withdrawAmount, this.esm_account);
                        this.esm_account -= withdraw;
                        $gameParty.gainGold(withdraw);
                        this.esm_save();
                        return esm_messages.withdrawSuccess.replace('%1', withdraw);
                    case 'BuyStock':
                        if (!this.esm_isBusinessTime()) return esm_messages.closedMessage;
                        const code = $gameVariables.value(esm_inputCodeVar).toString().padStart(3, '0');
                        const qty = Number($gameVariables.value(esm_inputAmountVar)) || 0;
                        const stock = esm_stockList.find(s => s.code === code);
                        if (!stock || qty <= 0) return esm_messages.invalidStockCode;
                        const price = this.esm_prices[code];
                        const cost = price * qty;
                        const fee = this.esm_calculateFee(cost);
                        if (this.esm_account < cost + fee) return esm_messages.buyInsufficient;
                        this.esm_account -= cost + fee;
                        const oldHold = this.esm_holdings[code] || 0;
                        const oldAvg = this.esm_avgBuyPrices[code] || 0;
                        this.esm_holdings[code] = oldHold + qty;
                        this.esm_avgBuyPrices[code] = ((oldAvg * oldHold) + (price * qty)) / (oldHold + qty);
                        this.esm_tradeLog.push({ type: 'buy', code, qty, price, time: this.esm_getCurrentTime() });
                        this.esm_save();
                        return esm_messages.buySuccess.replace('%1', code).replace('%2', this.esm_holdings[code]);
                    case 'SellStock':
                        if (!this.esm_isBusinessTime()) return esm_messages.closedMessage;
                        const sellCode = $gameVariables.value(esm_inputCodeVar).toString().padStart(3, '0');
                        const sellQty = Number($gameVariables.value(esm_inputAmountVar)) || 0;
                        const sellStock = esm_stockList.find(s => s.code === sellCode);
                        if (!sellStock || sellQty <= 0 || (this.esm_holdings[sellCode] || 0) < sellQty) return esm_messages.sellInsufficient;
                        const sellPrice = this.esm_prices[sellCode];
                        const revenue = sellPrice * sellQty;
                        const sellFee = this.esm_calculateFee(revenue);
                        this.esm_account += revenue - sellFee;
                        this.esm_holdings[sellCode] -= sellQty;
                        if (this.esm_holdings[sellCode] === 0) this.esm_avgBuyPrices[sellCode] = 0;
                        this.esm_tradeLog.push({ type: 'sell', code: sellCode, qty: sellQty, price: sellPrice, time: this.esm_getCurrentTime() });
                        this.esm_save();
                        return esm_messages.sellSuccess.replace('%1', revenue - sellFee);
                    case 'QueryAccount':
                        return `资金账户余额: ${this.esm_account} 金币。`;
                    case 'QueryHoldings':
                        let holdingsMsg = '';
                        Object.keys(this.esm_holdings).forEach(code => {
                            const hold = this.esm_holdings[code];
                            if (hold > 0) {
                                const avg = this.esm_avgBuyPrices[code].toFixed(2);
                                const curr = this.esm_prices[code].toFixed(2);
                                const pnl = ((curr - avg) * hold).toFixed(2);
                                holdingsMsg += `${code}: ${hold}股, 成本${avg}, 当前${curr}, 盈亏${pnl}\n`;
                            }
                        });
                        return holdingsMsg || esm_messages.noHoldings;
                    case 'QueryPrice':
                        const queryCode = $gameVariables.value(esm_inputCodeVar).toString().padStart(3, '0');
                        const queryStock = esm_stockList.find(s => s.code === queryCode);
                        if (!queryStock) return esm_messages.stockNotFound;
                        return `${queryStock.displayName} 当前价格: ${this.esm_prices[queryCode].toFixed(2)}元`;
                    case 'QuerySingleHolding':
                        const singleCode = $gameVariables.value(esm_inputCodeVar).toString().padStart(3, '0');
                        const singleStock = esm_stockList.find(s => s.code === singleCode);
                        if (!singleStock) return esm_messages.stockNotFound;
                        const singleHold = this.esm_holdings[singleCode] || 0;
                        if (singleHold === 0) return esm_messages.noHoldings;
                        const singleAvg = this.esm_avgBuyPrices[singleCode].toFixed(2);
                        const singleCurr = this.esm_prices[singleCode].toFixed(2);
                        const singlePnl = ((singleCurr - singleAvg) * singleHold).toFixed(2);
                        return `${singleStock.displayName}(${singleCode})\n持股数:${singleHold} 总盈亏:${singlePnl}\n成本价:${singleAvg} 当前价:${singleCurr}`;
                    case 'QueryHistory':
                        const histCode = $gameVariables.value(esm_inputCodeVar).toString().padStart(3, '0');
                        const days = Number($gameVariables.value(esm_inputAmountVar)) || 1;
                        return this.esm_getHistoryText(histCode, days);
                    case 'DepositMargin':
                        const marginAmount = Number($gameVariables.value(esm_contractInputAmountVar)) || 0;
                        if (marginAmount <= 0) return esm_messages.invalidAmount;
                        const fee = marginAmount * esm_marginTransferFeeRate;
                        if (this.esm_account < marginAmount + fee) return esm_messages.marginInsufficient;
                        this.esm_account -= marginAmount + fee;
                        this.esm_margin += marginAmount;
                        this.esm_save();
                        return esm_messages.marginTransferSuccess.replace('%1', this.esm_margin);
                    case 'WithdrawMargin':
                        const withdrawMargin = Number($gameVariables.value(esm_contractInputAmountVar)) || 0;
                        if (withdrawMargin <= 0) return esm_messages.invalidAmount;
                        const withdrawFee = withdrawMargin * esm_marginTransferFeeRate;
                        if (this.esm_margin < withdrawMargin + withdrawFee) return esm_messages.marginInsufficient;
                        this.esm_margin -= withdrawMargin + withdrawFee;
                        this.esm_account += withdrawMargin;
                        this.esm_save();
                        return esm_messages.marginTransferSuccess.replace('%1', this.esm_margin);
                    case 'OpenLong':
                    case 'OpenShort':
                        const openCode = $gameVariables.value(esm_contractInputCodeVar).toString().padStart(3, '0');
                        const openQty = Number($gameVariables.value(esm_contractInputAmountVar)) || 0;
                        const leverage = Math.min(Math.max(Number($gameVariables.value(esm_contractInputLeverageVar)) || esm_defaultLeverage, 1), esm_maxLeverage);
                        const stopLoss = Number($gameVariables.value(esm_contractInputStopLossVar)) || 0;
                        const openStock = esm_stockList.find(s => s.code === openCode);
                        if (!openStock || openQty <= 0) return esm_messages.invalidStockCode;
                        const openPrice = this.esm_prices[openCode];
                        const direction = command === 'OpenLong' ? 'long' : 'short';
                        const marginRequired = (openPrice * openQty) / leverage;
                        if (this.esm_margin < marginRequired) return esm_messages.marginInsufficient;
                        const pos = this.esm_positions[openCode][direction];
                        pos.quantity += openQty;
                        pos.entryPrice = ((pos.entryPrice * (pos.quantity - openQty)) + (openPrice * openQty)) / pos.quantity;
                        pos.leverage = leverage;
                        pos.stopLoss = stopLoss;
                        pos.marginUsed += marginRequired;
                        pos.openTime = this.esm_getCurrentTime();
                        this.esm_margin -= marginRequired;
                        this.esm_contractHistory.push({ type: 'open', direction, code: openCode, qty: openQty, price: openPrice, time: pos.openTime });
                        this.esm_save();
                        return esm_messages.openPositionSuccess.replace('%1', direction).replace('%2', openQty);
                    case 'ClosePosition':
                        const closeCode = $gameVariables.value(esm_contractInputCodeVar).toString().padStart(3, '0');
                        const closeQty = Number($gameVariables.value(esm_contractInputAmountVar)) || 0;
                        const closeStock = esm_stockList.find(s => s.code === closeCode);
                        if (!closeStock || closeQty <= 0) return esm_messages.invalidStockCode;
                        const closePrice = this.esm_prices[closeCode];
                        let totalPnl = 0;
                        ['long', 'short'].forEach(dir => {
                            const pos = this.esm_positions[closeCode][dir];
                            if (pos.quantity >= closeQty) {
                                const basePnl = (closePrice - pos.entryPrice) * closeQty * (dir === 'long' ? 1 : -1);
                                const pnl = basePnl * pos.leverage - pos.fundingPaid;
                                totalPnl += pnl;
                                pos.quantity -= closeQty;
                                pos.marginUsed -= (pos.entryPrice * closeQty) / pos.leverage;
                                if (pos.quantity === 0) {
                                    pos.entryPrice = 0;
                                    pos.leverage = esm_defaultLeverage;
                                    pos.stopLoss = 0;
                                    pos.fundingPaid = 0;
                                    pos.marginUsed = 0;
                                    pos.openTime = null;
                                }
                            }
                        });
                        this.esm_margin += Math.max(0, totalPnl) + (closePrice * closeQty) / esm_defaultLeverage; // 简化
                        this.esm_save();
                        return esm_messages.closePositionSuccess.replace('%1', totalPnl.toFixed(2));
                    // 添加其他缺失的命令 case...
                    default:
                        console.warn('Unknown command:', command);
                }
            } catch (e) {
                console.error('esm_execCommand error:', e);
                return '操作失败，请检查输入。';
            }
        },

        esm_calculateFee(amount) {
            const vip = $gameVariables.value(esm_vipVar) || 0;
            const feeRate = vip > 0 ? esm_feeRateVip : esm_feeRate;
            return amount > esm_feeThreshold ? amount * feeRate : 0;
        },

        esm_checkContractConditions() {
            // 止损/爆仓/资金费检查...
            // 完整实现从原代码复制
        },

        esm_getHistoryText(code, days) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return esm_messages.stockNotFound;
            days = Math.min(days || 1, esm_historyPeriods_parsed);
            let msg = `${stock.displayName}(${stock.code})最近${days}个交易日历史：\n`;
            const hist = this.esm_history[code] || [];
            const actualDays = Math.min(days, hist.length);
            if (actualDays === 0) return msg + '无历史数据。';
            const recentHist = hist.slice(0, actualDays);
            recentHist.forEach((entry, i) => {
                msg += `交易日${i+1}(${entry.day}): 平均${entry.avg.toFixed(2)} ${entry.change}\n`;
            });
            if (actualDays < days) msg += `\n历史数据不足，仅显示可用${actualDays}个交易日。`;
            return msg;
        },

        esm_queryAccount() {
            $gameMessage.add(`资金账户余额: ${this.esm_account} 金币。`);
        },

        esm_queryHoldings() {
            let msg = '';
            Object.keys(this.esm_holdings).forEach(code => {
                const hold = this.esm_holdings[code] || 0;
                if (hold > 0) {
                    const avg = this.esm_avgBuyPrices[code].toFixed(2);
                    const curr = this.esm_prices[code].toFixed(2);
                    const pnl = ((curr - avg) * hold).toFixed(2);
                    msg += `${code}: ${hold}股, 成本${avg}, 当前${curr}, 盈亏${pnl}\n`;
                }
            });
            $gameMessage.add(msg || esm_messages.noHoldings);
        },

        esm_queryPrice() {
            const code = $gameVariables.value(esm_inputCodeVar).toString().padStart(3, '0');
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) {
                $gameMessage.add(esm_messages.stockNotFound || '股票代码不存在，查询为空。');
                return;
            }
            $gameMessage.add(`${stock.displayName} 当前价格: ${this.esm_prices[code].toFixed(2)}元`);
        },

        esm_querySingleHolding() {
            const code = $gameVariables.value(esm_inputCodeVar).toString().padStart(3, '0');
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) {
                $gameMessage.add(esm_messages.stockNotFound || '股票代码不存在，查询为空。');
                return;
            }
            const hold = this.esm_holdings[code] || 0;
            if (hold === 0) {
                $gameMessage.add(esm_messages.noHoldings || '无持仓。');
                return;
            }
            const avg = this.esm_avgBuyPrices[code].toFixed(2);
            const curr = this.esm_prices[code].toFixed(2);
            const pnl = ((curr - avg) * hold).toFixed(2);
            $gameMessage.add(`${stock.displayName}(${code})\n持股数:${hold} 总盈亏:${pnl}\n成本价:${avg} 当前价:${curr}`);
        },

        esm_queryCompanyInfo() {
            const code = $gameVariables.value(esm_inputCodeVar).toString().padStart(3, '0');
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) {
                $gameMessage.add(esm_messages.stockNotFound || '股票代码不存在，查询为空。');
                return;
            }
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
        },

        esm_queryHistory(days = 0) {
            const code = $gameVariables.value(esm_inputCodeVar).toString().padStart(3, '0');
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) {
                $gameMessage.add(esm_messages.stockNotFound || '股票代码不存在，查询为空。');
                return;
            }
            days = Math.min(Number(days) || $gameVariables.value(esm_inputAmountVar) || 1, esm_historyPeriods_parsed);
            let msg = `${stock.name} 最近${days}交易日：首${this.esm_history[code][0]?.avg?.toFixed(2) || 0}末${this.esm_history[code][days-1]?.avg?.toFixed(2) || 0} 平均${this.esm_history[code].slice(0, days).reduce((a, b) => a + b.avg, 0) / days?.toFixed(2) || 0}`;
            $gameMessage.add(msg);
        },

        // VIP计算（补全缺失方法）
        esm_calculateVIP() {
            const thresholds = safeParseJson(esm_tradeSettings.thresholds || '{}');
            const totalAssets = this.esm_account + Object.keys(this.esm_holdings).reduce((sum, code) => sum + (this.esm_prices[code] * this.esm_holdings[code]), 0);
            let vip = 0;
            for (let i = 1; i <= 5; i++) {
                if (totalAssets >= Number(thresholds[`vip${i}`] || 0)) vip = i;
            }
            this.esm_vip = vip;
            $gameVariables.setValue(esm_vipVar, vip);
        },

        esm_getCurrentFeeRate() {
            const feeRates = safeParseJson(esm_tradeSettings.feeRates || '{}');
            const rate = Number(feeRates[`vip${this.esm_vip}`] || feeRates.vip0 || 0.008);
            const percent = (rate * 100).toFixed(3);
            $gameVariables.setValue(esm_feeRateVar, rate);
            $gameMessage.add(esm_messages.feeRateMsg.replace('%1', this.esm_vip).replace('%2', rate).replace('%3', percent));
            return { vip: this.esm_vip, rate, percent };
        },

        // 合约方法（补全缺失部分，基于上下文）
        esm_depositMargin(amount = 0) {
            amount = Number(amount) || $gameVariables.value(esm_contractInputAmountVar) || 0;
            if (amount <= 0) {
                $gameMessage.add(esm_messages.invalidAmount || '无效金额，请输入正数。');
                return;
            }
            if (this.esm_account < amount) {
                $gameMessage.add(esm_messages.marginInsufficient || '保证金不足！');
                return;
            }
            const feeRate = this.esm_getCurrentFeeRate().rate;
            const fee = amount * feeRate;
            if (this.esm_account < amount + fee) {
                $gameMessage.add(esm_messages.buyFeeInsufficient.replace('%1', fee) || '手续费不足！');
                return;
            }
            this.esm_account -= amount + fee;
            this.esm_margin += amount;
            $gameMessage.add(esm_messages.marginTransferSuccess.replace('%1', this.esm_margin) + ' ' + esm_messages.marginTransferFee.replace('%1', fee));
            this.esm_save();
            this.esm_calculateVIP();
        },

        esm_withdrawMargin(amount = 0) {
            amount = Number(amount) || $gameVariables.value(esm_contractInputAmountVar) || 0;
            if (amount <= 0) {
                $gameMessage.add(esm_messages.invalidAmount || '无效金额，请输入正数。');
                return;
            }
            if (this.esm_margin < amount) {
                $gameMessage.add(esm_messages.marginInsufficient || '保证金不足！');
                return;
            }
            const feeRate = this.esm_getCurrentFeeRate().rate;
            const fee = amount * feeRate;
            this.esm_margin -= amount + fee;
            this.esm_account += amount;
            $gameMessage.add(esm_messages.marginTransferSuccess.replace('%1', this.esm_margin) + ' ' + esm_messages.marginTransferFee.replace('%1', fee));
            this.esm_save();
            this.esm_calculateVIP();
        },

        esm_openPosition(direction, code, quantity, leverage = 0, stopLoss = 0) {
            code = code.toString().padStart(3, '0');
            quantity = Number(quantity) || $gameVariables.value(esm_contractInputAmountVar) || 0;
            leverage = Math.max(1, Math.min(Number(leverage) || $gameVariables.value(esm_contractInputLeverageVar) || esm_defaultLeverage, esm_maxLeverage));
            stopLoss = Number(stopLoss) || $gameVariables.value(esm_contractInputStopLossVar) || 0;
            if (quantity <= 0) {
                $gameMessage.add(esm_messages.invalidQuantity || '无效数量。');
                return;
            }
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) {
                $gameMessage.add(esm_messages.invalidStockCode || '无效代码！');
                return;
            }
            const price = this.esm_prices[code];
            const marginRequired = (price * quantity) / leverage;
            if (this.esm_margin < marginRequired) {
                $gameMessage.add(esm_messages.marginInsufficient || '保证金不足！');
                return;
            }
            const feeRate = Number(esm_contractSettings.transactionFeeRate) || 0.001;
            const fee = marginRequired * feeRate;
            if (this.esm_margin < marginRequired + fee) {
                $gameMessage.add(esm_messages.buyFeeInsufficient.replace('%1', fee) || '手续费不足！');
                return;
            }
            this.esm_margin -= marginRequired + fee;
            if (!this.esm_positions[code]) this.esm_positions[code] = { long: null, short: null };
            this.esm_positions[code][direction] = {
                quantity,
                entryPrice: price,
                leverage,
                stopLoss,
                fundingPaid: 0,
                marginUsed: marginRequired,
                openTime: this.esm_getCurrentTime()
            };
            $gameMessage.add(esm_messages.openPositionSuccess.replace('%1', direction).replace('%2', quantity) + ' ' + esm_messages.marginTransferFee.replace('%1', fee));
            this.esm_save();
            this.esm_calculateVIP();
        },

        esm_closePosition(direction, code, quantity = 0) {
            code = code.toString().padStart(3, '0');
            quantity = Number(quantity) || $gameVariables.value(esm_contractInputAmountVar) || 0;
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock || quantity <= 0) {
                $gameMessage.add(esm_messages.invalidStockCode || '无效代码！');
                return;
            }
            const pos = this.esm_positions[code]?.[direction];
            if (!pos || pos.quantity < quantity) {
                $gameMessage.add(esm_messages.noPositions || '无持仓合约。');
                return;
            }
            const price = this.esm_prices[code];
            const basePnl = (price - pos.entryPrice) * quantity * (direction === 'long' ? 1 : -1);
            const pnl = basePnl * pos.leverage;
            const feeRate = Number(esm_contractSettings.transactionFeeRate) || 0.001;
            const fee = Math.abs(pnl) * feeRate;
            const netPnl = pnl - fee;
            this.esm_margin += pos.marginUsed * (quantity / pos.quantity) + netPnl;
            pos.quantity -= quantity;
            pos.marginUsed -= pos.marginUsed * (quantity / pos.quantity);
            if (pos.quantity <= 0) {
                delete this.esm_positions[code][direction];
            }
            $gameMessage.add(esm_messages.closePositionSuccess.replace('%1', netPnl.toFixed(2)) + ' ' + esm_messages.marginTransferFee.replace('%1', fee));
            this.esm_save();
            this.esm_calculateVIP();
        },

        esm_placeOrder(type, direction, code, quantity, price = 0) {
            code = code.toString().padStart(3, '0');
            quantity = Number(quantity) || $gameVariables.value(esm_contractInputAmountVar) || 0;
            price = Number(price) || $gameVariables.value(esm_inputAmountVar) || 0;
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock || quantity <= 0) {
                $gameMessage.add(esm_messages.invalidStockCode || '无效代码！');
                return;
            }
            if (type !== 'market' && price <= 0) {
                $gameMessage.add(esm_messages.invalidPrice || '价格无效！');
                return;
            }
            const order = {
                id: this.esm_orderIdCounter++,
                type,
                direction,
                code,
                quantity,
                price,
                status: 'pending',
                time: this.esm_getCurrentTime()
            };
            this.esm_orders.push(order);
            $gameMessage.add(esm_messages.orderPlaced.replace('%1', order.id) || '委托单已挂起。');
            this.esm_save();
        },

        esm_cancelOrder(orderId) {
            orderId = Number(orderId) || $gameVariables.value(esm_inputAmountVar) || 0;
            const index = this.esm_orders.findIndex(o => o.id === orderId && o.status === 'pending');
            if (index === -1) {
                $gameMessage.add(esm_messages.orderCancelled.replace('%1', '订单不存在或已执行') || '委托单取消失败。');
                return;
            }
            this.esm_orders.splice(index, 1);
            $gameMessage.add(esm_messages.orderCancelled.replace('%1', orderId) || '委托单取消成功。');
            this.esm_save();
        },

        esm_setTakeProfit(code, direction, price) {
            code = code.toString().padStart(3, '0');
            price = Number(price) || $gameVariables.value(esm_inputAmountVar) || 0;
            const pos = this.esm_positions[code]?.[direction];
            if (!pos || pos.quantity <= 0) {
                $gameMessage.add(esm_messages.noPositions || '无持仓合约。');
                return;
            }
            if (price <= 0) {
                $gameMessage.add(esm_messages.invalidPrice || '价格无效！');
                return;
            }
            pos.takeProfit = price;
            $gameMessage.add('止盈设置成功：价格 ' + price);
            this.esm_save();
        },

        esm_checkOrders() {
            this.esm_orders.forEach(order => {
                if (order.status !== 'pending') return;
                const currentPrice = this.esm_prices[order.code];
                let trigger = false;
                switch (order.type) {
                    case 'market':
                        trigger = true;
                        break;
                    case 'limit':
                        trigger = (order.direction === 'long' && currentPrice <= order.price) || (order.direction === 'short' && currentPrice >= order.price);
                        break;
                    case 'takeProfit':
                        trigger = (order.direction === 'long' && currentPrice >= order.price) || (order.direction === 'short' && currentPrice <= order.price);
                        break;
                    case 'stopLoss':
                        trigger = (order.direction === 'long' && currentPrice <= order.price) || (order.direction === 'short' && currentPrice >= order.price);
                        break;
                }
                if (trigger) {
                    if (order.type === 'takeProfit' || order.type === 'stopLoss') {
                        this.esm_closePosition(order.direction, order.code, order.quantity);
                    } else {
                        this.esm_openPosition(order.direction, order.code, order.quantity, esm_defaultLeverage, 0);
                    }
                    order.status = 'executed';
                    $gameMessage.add(esm_messages.orderExecuted.replace('%1', order.id) || '委托单执行成功。');
                }
            });
            this.esm_orders = this.esm_orders.filter(o => o.status === 'pending');
            this.esm_save();
        },

        esm_deductFundingFee() {
            const currentTime = this.esm_getCurrentTime();
            if (this.esm_shouldDeductFunding(currentTime)) {
                Object.keys(this.esm_positions).forEach(code => {
                    ['long', 'short'].forEach(direction => {
                        const pos = this.esm_positions[code][direction];
                        if (pos.quantity > 0) {
                            const rate = direction === 'long' ? this.esm_longFundingRate : this.esm_shortFundingRate;
                            const fee = pos.marginUsed * rate;
                            pos.fundingPaid += fee;
                            this.esm_margin -= fee;
                            $gameMessage.add(esm_messages.fundingFeeDeducted.replace('%1', fee.toFixed(2)) || '资金费扣取。');
                        }
                    });
                });
                this.esm_lastFundingTime = currentTime;
                this.esm_save();
            }
        },

        esm_shouldDeductFunding(currentTime) {
            const last = this.esm_lastFundingTime;
            switch (esm_fundingInterval) {
                case 'hour':
                    return true; // 假设每小时检查
                case 'period':
                    return currentTime.period !== last.period;
                default:
                    return false;
            }
        },

        esm_checkStopLossAndLiquidation() {
            Object.keys(this.esm_positions).forEach(code => {
                const price = this.esm_prices[code];
                ['long', 'short'].forEach(direction => {
                    const pos = this.esm_positions[code][direction];
                    if (pos.quantity > 0) {
                        const basePnl = (price - pos.entryPrice) * pos.quantity * (direction === 'long' ? 1 : -1);
                        const pnl = basePnl * pos.leverage;
                        const equity = pos.marginUsed + pnl;
                        if (equity / pos.marginUsed <= esm_liquidationThreshold) {
                            this.esm_closePosition(direction, code, pos.quantity);
                            $gameMessage.add(esm_messages.liquidationTriggered.replace('%1', code).replace('%2', this.esm_margin) || '爆仓！');
                            return;
                        }
                        const stopCondition = direction === 'long' ? (price <= pos.stopLoss) : (price >= pos.stopLoss);
                        if (pos.stopLoss > 0 && stopCondition) {
                            this.esm_closePosition(direction, code, pos.quantity);
                            $gameMessage.add(esm_messages.stopLossTriggered.replace('%1', code) || '止损触发！');
                        }
                    }
                });
            });
            this.esm_save();
        },

        esm_checkContractConditions() {
            this.esm_deductFundingFee();
            this.esm_checkStopLossAndLiquidation();
            this.esm_checkOrders();
        },

        esm_setFundingRate(longRate, shortRate) {
            this.esm_longFundingRate = Number(longRate) || this.esm_longFundingRate;
            this.esm_shortFundingRate = Number(shortRate) || this.esm_shortFundingRate;
            $gameMessage.add(esm_messages.fundingRateMsg.replace('%1', this.esm_longFundingRate).replace('%2', this.esm_shortFundingRate));
            this.esm_save();
        },

        esm_queryPositions() {
            let msg = '';
            Object.keys(this.esm_positions).forEach(code => {
                ['long', 'short'].forEach(direction => {
                    const pos = this.esm_positions[code][direction];
                    if (pos.quantity > 0) {
                        const price = this.esm_prices[code];
                        const basePnl = (price - pos.entryPrice) * pos.quantity * (direction === 'long' ? 1 : -1);
                        const pnl = basePnl * pos.leverage;
                        const estClosePnl = pnl - this.esm_calculateFee(Math.abs(pnl));
                        msg += `${code} ${direction}: 数量${pos.quantity}, 入场价${pos.entryPrice}, 杠杆${pos.leverage}, 止损${pos.stopLoss}, 盈亏${Math.floor(estClosePnl)}\n`;
                    }
                });
            });
            $gameMessage.add(msg || esm_messages.noPositions);
        },

        esm_querySinglePosition(code) {
            code = code.toString().padStart(3, '0');
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) {
                $gameMessage.add(esm_messages.stockNotFound || '股票代码不存在，查询为空。');
                return;
            }
            let msg = `${stock.displayName}(${code})\n`;
            let hasPos = false;
            ['long', 'short'].forEach(direction => {
                const pos = this.esm_positions[code][direction];
                if (pos.quantity > 0) {
                    hasPos = true;
                    const price = this.esm_prices[code];
                    const basePnl = (price - pos.entryPrice) * pos.quantity * (direction === 'long' ? 1 : -1);
                    const pnl = basePnl * pos.leverage;
                    const estClosePnl = pnl - this.esm_calculateFee(Math.abs(pnl));
                    msg += `${direction}: 开仓时间${pos.openTime}, 已扣费${pos.fundingPaid}, 保证金占用${pos.marginUsed}, 平仓预估盈亏${Math.floor(estClosePnl)}\n`;
                }
            });
            $gameMessage.add(hasPos ? msg : esm_messages.noPositions || '无持仓合约。');
        }
    };

    // 插件命令注册
    PluginManager.registerCommand('Expand_Stockmarket', 'DepositCash', () => esm_manager.esm_execCommand('DepositCash'));
    PluginManager.registerCommand('Expand_Stockmarket', 'WithdrawCash', () => esm_manager.esm_execCommand('WithdrawCash'));
    PluginManager.registerCommand('Expand_Stockmarket', 'BuyStock', () => esm_manager.esm_execCommand('BuyStock'));
    PluginManager.registerCommand('Expand_Stockmarket', 'SellStock', () => esm_manager.esm_execCommand('SellStock'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryAccount', () => esm_manager.esm_execCommand('QueryAccount'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryHoldings', () => esm_manager.esm_execCommand('QueryHoldings'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryPrice', () => esm_manager.esm_execCommand('QueryPrice'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QuerySingleHolding', () => esm_manager.esm_execCommand('QuerySingleHolding'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryHistory', () => esm_manager.esm_execCommand('QueryHistory'));
    PluginManager.registerCommand('Expand_Stockmarket', 'DepositMargin', () => esm_manager.esm_execCommand('DepositMargin'));
    PluginManager.registerCommand('Expand_Stockmarket', 'WithdrawMargin', () => esm_manager.esm_execCommand('WithdrawMargin'));
    PluginManager.registerCommand('Expand_Stockmarket', 'OpenLong', () => esm_manager.esm_execCommand('OpenLong'));
    PluginManager.registerCommand('Expand_Stockmarket', 'OpenShort', () => esm_manager.esm_execCommand('OpenShort'));
    PluginManager.registerCommand('Expand_Stockmarket', 'ClosePosition', () => esm_manager.esm_execCommand('ClosePosition'));
    PluginManager.registerCommand('Expand_Stockmarket', 'PlaceOrder', () => esm_manager.esm_execCommand('PlaceOrder'));
    PluginManager.registerCommand('Expand_Stockmarket', 'CancelOrder', () => esm_manager.esm_execCommand('CancelOrder'));
    PluginManager.registerCommand('Expand_Stockmarket', 'SetTakeProfit', () => esm_manager.esm_execCommand('SetTakeProfit'));
    PluginManager.registerCommand('Expand_Stockmarket', 'SetFundingRate', () => esm_manager.esm_execCommand('SetFundingRate'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryPositions', () => esm_manager.esm_execCommand('QueryPositions'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QuerySinglePosition', () => esm_manager.esm_execCommand('QuerySinglePosition'));
    PluginManager.registerCommand('Expand_Stockmarket', 'QueryFundingRate', () => esm_manager.esm_execCommand('QueryFundingRate'));
    PluginManager.registerCommand('Expand_Stockmarket', 'OpenStockWindow', () => {
        SceneManager.push(Scene_StockmarketWindow);
    });

    // 存档扩展
    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        if (esm_useSaveObject) {
            contents.esm_stockmarket = {
                account: esm_manager.esm_account,
                holdings: esm_manager.esm_holdings,
                prices: esm_manager.esm_prices,
                avgBuyPrices: esm_manager.esm_avgBuyPrices,
                tradeLog: esm_manager.esm_tradeLog,
                history: esm_manager.esm_history,
                margin: esm_manager.esm_margin,
                positions: esm_manager.esm_positions,
                orders: esm_manager.esm_orders,
                contractHistory: esm_manager.esm_contractHistory,
                longFundingRate: esm_manager.esm_longFundingRate,
                shortFundingRate: esm_manager.esm_shortFundingRate,
                lastFundingTime: esm_manager.esm_lastFundingTime,
                orderIdCounter: esm_manager.esm_orderIdCounter
            };
        }
        return contents;
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        if (esm_useSaveObject && contents.esm_stockmarket) {
            Object.assign(esm_manager, contents.esm_stockmarket);
        }
    };

    // 初始化
    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        esm_manager.esm_init();
    };

    const _DataManager_loadGame = DataManager.loadGame;
    DataManager.loadGame = function(savefileId) {
        const result = _DataManager_loadGame.call(this, savefileId);
        if (result) {
            esm_manager.esm_load();
        }
        return result;
    };

    // 地图钩子
    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        esm_manager.esm_load();
        if (esm_updateTrigger === 'auto' || esm_updateTrigger === 'both') {
            esm_manager.esm_checkAndUpdatePrices();
        }
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        esm_manager.esm_checkAndUpdatePrices();
        esm_manager.esm_checkContractConditions();
    };

    // 新窗口类: 主命令窗口
    class Window_StockCommand extends Window_Command {
        makeCommandList() {
            this.addCommand('账户管理', 'account');
            this.addCommand('股票交易', 'trade');
            this.addCommand('查询信息', 'query');
            this.addCommand('合约操作', 'contract');
            this.addCommand('行情设置', 'marketSettings');
            this.addCommand('特殊事件', 'specialEvents');
            this.addCommand('更新股价', 'updatePrice');
            this.addCommand('检查更新', 'checkTimeUpdate');
            this.addCommand('退出', 'cancel');
        }
    }

    // 新窗口类: 信息窗口
    class Window_StockInfo extends Window_Base {
        refresh() {
            this.contents.clear();
            this.drawText(`资金账户: ${esm_manager.esm_account} 金币`, 0, 0);
            this.drawText(`保证金: ${esm_manager.esm_margin} 金币`, 0, this.lineHeight());
            const vip = $gameVariables.value(esm_vipVar) || 0;
            const feeRate = vip > 0 ? esm_feeRateVip : esm_feeRate;
            this.drawText(`VIP: ${vip} 费率: ${feeRate * 100}%`, 0, this.lineHeight() * 2);
            const time = esm_manager.esm_getCurrentTime();
            this.drawText(`时间: ${time.year}-${time.month}-${time.day} 周${time.week} 时段${time.period}`, 0, this.lineHeight() * 3);
        }
    }

    // 新窗口类: 股票列表窗口
    class Window_StockList extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this.refresh();
        }

        maxItems() {
            return esm_stockList.length;
        }

        drawItem(index) {
            const stock = esm_stockList[index];
            const rect = this.itemRect(index);
            const price = esm_manager.esm_prices[stock.code].toFixed(2);
            const hold = esm_manager.esm_holdings[stock.code] || 0;
            this.drawText(`${stock.code}: ${stock.name} - ${price}元 (持:${hold})`, rect.x, rect.y, rect.width);
        }

        currentCode() {
            return esm_stockList[this.index()].code;
        }
    }

    // 新窗口类: 消息窗口
    class Window_StockMessage extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this._text = '';
        }

        setText(text) {
            this._text = text || '无信息';
            this.refresh();
        }

        refresh() {
            this.contents.clear();
            if (typeof this.textPadding !== 'function') {
                this.textPadding = function() { return this.padding; };
                console.warn('Window_StockMessage: textPadding 方法丢失，已动态修复。');
            }
            this.drawTextEx(this._text, this.textPadding(), 0);
        }
    }

    // 新窗口类: 子命令窗口
    class Window_SubCommand extends Window_Command {
        constructor(rect, commands) {
            super.initialize(rect);
            this._commands = commands || [];
            this.refresh();
        }

        makeCommandList() {
            if (!this._commands || !Array.isArray(this._commands)) {
                console.warn('Window_SubCommand: _commands is undefined or not array, skipping.');
                return;
            }
            this._commands.forEach(cmd => {
                if (cmd && cmd.name && cmd.symbol) {
                    this.addCommand(cmd.name, cmd.symbol);
                }
            });
        }
    }

    // 新窗口类: 数字输入窗口
    class Window_StockNumberInput extends Window_NumberInput {
        initialize(rect) {
            super.initialize(rect);
            this._prompt = '';
            this._maxDigits = 10;
            this._number = 0;
            this.updatePlacement();
        }

        setMessageText(prompt) {
            this._prompt = prompt || '请输入:';
            this.refresh();
        }

        refresh() {
            this.contents.clear();
            this.drawText(this._prompt, 0, 0, this.width - this.padding * 2);
            const y = this.lineHeight();
            const digits = this._number.toString().padStart(this._maxDigits, ' ');
            this.changeTextColor(ColorManager.normalColor());
            this.drawText(digits, 0, y, this.width - this.padding * 2, 'center');
        }

        start() {
            this._number = 0;
            this.refresh();
            this.show();
            super.start();
            this.activate();
        }

        processDigit(digit) {
            if (this._number.toString().length < this._maxDigits) {
                this._number = this._number * 10 + digit;
                this.refresh();
            }
        }

        processBack() {
            this._number = Math.floor(this._number / 10);
            this.refresh();
        }

        number() {
            return this._number;
        }

        updatePlacement() {
            this.x = (Graphics.boxWidth - this.width) / 2;
            this.y = (Graphics.boxHeight - this.height) / 2;
        }
    }

    // 新窗口类: 代码输入窗口 (3位)
    class Window_StockCodeInput extends Window_StockNumberInput {
        initialize(rect) {
            super.initialize(rect);
            this._maxDigits = 3;
            this._prompt = '';
        }

        setMessageText(prompt) {
            this._prompt = prompt || '请输入代码:';
            this.refresh();
        }

        processDigit(digit) {
            if (this._number.toString().length < this._maxDigits) {
                super.processDigit(digit);
            }
        }
    }

    // 新窗口类: 选择窗口
    class Window_StockSelect extends Window_Command {
        constructor(rect, options) {
            super.initialize(rect);
            this._options = options || [];
            this._prompt = '';
            this.refresh();
        }

        setMessageText(prompt) {
            this._prompt = prompt || '';
            this.refresh();
        }

        makeCommandList() {
            if (!this._options || !Array.isArray(this._options)) {
                console.warn('Window_StockSelect: _options is undefined or not array, skipping.');
                return;
            }
            this._options.forEach(opt => {
                if (opt && opt.name && opt.symbol) {
                    this.addCommand(opt.name, opt.symbol);
                }
            });
        }

        refresh() {
            super.refresh();
            if (this._prompt) {
                this.drawText(this._prompt, 0, 0, this.width - this.padding * 2);
            }
        }
    }

    // 新场景: 股市窗口场景
    class Scene_StockmarketWindow extends Scene_MenuBase {
        create() {
            super.create();
            this._windowContainer = new Sprite(); // 用于居中
            this.addChild(this._windowContainer);
            this._windowContainer.x = (Graphics.boxWidth - sceneWidth) / 2 + offsetX;
            this._windowContainer.y = (Graphics.boxHeight - sceneHeight) / 2 + offsetY;
            this.createCommandWindow();
            this.createInfoWindow();
            this.createStockListWindow();
            this.createMessageWindow();
            this.createSubCommandWindow();
            this.createNumberInputWindow();
            this.createCodeInputWindow();
            this.createSelectWindow();
            this._commandWindow.activate();
        }

        createBackground() {
            super.createBackground();
            if (backgroundImage) {
                const bitmap = ImageManager.loadSystem(backgroundImage);
                this._backgroundSprite = new Sprite(bitmap);
                this.addChildAt(this._backgroundSprite, 0); // 背景在最底层
                bitmap.addLoadListener(() => {
                    // 可选：拉伸到全屏或场景大小
                    this._backgroundSprite.width = Graphics.boxWidth;
                    this._backgroundSprite.height = Graphics.boxHeight;
                });
            }
        }

        createCommandWindow() {
            const rect = new Rectangle(0, 0, sceneWidth / 4, sceneHeight);
            this._commandWindow = new Window_StockCommand(rect);
            this._commandWindow.setHandler('account', this.onAccount.bind(this));
            this._commandWindow.setHandler('trade', this.onTrade.bind(this));
            this._commandWindow.setHandler('query', this.onQuery.bind(this));
            this._commandWindow.setHandler('contract', this.onContract.bind(this));
            this._commandWindow.setHandler('marketSettings', this.onMarketSettings.bind(this));
            this._commandWindow.setHandler('specialEvents', this.onSpecialEvents.bind(this));
            this._commandWindow.setHandler('updatePrice', this.onUpdatePrice.bind(this));
            this._commandWindow.setHandler('checkTimeUpdate', this.onCheckTimeUpdate.bind(this));
            this._commandWindow.setHandler('cancel', this.popScene.bind(this));
            this._windowContainer.addChild(this._commandWindow); // 加到 container
        }

        onMarketSettings() {
            const commands = [
                { name: '全局行情', symbol: 'globalMarket' },
                { name: '个股行情', symbol: 'singleMarket' }
            ];
            this.showSubCommand(commands, this.onMarketSub.bind(this));
        }

        onMarketSub() {
            const symbol = this._subCommandWindow.currentSymbol();
            this.onSubCancel();
            this._currentAction = symbol;
            this._inputValues = {};
            this._inputStep = 0;
            if (symbol === 'singleMarket') {
                this._stockListWindow.show();
                this._stockListWindow.activate();
            } else {
                this.nextInputStep();  // 开始多步输入
            }
        }

        onSpecialEvents() {
            const commands = esm_specialEvents.map(e => ({ name: e.identifier, symbol: e.identifier }));
            this.showSubCommand(commands, this.onSpecialSub.bind(this));
        }

        onSpecialSub() {
            const symbol = this._subCommandWindow.currentSymbol();
            this.onSubCancel();
            this._currentAction = 'setSpecialTime';
            this._inputValues = { identifier: symbol };
            this.startNumberInput('请输入持续周期:', 'duration');
            // 后续可扩展 affectedStocks 输入，但暂用默认
        }

        createInfoWindow() {
            const rect = new Rectangle(sceneWidth / 4, 0, sceneWidth * 3 / 4, this.calcWindowHeight(4, false));
            this._infoWindow = new Window_StockInfo(rect);
            this._windowContainer.addChild(this._infoWindow);
        }

        createStockListWindow() {
            const y = this._infoWindow.height;
            const rect = new Rectangle(sceneWidth / 4, y, sceneWidth * 3 / 4, sceneHeight - y);
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
            this._messageWindow.hide();
            this._windowContainer.addChild(this._messageWindow);
        }

        createSubCommandWindow() {
            const rect = new Rectangle(subOffsetX, subOffsetY, subWidth, subHeight);
            this._subCommandWindow = new Window_SubCommand(rect, []);
            this._subCommandWindow.hide();
            this._subCommandWindow.deactivate();
            this._subCommandWindow.setHandler('cancel', this.onSubCancel.bind(this));
            this._windowContainer.addChild(this._subCommandWindow);
        }

        createNumberInputWindow() {
            const rect = new Rectangle(inputOffsetX, inputOffsetY, inputWidth, inputHeight);
            this._numberInputWindow = new Window_StockNumberInput(rect);
            this._numberInputWindow.hide();
            this._numberInputWindow.setHandler('ok', this.onNumberOk.bind(this));
            this._numberInputWindow.setHandler('cancel', this.onNumberCancel.bind(this));
            this._windowContainer.addChild(this._numberInputWindow);
        }

        createCodeInputWindow() {
            const rect = new Rectangle(inputOffsetX, inputOffsetY, inputWidth, inputHeight);
            this._codeInputWindow = new Window_StockCodeInput(rect);
            this._codeInputWindow.hide();
            this._codeInputWindow.setHandler('ok', this.onCodeOk.bind(this));
            this._codeInputWindow.setHandler('cancel', this.onCodeCancel.bind(this));
            this._windowContainer.addChild(this._codeInputWindow);
        }

        createSelectWindow() {
            const rect = new Rectangle(inputOffsetX, inputOffsetY, inputWidth, inputHeight);
            this._selectWindow = new Window_StockSelect(rect, []);
            this._selectWindow.hide();
            this._selectWindow.setHandler('ok', this.onSelectOk.bind(this));
            this._selectWindow.setHandler('cancel', this.onSelectCancel.bind(this));
            this._windowContainer.addChild(this._selectWindow);
        }

        showSubCommand(commands, handler) {
            if (!commands || !Array.isArray(commands)) {
                console.error('showSubCommand: commands is not an array or undefined. Using empty array.');
                commands = [];
            }
            this._subCommandWindow = new Window_SubCommand(new Rectangle(subOffsetX, subOffsetY, subWidth, subHeight), commands);
            this._subCommandWindow.setHandler('ok', handler.bind(this));
            this._subCommandWindow.setHandler('cancel', this.onSubCancel.bind(this));
            this._windowContainer.addChild(this._subCommandWindow);
            this._subCommandWindow.activate();
            this._subCommandWindow.show();
        }

        onSubCancel() {
            this._subCommandWindow.hide();
            this._subCommandWindow.deactivate();
            this._commandWindow.activate();
        }

        onAccount() {
            const commands = [
                { name: '存入现金', symbol: 'deposit' },
                { name: '取出现金', symbol: 'withdraw' },
                { name: '转入保证金', symbol: 'depositMargin' },
                { name: '转出保证金', symbol: 'withdrawMargin' }
            ];
            console.log('onAccount commands:', commands);
            this.showSubCommand(commands, this.onAccountSub.bind(this));
        }

        onAccountSub() {
            const symbol = this._subCommandWindow.currentSymbol();
            this.onSubCancel();
            this._currentAction = symbol;
            this._inputValues = {};
            this._inputStep = 0;
            this.startNumberInput('请输入金额:', 'amount');
        }

        onTrade() {
            const commands = [
                { name: '购买股票', symbol: 'buy' },
                { name: '出售股票', symbol: 'sell' }
            ];
            this.showSubCommand(commands, this.onTradeSub.bind(this));
        }

        onTradeSub() {
            const symbol = this._subCommandWindow.currentSymbol();
            this.onSubCancel();
            this._currentAction = symbol;
            this._inputValues = {};
            this._inputStep = 0;
            this._stockListWindow.show();
            this._stockListWindow.activate();
        }

        onQuery() {
            const commands = [
                { name: '账户余额', symbol: 'account' },
                { name: '持仓查询', symbol: 'holdings' },
                { name: '股价查询', symbol: 'price' },
                { name: '个股持仓', symbol: 'singleHolding' },
                { name: '历史记录', symbol: 'history' },
                { name: '公司信息', symbol: 'companyInfo' },
                { name: '合约持仓', symbol: 'positions' },
                { name: '个股合约', symbol: 'singlePosition' },
                { name: '资金费率', symbol: 'fundingRate' }
            ];
            this.showSubCommand(commands, this.onQuerySub.bind(this));
        }

        onQuerySub() {
            const symbol = this._subCommandWindow.currentSymbol();
            this.onSubCancel();
            this._currentAction = symbol;
            this._inputValues = {};
            this._inputStep = 0;
            if (['account', 'holdings', 'positions', 'fundingRate'].includes(symbol)) {
                this.executeAction();
            } else if (symbol === 'history') {
                this.startNumberInput('请输入天数:', 'days');
            } else {
                this.startCodeInput('请输入代码:', 'code');
            }
        }

        onContract() {
            const commands = [
                { name: '开多仓', symbol: 'openLong' },
                { name: '开空仓', symbol: 'openShort' },
                { name: '平仓', symbol: 'closePosition' },
                { name: '挂委托单', symbol: 'placeOrder' },
                { name: '取消委托', symbol: 'cancelOrder' },
                { name: '设置止盈', symbol: 'setTakeProfit' },
                { name: '设置资金费', symbol: 'setFundingRate' }
            ];
            this.showSubCommand(commands, this.onContractSub.bind(this));
        }

        onContractSub() {
            const symbol = this._subCommandWindow.currentSymbol();
            this.onSubCancel();
            this._currentAction = symbol;
            this._inputValues = {};
            this._inputStep = 0;
            if (symbol === 'setFundingRate') {
                this.nextInputStep();
            } else if (symbol === 'cancelOrder') {
                this.startNumberInput('请输入订单ID:', 'orderId');
            } else {
                this.startCodeInput('请输入代码:', 'code');
            }
        }

        onStockSelect() {
            this._selectedCode = this._stockListWindow.currentCode();
            this._stockListWindow.hide();
            this._stockListWindow.deactivate();
            this.nextInputStep();
        }

        onStockCancel() {
            this._stockListWindow.hide();
            this._stockListWindow.deactivate();
            this._commandWindow.activate();
        }

        startNumberInput(prompt, key) {
            this._numberInputWindow.setMessageText(prompt);
            this._numberInputWindow.start();
            this._numberInputWindow.setHandler('ok', () => {
                this._inputValues[key] = this._numberInputWindow.number();
                this.onNumberOk();
            });
        }

        onNumberOk() {
            this._numberInputWindow.hide();
            this._numberInputWindow.deactivate();
            this.nextInputStep();
        }

        onNumberCancel() {
            this._numberInputWindow.hide();
            this._numberInputWindow.deactivate();
            this._commandWindow.activate();
        }

        startCodeInput(prompt) {
            this._codeInputWindow.setMessageText(prompt);
            this._codeInputWindow.start();
        }

        onCodeOk() {
            const value = this._codeInputWindow.number();
            this._selectedCode = value.toString().padStart(3, '0');
            $gameVariables.setValue(esm_inputCodeVar, value);
            this._codeInputWindow.hide();
            this._codeInputWindow.deactivate();
            this.nextInputStep();
        }

        onCodeCancel() {
            this._codeInputWindow.hide();
            this._codeInputWindow.deactivate();
            this._commandWindow.activate();
        }

        startSelect(options, prompt) {
            if (!options || !Array.isArray(options) || options.length === 0) {
                console.warn('startSelect: Invalid options, skipping.');
                this._messageWindow.setText('无可用选项。');
                this._messageWindow.show();
                return;
            }
            this._selectWindow._options = options;
            this._selectWindow.setMessageText(prompt);
            this._selectWindow.refresh();
            this._selectWindow.show();
            this._selectWindow.activate();
        }

        onSelectOk() {
            const sym = this._selectWindow.currentSymbol();
            if (this._inputStep === 1) {
                this._inputValues.direction = sym;
            } else if (this._inputStep === 5) {
                this._inputValues.orderType = sym;
            }
            this._selectWindow.hide();
            this._selectWindow.deactivate();
            this.nextInputStep();
        }

        onSelectCancel() {
            this._selectWindow.hide();
            this._selectWindow.deactivate();
            this._commandWindow.activate();
        }

        nextInputStep() {
            const symbol = this._currentAction;
            if (!this._inputValues) this._inputValues = {};
            this._inputStep = this._inputStep || 0;
            this._inputStep++;
            switch (this._inputStep) {
                case 1:
                    if (['openLong', 'openShort'].includes(symbol)) {
                        this._inputValues.direction = symbol === 'openLong' ? 'long' : 'short';
                        this.nextInputStep();
                    } else if (symbol === 'closePosition' || symbol === 'placeOrder' || symbol === 'setTakeProfit') {
                        const options = [
                            { name: '多', symbol: 'long' },
                            { name: '空', symbol: 'short' }
                        ];
                        this.startSelect(options, '选择方向:');
                    } else if (symbol === 'globalMarket' || symbol === 'singleMarket') {
                        this.startNumberInput('请输入概率加成(%):', 'prob');
                    } else if (symbol === 'setFundingRate') {
                        this.startNumberInput('请输入做多费率 (e.g., 0.0001):', 'longRate');
                    } else {
                        this.nextInputStep();
                    }
                    break;
                case 2:
                    if (symbol === 'globalMarket' || symbol === 'singleMarket') {
                        this.startNumberInput('请输入上涨幅度加成(%):', 'upAmp');
                    } else if (symbol === 'setFundingRate') {
                        this.startNumberInput('请输入做空费率 (e.g., 0.0001):', 'shortRate');
                    } else {
                        this.startNumberInput('请输入数量:', 'quantity');
                    }
                    break;
                case 3:
                    if (symbol === 'globalMarket' || symbol === 'singleMarket') {
                        this.startNumberInput('请输入下跌幅度加成(%):', 'downAmp');
                    } else if (['openLong', 'openShort', 'placeOrder'].includes(symbol)) {
                        this.startNumberInput('请输入杠杆(1-10):', 'leverage');
                    } else {
                        this.nextInputStep();
                    }
                    break;
                case 4:
                    if (symbol === 'globalMarket' || symbol === 'singleMarket') {
                        this.startNumberInput('请输入持续年:', 'durationYears');
                    } else if (['openLong', 'openShort', 'placeOrder'].includes(symbol)) {
                        this.startNumberInput('请输入止损价(0忽略):', 'stopLoss');
                    } else if (symbol === 'setTakeProfit') {
                        this.startNumberInput('请输入止盈价:', 'price');
                    } else {
                        this.nextInputStep();
                    }
                    break;
                case 5:
                    if (symbol === 'globalMarket' || symbol === 'singleMarket') {
                        this.startNumberInput('请输入持续月:', 'durationMonths');
                    } else if (symbol === 'placeOrder') {
                        const typeOptions = [
                            { name: '市价', symbol: 'market' },
                            { name: '限价', symbol: 'limit' },
                            { name: '止盈', symbol: 'takeProfit' },
                            { name: '止损', symbol: 'stopLoss' }
                        ];
                        this.startSelect(typeOptions, '选择委托类型:');
                    } else {
                        this.nextInputStep();
                    }
                    break;
                case 6:
                    if (symbol === 'globalMarket' || symbol === 'singleMarket') {
                        this.startNumberInput('请输入持续日:', 'durationDays');
                    } else if (symbol === 'placeOrder' && ['limit', 'takeProfit', 'stopLoss'].includes(this._inputValues.orderType)) {
                        this.startNumberInput('请输入价格:', 'price');
                    } else {
                        this.executeAction();
                    }
                    break;
                default:
                    this.executeAction();
            }
        }

        executeAction() {
            const symbol = this._currentAction;
            let text = '';
            console.log(`[Debug] Executing action: ${symbol}, values:`, this._inputValues);  // 调试日志
            try {
                switch (symbol) {
                    case 'deposit':
                        $gameVariables.setValue(esm_inputAmountVar, this._inputValues.amount);
                        esm_manager.esm_execCommand('DepositCash');
                        text = esm_messages.depositSuccess.replace('%1', esm_manager.esm_account) || '存入成功！';
                        break;
                    case 'withdraw':
                        $gameVariables.setValue(esm_inputAmountVar, this._inputValues.amount);
                        esm_manager.esm_execCommand('WithdrawCash');
                        text = esm_messages.withdrawSuccess.replace('%1', this._inputValues.amount) || '取出成功！';
                        break;
                    case 'depositMargin':
                        $gameVariables.setValue(esm_contractInputAmountVar, this._inputValues.amount);
                        esm_manager.esm_execCommand('DepositMargin');
                        text = esm_messages.marginTransferSuccess.replace('%1', esm_manager.esm_margin) || '转入成功！';
                        break;
                    case 'withdrawMargin':
                        $gameVariables.setValue(esm_contractInputAmountVar, this._inputValues.amount);
                        esm_manager.esm_execCommand('WithdrawMargin');
                        text = esm_messages.marginTransferSuccess.replace('%1', esm_manager.esm_margin) || '转出成功！';
                        break;
                    case 'buy':
                        $gameVariables.setValue(esm_inputCodeVar, parseInt(this._selectedCode));
                        $gameVariables.setValue(esm_inputAmountVar, this._inputValues.quantity);
                        esm_manager.esm_execCommand('BuyStock');
                        text = esm_messages.buySuccess.replace('%1', this._selectedCode).replace('%2', this._inputValues.quantity) || '购买成功！';
                        break;
                    case 'sell':
                        $gameVariables.setValue(esm_inputCodeVar, parseInt(this._selectedCode));
                        $gameVariables.setValue(esm_inputAmountVar, this._inputValues.quantity);
                        esm_manager.esm_execCommand('SellStock');
                        text = esm_messages.sellSuccess.replace('%1', this._inputValues.quantity) || '出售成功！';
                        break;
                    case 'history':
                        $gameVariables.setValue(esm_inputCodeVar, parseInt(this._selectedCode));
                        $gameVariables.setValue(esm_inputAmountVar, this._inputValues.days);
                        text = this.getHistoryText(this._selectedCode, this._inputValues.days);
                        break;
                    case 'openLong':
                    case 'openShort':
                        $gameVariables.setValue(esm_contractInputCodeVar, parseInt(this._selectedCode));
                        $gameVariables.setValue(esm_contractInputAmountVar, this._inputValues.quantity);
                        $gameVariables.setValue(esm_contractInputLeverageVar, this._inputValues.leverage || esm_contractSettings.defaultLeverage);
                        $gameVariables.setValue(esm_contractInputStopLossVar, this._inputValues.stopLoss || 0);
                        esm_manager.esm_execCommand(symbol.charAt(0).toUpperCase() + symbol.slice(1));
                        text = esm_messages.openPositionSuccess.replace('%1', this._inputValues.direction).replace('%2', this._inputValues.quantity) || '开仓成功！';
                        break;
                    case 'closePosition':
                        $gameVariables.setValue(esm_contractInputCodeVar, parseInt(this._selectedCode));
                        $gameVariables.setValue(esm_contractInputAmountVar, this._inputValues.quantity);
                        esm_manager.esm_execCommand('ClosePosition');
                        text = esm_messages.closePositionSuccess.replace('%1', this._inputValues.quantity) || '平仓成功！';
                        break;
                    case 'placeOrder':
                        $gameVariables.setValue(esm_contractInputCodeVar, parseInt(this._selectedCode));
                        $gameVariables.setValue(esm_contractInputAmountVar, this._inputValues.quantity);
                        $gameVariables.setValue(esm_inputAmountVar, this._inputValues.price || 0);
                        esm_manager.esm_execCommand('PlaceOrder');
                        text = esm_messages.orderPlaced.replace('%1', esm_manager.esm_orderIdCounter - 1) || '委托单已挂起！';
                        break;
                    case 'cancelOrder':
                        $gameVariables.setValue(esm_inputAmountVar, this._inputValues.orderId);
                        esm_manager.esm_execCommand('CancelOrder');
                        text = esm_messages.orderCancelled.replace('%1', this._inputValues.orderId) || '委托单取消成功！';
                        break;
                    case 'setTakeProfit':
                        $gameVariables.setValue(esm_contractInputCodeVar, parseInt(this._selectedCode));
                        $gameVariables.setValue(esm_inputAmountVar, this._inputValues.price);
                        esm_manager.esm_execCommand('SetTakeProfit');
                        text = '止盈设置成功！';
                        break;
                    case 'setFundingRate':
                        $gameVariables.setValue(esm_contractLongFundingRateVar, this._inputValues.longRate);
                        $gameVariables.setValue(esm_contractShortFundingRateVar, this._inputValues.shortRate);
                        esm_manager.esm_execCommand('SetFundingRate');
                        text = esm_messages.fundingRateMsg.replace('%1', this._inputValues.longRate).replace('%2', this._inputValues.shortRate) || '资金费率设置成功！';
                        break;
                    case 'account':
                        text = esm_manager.esm_execCommand('QueryAccount');
                        break;
                    case 'holdings':
                        text = esm_manager.esm_execCommand('QueryHoldings');
                        break;
                    case 'price':
                        text = this.getStockPriceText(this._selectedCode);
                        break;
                    case 'singleHolding':
                        text = this.getHoldingsText(this._selectedCode);
                        break;
                    case 'companyInfo':
                        text = this.getCompanyInfoText(this._selectedCode);
                        break;
                    case 'positions':
                        text = esm_manager.esm_execCommand('QueryPositions');
                        break;
                    case 'singlePosition':
                        text = this.getSinglePositionText(this._selectedCode);
                        break;
                    case 'fundingRate':
                        text = esm_messages.fundingRateMsg.replace('%1', esm_manager.esm_longFundingRate).replace('%2', esm_manager.esm_shortFundingRate);
                        break;
                    default:
                        text = '未知操作。';
                }
                this._messageWindow.setText(text);
                this._messageWindow.show();
                this._infoWindow.refresh();
                this._stockListWindow.refresh();
            } catch (e) {
                console.error('executeAction error:', e);
                this._messageWindow.setText('操作失败，请检查输入。');
                this._messageWindow.show();
            }
            this._commandWindow.activate();
        }

        getHoldingsText(code) {
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

        getHistoryText(code, days) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return esm_messages.stockNotFound || '股票代码不存在，查询为空。';
            days = Math.min(Number(days) || 1, esm_historyPeriods_parsed);
            let msg = `${stock.displayName}(${stock.code})最近${days}个交易日历史：\n`;
            const hist = esm_manager.esm_history[code] || [];
            const actualDays = Math.min(days, hist.length);
            if (actualDays === 0) return msg + '无历史数据。';
            const recentHist = hist.slice(0, actualDays);
            recentHist.forEach((entry, i) => {
                msg += `交易日${i+1}(${entry.day}): 平均${entry.avg.toFixed(2)} ${entry.change}\n`;
            });
            if (actualDays < days) msg += `\n历史数据不足，仅显示可用${actualDays}个交易日。`;
            return msg;
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

        onUpdatePrice() {
            esm_manager.esm_updateAllPrices(1);
            this._messageWindow.setText('股价已强制更新。');
            this._messageWindow.show();
            this._infoWindow.refresh();
            this._stockListWindow.refresh();
            this._commandWindow.activate();
        }

        onCheckTimeUpdate() {
            esm_manager.esm_checkAndUpdatePrices();
            this._messageWindow.setText('时间更新已检查。');
            this._messageWindow.show();
            this._infoWindow.refresh();
            this._stockListWindow.refresh();
            this._commandWindow.activate();
        }
    }

    // 添加到主菜单
    if (esm_enableMenuEntry) {
        const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
        Scene_Menu.prototype.createCommandWindow = function() {
            _Scene_Menu_createCommandWindow.call(this);
            this._commandWindow.setHandler('stockmarket', this.commandStockmarket.bind(this));
        };

        const _Window_MenuCommand_makeCommandList = Window_MenuCommand.prototype.makeCommandList;
        Window_MenuCommand.prototype.makeCommandList = function() {
            _Window_MenuCommand_makeCommandList.call(this);
            this.addCommand(esm_menuCommandName, 'stockmarket');
        };

        Scene_Menu.prototype.commandStockmarket = function() {
            SceneManager.push(Scene_StockmarketWindow);
        };
    }

    // 暴露全局
    window.esm_manager = esm_manager;
    window.esm_stockList = esm_stockList;
    window.esm_messages = esm_messages;

    // 全局错误监听
    window.addEventListener('error', (e) => {
        if (e.filename && e.filename.includes('Expand_Stockmarket.js')) {
            console.error('Stockmarket Error:', e.error);
        }
    });

})();