(function($) {
    /** 该版本上将拖拽配置的工删除
     * 图形基础拖入框 参数说明
     * 分为横向柱形图和纵向柱形图
     * @param  width        chart图宽度
     * @param  height       chart图高度
     * @param  ChartType    图形类别，为整型 0:折线图,1:柱状图,2:饼图,3:雷达图,4:漏斗图
     * @param  ShowTitle    是否显示标题
     * @param  DragDoneCallBack  配置报表所需回掉函数（调用插件是需要重写 ）    
     *    提供一个参数 {type:'',operate:'',mess:''} 
     *    type:返回消息类型，值如下(Series:系列,Categories:类别,Fields:字段,Error:错误)
     *    operate:为对应的操作，值如下(Add:新增，Edit:修改,Delete:删除)单击字段时返回Edit
     *    mess:消息内容，为字符串,当修改字段时mess为所需要修改的字段
     *    例如：{type:'Series'}  表示拖拽配置的为系列 {type:'Error',mess:'xxxxxx'}返回的数据格式错误等
     *    回掉函数返回的数据类型:{ Series:[{Name:'',Data:''}],Categories:[],Fields:[{Code:'',DisplayName:''}],}
     *    配置字段时需要返回Fields的值
     *    例如：{
     *               Fields:[],//配置的时候需要配置该参数，显示的时候不需要配置该参数
     *               Categories: ['Jim', 'Lucy', 'Lily', 'Adele', 'Novak'],
     *               Series = [{
     *                   'Name': '语文',
     *                   'Data': [88, 56, 78, 34, 99],
     *                   'Code':'xxxx'
     *                }, {
     *                   'Name': '数学',
     *                   'Data': [20, 78, 45, 89, 22],
     *                   'Code':'xxxx'
     *                }, {
     *                   'Name': '英语',
     *                   'Data': [50, 87, 56, 45, 67],
     *                   'Code':'xxxx'
     *                }];
     *           }
     *@param ClickChartCBack 回掉函数，用于点击图表所执行的回调，需要重写
     *    提供一个参数 {'Name':'','Data':'','Category':'','CateCode':'','SeriesCode':''} 
     *    Name:点击图表字段名
     *    Data:点击图表数值
     *    Category:点击图标系列
     *    CateCode:类别Code
     *    SeriesCode:系列Code
     *    例如：{'Name':'语文','Data':'78',Category:'jim'}
     */


    const ChartText = ['折线图', '柱状图', '饼图', '雷达图', '漏斗图'];
    const ChartType = {
        Line: 0,
        Bar: 1,
        Pie: 2,
        Radar: 3,
        Funnel: 4
    };
    const DefaultOption = {
        ChartType: 1,
        Width: 400,
        Height: 300,
        ShowSeries: true,
        setCfg: true, //是否是配置模式
        SetField: false,
        ShowDemo: false,
        Colors: ['#69A8E8', '#82B986', '#F4D67C', '#F07F77', '#6BD6E9', '#F5769D', '#F2D39E', '#C6ABF2', '#F8B892', '#CB9E9E', '#C888D4', '#9EC66F', '#D288A7', '#88B0B6', '#94CAB1', '#BCBCE4', '#7185B9', '#FFC973', '#95D1E7', '#CAC4B3']
    };
    const colorLen = DefaultOption.Colors.length;

    // let DefaultData = {};
    /**
     * 
     * @param {object} opt 配置参数
     * @param {element} BaseWrap 图标最外层容器 
     */
    function ChartBase(opt, BaseWrap) {
        this.opt = $.extend({}, DefaultOption, opt);

        let that = this;
        //接收的参数汇总
        that.ReportWidget = {
            Series: that.opt.Series || [],
            ShowSeries: that.opt.ShowSeries,
            Categories: [], //类别，即柱状图的横坐标文字描述
            CateCodes: {},
            Fields: [],
            ShowDemo: that.opt.ShowDemo,
            IgnoreSeries: [],
            SeriesColor: that.opt.Colors,
            SeriesIndex: 0, //显示的是第几页的数据，从0开始，只作用于小屏幕的移动端
            SeriesCount: that.opt.Series && Math.ceil(that.opt.Series.length / 10)
        };

        //传给图表插件数据整合
        that.DisplayData = {
            Width: 400,
            Height: 300,
            Max: 0,
            Min: Number.MIN_VALUE,
            Categories: [],
            CateCodes: {},
            CateLength: 6,
            Colors: [],
            Series: [],
            ClickChartCBack: function(ret) {
                that.opt.ClickChartCBack && that.opt.ClickChartCBack(ret);
            },
            BarGap: 20,
            ChartType: ''
        };

        that.BaseWrap = BaseWrap || $('body');

        that.init();
    }

    ChartBase.prototype = {
        init: function() {
            var htmls = ['<div class="BaseChartWrapOuter"></div>',
                '<div class="BaseChartTitle"></div>',
                '<div class="BaseChartChart"></div>',
                '<div class="BaseChartCategories"></div>',
                '<div class="BaseChartSeries">' +
                '<div class="BaseChartLengend">' +
                '<div class="SeriesUL">' +
                '<a class="bar_all bar_all_up bar-animate" data-type="show" title="点击展示或隐藏部分系列"><i class="chart-arrow"></i></a>' +
                '<a class="bar_all bar_all_up bar_all_left" data-type="left" title="上一页"><i class="chart-arrow"></i></a>' +
                '<a class="bar_all bar_all_up bar_all_right" data-type="right" title="下一页"><i class="chart-arrow"></i></a>' +
                '</div>' +
                '</div>' +
                '</div>',
                '<div class="BaseChartField"></div>',
                '<div class="BaseChartFieldSet clearfix"></div>'
            ];

            this.IsMobile = isMobile();
            this.$Wrap = $(htmls[0]); //最外层容器
            this.$Title = $(htmls[1]); //图形标题栏
            this.$Title.text(ChartText[this.opt.ChartType]);
            this.$Chart = $(htmls[2]); //图标canvas容器
            this.$Categories = $(htmls[3]); //类别容器，目前是隐藏的，算法修改所有的类别直接绘制在canvas上面
            this.$Series = $(htmls[4]); //系列可点击方形按钮最外层容器
            this.$Fields = $(htmls[5]); //this.Chart的容器
            this.$FieldSet = $(htmls[6]); //未知
            this.$SeriesUL = this.$Series.find('.SeriesUL'); //系列列表
            this.$SeriesLeft = this.$Series.find(".bar_all_left"); //系列上一页
            this.$SeriesRight = this.$Series.find(".bar_all_right"); //系列下一页
            this.$Up = this.$Series.find('.bar-animate'); //展开收缩按钮

            this.$Wrap.css({
                width: this.opt.Width,
                height: this.opt.Height
            });
            this.DemoText = $("<i class='demotext'>样例数据</i>").appendTo(this.$Wrap);

            this.IsMobile && (this.ReportWidget.SeriesCount > 1 && this.$SeriesRight.show());

            this.TitleHeight = 35;

            this.DragPlaceHeight = 30;
            this.$Series.addClass("showChart");

            this.dragContain = $(this.opt.dragContain);

            //处理Categories将其拆分为Categories和CateCodes
            if (this.opt.Categories && this.opt.Categories.length > 0) {
                let isObj = Object.prototype.toString.call(this.opt.Categories[0]) === "[object Object]";
                for (let k = 0, len = this.opt.Categories.length; k < len; k++) {
                    let item = this.opt.Categories[k];
                    if (isObj) {
                        this.ReportWidget.Categories.push(item["value"]);
                        this.ReportWidget.CateCodes[item["value"]] = item["key"];
                    } else {
                        this.ReportWidget.Categories.push(item);
                        this.ReportWidget.CateCodes[item] = item;
                    }
                }
            }
            //确定图表类型对应的构造函数名
            // this.DisplayData.ChartType = ChartTypeE[this.opt.ChartType];
            //计算可绘制区域剩余的高度 = 总高度 - 系列栏高度 - 图形title的高度
            this.DisplayData.Height = this.opt.Height - this.DragPlaceHeight - (this.opt.ShowTitle ? this.TitleHeight : 0);
            this.$Fields.height(this.DisplayData.Height);
            this.$Fields.append(this.$Chart).append(this.$FieldSet);

            this.DisplayData.Width = this.opt.Width;
            this.opt.ShowTitle && this.$Wrap.append(this.$Title);
            this.BaseWrap.append(this.$Wrap.append(this.$Fields).append(this.$Categories).append(this.$Series));
            this.fillText();
            this.bind();
            this.drawChart();
        },

        //拆分Categories为Categories和CateCodes
        doRetData: function(data) {
            if (data === void 0) return;
            let Cates = data.Categories;
            $.extend(this.ReportWidget, data);
            if (Cates) {
                if (typeof Cates[0] === "object") {
                    this.ReportWidget.Categories = [];
                }
                for (let k = 0; k < Cates.length; k++) {
                    let item = Cates[k];
                    if (item && item['key'] && item['value']) {
                        this.ReportWidget.Categories.push(item["value"]);
                        this.ReportWidget.CateCodes[item["value"]] = item["key"];
                    } else {
                        break;
                    }
                }
            }
        },
        bind: function() {
            let that = this;
            that.$Wrap.on('click', '.SeriesLi', function() {
                that.TimeOut && window.clearTimeout(that.TimeOut);
                that.TimeOut = null;
                let cItem = $($(this).find('i')[0]);
                let isGray = cItem.attr('data-gray');
                let text = $(this).text();
                if (isGray === '1') {
                    cItem.css('background-color', cItem.attr('data-c'));
                    $(this).css("color", "#333");
                    that.ReportWidget.IgnoreSeries.splice(that.ReportWidget.IgnoreSeries.indexOf(text), 1);
                } else {
                    cItem.css('background-color', "#aaa");
                    $(this).css("color", "#aaa");
                    that.ReportWidget.IgnoreSeries.push(text);
                }
                cItem.attr('data-gray', isGray === "1" ? '0' : '1');
                that.TimeOut = window.setTimeout(function() {
                    that.drawChart.call(that);
                }, 400);

                return false;
            });

            if (isMobile()) {
                that.$SeriesUL.find(".SeriesLi").each(function() {
                    $(this).tabM(function(e) {
                        that.TimeOut && window.clearTimeout(that.TimeOut);
                        that.TimeOut = null;
                        let tar = $(e.target);

                        let cItem, text, cLi;
                        if (tar.hasClass('SeriesLi')) {
                            cItem = $(tar.find('i')[0]);
                            cLi = tar;
                            text = tar.text();
                        } else {
                            cItem = tar;
                            cLi = tar.parent('.SeriesLi');
                            text = cLi.text();
                        }

                        let isGray = cItem.attr('data-gray');
                        if (isGray === '1') {
                            cItem.css('background-color', cItem.attr('data-c'));
                            cLi.css("color", "#333");
                            that.ReportWidget.IgnoreSeries.splice(that.ReportWidget.IgnoreSeries.indexOf(text), 1);
                        } else {
                            cItem.css('background-color', "#aaa");
                            cLi.css("color", "#aaa");
                            that.ReportWidget.IgnoreSeries.push(text);
                        }
                        cItem.attr('data-gray', isGray === "1" ? '0' : '1');
                        that.TimeOut = window.setTimeout(function() {
                            that.drawChart.call(that);
                        }, 600);
                    });
                });
            } else {

            }
        },
        //构建系列栏内容
        fillText: function() {
            let that = this;
            let colorLen = that.opt.Colors.length;
            //生成系列可点击小方形色块
            if ($.isArray(this.ReportWidget.Series) && this.ReportWidget.Series.length > 0) {
                this.$Series.children('span:eq(0)').remove();
                let $wrap = $("<div id='wrapUl0' class='wrapUl'>");
                this.$SeriesUL.append($wrap);
                //每10条为一页
                this.ReportWidget.Series.forEach((val, index) => {
                    if (index % 10 == 0 && index != 0) {
                        $wrap = $(`<div id="wrapUl${index / 10}" class="wrapUl">`).appendTo(this.$SeriesUL);
                        this.IsMobile && $wrap.hide();
                    }
                    $wrap.append(`<span class="SeriesLi"><i data-c="${this.opt.Colors[index % colorLen]}" data-gray="0" style="background-color:${this.opt.Colors[index % colorLen]}"></i>${val['Name']}</span>`);
                });
            }

            this.$Categories.hide();

            let height = this.$SeriesUL.height();
            //给系列交互绑定相应的事件
            if (height > 33) {
                let that = this;
                that.$Up.show();
                that.$Wrap.on('click', '.bar_all', function(event) {
                    event.preventDefault();
                    let type = $(this).attr('data-type');
                    switch (type) {
                        case 'show':
                            {
                                $(this).attr('data-type', 'hide');
                                $(this).removeClass("bar_all_up").addClass("bar_all_down");
                                that.$SeriesUL.css({
                                    top: 30 - height
                                });
                                that.$SeriesUL.css("z-index", 11000);
                            }
                            break;
                        case 'hide':
                            {
                                $(this).attr('data-type', 'show');
                                $(this).removeClass("bar_all_down").addClass("bar_all_up");
                                that.$SeriesUL.css({
                                    top: 0
                                });
                                that.$SeriesUL.css("z-index", 0);
                            }
                            break;
                        case 'left':
                            {
                                that.ReportWidget.SeriesIndex--;
                                that.ReportWidget.SeriesIndex == 0 && $(this).hide();
                                that.$SeriesRight.show();
                                that.drawChart.call(that);
                                that.$SeriesUL.find(".wrapUl").hide().end().find("#wrapUl" + that.ReportWidget.SeriesIndex).show();
                                height = that.$SeriesUL.height();
                                height <= 30 ? (that.$SeriesUL.find(".bar-animate").hide()) : (that.$SeriesUL.find(".bar-animate").show());
                                that.$SeriesUL.css({
                                    top: 30 - height
                                });
                            }
                            break;
                        case 'right':
                            {
                                that.ReportWidget.SeriesIndex++;
                                that.ReportWidget.SeriesIndex == that.ReportWidget.SeriesCount - 1 && $(this).hide();
                                that.$SeriesLeft.show();
                                that.drawChart.call(that);
                                that.$SeriesUL.find(".wrapUl").hide().end().find("#wrapUl" + that.ReportWidget.SeriesIndex).show();
                                height = that.$SeriesUL.height();
                                height <= 30 ? (that.$SeriesUL.find(".bar-animate").hide()) : (that.$SeriesUL.find(".bar-animate").show());
                                that.$SeriesUL.css({
                                    top: 30 - height
                                });
                            }
                            break;
                    }
                    return false;
                });
            }
        },

        //格式化数据，将数据调整为图表支持的数据类型
        ForMatData: function() {
            let reportWidget = this.ReportWidget,
                data = this.DisplayData;
            data.Max = 0;
            data.Colors = [];
            data.Series = [];
            data.FullMode = reportWidget.ShowSeries;
            data.Categories = reportWidget.Categories;
            data.CateCodes = reportWidget.CateCodes;
            let seCount = reportWidget.Series.length;
            if (seCount > 0) {
                data.CateLength = reportWidget.Series[0].Data.length;
            }

            let startIndex = 0,
                endIndex = seCount;

            this.IsMobile && (startIndex = reportWidget.SeriesIndex * 10,
                endIndex = (Math.ceil(seCount / 10) - 1) > reportWidget.SeriesIndex ? (reportWidget.SeriesIndex + 1) * 10 : seCount);

            //剔除用户手动去掉的系列
            if (reportWidget.IgnoreSeries.length > 0) {
                for (let j = startIndex; j < endIndex; j++) {
                    let kk = reportWidget.Series[j];
                    if (reportWidget.IgnoreSeries.indexOf(String(kk['Name'])) < 0) {
                        data.Series.push(kk);
                        data.Colors.push(reportWidget.SeriesColor[j % colorLen]);
                    }
                }
            } else {
                if (this.IsMobile) {
                    for (let j = startIndex; j < endIndex; j++) {
                        data.Series.push(reportWidget.Series[j]);
                        data.Colors.push(reportWidget.SeriesColor[j % colorLen]);
                    }
                } else {
                    data.Series = reportWidget.Series;
                    data.Colors = reportWidget.SeriesColor;
                }
            }

            //计算数据的最大值和最小值
            for (let i = 0, len = data.Series.length; i < len; i++) {
                if (data.Series[i].Data == void 0 || data.Series[i].Data.length == 0) return false;
                let Max = data.Series[i].Data ? Math.max.apply(null, data.Series[i].Data) : 0;
                let Min = data.Series[i].Data ? Math.min.apply(null, data.Series[i].Data) : 0;

                if ($.isNumeric(Max)) {
                    data.Max = Math.max(data.Max, Max);
                    data.Min = Math.min(data.Min, Min);
                } else {
                    // alert("数据格式错误!");
                    return false;
                }
            }
            if (data.Series.length > 0 && data.Min <= 0) {
                if (data.Min <= 0) {
                    data.Min -= Math.abs(data.Min) / 10;
                } else {
                    data.Min = 0;
                }
            }

            return true;
        },

        //将图表数据修改为默认的示例数据
        resetChartData: function() {
            let data = this.DisplayData;
            data.Max = 90;
            data.Min = 10;
            data.CateCodes = {};
            data.FullMode = true;
            data.Colors = ['#69A8E8', '#82B986', '#F4D67C', '#F07F77', '#F5769D', '#6BD6E9', '#F2D39E', '#C6ABF2'];
            if (this.opt.ChartType == ChartType.Radar) {
                data.Categories = ['类别1', '类别2', '类别3', '类别4', '类别5', '类别6', '类别7'];
                data.CateLength = 7;
                data.Series = [{
                    'Name': '系列1',
                    'Data': [90, 20, 60, 40, 80, 66, 45]
                }, {
                    'Name': '系列2',
                    'Data': [40, 80, 55, 76, 33, 45, 78]
                }, {
                    'Name': '系列3',
                    'Data': [10, 24, 33, 54, 58, 45, 66]
                }];
            } else if (this.opt.ChartType == ChartType.Funnel) {
                data.Categories = ['分类1'];
                data.CateLength = 1;
                data.Series = [{
                    'Name': '系列1',
                    'Data': [10]
                }, {
                    'Name': '系列2',
                    'Data': [20]
                }, {
                    'Name': '系列3',
                    'Data': [40]
                }, {
                    'Name': '系列4',
                    'Data': [66]
                }, {
                    'Name': '系列5',
                    'Data': [75]
                }, {
                    'Name': '系列6',
                    'Data': [90]
                }];
            } else {
                data.CateLength = 3;
                data.Categories = ['分类1', '分类2', '分类3'];
                data.Series = [{
                    'Name': '系列1',
                    'Data': [90, 10, 71]
                }, {
                    'Name': '系列2',
                    'Data': [70, 50, 90]
                }, {
                    'Name': '系列3',
                    'Data': [46, 88, 28]
                }];
            }
        },
        //用于数据拖拽完成后显示图表
        drawChart: function() {
            let that = this;
            that.doRetData(that.ReportWidget);

            if (that.ReportWidget.Categories && that.ReportWidget.Categories.length > 0 && that.ReportWidget.Series && that.ReportWidget.Series.length > 0 && that.ReportWidget.Series[0].Data) {
                let bool = that.ForMatData();
                bool === false && that.resetChartData();
            } else {
                this.resetChartData();
                console.log('显示默认图表');
            }

            that.ReportWidget.ShowDemo ? that.DemoText.show() : that.DemoText.hide();

            let ChartFun = null;
            switch (that.opt.ChartType) {
                case ChartType.Line: //折线图
                    {
                        ChartFun = that.$Chart.Chart().Line;
                    }
                    break;
                case ChartType.Bar: //柱状图
                    {
                        ChartFun = that.$Chart.Chart().Bar;
                    }
                    break;
                case ChartType.Pie: //饼图
                    {
                        ChartFun = that.$Chart.Chart().Pie;
                    }
                    break;
                case ChartType.Radar: //雷达图
                    {
                        ChartFun = that.$Chart.Chart().Radar;
                    }
                    break;
                case ChartType.Funnel: //漏斗图
                    {
                        ChartFun = that.$Chart.Chart().Funnel;
                    }
                    break;
            }
            if (that.Charting) {
                that.Charting.Refresh(that.DisplayData);
                delete that.Charting;
            }
            that.Charting = ChartFun(that.DisplayData);
        },
        clear: function() {
            let that = this;
            $(document).unbind("mousemove.chartbase");
            that.DisplayData = null;
        }
    };

    $.fn.ChartBase = function(opt) {
        return new ChartBase(opt, this);
    };

    function isMobile() {
        if ((navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i))) {
            return true;
        }
        return false;
    }

    $.fn.tabM = function(fn) {
        this[0].addEventListener('touchstart', function(e) {
            $(this).data('start', e);
            $(this).data('end', null);
        }, false);

        this[0].addEventListener('touchmove', function(e) {
            $(this).data('end', e);
        }, false);

        this[0].addEventListener('touchend', function(event) {
            let s = $(this).data('start');
            let se = s.touches[0];
            let e = $(this).data('end');
            let ee = e && e.touches[0];
            if (se) {
                let tar = se.target.tagName.toUpperCase();
                if (tar !== 'SPAN' && tar !== 'I') {
                    return;
                }
                if (ee) {
                    if (Math.abs(se.pageX - ee.pageX) < 10 && Math.abs(se.pageY - ee.pageY) < 10) {
                        fn && fn(se);
                        event.preventDefault();
                        event.stopPropagation();
                    }
                } else {
                    fn && fn(se);
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        });
    };
}(window.jQuery || window.Zepto));