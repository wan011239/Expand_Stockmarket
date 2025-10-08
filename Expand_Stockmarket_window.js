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

    // 新窗口类: 信息显示窗口（保留）
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
            this.drawText(`账户余额: ${account} 金币`, 0, 0, this.width - this.padding * 2, 'center');
            this.drawText(`保证金: ${margin} 金币`, 0, this.lineHeight(), this.width - this.padding * 2, 'center');
            this.drawText(`VIP等级: ${vip} 手续费: ${feeRate}`, 0, this.lineHeight() * 2, this.width - this.padding * 2, 'center');
            this.drawText(`当前时间: ${time} ${weekDay}`, 0, this.lineHeight() * 3, this.width - this.padding * 2, 'center');
        }
    }

    // 新窗口类: 股票列表窗口（保留，用于个股查询）
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
            $gameVariables.setValue(esm_contractInputCodeVar, parseInt(stock.code));
            $gameVariables.setValue(esm_inputCodeVar, parseInt(stock.code));
            this._stockListWindow.hide();
            this._stockListWindow.deactivate();
            const symbol = this._currentAction;

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

        // 修改：简化 nextInputStep 和 executeAction，只处理查询相关（历史查询需要天数）
        nextInputStep() {
            const symbol = this._currentAction;
            if (!this._inputValues) this._inputValues = {};
            this._inputStep = this._inputStep || 0;
            this._inputStep++;
            switch (this._inputStep) {
                default:
                    this.executeAction();
            }
        }

        executeAction() {
            const symbol = this._currentAction;
            let text = '';
            try {
                // 移除历史查询相关
            } catch (e) {
                console.error('Scene_StockmarketWindow: executeAction failed', e);
                text = '操作失败: ' + e.message;
            }
            this._queryListWindow.deactivate();  // 停用查询列表
            this._messageWindow.setText(text);
            this._messageWindow.show();
            this._messageWindow.activate();
            this._messageWindow.select(0);
            this._infoWindow.refresh();
            this._stockListWindow.refresh();
        }

        // 保留：查询文本获取函数
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

    // 插件命令: 打开窗口（保留）
    PluginManager.registerCommand('Expand_Stockmarket_window', 'OpenStockWindow', () => {
        SceneManager.push(Scene_StockmarketWindow);
    });

    // 添加到主菜单（保留，如果启用）
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
