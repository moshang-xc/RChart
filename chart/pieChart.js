/**
 * 饼图
 */
import {
    bitwise,
    slider,
    isInteger,
    HideSec
} from './lib.js';

var Pie = function(opt = {}, target = $('body')) {
    this.opt = $.extend({}, opt);
    this.$outer = $(target);
    this.$outer.html('');
    this.opt.Width = bitwise(this.opt.Width);
    this.opt.Height = bitwise(this.opt.Height);

    this.$wrap = $(`<div class="PieChartWrap" style="width: ${this.opt.Width}px; height: ${this.opt.Height}px;"></div>`);

    this.$ToolTip = $('<div class="ChartToolTip"><div class="TipName"></div><div class="TipData"></div></div>');
    this.$TipName = this.$ToolTip.find('.TipName');
    this.$TipData = this.$ToolTip.find('.TipData');
    this.$ToolTipWrap = $('<div class="ChartToolTopWrap"></div>').append(this.$ToolTip);
    this.ColorLen = this.opt.Colors.length;
    this.OriWidth = this.opt.Width;

    this.init();
};
Pie.prototype = {
    constructor: Pie,
    init: function() {
        if (this.opt.Width == 0 || this.opt.Height == 0) {
            return;
        }

        this.canvasF = document.createElement('canvas');
        if (!this.canvasF.getContext) {
            return;
        }
        this.cxtF = this.canvasF.getContext('2d');
        this.cacheF = document.createElement('canvas');
        this.cacheCxt = this.cacheF.getContext('2d');
        this.canvasF.className = 'PieChartCanvas';

        this.$wrap.append(this.canvasF).append(this.$ToolTipWrap).appendTo(this.$outer);
        // showDownload(this);

        this.canW = document.createElement('canvas');
        this.cxtW = this.canW.getContext('2d');
        this.canW.className = 'PieChartCanvas';
        this.$wrap.append(this.canW);


        this.sizePerc = this.opt.FullMode ? 60 : 85; // 饼图所占画布百分比大小

        this.borderWidth = 1; // 边框宽度
        this.borderStyle = "#fff"; // 边框颜色
        this.gradientColour = "#ddd"; // 边框渐变尾色
        this.maxPullOutDist = 10; //点击偏离圆心距离 
        this.pullOutLabelFont = "bold 12px 'Microsoft YaHei'"; // 描述字体
        this.fontzie = 12;
        this.chartStartAngle = -0.5 * Math.PI; // 起始角度为12点钟方向
        this.PerCent = this.chartStartAngle;
        this.curSlice = -1; // 偏移量的索引值，默认为-1没有偏移量
        this.chartData = []; // 饼图数据
        this.chartColors = this.opt.Colors; // 饼图颜色
        this.totalValue = 0; // 饼图数据总值
        this.canvasWidth = this.opt.Width; // 画布宽度
        this.canvasHeight = this.opt.Height; // 画布高度
        this.centreX = bitwise(this.canvasWidth / 2); // 画布中心位置X
        this.centreY = bitwise(this.canvasHeight / 2); // 画布中心位置Y
        this.chartRadius = bitwise(Math.min(this.canvasWidth, this.canvasHeight) * this.sizePerc / 100 / 2); // 饼图半径
        this.whiteSpace = {
            top: this.centreY - this.chartRadius,
            left: this.centreX - this.chartRadius
        };

        this.progress = 0;
        this.formatData();

        this.opt.Width += this.Direction.L + this.Direction.R;
        this.opt.Height += this.Direction.T + this.Direction.B;
        this.canvasF.style.left = -this.Direction.L + "px";
        this.canvasF.style.top = -this.Direction.T + "px";

        this.canvasF.width = this.opt.Width;
        this.canvasF.height = this.opt.Height;
        this.canW.width = this.opt.Width;
        this.canW.height = this.opt.Height;
        this.scaleWidth = this.opt.Width;
        this.scaleHeight = this.opt.Height;

        if (window.devicePixelRatio) {
            this.scaleWidth = this.opt.Width * window.devicePixelRatio;
            this.scaleHeight = this.opt.Height * window.devicePixelRatio;
            this.canW.style.width = this.cacheF.style.width = this.canvasF.style.width = this.opt.Width + "px";
            this.canW.style.height = this.cacheF.style.height = this.canvasF.style.height = this.opt.Height + "px";
            this.canW.height = this.cacheF.height = this.canvasF.height = this.scaleHeight;
            this.canW.width = this.cacheF.width = this.canvasF.width = this.scaleWidth;
            this.cxtF.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.cxtW.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.cacheCxt.scale(window.devicePixelRatio, window.devicePixelRatio);
        }

        this.draw();
        this.bind();
    },
    formatData: function() {
        var that = this;
        $.each(that.opt.Series, function(index, item) {
            //增加多条数据循环遍历处理
            let data = {
                value: parseFloat(item.Data[0]),
                discri: item.Name,
                OriginalData: item.Data[0],
                SeriesCode: item.Code
            };
            that.totalValue += parseFloat(item.Data[0]) - (that.opt.Min < 0 ? that.opt.Min : 0);
            let cate = that.opt.Categories[0];
            data.Category = cate;
            cate && (data.CateCode = that.opt.CateCodes[cate]);
            that.chartData[index] = data;
        });

        let currentPos = 0;
        for (let slice = 0, len = that.chartData.length; slice < len; slice++) {
            let point = that.chartData[slice],
                val = that.opt.Min < 0 ? point['value'] - that.opt.Min : point['value'],
                percent = val / that.totalValue;

            point['startAngle'] = 2 * Math.PI * currentPos;
            point['endAngle'] = 2 * Math.PI * (currentPos + percent);
            // point['midAngle'] = (point['startAngle'] + point['endAngle']) / 2 + that.chartStartAngle;
            point['midAngle'] = Math.PI * (currentPos * 2 + percent) + that.chartStartAngle;
            point['width'] = bitwise(Math.max(String(point['value']).length + 5, String(point['discri']).length) * 13);

            currentPos += percent;
            //格式化数据
            point['align'] = that.getAlign(point['midAngle']);
            var offPoint = {
                x: Math.cos(point['midAngle']),
                y: Math.sin(point['midAngle'])
            };
            point['sPoint'] = {
                x: bitwise(that.centreX + offPoint.x * (that.chartRadius)),
                y: bitwise(that.centreY + offPoint.y * (that.chartRadius))
            };
            point['mPoint'] = {
                x: bitwise(that.centreX + offPoint.x * (that.chartRadius + that.maxPullOutDist)),
                y: bitwise(that.centreY + offPoint.y * (that.chartRadius + that.maxPullOutDist))
            };
            var hPadding;
            if (point['align'] == 'left') {
                hPadding = 10;
            } else {
                hPadding = -10;
            }

            point['ePoint'] = {
                x: bitwise(that.centreX + offPoint.x * (that.chartRadius + that.maxPullOutDist) + hPadding),
                y: bitwise(that.centreY + offPoint.y * (that.chartRadius + that.maxPullOutDist))
            };
        }

        that.location();
    },
    /**
     * 防止文本重叠(判断终点y坐标之间的距离，若距离小于30，则其中一个X坐标平移)
     */
    location: function() {
        //将值分为四个象限分别处理，一三象限逆时针方向绘制，二四象限顺时针方向处理
        let that = this,
            MinHeight = 16;

        if (that.chartData.length === 1) {
            that.chartData[0]['align'] = "right";
        }

        let Direction = {
                L: 0,
                T: 0,
                R: 0,
                B: 0
            },
            Quadrants = {
                first: [],
                sec: [],
                third: [],
                fou: []
            };

        for (let i = 0, len = that.chartData.length; i < len; i++) {
            let point = that.chartData[i];
            point.index = i;
            if (point.align == 'left') { //一，四象限
                Direction.R = Math.max(Direction.R, (point["discri"].length + 6) * that.fontzie + point["ePoint"].x);
                if (point.midAngle >= 0 && point.midAngle <= Math.PI / 2) {
                    Quadrants.fou.push(point);
                    continue;
                }
                Quadrants.first.push(point);
                continue;
            } else { //二，三象限
                Direction.L = Math.min(Direction.L, point["ePoint"].x - (point["discri"].length + 6) * that.fontzie);
                if (point.midAngle >= Math.PI / 2 && point.midAngle <= Math.PI) {
                    Quadrants.third.push(point);
                    continue;
                }
                Quadrants.sec.push(point);
                continue;
            }
        }
        //左右留白
        Direction.R = Direction.R - that.opt.Width;
        Direction.R = Direction.R > 0 ? parseInt(Direction.R) : 0;
        Direction.L = Direction.L > 0 ? 0 : Math.abs(parseInt(Direction.L));

        //计算上下距离
        Quadrants.first.reverse();
        Quadrants.third.reverse();
        for (let k in Quadrants) {
            if (Quadrants.hasOwnProperty(k)) {

                let quadrant = Quadrants[k];
                //格式化数据
                for (let j = 1, l = quadrant.length; j < l; j++) {
                    let curPoint = quadrant[j],
                        lastPoint = quadrant[j - 1],
                        h = Math.abs(curPoint['ePoint'].y - lastPoint['ePoint'].y);
                    if (h < MinHeight) {
                        switch (k) {
                            case "first":
                            case "sec":
                                {
                                    curPoint.ePoint.y = lastPoint['ePoint'].y - MinHeight;
                                    j == l - 1 && (Direction.T = Math.min(curPoint.ePoint.y - 2 * that.fontzie, Direction.T));
                                }
                                break;
                            case "third":
                            case "fou":
                                {
                                    curPoint.ePoint.y = lastPoint['ePoint'].y + MinHeight;
                                    j == l - 1 && (Direction.B = Math.max(curPoint.ePoint.y + 2 * that.fontzie, Direction.B));
                                }
                                break;
                        }
                    } else {
                        switch (k) {
                            case "first":
                            case "sec":
                                {
                                    if (curPoint['ePoint'].y > lastPoint['ePoint'].y) {
                                        curPoint.ePoint.y = lastPoint['ePoint'].y - MinHeight;
                                    }
                                    j == l - 1 && (Direction.T = Math.min(curPoint.ePoint.y - 2 * that.fontzie, Direction.T));
                                }
                                break;
                            case "third":
                            case "fou":
                                {
                                    if (curPoint['ePoint'].y < lastPoint['ePoint'].y) {
                                        curPoint.ePoint.y = lastPoint['ePoint'].y + MinHeight;
                                    }
                                    j == l - 1 && (Direction.B = Math.max(curPoint.ePoint.y + 2 * that.fontzie, Direction.B));
                                }
                                break;
                        }
                    }
                }
            }
        }

        Direction.T = Direction.T > 0 ? 0 : Math.abs(parseInt(Direction.T));
        Direction.B = Direction.B - that.opt.Height;
        Direction.B = Direction.B > 0 ? parseInt(Direction.B) : 0;
        that.Direction = Direction;

        that.Points = Array.prototype.concat.call(Quadrants.first, Quadrants.sec, Quadrants.third, Quadrants.fou);
    },
    draw: function() {
        let that = this,
            cxtF = this.cxtF,
            cxtW = this.cxtW;

        cxtW.fillStyle = "#fff";
        cxtW.beginPath();
        cxtW.moveTo(that.centreX, that.centreY);
        cxtW.arc(that.centreX, that.centreY, that.chartRadius + 1, that.chartStartAngle, that.PerCent, true);
        that.PerCent = that.chartStartAngle + Math.PI * that.progress * 2;
        cxtW.fill();

        cxtF.save();
        cxtF.translate(that.Direction.L, that.Direction.T);
        cxtF.strokeStyle = '#fff';
        for (let i = 0, len = that.chartData.length; i < len; i++) {
            len === 1 && (cxtF.strokeStyle = that.chartColors[i % that.ColorLen]);
            cxtF.beginPath();
            cxtF.moveTo(that.centreX, that.centreY);
            cxtF.arc(that.centreX, that.centreY, that.chartRadius, that.chartData[i]['startAngle'] + that.chartStartAngle, that.chartData[i]['endAngle'] + that.chartStartAngle, false);
            cxtF.lineTo(that.centreX, that.centreY);
            cxtF.fillStyle = that.chartColors[i % that.ColorLen];
            cxtF.fill();
            cxtF.stroke();
            cxtF.closePath();
        }
        cxtF.restore();
        that.opt.IsMobile && (that.PerCent = 1.5 * Math.PI);
        that.animatePie();
    },
    animatePie: function() {
        let that = this,
            cxtW = this.cxtW;
        if (that.PerCent >= 1.5 * Math.PI) {
            that.PerCent = 0;
            that.canW.remove();

            that.opt.FullMode && that.drawSlice();
            return;
        }

        cxtW.clearRect(that.centreX - that.chartRadius, that.centreY - that.chartRadius, 2 * that.chartRadius, 2 * that.chartRadius);
        cxtW.beginPath();
        cxtW.moveTo(that.centreX, that.centreY);
        cxtW.arc(that.centreX, that.centreY, that.chartRadius + 1, that.chartStartAngle, that.PerCent, true);
        cxtW.fill();

        let tip = (102 - that.progress * 100) / 8;
        tip = tip == 0 ? 0.01 : tip / 100;
        that.progress += tip;
        that.PerCent = that.chartStartAngle + Math.PI * that.progress * 2;

        that.AnimationID = requestAnimationFrame(function() {
            that.animatePie.call(that);
        });
    },
    drawSlice: function() {
        var that = this;
        let cxtF = this.cxtF;
        cxtF.save();
        cxtF.translate(this.Direction.L, this.Direction.T);
        cxtF.font = this.pullOutLabelFont;
        cxtF.textBaseline = "middle";
        for (let i = 0, len = this.Points.length; i < len; i++) {
            //画线
            let point = this.Points[i],
                align = point['align'],
                pad,
                per = (point['value'] - (this.opt.Min < 0 ? this.opt.Min : 0)) / this.totalValue * 100;

            cxtF.fillStyle = this.chartColors[point.index % this.ColorLen];
            cxtF.textAlign = align;

            if (align == 'left') {
                pad = 2;
            } else {
                pad = -2;
            }

            cxtF.save();
            cxtF.strokeStyle = this.chartColors[point.index % this.ColorLen];
            cxtF.beginPath();
            per = isInteger(per) ? per : per.toFixed(2);
            cxtF.fillText(point['discri'] + '(' + per + "%)", point['ePoint'].x + pad, point['ePoint'].y);
            cxtF.moveTo(point['sPoint'].x, point['sPoint'].y);
            cxtF.quadraticCurveTo(point['mPoint'].x, point['mPoint'].y, point['ePoint'].x, point['ePoint'].y);
            cxtF.stroke();
            cxtF.restore();
        }
        cxtF.restore();

        this.cacheCxt.drawImage(this.canvasF, 0, 0, this.opt.Width, this.opt.Height);
    },
    getClickIndex: function(e) {
        let offsetA = $(this.canvasF).offset(),
            mouseX = e.pageX - offsetA.left - this.Direction.L,
            mouseY = e.pageY - offsetA.top - this.Direction.T,
            xFromCentre = mouseX - this.centreX,
            yFromCentre = mouseY - this.centreY,
            distanceFromCentre = Math.sqrt(Math.pow(Math.abs(xFromCentre), 2) + Math.pow(Math.abs(yFromCentre), 2));

        if (distanceFromCentre <= this.chartRadius) {
            let clickAngle = Math.atan2(yFromCentre, xFromCentre) - this.chartStartAngle;
            if (clickAngle < 0) {
                clickAngle = 2 * Math.PI + clickAngle;
            }
            for (let i = 0, len = this.chartData.length; i < len; i++) {
                let itemData = this.chartData[i];
                if (clickAngle >= itemData['startAngle'] && clickAngle <= itemData['endAngle']) {
                    return i;
                }
            }
        }
        return -1;
    },
    bind: function(e) {
        let that = this;
        new slider(that);

        if (!that.opt.IsMobile) {
            that.$ToolTipWrap.click(function(e) {
                let slice = that.getClickIndex.call(that, e);

                if (slice === -1) {
                    return;
                }
                let ret = {
                    'Name': that.chartData[slice]['discri'],
                    'Data': that.chartData[slice]['value'],
                    'Category': that.chartData[slice]['Category'],
                    'SeriesCode': that.chartData[slice]['SeriesCode'],
                    'CateCode': that.chartData[slice]['CateCode']
                };
                that.opt.ClickChartCBack && that.opt.ClickChartCBack(ret);
                return;
            });

            that.$ToolTipWrap.mousemove(function(e) {
                let cxtF = that.cxtF;
                cxtF.clearRect(0, 0, that.opt.Width, that.opt.Height);
                cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                let i = that.getClickIndex(e);
                if (i === -1) {
                    that.$ToolTip.fadeOut(200);
                    return;
                }
                let startAngle = that.chartData[i]['startAngle'] + that.chartStartAngle,
                    endAngle = that.chartData[i]['endAngle'] + that.chartStartAngle,
                    off = $(this).offset();

                cxtF.save();
                cxtF.translate(that.Direction.L, that.Direction.T);
                cxtF.globalAlpha = 0.5;
                cxtF.beginPath();
                cxtF.moveTo(that.centreX, that.centreY);
                cxtF.arc(that.centreX, that.centreY, that.chartRadius + that.maxPullOutDist, startAngle, endAngle, false);
                cxtF.fillStyle = that.chartColors[i % that.ColorLen];
                cxtF.fill();
                cxtF.restore();

                that.$TipName.text(that.chartData[i]['discri']);
                that.$TipData.text(that.chartData[i]['Category'] + '：' + that.chartData[i]['OriginalData']);

                let left = e.pageX - off.left - that.Direction.L,
                    isleft = left < that.OriWidth / 2;

                that.$ToolTip.css({
                    right: isleft ? "auto" : that.OriWidth - left,
                    left: isleft ? left : "auto",
                    top: e.pageY - off.top - 55
                }).show();
            });

            that.$ToolTipWrap.mouseout(function() {
                that.$ToolTip.fadeOut();
            });
        } else if (that.opt.FullMode) {
            that.$ToolTip.addClass("ChartToolTipMobile");
            that.$ToolTipWrap.tabMobile(function(e) {
                let i = that.getClickIndex.call(that, e),
                    cxtF = that.cxtF;

                if (i === -1) {
                    that.TimeOut && window.clearTimeout(that.TimeOut);
                    that.TimeOut = null;
                    that.$ToolTip.hide();
                    cxtF.clearRect(0, 0, that.scaleWidth, that.scaleWidth);
                    cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                    return;
                }

                that.TimeOut && window.clearTimeout(that.TimeOut);
                that.TimeOut = null;
                cxtF.clearRect(0, 0, that.scaleWidth, that.scaleHeight);
                cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);

                let startAngle = that.chartData[i]['startAngle'] + that.chartStartAngle,
                    endAngle = that.chartData[i]['endAngle'] + that.chartStartAngle,
                    off = $(that.canvasF).offset();

                cxtF.save();
                cxtF.translate(that.Direction.L, that.Direction.T);
                cxtF.globalAlpha = 0.5;
                cxtF.beginPath();
                cxtF.moveTo(that.centreX, that.centreY);
                cxtF.arc(that.centreX, that.centreY, that.chartRadius + that.maxPullOutDist, startAngle, endAngle, false);
                cxtF.fillStyle = that.chartColors[i % that.ColorLen];
                cxtF.fill();
                cxtF.restore();

                that.$TipName.text(that.chartData[i]['discri']);
                that.$TipData.text(that.chartData[i]['Category'] + '：' + that.chartData[i]['OriginalData']);

                let left = e.pageX - off.left - that.Direction.L,
                    isleft = left < that.OriWidth / 2;
                that.$ToolTip.css({
                    right: isleft ? "auto" : that.OriWidth - left,
                    left: isleft ? left : "auto",
                    top: e.pageY - off.top - 55
                }).show();

                that.TimeOut = window.setTimeout(function() {
                    that.TimeOut = null;
                    that.$ToolTip.hide();
                    cxtF.clearRect(0, 0, that.scaleWidth, that.scaleWidth);
                    cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                }, HideSec);

                let ret = {
                    'Name': that.chartData[i]['discri'],
                    'Data': that.chartData[i]['value'],
                    'Category': that.chartData[i]['Category']
                };
                that.opt.ClickChartCBack && that.opt.ClickChartCBack(ret);
            });
        }
    },
    getAlign: function(angel) {
        let per = Math.PI / 2;
        if (angel > per * 3 || angel < per) {
            return 'left';
        } else if (angel > per && angel < per * 3) {
            return 'right';
        }
    },
    Refresh: function(data) {
        this.AnimationID && window.cancelAnimationFrame(this.AnimationID);
    }
};

export default Pie;