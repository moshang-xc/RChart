/**
 * 折线图
 */
import {
    drawBackGrid,
    bitwise,
    slider,
    HideSec,
    sliderBar
} from './lib.js';

var Line = function(opt = {}, target = $('body')) {
    this.opt = opt;
    this.$outer = target;

    this.setDefault();
    this.init();
};
Line.prototype = {
    setDefault: function() {
        this.$outer.html('');
        this.$wrap = $('<div class="LineChartWrap"></div>');
        this.$wrap.css({
            width: this.opt.Width,
            height: this.opt.Height
        });
        this.$ToolTip = $('<div class="ChartToolTip"><div class="TipName"></div><div class="TipData"></div></div>');
        this.$TipName = this.$ToolTip.find('.TipName');
        this.$TipData = this.$ToolTip.find('.TipData');
        this.$ToolTipWrap = $('<div class="ChartToolTopWrap"></div>').append(this.$ToolTip);

        this.opt.CateLength = this.opt.Categories ? this.opt.Categories.length : 0;
        this.padding = 12; //右偏移量
        this.paddingL = 60;
        this.CanWidth = this.opt.Width - 2 * this.padding;
        this.progress = 0;

        this.img = 0;
        this.radius = 8;
        this.LineWidth = this.opt.IsMobile ? 2 : 2;
        this.CircleRadiu = this.opt.IsMobile ? 3 : 3;
        this.fontSize = 12;
        this.ColorLen = this.opt.Colors.length;
        //折线图横坐标最小刻度  目前只针对移动端
        this.minPerWidth = 40;

        this.showIndex = 0;
        this.showLength = this.opt.CateLength;
        var perW = this.opt.Width / this.showLength;

        while (this.minPerWidth > perW) {
            perW = this.opt.Width / --this.showLength;
        }

        this.range = this.opt.CateLength - this.showLength;
        this.HasBind = false;
    },
    init: function() {
        if (this.opt.Width == 0 || this.opt.Height == 0)
            return;
        this.canvasF = document.createElement('canvas');
        this.canvasBack = document.createElement('canvas');
        this.canvasF.className = this.canvasBack.className = 'LineChartCanvas';
        this.cacheF = document.createElement('canvas');

        this.canvasF.width = this.cacheF.width = this.canvasBack.width = this.opt.Width;
        this.canvasF.height = this.cacheF.height = this.canvasBack.height = this.opt.Height;
        this.cxtF = this.canvasF.getContext('2d');
        this.cxtBack = this.canvasBack.getContext("2d");
        this.cacheCxt = this.cacheF.getContext("2d");

        this.scaleWidth = this.opt.Width;
        this.scaleHeight = this.opt.Height;

        if (window.devicePixelRatio) {
            this.scaleWidth = this.opt.Width * window.devicePixelRatio;
            this.scaleHeight = this.opt.Height * window.devicePixelRatio;
            this.canvasF.style.width = this.cacheF.style.width = this.canvasBack.style.width = this.opt.Width + "px";
            this.canvasF.style.height = this.cacheF.style.height = this.canvasBack.style.height = this.opt.Height + "px";
            this.canvasF.height = this.cacheF.height = this.canvasBack.height = this.scaleHeight;
            this.canvasF.width = this.cacheF.width = this.canvasBack.width = this.scaleWidth;
            this.cxtF.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.cxtBack.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.cacheCxt.scale(window.devicePixelRatio, window.devicePixelRatio);
        }

        if (this.opt.Series.length == 0 || this.opt.Categories.length == 0) return;
        this.$wrap.append(this.canvasBack).append(this.canvasF).append(this.$ToolTipWrap).appendTo(this.$outer);

        drawBackGrid(this);

        if (!this.opt.IsMobile && this.showLength < this.opt.CateLength) {
            this.ScrollStep = this.opt.CateLength - this.showLength + 1;
            this.$ScrollWrap = $('<div class="ChartScrollWrap"></div>');
            this.$ScrollWrap.css({
                "top": this.opt.Height - 4,
                "left": this.Axis.yLabelWidth
            }).width(this.opt.Width - this.Axis.yLabelWidth - this.padding);

            let t = this.showIndex + this.showLength,
                ww;
            for (var i = 1; i <= this.ScrollStep; i++) {
                ww = (i / this.ScrollStep * 100).toFixed(2) + "%";
                this.$ScrollWrap.append("<i class='BarTip' style='left:" + ww + "' data-text='" + this.opt.Categories[t + i - 2] + "'></i>");
            }
            ww = (1 / this.ScrollStep * 100).toFixed(2) + "%";
            this.$ScrollBar = $('<div class="ChartScrollBar"></div>').width(ww).appendTo(this.$ScrollWrap);
            this.$ScrollIcon = $('<i class="BarIcon"></i>').css("left", ww).appendTo(this.$ScrollWrap);
            this.$ScrollWrap.appendTo(this.$wrap);
        }

        this.animateData();
    },
    Slider: function() {
        this.cxtF.clearRect(0, 0, this.canvasF.width, this.canvasF.height);
        drawBackGrid(this);
        this.progress = 1;
        this.HasBind = true;
        this.drawLine();
    },
    formatData: function() {
        let that = this,
            range = that.showIndex + that.showLength,
            yWidth = that.Axis.yLabelWidth,
            min = that.opt.Min,
            max = that.opt.Max;

        that.DrawData = [];
        that.TextPos = [];

        $.each(that.opt.Series, function(index, item) {
            let drawData = [];
            $.each(item.Data, function(i, v) {
                if (i < that.showIndex || i >= range) {
                    return true;
                }
                let val = parseFloat(v),
                    aPoint = {},
                    ind = i - that.showIndex;

                aPoint.x = bitwise(yWidth + ((ind + 0.5) / that.opt.CateLength) * that.DrawWidth);
                aPoint.y = (val - min) / (max - min) * that.DrawHeight;
                aPoint.y = bitwise(that.Axis.endPoint - aPoint.y);
                aPoint.Name = item.Name;
                aPoint.Data = val;
                aPoint.OriginalData = v;
                aPoint.Category = that.opt.Categories[i];
                aPoint.SeriesCode = item.Code;
                aPoint.Category && (aPoint.CateCode = that.opt.CateCodes[aPoint.Category]);

                drawData.push(aPoint);
                index === 0 && that.TextPos.push(aPoint.x);
            });
            that.DrawData.push(drawData);
        });

        that.cxtF.font = '12px Microsoft YaHei';
        that.cxtF.lineJoin = 'round';
        that.cxtF.lineWidth = that.LineWidth;
        that.cxtF.fillStyle = "#fff";
    },
    //绘制数据内容
    drawLine: function() {
        var that = this;
        var progressDots = Math.ceil(that.progress * that.opt.CateLength);
        if (progressDots >= that.opt.CateLength + 1) {
            that.cacheCxt.clearRect(0, 0, this.canvasF.width, this.canvasF.height);
            that.cacheCxt.drawImage(that.canvasF, 0, 0, that.opt.Width, that.opt.Height);
            that.HasBind == false && this.bind();
            return;
        }
        var progressFragment = (that.progress * that.opt.CateLength) - Math.floor(that.progress * that.opt.CateLength);

        that.cxtF.clearRect(0, 0, this.scaleWidth, this.scaleHeight);
        //画内部多边形
        $.each(that.DrawData, function(j, item) {
            that.cxtF.save();
            //绘制线段
            that.cxtF.strokeStyle = that.opt.Colors[j % that.ColorLen];
            that.cxtF.beginPath();
            //console.log(item.length);
            $.each(item, function(index, point) {
                if (index <= progressDots) {
                    var px = index === 0 ? item[0].x : item[index - 1].x,
                        py = index === 0 ? item[0].y : item[index - 1].y;

                    var nextX = point.x,
                        nextY = point.y;

                    index === progressDots && (nextX = px + ((nextX - px) * progressFragment), nextY = py + ((nextY - py) * progressFragment));
                    index === 0 ? that.cxtF.moveTo(nextX, nextY) : that.cxtF.lineTo(nextX, nextY);
                }
            });
            that.cxtF.stroke();

            //画圆点
            $.each(item, function(index, point) {
                if (index < progressDots) {
                    that.cxtF.beginPath();
                    that.cxtF.arc(point.x, point.y, that.CircleRadiu, 0, Math.PI * 2);
                    that.cxtF.fill();
                    that.cxtF.stroke();
                }
            });
            that.cxtF.restore();
        });
        var tip = (101 - that.progress * 100) / 10 / 2;
        tip = tip == 0 ? 0.01 : tip / 100;
        that.progress += tip;

        that.AnimationID = requestAnimationFrame(function() {
            that.drawLine.call(that);
        });
    },
    animateData: function() {
        var that = this;
        that.opt.IsMobile ? that.progress = 1 : that.progress = 0;
        //console.log("开始");
        that.drawLine();
        //console.time("line");
    },
    bind: function() {
        var that = this;
        var offset = that.$ToolTipWrap.offset();

        if (that.showLength < that.opt.CateLength && that.HasBind == false) {
            new sliderBar(that);
        }

        that.HasBind = true;

        if (!that.opt.IsMobile) {
            that.$ToolTipWrap.unbind("mousemove.chart").bind("mousemove.chart", function(e) {
                that.cxtF.clearRect(0, 0, that.opt.Width, that.opt.Height);
                //that.cxtF.drawImage(that.cacheF, 0, 0);
                that.cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);

                var point = {
                    x: e.pageX - offset.left,
                    y: e.pageY - offset.top
                };

                var index = Math.floor((point.x - that.Axis.yLabelWidth) / that.Axis.xLabelWidth);
                if (index < that.opt.CateLength && index > -1) {
                    var tar = {
                        a: 0,
                        p: {},
                        len: 10000
                    };
                    $.each(that.DrawData, function(i, item) {
                        var p = item[index];
                        var l = Math.abs(p.y - point.y);
                        if (tar.len > l) {
                            tar.a = i;
                            tar.len = l;
                            tar.p = p;
                        }
                    });
                    that.cxtF.save();
                    //画线
                    that.cxtF.beginPath();
                    var datass = that.DrawData[tar.a];
                    if (datass) {
                        that.cxtF.globalAlpha = 1;
                        that.cxtF.moveTo(datass[0].x, datass[0].y);
                        for (var i = 1, l = datass.length; i < l; i++) {
                            that.cxtF.lineTo(datass[i].x, datass[i].y);
                        }
                        that.cxtF.lineWidth = that.LineWidth + 1;
                        that.cxtF.strokeStyle = that.opt.Colors[tar.a % that.ColorLen];
                        that.cxtF.stroke();
                    }
                    that.cxtF.closePath();

                    that.cxtF.globalAlpha = 0.5;
                    that.cxtF.beginPath();
                    that.cxtF.moveTo(tar.p.x, tar.p.y);
                    that.cxtF.arc(tar.p.x, tar.p.y, that.radius, 0, Math.PI * 2);
                    // that.cxtF.fillText(tar.p.Name + ':' + tar.p.Data, tar.p.x + that.radius, tar.p.y);
                    that.cxtF.fillStyle = that.opt.Colors[tar.a % that.ColorLen];
                    that.cxtF.fill();
                    that.cxtF.restore();

                    that.$TipName.text(tar.p.Category);
                    that.$TipData.text(tar.p.Name + '：' + tar.p.OriginalData);
                    that.$ToolTip.removeAttr('style');
                    if (index >= Math.floor(that.opt.CateLength / 2)) {
                        that.$ToolTip.css({
                            left: "auto",
                            right: that.opt.Width - tar.p.x + 10,
                            top: tar.p.y - 20
                        }).show();
                    } else {
                        that.$ToolTip.css({
                            left: tar.p.x + 10,
                            right: "auto",
                            top: tar.p.y - 20
                        }).show();
                    }

                }
            });
            that.$ToolTipWrap.unbind("mouseleave.chart").bind("mouseleave.chart", function(e) {
                that.cxtF.clearRect(0, 0, that.scaleWidth, that.scaleHeight);
                //that.cxtF.drawImage(that.cacheF, 0, 0);
                that.cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                that.$ToolTip.fadeOut(200);
            });
            that.$ToolTipWrap.unbind("click.chart").bind("click.chart", function(e) {
                doClick(e, this);
            });
        } else if (that.opt.FullMode) {
            new slider(that);

            that.$ToolTip.addClass("ChartToolTipMobile");
            that.$ToolTipWrap.tabMobile(function(e) {
                //offset = that.$ToolTipWrap.offset();
                offset = $(that.canvasF).offset();
                var point = {
                    x: e.pageX - offset.left,
                    y: e.pageY - offset.top
                };
                var index = Math.floor((point.x - that.Axis.yLabelWidth) / that.Axis.xLabelWidth);

                if (index < that.opt.CateLength && index > -1) {
                    that.cxtF.clearRect(0, 0, that.scaleWidth, that.scaleHeight);
                    that.cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                    that.TimeOut && window.clearTimeout(that.TimeOut);
                    that.TimeOut = null;

                    var tar = {
                        a: 0,
                        p: {},
                        len: 10000
                    };
                    $.each(that.DrawData, function(i, item) {
                        var p = item[index];
                        var l = Math.abs(p.y - point.y);
                        if (tar.len > l) {
                            tar.a = i;
                            tar.len = l;
                            tar.p = p;
                        }
                    });
                    that.cxtF.save();
                    //画线
                    that.cxtF.beginPath();
                    var datass = that.DrawData[tar.a];
                    if (datass) {
                        that.cxtF.globalAlpha = 1;
                        that.cxtF.moveTo(datass[0].x, datass[0].y);
                        for (var i = 1, l = datass.length; i < l; i++) {
                            that.cxtF.lineTo(datass[i].x, datass[i].y);
                        }
                        that.cxtF.lineWidth = that.LineWidth + 1;
                        that.cxtF.strokeStyle = that.opt.Colors[tar.a];
                        that.cxtF.stroke();
                    }
                    that.cxtF.closePath();

                    that.cxtF.globalAlpha = 0.5;
                    that.cxtF.beginPath();
                    that.cxtF.moveTo(tar.p.x, tar.p.y);
                    that.cxtF.arc(tar.p.x, tar.p.y, that.radius, 0, Math.PI * 2);
                    that.cxtF.fillStyle = that.opt.Colors[tar.a % that.ColorLen];
                    that.cxtF.fill();
                    that.cxtF.restore();

                    that.$TipName.text(tar.p.Category);
                    that.$TipData.text(tar.p.Name + '：' + tar.p.OriginalData);
                    that.$ToolTip.removeAttr('style');
                    if (index >= Math.floor(that.opt.CateLength / 2)) {
                        that.$ToolTip.css({
                            right: that.opt.Width - tar.p.x + 10,
                            top: tar.p.y - 20
                        }).show();
                    } else {
                        that.$ToolTip.css({
                            left: tar.p.x + 10,
                            top: tar.p.y - 20
                        }).show();
                    }

                    that.TimeOut = window.setTimeout(function() {
                        that.TimeOut = null;
                        that.$ToolTip.hide();
                        that.cxtF.clearRect(0, 0, that.scaleWidth, that.scaleHeight);
                        that.cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                    }, HideSec);
                }

                doClick(e, that.$ToolTipWrap[0]);
            });
        }

        function doClick(e, tt) {
            var offset = $(tt).offset();
            var point = {
                x: e.pageX - offset.left,
                y: e.pageY - offset.top
            };

            var index = Math.floor((point.x - that.Axis.yLabelWidth) / that.Axis.xLabelWidth);

            if (index < that.opt.CateLength && index > -1) {
                $.each(that.DrawData, function(i, item) {
                    var p = item[index];
                    var l = Math.sqrt(Math.pow(Math.abs(point.x - p.x), 2) + Math.pow(Math.abs(point.y - p.y), 2));
                    if (l <= that.radius) {
                        var ret = {
                                'Name': p.Name,
                                'Data': p.Data,
                                'Category': p.Category,
                                'SeriesCode': p.SeriesCode,
                                'CateCode': p.CateCode
                            },
                            tar = ret;
                        tar.point = p;
                        tar.index = i;
                        that.opt.ClickChartCBack && that.opt.ClickChartCBack(ret);
                        return false;
                    }
                });
            }
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

export default Line;