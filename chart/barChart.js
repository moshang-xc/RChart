/**
 * 柱行图
 */
import {
    drawBackGrid,
    bitwise,
    sliderBar,
    HideSec
} from './lib.js';

let Bar = function(opt = {}, target = $('body')) {
    this.opt = opt;
    this.$outer = target;
    this.setDefault();
    this.init();
};

Bar.prototype = {
    constructor: Bar,
    setDefault: function() {
        this.$outer.html('');
        this.$wrap = $(`<div class="LineChartWrap" style="width: ${this.opt.Width}px; height: ${this.opt.Height}px;"></div>`);
        this.$ToolTip = $('<div class="ChartToolTip"><div class="TipName"></div><div class="TipData"></div></div>');
        this.$TipName = this.$ToolTip.find('.TipName');
        this.$TipData = this.$ToolTip.find('.TipData');
        this.$ToolTipWrap = $('<div class="ChartToolTopWrap"></div>').append(this.$ToolTip);

        this.padding = 12;
        this.CanWidth = this.opt.Width - 2 * this.padding;
        this.progress = 0;
        this.opt.CateLength = this.opt.Categories ? this.opt.Categories.length : 0;
        this.img = 0;
        this.radius = 8;
        this.LineWidth = 1;
        this.fontSize = 12;
        //柱子最小宽度
        this.barMinWidth = this.opt.IsMobile ? 15 : 10;
        this.showLength = this.opt.CateLength;
        this.showIndex = 0;

        //根据柱行的最小宽度确定一页最多展示几条数据
        let w = this.opt.Width / (this.opt.Series.length + 1),
            perW = w / this.showLength;

        while (this.barMinWidth > perW && this.showLength > 1) {
            perW = w / --this.showLength;
        }

        this.range = this.opt.CateLength - this.showLength;
        this.opt.Series.length == 1 && (perW = perW / 2);
        this.BarGap = perW;
        w = this.BarGap / this.opt.Series.length / 2;
        this.BarMargin = perW / 5;

        this.ColorLen = this.opt.Colors.length;
        this.HasBind = false;
    },
    init: function() {
        if (this.opt.Width == 0 || this.opt.Height == 0)
            return;

        this.canvasF = document.createElement('canvas');
        this.canvasBack = document.createElement('canvas');
        this.canvasF.className = this.canvasBack.className = 'LineChartCanvas';
        this.cacheF = document.createElement('canvas');
        this.$wrap.append(this.canvasBack).append(this.canvasF).append(this.$ToolTipWrap);
        if (typeof window.G_vmlCanvasManager != "undefined") {
            this.canvasF = window.G_vmlCanvasManager.initElement(this.canvasF);
        }

        this.cxtF = this.canvasF.getContext('2d');
        this.cxtBack = this.canvasBack.getContext("2d");
        this.cacheCxt = this.cacheF.getContext("2d");
        this.canvasF.width = this.canvasBack.width = this.opt.Width;
        this.canvasF.height = this.canvasBack.height = this.opt.Height;

        //不同终端提供清晰的图表
        if (window.devicePixelRatio) {
            this.canvasF.style.width = this.cacheF.style.width = this.canvasBack.style.width = this.opt.Width + "px";
            this.canvasF.style.height = this.cacheF.style.height = this.canvasBack.style.height = this.opt.Height + "px";
            this.canvasF.height = this.cacheF.height = this.canvasBack.height = this.opt.Height * window.devicePixelRatio;
            this.canvasF.width = this.cacheF.width = this.canvasBack.width = this.opt.Width * window.devicePixelRatio;
            this.cxtF.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.cxtBack.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.cacheCxt.scale(window.devicePixelRatio, window.devicePixelRatio);
        }

        if (this.opt.Series.length == 0 || this.opt.Categories.length == 0) {
            return;
        }

        //绘制坐标轴
        drawBackGrid(this);

        if (!this.opt.IsMobile && this.showLength < this.opt.CateLength) {
            this.ScrollStep = this.opt.CateLength - this.showLength + 1;
            this.$ScrollWrap = $('<div class="ChartScrollWrap"></div>');
            this.$ScrollWrap.css({
                "top": this.opt.Height - 4,
                "left": this.Axis.yLabelWidth
            }).width(this.opt.Width - this.Axis.yLabelWidth - this.padding);

            let t = this.showIndex + this.showLength,
                ww, i;
            for (i = 1; i <= this.ScrollStep; i++) {
                ww = (i / this.ScrollStep * 100).toFixed(2) + "%";
                this.$ScrollWrap.append("<i class='BarTip' style='left:" + ww + "' data-text='" + this.opt.Categories[t + i - 2] + "'></i>");
            }

            ww = (1 / this.ScrollStep * 100).toFixed(2) + "%";
            this.ScrollBar = $('<div class="ChartScrollBar"></div>').width(ww).appendTo(this.$ScrollWrap);
            this.ScrollIcon = $('<i class="BarIcon"></i>').css("left", ww).appendTo(this.$ScrollWrap);
            this.$ScrollWrap.appendTo(this.$wrap);
        }

        this.animateData();

        this.$wrap.appendTo(this.$outer);
    },
    Slider: function() {
        drawBackGrid(this);
        this.progress = 100;
        this.HasBind = true;
        this.drawLine();
    },
    formatData: function() {
        let that = this,
            xWidth = that.Axis.xLabelWidth,
            yWidth = that.Axis.yLabelWidth,
            min = that.opt.Min,
            max = that.opt.Max,
            cateW = xWidth - that.BarGap,
            itemW = bitwise(cateW / that.opt.Series.length),
            range = that.showIndex + that.showLength;

        that.DrawData = [];
        that.TextPos = [];
        that.BarWidth = itemW;

        if (that.opt.Series.length === 0) {
            return;
        }

        $.each(that.opt.Series, function(index, item) {
            let drawData = [];
            $.each(item.Data, function(i, v) {
                if (i < that.showIndex || i >= range) {
                    return true;
                }

                let val = parseFloat(v),
                    aPoint = {},
                    ind = i - that.showIndex;

                aPoint.tX = bitwise(yWidth + itemW * index + 0.5 * that.BarGap + xWidth * ind);
                aPoint.H = bitwise((val - min) / (max - min) * that.DrawHeight);
                aPoint.tY = bitwise(that.Axis.endPoint - aPoint.H);
                aPoint.W = itemW;
                aPoint.Name = item.Name;
                aPoint.Data = val;
                aPoint.OriginalData = v;
                aPoint.Category = that.opt.Categories[i];
                aPoint.SeriesCode = item.Code;
                aPoint.Category && (aPoint.CateCode = that.opt.CateCodes[aPoint.Category]);

                drawData.push(aPoint);
                index === 0 && that.TextPos.push(bitwise(yWidth + (ind + 0.5) * xWidth));
            });
            that.DrawData.push(drawData);
        });
        that.cxtF.font = '12px Microsoft YaHei';
    },
    //绘制数据内容
    drawLine: function() {
        var that = this;
        if (that.progress > 100) {
            that.cacheCxt.clearRect(0, 0, this.canvasF.width, this.canvasF.height);
            if (that.opt.IsMobile) {
                that.cxtF.textAlign = "center";
                that.cxtF.font = "12px Arial";
                var numW = that.cxtF.measureText("0.12345678").width / 10;
                var maxN = Math.round(that.BarWidth / numW);
                maxN = maxN > 0 ? maxN : 1;
                var w = that.BarWidth / 2;
                //画数值
                $.each(that.DrawData, function(j, item) {
                    that.cxtF.save();
                    that.cxtF.fillStyle = that.opt.Colors[j % that.ColorLen];
                    $.each(item, function(index, p) {
                        var text = p.Data + "";
                        text = text.length > maxN ? (maxN > 2 ? text.substr(0, maxN - 2) + '..' : text.substr(0, maxN) + '..') : text;
                        that.cxtF.fillText(text, bitwise(p.tX + w), bitwise(p.tY - 2));
                    });
                    that.cxtF.restore();
                });
            }

            that.cacheCxt.drawImage(that.canvasF, 0, 0, that.opt.Width, that.opt.Height);
            that.HasBind === false && that.bind();
            return;
        }

        that.cxtF.clearRect(0, 0, this.canvasF.width, this.canvasF.height);
        // 画内部多边形
        $.each(that.DrawData, function(j, item) {
            that.cxtF.save();
            //绘制线段
            that.cxtF.fillStyle = that.opt.Colors[j % that.ColorLen];
            $.each(item, function(index, p) {
                var h = p.H;
                that.cxtF.beginPath();
                that.cxtF.moveTo(p.tX, p.tY);
                that.cxtF.fillRect(bitwise(p.tX + that.BarMargin / 2), bitwise(p.tY + h * (1 - that.progress / 100)), p.W - that.BarMargin, bitwise(h * that.progress / 100));
            });
            that.cxtF.restore();
        });

        var tip = (101 - that.progress) / 8;
        tip = tip == 0 ? 1 : tip;
        that.progress += tip;
        that.AnimationID = requestAnimationFrame(function() {
            that.drawLine.call(that);
        });
    },
    animateData: function() {
        var that = this;
        that.opt.IsMobile ? that.progress = 100 : that.progress = 0;
        that.drawLine();
    },
    bind: function() {
        var that = this;

        if (that.showLength < that.opt.CateLength && that.HasBind == false) {
            new sliderBar(that);
        }

        that.HasBind = true;

        var tar = {};
        if (!that.opt.IsMobile) {
            that.$ToolTipWrap.unbind("mousemove.chart").bind("mousemove.chart", function(e) {
                that.cxtF.clearRect(0, 0, that.opt.Width, that.opt.Height);
                that.cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);

                var offset = $(this).offset();
                var point = {
                    x: e.pageX - offset.left,
                    y: e.pageY - offset.top
                };

                var index = Math.floor((point.x - that.Axis.yLabelWidth) / that.Axis.xLabelWidth);

                var w = (point.x - that.Axis.yLabelWidth) % that.Axis.xLabelWidth - that.BarGap / 2;
                var itemW = (that.Axis.xLabelWidth - that.BarGap) / that.opt.Series.length;
                var ind = Math.floor(w / itemW);

                if (index >= that.opt.CateLength || index < 0 || ind < 0 || ind >= that.opt.Series.length) return;
                tar = that.DrawData[ind][index];

                //画线

                that.cxtF.save();
                that.cxtF.globalAlpha = 0.3;
                that.cxtF.fillStyle = "#A3CBF2";

                that.cxtF.fillRect(bitwise(that.Axis.yLabelWidth + that.BarWidth * ind + 0.5 * that.BarGap + that.Axis.xLabelWidth * index), that.padding, that.BarWidth, that.DrawHeight);
                that.cxtF.restore();

                that.$TipData.html("");
                var cate = "";
                that.$TipData.append("<div style='color:#fff'>" + tar.Name + ':' + tar.OriginalData + "</div>");

                //悬浮层显示
                that.$TipName.text(tar.Category);
                var off = $(this).offset();
                var top = point.y > (that.opt.Height / 2) ? point.y - 70 : point.y;
                if (point.x < that.opt.Width / 2) {
                    that.$ToolTip.css({
                        left: point.x + that.Axis.yLabelWidth,
                        top: top,
                        right: 'auto'
                    }).show();
                } else {
                    that.$ToolTip.css({
                        right: that.opt.Width - point.x,
                        left: 'auto',
                        top: top
                    }).show();
                }
            });
            that.$ToolTipWrap.unbind("mouseleave.chart").bind("mouseleave.chart", function(e) {
                that.cxtF.clearRect(0, 0, that.opt.Width, that.opt.Height);
                //that.cxtF.drawImage(that.cacheF, 0, 0);
                that.cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                that.$ToolTip.fadeOut(200);
            });
            that.$ToolTipWrap.unbind("click.chart").bind("click.chart", function(e) {
                doClick(e, this);
            });
        } else if (that.opt.FullMode) {

            that.$ToolTip.addClass("ChartToolTipMobile");
            that.$ToolTipWrap.tabMobile(function(e) {
                tar = null;
                that.cxtF.clearRect(0, 0, that.opt.Width, that.opt.Height);
                that.cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                doClick(e, that.canvasF);
                //doClick(e, that.$ToolTipWrap[0]);

                if (tar == null) return;

                that.$TipData.html("");
                var cate = "";
                that.$TipData.append("<div style='color:#fff'>" + tar.Name + ':' + tar.OriginalData + "</div>");

                var offset = that.$ToolTipWrap.offset();
                var point = {
                    x: e.pageX - offset.left,
                    y: e.pageY - offset.top
                };
                var w = that.$ToolTipWrap.width() / 2;

                var x = that.DrawWidth / that.opt.CateLength;
                if (tar) {
                    //画线
                    that.cxtF.save();
                    that.cxtF.globalAlpha = 0.3;
                    that.cxtF.fillStyle = "#A3CBF2";

                    that.cxtF.fillRect(bitwise(that.Axis.yLabelWidth + that.BarWidth * tar.index + 0.5 * that.BarGap + that.Axis.xLabelWidth * tar.index1), that.padding, that.BarWidth, that.DrawHeight);
                    that.cxtF.restore();

                    that.TimeOut && window.clearTimeout(that.TimeOut);
                    that.TimeOut = null;
                    that.$TipData.html("<div style='color:#fff'>" + tar.Name + ':' + tar.Data + "</div>"); //悬浮层显示
                    var top = point.y > (that.opt.Height / 3) ? point.y - 70 : point.y;
                    that.$TipName.text(tar.Category);
                    if (point.x <= w) {
                        that.$ToolTip.css({
                            left: point.x,
                            top: top,
                            right: 'auto'
                        }).show();
                    } else {
                        that.$ToolTip.css({
                            right: that.opt.Width - point.x,
                            left: 'auto',
                            top: top
                        }).show();
                    }
                    that.TimeOut = window.setTimeout(function() {
                        that.TimeOut = null;
                        that.$ToolTip.hide();
                    }, HideSec);
                }
            });
        }

        function doClick(e, tt) {
            var offset = $(tt).offset();
            var point = {
                x: e.pageX - offset.left,
                y: e.pageY - offset.top
            };

            var index = Math.floor((point.x - that.Axis.yLabelWidth) / that.Axis.xLabelWidth);

            var w = (point.x - that.Axis.yLabelWidth) % that.Axis.xLabelWidth - that.BarGap / 2;
            var itemW = (that.Axis.xLabelWidth - that.BarGap) / that.opt.Series.length;
            var ind = Math.floor(w / itemW);

            if (index >= that.opt.CateLength || index < 0 || ind < 0 || ind >= that.opt.Series.length) return;
            tar = that.DrawData[ind][index];
            tar.point = point;
            tar.index = ind;
            tar.index1 = index;
            if (point.y < tar.tY) return;
            var ret = {
                'Name': tar.Name,
                'Data': tar.Data,
                'Category': tar.Category,
                'SeriesCode': tar.SeriesCode,
                'CateCode': tar.CateCode
            };
            that.opt.ClickChartCBack && that.opt.ClickChartCBack(ret);
            return false;
        }
    },
    unbind: function() {
        var that = this;
        if (!that.opt.IsMobile) {
            that.$ToolTipWrap.unbind("mousemove.chart");
            that.$ToolTipWrap.unbind("mouseleave.chart");
            that.$ToolTipWrap.unbind("click.chart");
        }
    },
    Refresh: function(data) {
        var that = this;
        that.AnimationID && window.cancelAnimationFrame(that.AnimationID);
    }
};

export default Bar;