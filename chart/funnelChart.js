/**
 * 漏斗图
 */
import {
    bitwise,
    slider,
    HideSec,
    isInteger,
    showDownload
} from './lib.js';

let Funnel = function(opt = {}, target = $('body')) {
    this.opt = $.extend({
        ShowType: 1 // 1: 有折角漏斗图， 2：无折角漏斗图
    }, opt);
    this.$outer = target;
    this.$outer.html('');
    this.$wrap = $(`<div class="FunnelChartWrap" style="width: ${this.opt.Width}px; height: ${this.opt.Height}px;"></div>`);

    this.$ToolTip = $('<div class="ChartToolTip"><div class="TipName"></div><div class="TipData"></div></div>');
    this.$TipName = this.$ToolTip.find('.TipName');
    this.$TipData = this.$ToolTip.find('.TipData');
    this.$ToolTipWrap = $('<div class="ChartToolTopWrap"></div>').append(this.$ToolTip);
    this.img = 0;
    this.ColorLen = this.opt.Colors.length;
    this.OriWidth = this.opt.Width;
    this.init();
};
Funnel.prototype = {
    constructor: Funnel,
    init: function() {
        if (this.opt.Width == 0 || this.opt.Height == 0) {
            return;
        }
        this.canvasF = document.createElement('canvas');
        if (!this.canvasF.getContext) {
            return;
        }
        this.cxtF = this.canvasF.getContext('2d');
        this.canvasF.className = 'FunnelChartCanvas';
        this.cacheF = document.createElement("canvas");
        this.cacheCxt = this.cacheF.getContext('2d');

        this.$wrap.append(this.canvasF).append(this.$ToolTipWrap).appendTo(this.$outer);
        // showDownload(this);

        this.sizePerc = 70; // 漏斗图所占画布百分比大小
        this.BiLi = 5 / 3; //漏斗图高宽比
        this.borderWidth = 1; // 边框宽度
        this.pullOutLabelFont = "bold 12px 'Microsoft YaHei'"; // 描述字体
        this.curSlice = -1; // 偏移量的索引值，默认为-1没有偏移量
        this.chartData = []; // 数据
        this.chartColors = this.opt.Colors; // 颜色
        this.totalValue = 0; // 饼图数据总值
        this.canvasWidth = this.opt.Width; // 画布宽度
        this.canvasHeight = this.opt.Height; // 画布高度
        this.centreX = bitwise(this.canvasWidth / 2 - this.canvasWidth / 10); // 画布中心位置X
        this.centreY = bitwise(this.canvasHeight / 2); // 画布中心位置Y
        this.chartW = bitwise(this.canvasWidth * this.sizePerc / 100 / 2); // 漏斗图半径
        this.chartH = bitwise(this.canvasHeight * this.sizePerc / 100 / 2); // 漏斗图半径
        var ctw = bitwise(this.chartH * this.BiLi);
        this.chartW > ctw && (this.chartW = ctw);
        this.angelT = this.chartW / 2.5 / this.chartH;
        this.fontsize = 12;

        this.formatData();
        this.opt.Width += this.Direction.L + this.Direction.R;
        this.opt.Height += this.Direction.B;
        this.canvasF.style.left = -this.Direction.L + "px";

        this.canvasF.width = this.cacheF.width = this.opt.Width;
        this.canvasF.height = this.cacheF.height = this.opt.Height;
        this.scaleWidth = this.opt.Width;
        this.scaleHeight = this.opt.Height;

        if (window.devicePixelRatio) {
            this.scaleWidth = this.opt.Width * window.devicePixelRatio;
            this.scaleHeight = this.opt.Height * window.devicePixelRatio;
            this.canvasF.style.width = this.cacheF.style.width = this.opt.Width + "px";
            this.canvasF.style.height = this.cacheF.style.height = this.opt.Height + "px";
            this.canvasF.height = this.cacheF.height = this.scaleHeight;
            this.canvasF.width = this.cacheF.width = this.scaleWidth;
            this.cxtF.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.cacheCxt.scale(window.devicePixelRatio, window.devicePixelRatio);
        }


        this.draw();
    },
    formatData: function() {
        //防止文本重叠
        let that = this,
            minVal = that.opt.Min < 0 ? that.opt.Min : 0;

        $.each(that.opt.Series, function(index, item) {
            //增加多条数据循环遍历处理
            let obj = {},
                cate = that.opt.Categories[0];
            index = parseInt(index);
            obj.value = parseFloat(item.Data[0]);
            obj.discri = item.Name;
            that.totalValue += parseFloat(item.Data[0]) - minVal;
            obj.Category = cate;
            obj.OriginalData = item.Data[0];
            obj.SeriesCode = item.Code;
            cate && (obj.CateCode = that.opt.CateCodes[cate]);
            that.chartData.push(obj);
        });

        let currentPos = 0,
            notTransfer = true,
            range = 0.75,
            padding = 20;
        switch (that.opt.ShowType) {
            case 1:
                { //1：显示有折角漏斗图
                    for (let i = 0, len = that.chartData.length; i < len; i++) {
                        let point = that.chartData[i],
                            percent = currentPos + ((point['value'] - minVal) / that.totalValue);
                        currentPos = percent;

                        let offPoint = {
                                x: that.centreX - that.chartW,
                                y: that.centreY - that.chartH
                            },
                            tan = Math.tan();
                        point.NeedLeft = false;
                        point['per'] = percent;

                        if (i == 0) {
                            point['TLPoint'] = {
                                x: offPoint.x,
                                y: offPoint.y
                            };
                            point['TRPoint'] = {
                                x: that.centreX + that.chartW,
                                y: offPoint.y
                            };
                        } else {
                            point['TLPoint'] = that.chartData[i - 1]['BLPoint'];
                            point['TRPoint'] = that.chartData[i - 1]['BRPoint'];
                        }

                        if (percent >= range) {
                            if (notTransfer === true) {
                                point['MLPoint'] = {
                                    x: that.centreX - that.chartW + that.chartH * 2 * range * that.angelT,
                                    y: offPoint.y + that.chartH * 2 * range
                                };
                                point['MRPoint'] = {
                                    x: that.centreX + that.chartW - that.chartH * 2 * range * that.angelT,
                                    y: offPoint.y + that.chartH * 2 * range
                                };
                                notTransfer = false;
                            }
                            point['BLPoint'] = {
                                x: that.centreX - that.chartW + that.chartH * 2 * range * that.angelT,
                                y: offPoint.y + percent * 2 * that.chartH
                            };
                            point['BRPoint'] = {
                                x: that.centreX + that.chartW - that.chartH * 2 * range * that.angelT,
                                y: offPoint.y + percent * 2 * that.chartH
                            };
                        } else {
                            point['BLPoint'] = {
                                x: offPoint.x + that.angelT * 2 * percent * that.chartH,
                                y: offPoint.y + percent * 2 * that.chartH
                            };
                            point['BRPoint'] = {
                                x: offPoint.x + 2 * that.chartW - that.angelT * 2 * percent * that.chartH,
                                y: offPoint.y + percent * 2 * that.chartH
                            };
                        }
                        point['sPoint'] = {
                            x: (point['TRPoint'].x + point['BRPoint'].x) / 2,
                            y: (point['TLPoint'].y + point['BLPoint'].y) / 2
                        };
                        point['mPoint'] = {
                            x: point['sPoint'].x + padding,
                            y: point['sPoint'].y
                        };

                        point['poly'] = [];
                        point['poly'].push(point['TLPoint']);
                        if (point['MLPoint']) {
                            point['poly'].push(point['MLPoint']);
                        }
                        point['poly'].push(point['BLPoint'], point['BRPoint']);
                        if (point['MRPoint']) {
                            point['poly'].push(point['MRPoint']);
                        }
                        point['poly'].push(point['TRPoint']);
                    }
                }
                break;
            case 2:
                { //2：显示无折角漏斗图
                    var padY = 2,
                        hh = this.chartH - padY * (that.chartData.length - 1) / 2;
                    for (var i = 0, len = that.chartData.length; i < len; i++) {
                        var point = that.chartData[i];
                        var percent = currentPos + (point['value'] / that.totalValue);
                        currentPos = percent;
                        var offPoint = {
                            x: that.centreX - that.chartW,
                            y: that.centreY - that.chartH
                        };

                        that.angelT = this.chartW * (1 - range);
                        point.NeedLeft = false;
                        point['per'] = percent;
                        if (i == 0) {
                            point['TLPoint'] = {
                                x: offPoint.x,
                                y: offPoint.y
                            };
                            point['TRPoint'] = {
                                x: that.centreX + that.chartW,
                                y: offPoint.y
                            };
                        } else {
                            var BL = that.chartData[i - 1]['BLPoint'];
                            point['TLPoint'] = {
                                x: BL.x,
                                y: BL.y + padY
                            };
                            var BR = that.chartData[i - 1]['BRPoint'];
                            point['TRPoint'] = {
                                x: BR.x,
                                y: BR.y + padY
                            };
                        }

                        point['BLPoint'] = {
                            x: offPoint.x + that.angelT * percent,
                            y: offPoint.y + percent * 2 * hh + padY * i
                        };
                        point['BRPoint'] = {
                            x: offPoint.x + 2 * that.chartW - that.angelT * percent,
                            y: offPoint.y + percent * 2 * hh + padY * i
                        };

                        point['sPoint'] = {
                            x: (point['TRPoint'].x + point['BRPoint'].x) / 2,
                            y: (point['TLPoint'].y + point['BLPoint'].y) / 2
                        };
                        point['mPoint'] = {
                            x: point['sPoint'].x + padding,
                            y: point['sPoint'].y
                        };

                        point['poly'] = [];
                        point['poly'].push(point['TLPoint']);
                        point['poly'].push(point['BLPoint'], point['BRPoint']);
                        point['poly'].push(point['TRPoint']);
                    }
                }
                break;
        }

        let NeedLeft = false,
            Direction = {
                T: 0,
                L: 0,
                B: 0,
                R: 0
            };
        if (that.chartData.length > 0) {
            let kP = that.chartData[0];
            Direction.R = Math.max(Direction.R, (kP["ePoint"] ? kP["ePoint"].x : kP["mPoint"].x) + that.fontsize * (kP["discri"].length + 6));
        }
        for (let i = 1, len = that.chartData.length; i < len; i++) {
            let index = i - 1,
                sPoint = that.chartData[index],
                mPoint = that.chartData[i],
                kk = Math.abs(sPoint['mPoint'].y - mPoint['mPoint'].y);

            if (kk < 14 || (sPoint['ePoint'] && sPoint['ePoint'].y > mPoint['mPoint'].y)) {
                let top = sPoint['ePoint'] ? sPoint['ePoint'].y + 14 : mPoint['mPoint'].y + 14 - kk;
                if (!NeedLeft) { //描述文本显示在右边
                    if (top > that.opt.Height - 16) {
                        NeedLeft = true;
                        mPoint['sPoint'].x = (mPoint['TLPoint'].x + mPoint['BLPoint'].x) / 2 + 12;
                        mPoint['mPoint'] = {
                            x: mPoint['sPoint'].x - padding,
                            y: mPoint['sPoint'].y
                        };
                        mPoint.NeedLeft = true;

                    } else {
                        mPoint['ePoint'] = {
                            x: mPoint['mPoint'].x + 5,
                            y: top
                        };
                    }
                    Direction.R = Math.max(Direction.R, (mPoint["ePoint"] ? mPoint["ePoint"].x : mPoint["mPoint"].x) + that.fontsize * (mPoint["discri"].length + 6));
                    Direction.B = Math.max(Direction.B, top + 2 * that.fontsize);
                } else { //描述文本显示在坐标
                    mPoint['sPoint'].x = (mPoint['TLPoint'].x + mPoint['BLPoint'].x) / 2 + 12;
                    mPoint['mPoint'] = {
                        x: mPoint['sPoint'].x - padding,
                        y: mPoint['sPoint'].y
                    };
                    mPoint.NeedLeft = true;
                    mPoint['ePoint'] = {
                        x: mPoint['mPoint'].x - 5,
                        y: top
                    };
                    Direction.L = Math.max(Direction.L, that.fontsize * (mPoint["discri"].length + 6) - (mPoint["ePoint"] ? mPoint["ePoint"].x : mPoint["mPoint"].x));
                    Direction.B = Math.max(Direction.B, top + 2 * that.fontsize);
                }
            } else {
                Direction.R = Math.max(Direction.R, (mPoint["ePoint"] ? mPoint["ePoint"].x : mPoint["mPoint"].x) + that.fontsize * (mPoint["discri"].length + 6));
                Direction.B = Math.max(Direction.B, mPoint.y + 2 * that.fontsize);
            }
        }
        Direction.L = Direction.L > 0 ? parseInt(Direction.L) : 0;
        Direction.R -= that.opt.Width;
        Direction.R = Direction.R > 0 ? parseInt(Direction.R) : 0;
        Direction.B -= that.opt.Height;
        Direction.B = Direction.B > 0 ? parseInt(Direction.B) : 0;
        that.Direction = Direction;
    },

    draw: function() {
        let that = this,
            cxtF = that.cxtF;
        cxtF.save();
        cxtF.translate(that.Direction.L, that.Direction.T);
        cxtF.globalAlpha = 1;
        for (let i = 0, len = that.chartData.length; i < len; i++) {
            let point = that.chartData[i];
            cxtF.save();
            cxtF.beginPath();
            cxtF.moveTo(point['TLPoint'].x, point['TLPoint'].y);
            cxtF.lineTo(point['TRPoint'].x, point['TRPoint'].y);
            if (!!point['MRPoint']) {
                cxtF.lineTo(point['MRPoint'].x, point['MRPoint'].y);
            }
            cxtF.lineTo(point['BRPoint'].x, point['BRPoint'].y);
            cxtF.lineTo(point['BLPoint'].x, point['BLPoint'].y);
            if (!!point['MLPoint']) {
                cxtF.lineTo(point['MLPoint'].x, point['MLPoint'].y);
            }
            cxtF.fillStyle = that.chartColors[i % that.ColorLen];
            cxtF.fill();
            cxtF.closePath();
            cxtF.restore();
        }
        cxtF.restore();

        that.cacheCxt.drawImage(that.canvasF, 0, 0, that.opt.Width, that.opt.Height);
        that.$divS = $('<div style="background-color:#fff"></div>');
        that.$divS.css({
            width: that.opt.Width,
            height: that.opt.Height,
            position: 'absolute',
            bottom: 0,
            left: 0
        });
        that.$divS.appendTo(that.$wrap);

        that.AnimationID = requestAnimationFrame(function() {
            that.animateFunnel();
        });
    },
    animateFunnel: function() {
        let that = this;

        if (that.opt.IsMobile) {
            that.$divS.remove();
            that.drawSlice();
            that.bind();
        } else {
            that.$divS.animate({
                height: 0
            }, 2000, function() {
                $(this).remove();
                that.drawSlice();
                that.bind();
            });
        }
    },
    drawSlice: function() {
        let minVal = this.opt.Min < 0 ? this.opt.Min : 0,
            cxtF = this.cxtF;

        cxtF.save();
        cxtF.translate(this.Direction.L, this.Direction.T);
        cxtF.textBaseline = "middle";
        cxtF.globalAlpha = this.opt.IsMobile ? 1 : 0.9;
        cxtF.font = this.pullOutLabelFont;
        for (let i = 0, len = this.chartData.length; i < len; i++) {
            let point = this.chartData[i],
                sPoint = point['sPoint'],
                mPoint = point['mPoint'],
                ePoint = point['ePoint'];

            point.NeedLeft && (cxtF.textAlign = 'right');
            cxtF.fillStyle = this.chartColors[i % this.ColorLen];

            //画线
            cxtF.beginPath();
            cxtF.moveTo(sPoint.x - 10, sPoint.y);
            let per = (point['value'] - minVal) / this.totalValue * 100;
            per = isInteger(per) ? per : per.toFixed(2);


            if (!!ePoint) {
                cxtF.quadraticCurveTo(mPoint.x, mPoint.y, ePoint.x, ePoint.y);
                cxtF.fillText(point['discri'] + "(" + per + "%)", ePoint.x + (point.NeedLeft ? -2 : 2), ePoint.y);
            } else {
                cxtF.lineTo(mPoint.x, mPoint.y);
                cxtF.fillText(point['discri'] + "(" + per + "%)", mPoint.x + (point.NeedLeft ? -2 : 2), mPoint.y);
            }
            cxtF.strokeStyle = this.chartColors[i % this.ColorLen];
            cxtF.stroke();
        }
        cxtF.restore();
        this.cacheCxt.drawImage(this.canvasF, 0, 0, this.opt.Width, this.opt.Height);
    },
    bind: function(e) {
        let that = this;
        new slider(that);

        let offsetA = $(that.canvasF).offset();
        that.$ToolTipWrap.click(function(e) {
            doClick(e);
        });

        function doClick(e) {
            let mouseX = e.pageX - offsetA.left,
                mouseY = e.pageY - offsetA.top,
                i = that.pointInPolygon.call(that, mouseX, mouseY);

            if (i != -1) {
                let ret = {
                    'Name': that.chartData[i]['discri'],
                    'Data': that.chartData[i]['value'],
                    'Category': that.chartData[i]['Category'],
                    'SeriesCode': that.chartData[i]['SeriesCode'],
                    'CateCode': that.chartData[i]['CateCode']
                };
                that.opt.ClickChartCBack && that.opt.ClickChartCBack(ret);
                return;
            }
        }

        if (!that.opt.IsMobile) {
            that.$ToolTipWrap.mousemove(function(e) {
                let mouseX = e.pageX - offsetA.left,
                    mouseY = e.pageY - offsetA.top,
                    i = that.pointInPolygon.call(that, mouseX, mouseY),
                    cxtF = that.cxtF;

                cxtF.clearRect(0, 0, that.opt.Width, that.opt.Height);
                cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);

                if (i != -1) {
                    cxtF.save();
                    cxtF.translate(that.Direction.L, that.Direction.T);
                    cxtF.globalAlpha = 0.2;
                    cxtF.beginPath();
                    cxtF.moveTo(that.chartData[i]['TLPoint'].x, that.chartData[i]['TLPoint'].y);
                    cxtF.lineTo(that.chartData[i]['TRPoint'].x, that.chartData[i]['TRPoint'].y);
                    if (!!that.chartData[i]['MRPoint']) {
                        cxtF.lineTo(that.chartData[i]['MRPoint'].x, that.chartData[i]['MRPoint'].y);
                    }
                    cxtF.lineTo(that.chartData[i]['BRPoint'].x, that.chartData[i]['BRPoint'].y);
                    cxtF.lineTo(that.chartData[i]['BLPoint'].x, that.chartData[i]['BLPoint'].y);
                    if (!!that.chartData[i]['MLPoint']) {
                        cxtF.lineTo(that.chartData[i]['MLPoint'].x, that.chartData[i]['MLPoint'].y);
                    }
                    cxtF.fillStyle = '#fff';
                    cxtF.fill();
                    cxtF.restore();

                    that.$TipName.text(that.chartData[i]['discri']);
                    that.$TipData.text(that.chartData[i]['Category'] + '：' + that.chartData[i]['OriginalData']);

                    let left = e.pageX - offsetA.left - that.Direction.L,
                        isleft = left < that.OriWidth / 2;
                    that.$ToolTip.css({
                        right: isleft ? "auto" : that.OriWidth - left,
                        left: isleft ? left : "auto",
                        top: e.pageY - offsetA.top - 55
                    }).show();
                } else {
                    that.$ToolTip.fadeOut(200);
                }
            });

            that.$ToolTipWrap.mouseout(function() {
                that.$ToolTip.fadeOut();
            });
        } else if (that.opt.FullMode) {
            that.$ToolTip.addClass("ChartToolTipMobile");
            that.$ToolTipWrap.tabMobile(function(e) {
                let mouseX = e.pageX - offsetA.left,
                    mouseY = e.pageY - offsetA.top,
                    i = that.pointInPolygon(mouseX, mouseY),
                    cxtF = that.cxtF;

                if (i != -1) {
                    that.TimeOut && window.clearTimeout(that.TimeOut);
                    that.TimeOut = null;

                    cxtF.clearRect(0, 0, that.scaleWidth, that.scaleHeight);
                    cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                    cxtF.save();
                    cxtF.translate(that.Direction.L, that.Direction.T);
                    cxtF.globalAlpha = 0.2;
                    cxtF.beginPath();
                    cxtF.moveTo(that.chartData[i]['TLPoint'].x, that.chartData[i]['TLPoint'].y);
                    cxtF.lineTo(that.chartData[i]['TRPoint'].x, that.chartData[i]['TRPoint'].y);
                    if (!!that.chartData[i]['MRPoint']) {
                        cxtF.lineTo(that.chartData[i]['MRPoint'].x, that.chartData[i]['MRPoint'].y);
                    }
                    cxtF.lineTo(that.chartData[i]['BRPoint'].x, that.chartData[i]['BRPoint'].y);
                    cxtF.lineTo(that.chartData[i]['BLPoint'].x, that.chartData[i]['BLPoint'].y);
                    if (!!that.chartData[i]['MLPoint']) {
                        cxtF.lineTo(that.chartData[i]['MLPoint'].x, that.chartData[i]['MLPoint'].y);
                    }
                    cxtF.fillStyle = '#fff';
                    cxtF.fill();

                    cxtF.restore();

                    that.$TipName.text(that.chartData[i]['discri']);
                    that.$TipData.text(that.chartData[i]['Category'] + '：' + that.chartData[i]['OriginalData']);

                    let left = e.pageX - offsetA.left - that.Direction.L,
                        isleft = left < that.OriWidth / 2;
                    that.$ToolTip.css({
                        right: isleft ? "auto" : that.OriWidth - left,
                        left: isleft ? left : "auto",
                        top: e.pageY - offsetA.top - 55
                    }).show();

                    that.TimeOut = window.setTimeout(function() {
                        that.TimeOut = null;
                        that.$ToolTip.hide();
                        cxtF.clearRect(0, 0, that.scaleWidth, that.scaleWidth);
                        cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                    }, HideSec);
                } else {
                    that.TimeOut && window.clearTimeout(that.TimeOut);
                    that.TimeOut = null;
                    that.$ToolTip.hide();
                    cxtF.clearRect(0, 0, that.scaleWidth, that.scaleWidth);
                    cxtF.drawImage(that.cacheF, 0, 0, that.opt.Width, that.opt.Height);
                }

                doClick(e, that.canvasF);
            });
        }
    },
    pointInPolygon: function(x, y) {
        x -= this.Direction.L || parseInt($(this.canvasF).css("left")), y -= +this.Direction.T || parseInt($(this.canvasF).css("top"));
        for (let k = 0, len = this.chartData.length; k < len; k++) {
            let px = x,
                py = y,
                flag = false;
            let poly = this.chartData[k]['poly'];
            for (let i = 0, l = poly.length, j = l - 1; i < l; j = i, i++) {
                let sx = poly[i].x,
                    sy = poly[i].y,
                    tx = poly[j].x,
                    ty = poly[j].y;
                // 点与多边形顶点重合
                if ((sx === px && sy === py) || (tx === px && ty === py)) {
                    return 'on';
                }
                // 判断线段两端点是否在射线两侧
                if ((sy < py && ty >= py) || (sy >= py && ty < py)) {
                    // 线段上与射线 Y 坐标相同的点的 X 坐标
                    let sameX = sx + (py - sy) * (tx - sx) / (ty - sy);
                    // 点在多边形的边上
                    if (sameX === px) {
                        return 'on';
                    }
                    // 射线穿过多边形的边界
                    if (sameX > px) {
                        flag = !flag;
                    }
                }
            }
            if (flag) {
                return k;
            }
        }
        return -1;
    },
    getAlign: function(angel) {
        var per = Math.PI / 2;
        if (angel > per * 3 || angel < per) {
            return 'left';
        } else if (angel > per && angel < per * 3) {
            return 'right';
        }
    },
    Refresh: function(data) {
        var that = this;
        that.AnimationID && window.cancelAnimationFrame(that.AnimationID);
    }
};

export default Funnel;