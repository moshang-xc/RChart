/**
 * 雷达图
 */
import {
    bitwise,
    slider,
    HideSec
} from './lib.js';

var Radar = function(opt = {}, target = $('body')) {
    this.opt = opt;
    this.$outer = target;

    this.$outer.html('');
    this.$wrap = $('<div class="RadarChartWrap"></div>');
    this.$ToolTip = $('<div class="ChartToolTip"><div class="TipName"></div><div class="TipData"></div></div>');
    this.$TipName = this.$ToolTip.find('.TipName');
    this.$TipData = this.$ToolTip.find('.TipData');
    this.$ToolTipWrap = $('<div class="ChartToolTopWrap"></div>').append(this.$ToolTip);

    this.opt.CateLength = this.opt.Categories ? this.opt.Categories.length : 0;
    this.sizePerc = 70; // 雷达图所占画布百分比大小
    this.radius = 8; // 鼠标选中悬浮半径
    this.ColorLen = this.opt.Colors.length;
    this.fontsize = 12;
    this.OriWidth = this.opt.Width;

    this.init();
};
Radar.prototype = {
    constructor: Radar,
    init: function() {
        if (this.opt.Width == 0 || this.opt.Height == 0) {
            return;
        }
        this.canvasF = document.createElement('canvas');
        this.canvasBack = document.createElement("canvas");
        this.cacheF = document.createElement("canvas");
        this.cxtF = this.canvasF.getContext('2d');
        this.cxtBack = this.canvasBack.getContext('2d');
        this.cacheCxt = this.cacheF.getContext('2d');
        this.canvasF.className = this.canvasBack.className = 'RadarChartCanvas';


        this.$wrap.css({
            width: this.opt.Width,
            height: this.opt.Height
        });
        this.$wrap.append(this.canvasBack).append(this.canvasF).append(this.$ToolTipWrap).appendTo(this.$outer);

        this.canvasWidth = this.opt.Width;
        this.canvasHeight = this.opt.Height;
        this.centreX = bitwise(this.canvasWidth / 2);
        this.centreY = bitwise(this.canvasHeight / 2);
        this.chartRadius = bitwise(Math.min(this.canvasWidth, this.canvasHeight) * this.sizePerc / 100 / 2); // 雷达图半径

        this.formatData();
        this.opt.Width += this.Direction.L + this.Direction.R;
        this.opt.Height += this.Direction.B + this.Direction.T;
        this.canvasBack.style.left = this.canvasF.style.left = -this.Direction.L + "px";
        this.canvasBack.style.top = this.canvasF.style.top = -this.Direction.T + "px";

        this.canvasF.width = this.canvasBack.width = this.cacheF.width = this.opt.Width;
        this.canvasF.height = this.canvasBack.height = this.cacheF.height = this.opt.Height;
        this.scaleWidth = this.opt.Width;
        this.scaleHeight = this.opt.Height;

        if (window.devicePixelRatio) {
            this.scaleWidth = this.opt.Width * window.devicePixelRatio;
            this.scaleHeight = this.opt.Height * window.devicePixelRatio;
            this.canvasF.style.width = this.canvasBack.style.width = this.cacheF.style.width = this.opt.Width + "px";
            this.canvasF.style.height = this.canvasBack.style.height = this.cacheF.style.height = this.opt.Height + "px";
            this.canvasF.height = this.canvasBack.height = this.cacheF.height = this.scaleHeight;
            this.canvasF.width = this.canvasBack.width = this.cacheF.width = this.scaleWidth;
            this.cxtF.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.cxtBack.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.cacheCxt.scale(window.devicePixelRatio, window.devicePixelRatio);
        }


        this.drawBack();
        this.animateData();
    },
    formatData: function() {
        let that = this;
        that.DrawData = [];
        that.Angels = [];
        that.perAngels = 2 * Math.PI / that.opt.CateLength;
        $.each(that.opt.Series, function(index, aitem) {
            let drawData = [],
                backData = [];

            $.each(aitem.Data, function(i, v) {
                let val = parseFloat(v),
                    aPoint = {},
                    item = (val - that.opt.Min) / (that.opt.Max - that.opt.Min),
                    angel = that.perAngels * i;
                aPoint.x = bitwise(Math.sin(angel) * that.chartRadius * item);
                aPoint.y = bitwise(Math.cos(angel) * that.chartRadius * item);
                aPoint.Name = aitem.Name;
                aPoint.Data = val;
                aPoint.OriginalData = v;
                aPoint.Category = that.opt.Categories[i];
                aPoint.SeriesCode = item.Code;
                aPoint.Category && (aPoint.CateCode = that.opt.CateCodes[aPoint.Category]);

                drawData.push(aPoint);

            });
            that.DrawData.push(drawData);
        });

        let BackData = [],
            data = {
                Fir: [],
                FirE: null,
                Sec: [],
                SecE: null,
                Thi: [],
                ThiE: null,
                Fou: [],
                FouE: null
            };

        //从最低端开始，顺时针方向，每90度划分为一个象限，并非为标准的象限
        for (let i = 0, l = that.opt.CateLength; i < l; i++) {
            let angel = that.perAngels * i;
            BackData.push({
                x: bitwise(that.centreX + Math.sin(angel) * that.chartRadius),
                y: bitwise(that.centreY + Math.cos(angel) * that.chartRadius),
                angel: angel,
                align: that.getAlign(angel),
                text: that.opt.Categories[i]
            });
        }
        let hasMid = that.opt.CateLength % 4 === 0;

        for (let i = 0, l = BackData.length; i < l; i++) {
            let t = BackData[i];
            t.tx = t.x;
            t.ty = t.y;
            switch (t.angel) {
                case 0:
                    {
                        t.y += 12;
                        data.FirE = t;
                    }
                    break;
                case Math.PI / 2:
                    {
                        data.SecE = t;
                    }
                    break;
                case Math.PI:
                    {
                        t.y -= 12;
                        data.ThiE = t;
                    }
                    break;
                case Math.PI * 3 / 2:
                    {
                        data.FouE = t;
                    }
                    break;
                default:
                    {
                        if (t.angel < Math.PI / 2) {
                            data.Fir.push(t);
                        } else if (t.angel < Math.PI) {
                            data.Sec.push(t);
                        } else if (t.angel < Math.PI * 3 / 2) {
                            data.Thi.push(t);
                        } else if (t.angel < Math.PI * 2) {
                            data.Fou.push(t);
                        }
                    }
                    break;
            }
        }

        data.Fir.reverse();
        data.Thi.reverse();
        let range = 16,
            Direction = {
                T: 0,
                L: 0,
                R: 0,
                B: 0
            };

        function checkV(arr, type) {
            for (let i = 0, l = arr.length; i < l; i++) {
                let item = arr[i];
                item.align == "left" && (item.x += 12);
                item.align == "right" && (item.x -= 12);
                switch (type) {
                    case "first":
                    case "forth":
                        {
                            //第一象限
                            if (i == 0) {
                                if (hasMid) {
                                    let s = Math.abs(that.centreY - item.y);
                                    s < range && (item.y += (range - s));
                                }
                                continue;
                            }
                            let s = item.y - arr[i - 1].y;
                            s < range && (item.y += (range - s));
                            if (i == l - 1) {
                                let s = data.FirE.y - item.y;
                                if (s < range)
                                    data.FirE.y = item.y + range;
                            }
                            let length = item.text ? item.text.length : 0;
                            type == "first" ? (Direction.R = Math.max(Direction.R, item.x + that.fontsize * (length + 4))) : (Direction.L = Math.max(Direction.L, that.fontsize * length - item.x));
                        }
                        break;
                    case "second":
                    case "third":
                        {
                            if (i == 0) {
                                if (hasMid) {
                                    let s = Math.abs(that.centreY - item.y);
                                    s < range && (item.y += (range - s));
                                }
                                continue;
                            }
                            let s = arr[i - 1].y - item.y;
                            s < range && (item.y -= (range - s));
                            if (i == l - 1 && hasMid) {
                                let s = item.y - data.ThiE.y;
                                if (s < range)
                                    data.ThiE.y = item.y - range;
                            }
                            Direction.T = Math.min(Direction.T, item.y);
                            let length = item.text ? item.text.length : 0;
                            type == "second" ? (Direction.R = Math.max(Direction.R, item.x + that.fontsize * (length + 4))) : (Direction.L = Math.max(Direction.L, that.fontsize * length - item.x));
                        }
                        break;
                }
            }
            return arr;
        }

        data.Fir = checkV(data.Fir, "first");
        data.Sec = checkV(data.Sec, "second");
        data.Thi = checkV(data.Thi, "third");
        data.Fou = checkV(data.Fou, "forth");

        Direction.L = Direction.L > 0 ? parseInt(Direction.L) : 0;
        Direction.R = Direction.R - that.opt.Width;
        Direction.R = Direction.R > 0 ? parseInt(Direction.R) : 0;
        Direction.T = hasMid ? data.ThiE.y : Direction.T;
        Direction.T = Direction.T < 0 ? parseInt(Math.abs(Direction.T - that.fontsize * 2)) : 0;
        let d = data.FirE.y + 2 * that.fontsize - that.opt.Height;
        Direction.B = d > 0 ? parseInt(d) : 0;

        that.Direction = Direction;

        //hasMid === true && (that.BackData = Array.prototype.concat.call(data.FirE, data.Fir.reverse(), data.SecE, data.Sec, data.ThiE, data.Thi.reverse(), data.FouE, data.Fou));
        //hasMid === false && (that.BackData = Array.prototype.concat.call(data.FirE, data.Fir.reverse(), data.Sec, data.Thi.reverse(), data.Fou));

        that.BackData = Array.prototype.concat.call(data.FirE, data.Fir.reverse());
        data.SecE && that.BackData.push(data.SecE);
        that.BackData = Array.prototype.concat.call(that.BackData, data.Sec);
        data.ThiE && that.BackData.push(data.ThiE);
        that.BackData = Array.prototype.concat.call(that.BackData, data.Thi.reverse());
        data.FouE && that.BackData.push(data.FouE);
        that.BackData = Array.prototype.concat.call(that.BackData, data.Fou);


    },
    drawBack: function() {
        let that = this,
            isTrue = false;
        //画底部背景
        that.cxtBack.save();
        that.cxtBack.translate(that.Direction.L, that.Direction.T);
        //that.cxtBack.fillStyle = (isTrue = !isTrue) ? "#ECECEC" : "#fff";
        that.cxtBack.strokeStyle = "#ddd";
        that.cxtBack.clearRect(0, 0, that.canvasBack.width, that.canvasBack.height);
        that.cxtBack.lineWidth = 1;
        for (let j = 5; j > 0; j--) {
            that.cxtBack.beginPath();
            for (let i = 0; i < that.opt.CateLength + 1; i++) {
                let angel = (2 * Math.PI / that.opt.CateLength) * i,
                    x = bitwise(that.centreX + Math.sin(angel) * that.chartRadius * j / 5),
                    y = bitwise(that.centreY + Math.cos(angel) * that.chartRadius * j / 5);
                if (i == 0) {
                    that.cxtBack.moveTo(x, y);
                    continue;
                }
                that.cxtBack.lineTo(x, y);
            }
            that.cxtBack.stroke();
        }

        that.cxtBack.beginPath();
        that.cxtBack.fillStyle = '#999';
        that.cxtBack.font = "bold 12px Arial";
        that.cxtBack.textBaseline = "middle";
        for (let i = 0, l = that.BackData.length; i < l; i++) {
            let item = that.BackData[i];
            that.cxtBack.moveTo(that.centreX, that.centreY);
            that.cxtBack.lineTo(item.tx, item.ty);
            that.cxtBack.textAlign = item.align;
            that.cxtBack.fillText(item.text, item.x, item.y);
        }
        that.cxtBack.stroke();
        that.cxtBack.closePath();
        that.cxtBack.restore();
    },
    drawRadar: function() {
        var that = this;
        if (that.progress > 100) {
            //var rate = window.devicePixelRatio || 1;
            that.cacheCxt.drawImage(that.canvasF, 0, 0, that.opt.Width, that.opt.Height);
            this.bind();
            //console.timeEnd("radar");
            return;
        }
        var per = that.progress / 100.0;
        that.cxtF.clearRect(0, 0, that.scaleWidth, that.scaleHeight);
        //画内部多边形
        that.cxtF.save();
        that.cxtF.lineJoin = 'round';
        that.cxtF.strokeStyle = '#fff';
        that.cxtF.lineWidth = 2;

        that.cxtF.translate(that.Direction.L, that.Direction.T);
        $.each(that.DrawData, function(index, item) {
            that.cxtF.save();
            that.cxtF.fillStyle = that.opt.Colors[index % that.ColorLen];
            $.each(item, function(i, point) {
                that.cxtF.beginPath();
                that.cxtF.arc(point.x * per + that.centreX, point.y * per + that.centreY, 4, 0, Math.PI * 2);
                that.cxtF.closePath();
                that.cxtF.fill();
                that.cxtF.stroke();
            });

            that.cxtF.beginPath();
            $.each(item, function(i, point) {
                that.cxtF.lineTo(point.x * per + that.centreX, point.y * per + that.centreY);
            });
            that.cxtF.strokeStyle = that.opt.Colors[index % that.ColorLen];
            that.cxtF.closePath();
            that.cxtF.stroke();
            that.cxtF.restore();
        });
        that.cxtF.restore();
        var tip = (101 - that.progress) / 8;
        tip = tip == 0 ? 1 : tip;
        that.progress += tip;
        that.AnimationID = requestAnimationFrame(function() {
            that.drawRadar.call(that);
        });
    },
    getAlign: function(angel) {

        if (angel > 0 && angel < Math.PI) {
            return 'left';
        } else if (angel > Math.PI && angel < Math.PI * 2) {
            return 'right';
        } else {
            return 'center';
        }
    },
    animateData: function() {
        var that = this;
        that.opt.IsMobile ? that.progress = 100 : that.progress = 0;
        that.drawRadar();
        //console.time("radar");
    },
    getClickIndex: function(e) {
        let that = this,
            offsetA = $(that.canvasF).offset(),
            mouseX = e.pageX - offsetA.left - that.Direction.L,
            mouseY = e.pageY - offsetA.top - that.Direction.T,
            xFromCentre = mouseX - that.centreX,
            yFromCentre = mouseY - that.centreY,
            distanceFromCentre = Math.sqrt(Math.pow(Math.abs(xFromCentre), 2) + Math.pow(Math.abs(yFromCentre), 2)),
            index = -1;
        if (distanceFromCentre <= that.chartRadius) {
            let clickAngle = Math.atan2(yFromCentre, xFromCentre) - Math.PI / 2;
            if (clickAngle < 0) {
                clickAngle = -clickAngle;
            } else {
                clickAngle = 2 * Math.PI - clickAngle;
            }
            index = Math.round(clickAngle / that.perAngels);
            index = index === that.opt.CateLength ? 0 : index;
        }
        return index;
    },
    bind: function() {
        var that = this;
        new slider(that);
        var offsetA = $(that.canvasF).offset();

        function doClick(e) {
            var index = that.getClickIndex.call(that, e);
            if (index === -1) {
                return;
            }

            var x = e.pageX - offsetA.left - that.centreX;
            var y = e.pageY - offsetA.top - that.centreY;
            $.each(that.DrawData, function(i, item) {
                var p = item[index];
                var l = Math.sqrt(Math.pow(Math.abs(x - p.x), 2) + Math.pow(Math.abs(y - p.y), 2));
                if (l <= that.radius) {
                    var ret = {
                        'Name': p.Name,
                        'Data': p.Data,
                        'Category': p.Category,
                        'SeriesCode': p.SeriesCode,
                        'CateCode': p.CateCode
                    };
                    that.opt.ClickChartCBack && that.opt.ClickChartCBack(ret);
                    return false;
                }
            });
        }

        if (!that.opt.IsMobile) {
            that.$ToolTipWrap.click(function(e) {
                doClick(e);
            });

            that.$ToolTipWrap.mousemove(function(e) {
                var index = that.getClickIndex(e);
                if (index === -1) {
                    return;
                }
                that.cxtF.clearRect(0, 0, that.opt.Width, that.opt.Height);
                //that.cxtF.drawImage(that.cacheF, 0, 0);
                that.cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                that.cxtF.save();
                that.cxtF.translate(that.Direction.L, that.Direction.T);
                that.cxtF.globalAlpha = 0.5;
                that.$TipData.html("");
                var cate = "";
                $.each(that.DrawData, function(i, item) {
                    var color = that.opt.Colors[i % that.ColorLen];
                    var p = item[index];
                    that.cxtF.beginPath();
                    that.cxtF.fillStyle = color;
                    that.cxtF.moveTo(p.x + that.centreX, p.y + that.centreY);
                    that.cxtF.arc(p.x + that.centreX, p.y + that.centreY, that.radius, 0, Math.PI * 2);
                    that.cxtF.fill();
                    cate === "" && (cate = p.Category);
                    that.$TipData.append("<div style='color:" + color + "'>" + p.Name + ':' + p.OriginalData + "</div>");
                });
                that.cxtF.restore();
                //悬浮层显示
                that.$TipName.text(cate);
                //var off = $(this).offset();

                var left = e.pageX - offsetA.left - that.Direction.L;
                var isleft = left < that.OriWidth / 2;

                that.$ToolTip.css({
                    right: isleft ? "auto" : that.OriWidth - left,
                    left: isleft ? left : "auto",
                    top: e.pageY - offsetA.top
                }).fadeIn();
            });

            that.$ToolTipWrap.mouseleave(function(e) {
                that.cxtF.clearRect(0, 0, that.scaleWidth, that.scaleHeight);
                //that.cxtF.drawImage(that.cacheF, 0, 0);
                that.cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                that.$ToolTip.fadeOut(200);
            });
        } else if (that.opt.FullMode) {
            that.$ToolTipWrap.tabMobile(function(e) {
                that.$ToolTip.addClass("ChartToolTipMobile");
                var index = that.getClickIndex.call(that, e);
                //var rate = window.devicePixelRatio || 1;
                if (index === -1) {
                    that.TimeOut && window.clearTimeout(that.TimeOut);
                    that.TimeOut = null;
                    that.$ToolTip.hide();
                    that.cxtF.clearRect(0, 0, that.scaleWidth, that.scaleWidth);
                    that.cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                    return;
                }

                that.TimeOut && window.clearTimeout(that.TimeOut);
                that.TimeOut = null;
                that.cxtF.clearRect(0, 0, that.scaleWidth, that.scaleHeight);
                that.cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                that.cxtF.save();
                that.cxtF.translate(that.Direction.L, that.Direction.T);
                that.cxtF.globalAlpha = 0.5;
                that.$TipData.html("");
                var cate = "";
                $.each(that.DrawData, function(i, item) {
                    var color = that.opt.Colors[i % that.ColorLen];
                    var p = item[index];
                    that.cxtF.beginPath();
                    that.cxtF.fillStyle = color;
                    that.cxtF.moveTo(p.x + that.centreX, p.y + that.centreY);
                    that.cxtF.arc(p.x + that.centreX, p.y + that.centreY, that.radius, 0, Math.PI * 2);
                    that.cxtF.fill();
                    cate === "" && (cate = p.Category);
                    that.$TipData.append("<div style='color:" + color + "'>" + p.Name + ':' + p.OriginalData + "</div>");
                });
                that.cxtF.restore();
                //悬浮层显示
                that.$TipName.text(cate);
                //var off = $(this).offset();
                var left = e.pageX - offsetA.left - that.Direction.L;
                var isleft = left < that.OriWidth / 2;

                that.$ToolTip.css({
                    right: isleft ? "auto" : that.OriWidth - left,
                    left: isleft ? left : "auto",
                    top: e.pageY - offsetA.top
                }).fadeIn();

                that.TimeOut = window.setTimeout(function() {
                    that.TimeOut = null;
                    that.$ToolTip.hide();
                    that.cxtF.clearRect(0, 0, that.scaleWidth, that.scaleWidth);
                    that.cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                }, HideSec);

                doClick(e, that.$ToolTipWrap[0]);
            });
        }
    },
    Refresh: function(data) {
        var that = this;
        that.AnimationID && window.cancelAnimationFrame(that.AnimationID);
    }
};

export default Radar;