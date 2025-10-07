//=============================================================================
// Expand_Stockmarket_window.js
//=============================================================================
/*
插件名：Expand_Stockmarket_window
用到的原生内容：扩展了Scene_Menu.prototype.createCommandWindow（用alias）、Scene_Menu.prototype.addOriginalCommands（无，但通过alias添加命令）；新增场景 Scene_StockmarketWindow 继承 Scene_MenuBase；新增窗口类如 Window_StockCommand 继承 Window_Command 等。
冲突提示：若其他插件也修改了Scene_Menu的createCommandWindow或添加菜单项，请确保本插件在其之后加载；本插件依赖Expand_Stockmarket插件，确保其先加载并 esm_manager 可用；若其他插件修改Window_Selectable的鼠标处理，请检查兼容性。
*/
// 作者: Grok (基于Expand_Stockmarket扩展)
// 版本: 1.0.0
// 描述: RPG Maker MZ 股市图形界面插件，调用Expand_Stockmarket接口，提供可视化窗口操作，支持鼠标/键盘交互。
// 使用条款: 仅限RPG Maker MZ项目使用，可自由修改。
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 股市图形界面 (调用Expand_Stockmarket)
 * @author Grok
 *
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

 * @param numberPadSettings
 * @text 数字键盘设置
 * @type struct<WindowSettingsStruct>
 * @default {"width":"200","height":"150","offsetX":"410","offsetY":"200"}

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
 * - 依赖Expand_Stockmarket插件，确保先加载。
 * - 主菜单添加“股市”入口（可选关闭），或事件调用 OpenStockWindow。
 * - 界面: 主命令窗口（账户/交易/查询/合约/退出），信息面板（余额/VIP等），股票列表（点击操作）。
 * - 操作: 鼠标点击/键盘选择，数字输入窗口支持鼠标。
 * - 查询结果在专用消息窗口显示。
 * - 兼容: 不修改核心窗口，仅新增类。
 * - 调试: 若 esm_manager 未定义，控制台警告。
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
    const parameters = PluginManager.parameters('Expand_Stockmarket_window');
    const esmw_menuCommandName = parameters['menuCommandName'] || '股市';
    const esmw_enableMenuEntry = parameters['enableMenuEntry'] === 'true';
    const windowSettings = JSON.parse(parameters['windowSettings'] || '{"width":"800","height":"600","offsetX":"0","offsetY":"0"}');
    const subCommandSettings = JSON.parse(parameters['subCommandSettings'] || '{"width":"600","height":"430","offsetX":"200","offsetY":"170"}');
    const messageSettings = JSON.parse(parameters['messageSettings'] || '{"width":"600","height":"430","offsetX":"200","offsetY":"170"}');
    const inputSettings = JSON.parse(parameters['inputSettings'] || '{"width":"400","height":"150","offsetX":"200","offsetY":"200"}');
    const numberPadSettings = JSON.parse(parameters['numberPadSettings'] || '{"width":"200","height":"150","offsetX":"410","offsetY":"200"}');
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
    const padWidth = Number(numberPadSettings.width) || 200;
    const padHeight = Number(numberPadSettings.height) || 150;
    const padOffsetX = Number(numberPadSettings.offsetX) || 410;
    const padOffsetY = Number(numberPadSettings.offsetY) || 200;
    const backgroundImage = parameters['backgroundImage'] || '';

    // 解析父插件参数（修复变量未定义）
    const stockParams = PluginManager.parameters('Expand_Stockmarket');
    function safeJsonParse(str) {
        try { return JSON.parse(str); } catch (e) { console.error('JSON parse failed:', e); return {}; }
    }
    let esm_specialEvents = safeJsonParse(stockParams['specialEvents'] || '[]').map(safeJsonParse);
    let esm_variables = safeJsonParse(stockParams['variables'] || '{}');
    let esm_volatility = safeJsonParse(stockParams['volatility'] || '{}');
    let esm_contractSettings = safeJsonParse(stockParams['contractSettings'] || '{}');
    let esm_messages = safeJsonParse(stockParams['messages'] || '{}'); // 额外解析
    const esm_inputCodeVar = Number(esm_variables.inputCodeVar || 69);
    const esm_inputAmountVar = Number(esm_variables.inputAmountVar || 68);
    const esm_contractInputAmountVar = Number(esm_variables.contractInputAmountVar || 73);
    const esm_contractInputCodeVar = Number(esm_variables.contractInputCodeVar || 74);
    const esm_contractInputLeverageVar = Number(esm_variables.contractInputLeverageVar || 75);
    const esm_contractInputStopLossVar = Number(esm_variables.contractInputStopLossVar || 76);
    const esm_historyPeriods = Number(esm_volatility.historyPeriods || 30);
    // 举一反三：其他变量如 esm_contractInputAmountVar = Number(esm_variables.contractInputAmountVar) || 73; 等，如果需要添加

    // 检查依赖
    if (typeof esm_manager === 'undefined' || typeof esm_stockList === 'undefined') {
        console.error('Expand_Stockmarket_window: 依赖插件 Expand_Stockmarket 未加载或未初始化必要的变量（如 esm_manager 或 esm_stockList）。');
        alert('错误: Expand_Stockmarket 未加载！');
        return;
    }

    if (typeof esm_messages === 'undefined') {
        console.warn('Expand_Stockmarket_window: esm_messages 未暴露，使用默认消息。');
        esm_messages = {}; // 默认空，避免崩溃
    }

    // 新窗口类: 主命令窗口
    class Window_StockCommand extends Window_Command {
        makeCommandList() {
            this.addCommand('账户管理', 'account');
            this.addCommand('股票交易', 'trade');
            this.addCommand('查询', 'query');
            this.addCommand('合约操作', 'contract');
            this.addCommand('行情设置', 'marketSettings');
            this.addCommand('特殊事件', 'specialEvents');
            this.addCommand('更新价格', 'updatePrice');
            this.addCommand('检查时间更新', 'checkTimeUpdate');
            this.addCommand('退出', 'cancel');
        }
    }

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
            const time = esm_manager.esm_getTimeStamp() || '未知';
            this.drawText(`账户余额: ${account} 金币`, 0, 0, this.width - this.padding * 2);
            this.drawText(`保证金: ${margin} 金币`, 0, this.lineHeight(), this.width - this.padding * 2);
            this.drawText(`VIP等级: ${vip} 手续费: ${feeRate}`, 0, this.lineHeight() * 2, this.width - this.padding * 2);
            this.drawText(`当前时间: ${time}`, 0, this.lineHeight() * 3, this.width - this.padding * 2);
        }
    }

    // 新窗口类: 股票列表窗口
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

    // 新窗口类: 操作结果/查询消息窗口（修复核心 bug）
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
            // 动态修复 textPadding 如果丢失
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

    // 新窗口类: 数字输入窗口
    class Window_StockNumberInput extends Window_NumberInput {
        initialize(rect) {
            super.initialize(rect);
            this._prompt = '';
            this._maxDigits = 10;  // 新增：设置最大位数（默认10位，防止 undefined 错误）
            this._number = 0;  // 初始化数字为0
            this.updatePlacement();
        }

        setMessageText(prompt) {
            this._prompt = prompt || '请输入:';
            this.refresh();
        }

        refresh() {
            this.contents.clear();
            // 先绘制提示（在上方）
            this.drawText(this._prompt, 0, 0, this.width - this.padding * 2);
            // 然后绘制数字（下方，留出空间）
            const y = this.lineHeight();  // 提示下方一行
            const digits = this._number > 0 ? this._number.toString() : '0';  // 显示0或数字，无空格填充
            this.changeTextColor(ColorManager.normalColor());
            this.contents.paintOpacity = 255;  // 确保不透明
            this.contents.fontSize = 28;  // 加大字体，便于可见
            this.contents.fontBold = true;  // 加粗
            this.drawText(digits, 0, y, this.width - this.padding * 2, 'center');  // 手动绘制数字
            this.resetFontSettings();  // 重置字体
        }

        start() {
            this._number = 0;  // 重置为0
            this.refresh();  // 刷新显示
            this.show();
            super.start();  // MZ 原生 start() 会处理输入
            this.activate();
        }

        processDigit(digit) {
            if (this._number.toString().length < this._maxDigits) {
                this._number = this._number * 10 + digit;
                SoundManager.playCursor();  // 输入音效反馈
                this.refresh();  // 每次输入刷新
            }
        }

        processBack() {
            this._number = Math.floor(this._number / 10);
            SoundManager.playCancel();  // 退格音效
            this.refresh();
        }

        number() {
            return this._number;
        }

        updatePlacement() {
            // 默认居中
            this.x = (Graphics.boxWidth - this.width) / 2;
            this.y = (Graphics.boxHeight - this.height) / 2;
        }
    }

    // 新窗口类: 代码输入窗口 (3位)
    class Window_StockCodeInput extends Window_StockNumberInput {
        initialize(rect) {
            super.initialize(rect);
            this._maxDigits = 3;  // 固定3位
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
            super(rect);
            this._options = options || []; // 修复警告：默认空数组
            this._prompt = '';
            this.refresh();
        }

        setMessageText(prompt) {
            this._prompt = prompt || '';
            this.refresh();
        }

        makeCommandList() {
            if (!this._options || !Array.isArray(this._options)) {
                console.warn('Window_StockSelect: _options is undefined or not array, using empty array.');
                this._options = [];  // 强制默认
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

    // 新窗口类: 数字键盘窗口（鼠标支持）
    class Window_NumberPad extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this._inputWindow = null;
            this.refresh();
        }

        setInputWindow(inputWindow) {
            this._inputWindow = inputWindow;
        }

        maxCols() { return 3; }  // 3列 (0-9, Back, OK)

        maxItems() { return 12; }  // 0-9 + Back + OK

        drawItem(index) {
            const rect = this.itemRect(index);
            let text;
            if (index < 10) text = index.toString();
            else if (index === 10) text = 'Back';
            else text = 'OK';
            this.drawText(text, rect.x, rect.y, rect.width, 'center');
        }

        processOk() {
            const index = this.index();
            if (index < 10) {
                if (this._inputWindow) this._inputWindow.processDigit(index);
            } else if (index === 10) {
                if (this._inputWindow) this._inputWindow.processBack();
            } else {
                SoundManager.playOk();
                this.deactivate();
                this.callHandler('ok');
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
            this.createNumberPadWindow();  // 新增: 数字键盘
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
            this._selectWindow.deactivate();
            this._selectWindow.setHandler('ok', this.onSelectOk.bind(this));
            this._selectWindow.setHandler('cancel', this.onSelectCancel.bind(this));
            this._windowContainer.addChild(this._selectWindow);
        }

        createNumberPadWindow() {
            const rect = new Rectangle(padOffsetX, padOffsetY, padWidth, padHeight);  // 使用参数动态设置
            this._numberPadWindow = new Window_NumberPad(rect);
            this._numberPadWindow.setHandler('ok', this.onNumberPadOk.bind(this));  // OK 处理
            this._numberPadWindow.hide();
            this._windowContainer.addChild(this._numberPadWindow);
        }

        start() {
            super.start();
            esm_manager.esm_checkAndUpdatePrices();
            this._infoWindow.refresh();
            this._stockListWindow.refresh();
        }

        update() {
            super.update();
            if (Input.isTriggered('refresh')) {
                esm_manager.esm_checkAndUpdatePrices();
                this._infoWindow.refresh();
                this._stockListWindow.refresh();
            }
        }

        onAccount() {
            const commands = [
                { name: '存入现金', symbol: 'deposit' },
                { name: '取出现金', symbol: 'withdraw' },
                { name: '转入保证金', symbol: 'depositMargin' },
                { name: '转出保证金', symbol: 'withdrawMargin' }
            ];
            this.showSubCommand(commands, this.onAccountSub.bind(this));
        }

        onTrade() {
            const commands = [
                { name: '购买股票', symbol: 'buy' },
                { name: '出售股票', symbol: 'sell' },
                { name: '一键清仓', symbol: 'clear' }
            ];
            this.showSubCommand(commands, this.onTradeSub.bind(this));
        }

        onQuery() {
            const commands = [
                { name: '全部持仓', symbol: 'allHoldings' },
                { name: '个股持仓', symbol: 'singleHolding' },
                { name: '股票价格', symbol: 'stockPrice' },
                { name: '公司信息', symbol: 'companyInfo' },
                { name: '历史查询', symbol: 'history' },
                { name: '手续费率', symbol: 'feeRate' },
                { name: '持仓合约', symbol: 'positions' },
                { name: '个股合约', symbol: 'singlePosition' },
                { name: '资金费率', symbol: 'fundingRate' }
            ];
            this.showSubCommand(commands, this.onQuerySub.bind(this));
        }

        onContract() {
            const commands = [
                { name: '开多仓', symbol: 'openLong' },
                { name: '开空仓', symbol: 'openShort' },
                { name: '平仓', symbol: 'closePosition' },
                { name: '挂委托单', symbol: 'placeOrder' },
                { name: '取消委托', symbol: 'cancelOrder' },
                { name: '设置止盈', symbol: 'setTakeProfit' },
                { name: '设置费率', symbol: 'setFundingRate' }
            ];
            this.showSubCommand(commands, this.onContractSub.bind(this));
        }

        onUpdatePrice() {
            esm_manager.esm_execCommand('UpdatePrice');
            this._messageWindow.setText('价格已更新！');
            this._messageWindow.show();
            this._infoWindow.refresh();
            this._stockListWindow.refresh();
        }

        onCheckTimeUpdate() {
            esm_manager.esm_execCommand('CheckTimeUpdate');
            this._messageWindow.setText('时间检查完成！');
            this._messageWindow.show();
            this._infoWindow.refresh();
            this._stockListWindow.refresh();
        }

        onAccountSub() {
            const symbol = this._subCommandWindow.currentSymbol();
            this.onSubCancel();
            this._currentAction = symbol;
            this._inputValues = {};
            this.startNumberInput('请输入金额:', 'amount');
        }

        onTradeSub() {
            const symbol = this._subCommandWindow.currentSymbol();
            this.onSubCancel();
            if (symbol === 'clear') {
                esm_manager.esm_execCommand('ClearAllHoldings');
                this._messageWindow.setText('已清仓！');
                this._messageWindow.show();
                this._infoWindow.refresh();
            } else {
                this._currentAction = symbol;
                this._inputValues = {};
                this._stockListWindow.show();
                this._stockListWindow.activate();
            }
        }

        onQuerySub() {
            const symbol = this._subCommandWindow.currentSymbol();
            this.onSubCancel();
            this._currentAction = symbol;
            this._inputValues = {};
            if (symbol === 'allHoldings' || symbol === 'feeRate' || symbol === 'positions' || symbol === 'fundingRate') {
                const text = this.getQueryText(symbol);
                this._messageWindow.setText(text);
                this._messageWindow.show();
                this._commandWindow.activate();
            } else if (symbol === 'history') {
                this._stockListWindow.show();
                this._stockListWindow.activate();
            } else {
                this._stockListWindow.show();
                this._stockListWindow.activate();
            }
        }

        onContractSub() {
            const symbol = this._subCommandWindow.currentSymbol();
            this.onSubCancel();
            this._currentAction = symbol;
            this._inputValues = {};
            this._inputStep = 0;
            if (symbol === 'cancelOrder') {
                this.startNumberInput('请输入委托ID:', 'orderId');
            } else if (symbol === 'setFundingRate') {
                this.nextInputStep();  // 开始多步输入
            } else {
                this._stockListWindow.show();
                this._stockListWindow.activate();
            }
        }

        startNumberInput(prompt, key) {
            this._numberInputWindow.setMessageText(prompt);
            this._numberInputWindow.start();
            this._numberInputKey = key;
            // 显示数字键盘
            this._numberPadWindow.setInputWindow(this._numberInputWindow);
            this._numberPadWindow.show();
            this._numberPadWindow.activate();  // 鼠标点击数字
        }

        onNumberOk() {
            const value = this._numberInputWindow.number();
            const key = this._numberInputKey;
            const symbol = this._currentAction;
            if (value === 0) {
                if (symbol === 'sell') {
                    // 对于卖出，0=全部
                    this._inputValues[key] = 0;
                    this._numberInputWindow.hide();
                    this._numberInputWindow.deactivate();
                    this._numberPadWindow.hide();
                    this._numberPadWindow.deactivate();
                    this.nextInputStep();
                    return;
                } else if (symbol === 'buy' || symbol === 'deposit' || symbol === 'withdraw') {
                    this._messageWindow.setText(esm_messages.invalidAmount || '无效金额，请输入正数。');
                    this._messageWindow.show();
                    this._numberInputWindow.start(); // 重新输入
                    return;
                }
            }
            this._inputValues[key] = value;
            this._numberInputWindow.hide();
            this._numberInputWindow.deactivate();
            this._numberPadWindow.hide();
            this._numberPadWindow.deactivate();
            this.nextInputStep();  // 继续下一步或执行
        }

        onNumberCancel() {
            this._numberInputWindow.hide();
            this._numberInputWindow.deactivate();
            this._numberPadWindow.hide();
            this._numberPadWindow.deactivate();
            this._commandWindow.activate();
        }

        onNumberPadOk() {
            this.onNumberOk();  // 与键盘OK相同
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
            if (!options || options.length === 0) {
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
                        text = esm_messages.closePositionSuccess || '平仓成功！';
                        break;
                    case 'placeOrder':
                        const args = {
                            orderType: this._inputValues.orderType,
                            direction: this._inputValues.direction,
                            code: this._selectedCode,
                            quantity: this._inputValues.quantity,
                            price: this._inputValues.price || 0
                        };
                        esm_manager.esm_execCommand('PlaceOrder', args);
                        text = esm_messages.orderPlaced.replace('%1', this._inputValues.orderType) || '委托挂起！';
                        break;
                    case 'cancelOrder':
                        esm_manager.esm_execCommand('CancelOrder', { orderId: this._inputValues.orderId });
                        text = esm_messages.orderCancelled.replace('%1', this._inputValues.orderId) || '委托取消！';
                        break;
                    case 'setTakeProfit':
                        const tpArgs = {
                            code: this._selectedCode,
                            direction: this._inputValues.direction,
                            price: this._inputValues.price || 0
                        };
                        esm_manager.esm_execCommand('SetTakeProfit', tpArgs);
                        text = '止盈设置成功！';
                        break;
                    case 'setFundingRate':
                        esm_manager.esm_execCommand('SetFundingRate', { longRate: this._inputValues.longRate, shortRate: this._inputValues.shortRate });
                        text = esm_messages.fundingRateMsg || '资金费率设置成功！';
                        break;
                    case 'globalMarket':
                    case 'singleMarket':
                        const marketArgs = {
                            prob: this._inputValues.prob || 0,
                            upAmp: this._inputValues.upAmp || 0,
                            downAmp: this._inputValues.downAmp || 0,
                            durationYears: this._inputValues.durationYears || 0,
                            durationMonths: this._inputValues.durationMonths || 0,
                            durationDays: this._inputValues.durationDays || 1
                        };
                        if (symbol === 'singleMarket') marketArgs.code = this._selectedCode;
                        esm_manager.esm_execCommand(symbol.charAt(0).toUpperCase() + symbol.slice(1), marketArgs);
                        text = '行情设置成功！';
                        break;
                    case 'setSpecialTime':
                        const specialArgs = { identifier: this._inputValues.identifier, duration: this._inputValues.duration, affectedStocks: '["001"]' };  // 默认股票
                        esm_manager.esm_execCommand('SetSpecialTime', specialArgs);
                        text = '特殊事件设置成功！';
                        break;
                }
            } catch (e) {
                console.error('Scene_StockmarketWindow: executeAction failed', e);
                text = '操作失败: ' + e.message;
            }
            this._messageWindow.setText(text);
            this._messageWindow.show();
            this._infoWindow.refresh();
            this._stockListWindow.refresh();
            this._commandWindow.activate();
        }

        onStockSelect() {
            const stock = this._stockListWindow.currentStock();
            if (!stock) return;
            this._selectedCode = stock.code;
            $gameVariables.setValue(esm_contractInputCodeVar, parseInt(stock.code)); // 统一用 contractInputCodeVar，如果需要
            $gameVariables.setValue(esm_inputCodeVar, parseInt(stock.code));
            this._stockListWindow.hide();
            this._stockListWindow.deactivate();
            const symbol = this._currentAction;
            console.log('[Debug] Selected code:', this._selectedCode, 'Action:', symbol);  // 新增日志

            // 新增：检查营业时间
            if (!esm_manager.esm_isBusinessTime()) {
                this._messageWindow.setText(esm_messages.closedMessage || '休市，无法交易！');
                this._messageWindow.show();
                this._commandWindow.activate();
                return;
            }

            if (symbol === 'buy' || symbol === 'sell') {
                console.log('[Debug] Starting input for', symbol, ', code:', this._selectedCode);
                this.startNumberInput('请输入数量:', 'quantity');
            } else if (symbol === 'history') {
                this.startNumberInput('请输入天数:', 'days');
            } else if (symbol === 'singleHolding' || symbol === 'stockPrice' || symbol === 'companyInfo' || symbol === 'singlePosition') {
                let text = '';
                switch (symbol) {
                    case 'singleHolding':
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
                }
                this._messageWindow.setText(text);
                this._messageWindow.show();
                this._commandWindow.activate();
            } else {
                this.nextInputStep();
            }
        }

        onStockCancel() {
            this._stockListWindow.hide();
            this._stockListWindow.deactivate();
            this._commandWindow.activate();
        }

        showSubCommand(commands, handler) {
            this._subCommandWindow._commands = commands;
            this._subCommandWindow.refresh();
            this._subCommandWindow.show();
            this._subCommandWindow.activate();
            this._subCommandWindow.setHandler('ok', handler);
        }

        onSubOk() {
            // 由具体 handler 处理
        }

        onSubCancel() {
            this._subCommandWindow.hide();
            this._subCommandWindow.deactivate();
            this._commandWindow.activate();
        }

        getQueryText(type) {
            let text = '';
            switch (type) {
                case 'allHoldings':
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
                case 'feeRate':
                    const { vip, rate, percent } = esm_manager.esm_getCurrentFeeRate();
                    text = esm_messages.feeRateMsg.replace('%1', vip).replace('%2', rate).replace('%3', percent) || '当前VIP等级：0，手续费率：0.008 (即0.8%)。';
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

        getHistoryText(code, days) {
            const stock = esm_stockList.find(s => s.code === code);
            if (!stock) return esm_messages.stockNotFound || '股票代码不存在，查询为空。';
            days = Math.min(Number(days) || 1, esm_historyPeriods);
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
    }

    // 插件命令: 打开窗口
    PluginManager.registerCommand('Expand_Stockmarket_window', 'OpenStockWindow', () => {
        SceneManager.push(Scene_StockmarketWindow);
    });

    // 添加到主菜单
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