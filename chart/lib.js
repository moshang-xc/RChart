const HideSec = 4000;
/**
 * 绘制背景坐标轴
 * @param {Object} chartObj 绘制对象
 */
function drawBackGrid(chartObj) {
    let cxt = chartObj.cxtBack,
        chartAxis = new ChartAxis(chartObj),
        i, l;
    chartObj.Axis = chartAxis;

    let scaleHeight = chartObj.DrawHeight = chartAxis.endPoint - chartAxis.startPoint,
        scaleWidth = chartObj.DrawWidth = chartAxis.xLabelWidth * chartObj.opt.CateLength,
        perH = scaleHeight / chartAxis.steps,
        perW = chartAxis.xLabelWidth;
    chartObj.opt.Max = chartAxis.yLabels[chartAxis.yLabels.length - 1]; //Math.max.apply(null, chartAxis.yLabels);
    chartObj.opt.Min = chartAxis.yLabels[0];

    chartObj.formatData();

    cxt.clearRect(0, 0, chartObj.canvasBack.width, chartObj.canvasBack.height);

    cxt.save();
    cxt.strokeStyle = '#ddd';
    cxt.fillStyle = '#000';
    cxt.font = '12px Microsoft YaHei';

    cxt.save();
    cxt.translate(bitwise(chartAxis.yLabelWidth), bitwise(chartAxis.startPoint));
    cxt.lineWidth = 1;

    //绘制最底部X轴
    cxt.beginPath();
    cxt.moveTo(0, scaleHeight);
    cxt.lineTo(scaleWidth, scaleHeight);
    cxt.stroke();

    //绘制底部X轴上的刻度线
    for (i = 0; i <= chartObj.showLength; i++) {
        cxt.beginPath();
        cxt.moveTo(perW * i, scaleHeight);
        cxt.lineTo(perW * i, scaleHeight + 6);
        cxt.stroke();
    }

    //h绘制X坐标虚线
    cxt.setLineDash && cxt.setLineDash([1, 2]);
    cxt.beginPath();
    //画X轴
    for (i = 0; i < chartAxis.steps; i++) {
        cxt.moveTo(0, perH * i);
        cxt.lineTo(scaleWidth, perH * i);
    }
    cxt.stroke();
    cxt.restore();

    //绘制纵坐标文本值
    cxt.save();
    cxt.translate(0, chartAxis.startPoint);
    cxt.textAlign = 'right';
    cxt.textBaseline = 'middle';
    for (i = 0; i <= chartAxis.steps; i++) {
        cxt.fillText(chartAxis.yLabels[i], chartAxis.yLabelWidth - 2, (chartAxis.steps - i) * perH);
    }
    cxt.restore();

    //绘制横坐标
    cxt.textBaseline = 'top';
    if (chartAxis.xLabelRotation > 0) {
        cxt.save();
        cxt.textAlign = 'right';
    } else {
        cxt.textAlign = 'center';
    }

    let y = chartAxis.endPoint + 4;

    let xlabel = chartAxis.xLabels;
    for (i = 0, l = xlabel.length; i < l; i++) {
        let text = chartObj.TextPos[i];
        if (chartAxis.xLabelRotation > 0) {
            cxt.save();
            if (chartAxis.xLabelRotation >= 60) {
                cxt.translate(text - chartObj.fontSize * 0.5, y);
            } else if (chartAxis.xLabelRotation >= 20) {
                cxt.translate(text + chartAxis.xLabelWidth / 2 - chartObj.fontSize * 1, y);
            } else {
                cxt.translate(text + chartAxis.xLabelWidth / 2 - chartObj.fontSize * 0.5, y);
            }

            cxt.rotate(-(toRadians(chartAxis.xLabelRotation)));
            cxt.fillText(xlabel[i], 0, 0);
            cxt.restore();
        } else {
            cxt.fillText(xlabel[i], text, y);
        }
    }
    cxt.restore();
}

/**
 * 计算X,Y轴对应的数据信息，供绘制坐标轴用
 */
function ChartAxis(chartObj) {
    this.fontSize = 12;
    this.font = '12px Microsoft YaHei';
    this.height = chartObj.opt.Height;
    this.width = chartObj.opt.Width;
    //绘制坐标轴的canvas
    this.ctx = chartObj.cxtBack;
    //计算给定数据中的最大值和最小值
    this.getMax(chartObj);
    //steps为Y轴初始将要等分的数量，最大值为10最小值为5
    this.steps = Math.max(chartObj.opt.Categories ? chartObj.opt.Categories.length : 5, chartObj.opt.Series ? chartObj.opt.Series.length : 5);
    this.steps = this.steps < 5 ? 5 : (this.steps > 10 ? 10 : this.steps);
    //计算x轴需当前要显示的类别数组
    this.xLabels = chartObj.opt.Categories.slice(chartObj.showIndex, chartObj.showIndex + chartObj.showLength);
    this.fit();
}

ChartAxis.prototype = {
    constructor: ChartAxis,
    fit: function(that) {
        this.startPoint = this.fontSize;
        this.endPoint = this.height - (this.fontSize * 1.5);

        this.StandardY();
        this.buildYLabels();
        this.calculateXLabelRotation();
        this.formatValue();
    },

    /**
     * 计算给定数据(Series[i].data)中的最大值和最小值
     */
    getMax: function(chartObj) {
        let max = 0,
            min = 0;

        this.max = this.min = 0;
        if (chartObj && chartObj.opt && chartObj.opt.Series) {
            let series = chartObj.opt.Series;
            for (let i = 0, l = series.length; i < l; i++) {
                let data = series[i]['Data'];
                max = Math.max.apply(null, data);
                min = Math.min.apply(null, data);

                this.max < max && (this.max = max);
                this.min > min && (this.min = min);
            }
        }
    },
    /**
     * 重新计算最大值max，最小值min
     * Y轴的等分数steps以及每一份的大小stepValue
     */
    StandardY: function() {
        let max = this.max,
            min = this.min,
            steps = this.steps;

        //将最大值和最小值转成整数
        let maxS = max + '',
            l = maxS.indexOf('.');
        //计算出小数的位数l，将max和min都转正对应的整数
        l = l < 0 ? 0 : (maxS.length - l - 1);
        max = Math.ceil(max * Math.pow(10, l));
        min = Math.floor(min * Math.pow(10, l));

        let tmax = max,
            tmin = min;

        if (max <= min) {
            return;
        }

        let tmpmin, corstep, tmpstep, tmpnumber, temp, extranumber;
        corstep = (max - min) / steps;
        if (Math.pow(10, parseInt(Math.log(corstep) / Math.log(10))) == corstep) {
            temp = Math.pow(10, parseInt(Math.log(corstep) / Math.log(10)));
        } else {
            temp = Math.pow(10, (parseInt(Math.log(corstep) / Math.log(10)) + 1));
        }
        tmpstep = (corstep / temp).toFixed(6);
        //选取规范步长
        if (tmpstep >= 0 && tmpstep <= 0.1) {
            tmpstep = 0.1;
        } else if (tmpstep >= 0.100001 && tmpstep <= 0.2) {
            tmpstep = 0.2;
        } else if (tmpstep >= 0.200001 && tmpstep <= 0.25) {
            tmpstep = 0.25;
        } else if (tmpstep >= 0.250001 && tmpstep <= 0.5) {
            tmpstep = 0.5;
        } else {
            tmpstep = 1;
        }
        tmpstep = tmpstep * temp;
        if (parseInt(min / tmpstep) != (min / tmpstep)) {
            if (min < 0) {
                min = (-1) * Math.ceil(Math.abs(min / tmpstep)) * tmpstep;
            } else {
                min = parseInt(Math.abs(min / tmpstep)) * tmpstep;
            }

        }
        if (parseInt(max / tmpstep) != (max / tmpstep)) {
            max = parseInt(max / tmpstep + 1) * tmpstep;
        }
        tmpnumber = (max - min) / tmpstep;
        if (tmpnumber < steps) {
            extranumber = steps - tmpnumber;
            tmpnumber = steps;
            if (extranumber % 2 == 0) {
                max = max + tmpstep * parseInt(extranumber / 2);
            } else {
                max = max + tmpstep * parseInt(extranumber / 2 + 1);
            }
            min = min - tmpstep * parseInt(extranumber / 2);
        }
        steps = tmpnumber;

        let stepValue = (max - min) / steps;

        //坐标数据优化
        if (min < 0 && tmpmin >= 0) {
            min = 0;
            steps = Math.ceil(max / stepValue);
            max = steps * stepValue;
        }

        let t = max - tmax;
        while (t > stepValue) {
            max -= stepValue;
            steps--;
            t = max - tmax;
        }

        let m = tmin - min;
        while (m > stepValue) {
            min += stepValue;
            steps--;
            m = tmin - min;
        }

        stepValue = stepValue / Math.pow(10, l);
        max /= Math.pow(10, l), min /= Math.pow(10, l);

        this.steps = steps;
        this.stepValue = stepValue;
        this.min = min;
        this.max = max;
    },
    /**
     * 调整所有计算结果，小数转为整数，提高画布绘制性能
     */
    formatValue: function() {
        //Y轴显示文本与Y轴添加6px的间距
        this.yLabelWidth += 6;
        this.xScalePaddingRight = 6;
        this.endPoint = bitwise(this.height - this.fontSize * 1.5 - Math.sin(toRadians(this.xLabelRotation)) * this.longestlabelText - 4);
        this.endPoint = bitwise(this.endPoint < this.height / 2 ? this.height / 2 : this.endPoint);
        this.xLabelRotation === 0 && (this.endPoint -= 5);
        this.xLabelWidth = (this.width - this.xScalePaddingRight - this.yLabelWidth) / this.xLabels.length;
    },
    /**
     * 计算y轴的显示文本，和显示文本在画布上的宽度
     */
    buildYLabels: function() {
        /**
         * y轴显示文本
         */
        this.yLabels = [];

        let stepDecimalPlaces = this.getDecimalPlaces(this.stepValue);

        for (let i = 0; i <= this.steps; i++) {
            this.yLabels.push((this.min + (i * this.stepValue)).toFixed(stepDecimalPlaces));
        }
        /**
         * y轴显示文本的宽度
         */
        this.yLabelWidth = this.longestText(this.ctx, this.font, this.yLabels);
    },

    /**
     * 计算x坐标轴的偏向角和距离
     */
    calculateXLabelRotation: function() {
        this.ctx.font = this.font;

        let firstWidth = this.ctx.measureText(this.xLabels[0]).width,
            lastWidth = this.ctx.measureText(this.xLabels[this.xLabels.length - 1]).width,
            firstRotated,
            lastRotated;

        /**
         * X轴在画布右侧的内边距
         */
        this.xScalePaddingRight = lastWidth / 2 + 3;

        /**
         * X轴在画布左侧的内边距
         */
        this.xScalePaddingLeft = (firstWidth / 2 > this.yLabelWidth + 10) ? firstWidth / 2 : this.yLabelWidth + 10;

        this.xLabelRotation = 0;
        let originalLabelWidth = this.longestText(this.ctx, this.font, this.xLabels),
            cosRotation,
            firstRotatedWidth;

        this.xLabelWidth = this.longestlabelText = originalLabelWidth;

        let xGridWidth = Math.floor(this.calculateX(1) - this.calculateX(0)) - 6;
        //todo by moshang 二分查找对算法进行优化
        while ((this.xLabelWidth > xGridWidth && this.xLabelRotation === 0) || (this.xLabelWidth > xGridWidth && this.xLabelRotation <= 90 && this.xLabelRotation > 0)) {
            cosRotation = Math.cos(toRadians(this.xLabelRotation));

            firstRotated = cosRotation * firstWidth;
            lastRotated = cosRotation * lastWidth;

            if (firstRotated + this.fontSize / 2 > this.yLabelWidth + 8) {
                this.xScalePaddingLeft = firstRotated + this.fontSize / 2;
            }
            this.xScalePaddingRight = this.fontSize / 2;

            this.xLabelRotation++;
            this.xLabelWidth = cosRotation * originalLabelWidth;

        }
        if (this.xLabelRotation > 0) {
            this.endPoint -= Math.sin(toRadians(this.xLabelRotation)) * originalLabelWidth + 3;
        }
    },
    /**
     * 计算X轴中显示文本的坐标位置
     */
    calculateX: function(index) {
        let innerWidth = this.width - (this.xScalePaddingLeft + this.xScalePaddingRight),
            valueWidth = innerWidth / (this.xLabels.length - ((this.offsetGridLines) ? 0 : 1)),
            valueOffset = (valueWidth * index) + this.xScalePaddingLeft;

        if (this.offsetGridLines) {
            valueOffset += (valueWidth / 2);
        }

        return Math.round(valueOffset);
    },

    /**
     * 获取小数的位数
     */
    getDecimalPlaces: function(num) {
        if (num % 1 !== 0 && isNumber(num)) {
            return num.toString().split('.')[1].length;
        } else {
            return 0;
        }
    },

    /**
     * 计算文本在画布上的最大长度
     */
    longestText: function(ctx, font, arrayOfStrings) {
        ctx.font = font;
        var longest = 0;
        for (var i = 0, len = arrayOfStrings.length; i < len; i++) {
            var textWidth = ctx.measureText(arrayOfStrings[i]).width;
            longest = (textWidth > longest) ? textWidth : longest;
        }
        return longest;
    }
};

/**
 * 判断是是否为有效数字或者可以被转成数字
 * @param {Number/String} n 需要判断的数据
 */
function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * 角度转换：度数 -> π表示法
 * @param {Number} degrees 需要转换的角度
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function setCanvasCfg(context, opt) {
    if (window.devicePixelRatio) {
        context.canvas.style.width = opt.Width + 'px';
        context.canvas.style.height = opt.Height + 'px';
        context.canvas.height = opt.Height * window.devicePixelRatio;
        context.canvas.width = opt.Width * window.devicePixelRatio;
        context.scale(window.devicePixelRatio, window.devicePixelRatio);
    } else {
        context.canvas.height = opt.Height;
        context.canvas.width = opt.Width;
    }
}

/**
 * 判断是否是移动端
 */
function isMobile() {
    if ((navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i))) {
        return true;
    }
    return false;
}

function base64Img2Blob(code) {
    var parts = code.split(';base64,');
    var contentType = parts[0].split(':')[1];
    var raw = window.atob(parts[1]);
    var rawLength = raw.length;

    var uInt8Array = new Uint8Array(rawLength);

    for (var i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], {
        type: contentType
    });
}

function downloadFile(fileName, content) {
    var aLink = document.createElement('a');
    var blob = base64Img2Blob(content); //new Blob([content]);
    // var blob = new Blob([content]);
    var evt = document.createEvent('HTMLEvents');
    evt.initEvent('click', false, false); //initEvent 不加后两个参数在FF下会报错
    aLink.download = fileName;
    aLink.href = URL.createObjectURL(blob);

    aLink.dispatchEvent(evt);
}

/**
 * 是否是整数
 * @param {Number} val 需要验证的数字
 */
function isInteger(val) {
    return (val | 0) === val;
}

//启用下载功能
function showDownload(that) {
    if (!that.opt.ShowDownLoad) return;
    var $btn = $('<span style="width:34px; height:22px; line-height:22px; font-size: 12px; border-radius:3px; background:#429CF3; color:#fff; text-align:center; position: absolute; top:1px; right:1px; cursor:pointer;">下载</span>');
    that.wrap.append($btn);
    $btn.click(function(event) {
        var type = 'image/png';
        var canvas = that.canvasF;
        downloadFile('报表', canvas.toDataURL(type));
    });
}

/**
 * 取整
 * @param {Number} k 需要取整的数值
 */
function bitwise(k) {
    return (k + 0.5) << 0;
}

function Slider(tar) {
    this.target = tar.canvasF;
    this.tarBack = tar.canvasBack;
    this.tabControl = tar.$ToolTipWrap[0];
    this.touch = ('ontouchstart' in window) || window.DocumentTouch && document instanceof window.DocumentTouch;
    this.startPos = {};
    this.range = this.target.offsetWidth - $(this.target).parent('div').width();
    this.toprange = this.target.offsetHeight - $(this.target).parent('div').height();

    if (this.range <= 0 && this.toprange <= 0) return;
    tar.opt.IsMobile ? this.bindMobileEvent() : this.bindPcEvent();
}

Slider.prototype = {
    constructor: Slider,
    bindMobileEvent: function() {
        var that = this;

        that.tabControl.addEventListener('touchstart', start, false);

        function start(event) {
            var touch = event.targetTouches[0];
            that.startPos = {
                x: touch.pageX,
                y: touch.pageY
            };
            that.startleft = parseInt(that.target.style.left || 0);
            that.starttop = parseInt(that.target.style.top || 0);
            that.tabControl.addEventListener('touchmove', moveM, false);
            that.tabControl.addEventListener('touchend', endM, false);
        }

        function moveM(event) {
            // 当屏幕有多个touch或者页面被缩放过， 就不执行move操作
            if (event.targetTouches.length > 1 || event.scale && event.scale !== 1) return;
            var touch = event.targetTouches[0];
            var endPos = {
                x: touch.pageX - that.startPos.x,
                y: touch.pageY - that.startPos.y
            };
            //isScrolling = Math.abs(endPos.x) < Math.abs(endPos.y) ? 1 : 0; //isScrolling为1时，表示纵向滑动，0为横向滑动
            if (Math.abs(endPos.x) > 5) {
                event.preventDefault(); //阻止触摸事件的默认行为，即阻止滚屏
                var left = that.startleft + endPos.x;
                left = left >= 0 ? 0 : (left < -that.range ? -that.range : left);
                //console.log(left);
                that.target.style.left = left + 'px';
                that.tarBack && (that.tarBack.style.left = left + 'px');
            }
            if (Math.abs(endPos.y) > 5) {
                event.preventDefault(); //阻止触摸事件的默认行为，即阻止滚屏
                var top = that.starttop + endPos.y;
                top = top >= 0 ? 0 : (top < -that.toprange ? -that.toprange : top);
                that.target.style.top = top + 'px';
                that.tarBack && (that.tarBack.style.top = top + 'px');
            }
        }

        function endM(event) {
            //console.log('end');
            //解绑事件
            that.tabControl.removeEventListener('touchmove', moveM, false);
            that.tabControl.removeEventListener('touchend', endM, false);
        }
    },
    bindPcEvent: function() {
        var that = this;
        that.tabControl = $(that.tabControl);

        that.tabControl.bind('mousedown.chart', start);

        function start(e) {
            e = e || window.event;
            that.startPos = {
                x: e.pageX,
                y: e.pageY
            };
            that.startleft = parseInt(that.target.style.left || 0);
            that.starttop = parseInt(that.target.style.top || 0);
            that.tabControl.bind('mousemove.chart', move);
            $(window).bind('mouseup.chart', end);
        }

        function move(e) {
            e = e || window.event;
            e.preventDefault(); // 阻止选中文本
            var endPos = {
                x: e.pageX - that.startPos.x,
                y: e.pageY - that.startPos.y
            };
            if (Math.abs(endPos.x) > 5) {
                event.preventDefault(); //阻止触摸事件的默认行为，即阻止滚屏
                var left = that.startleft + endPos.x;
                left = left >= 0 ? 0 : (left < -that.range ? -that.range : left);
                that.target.style.left = left + 'px';
                that.tarBack && (that.tarBack.style.left = left + 'px');
            }
            if (Math.abs(endPos.y) > 5) {
                event.preventDefault(); //阻止触摸事件的默认行为，即阻止滚屏
                var top = that.starttop + endPos.y;
                top = top >= 0 ? 0 : (top < -that.toprange ? -that.toprange : top);
                that.target.style.top = top + 'px';
                that.tarBack && (that.tarBack.style.top = top + 'px');
            }
        }

        function end(event) {
            //console.log('end');
            //解绑事件
            that.tabControl.unbind('mousemove.chart', move);
            $(window).unbind('mouseup.chart', end);
        }
    }
};

function sliderBar(tar) {
    if (!!tar) {
        this.chart = tar;
        this.tabControl = this.chart.opt.IsMobile ? this.chart.$ToolTipWrap[0] : this.chart.$ScrollWrap;
        this.touch = ('ontouchstart' in window) || window.DocumentTouch && document instanceof window.DocumentTouch;
        this.startPos = {};
        this.showIndex = this.chart.showIndex;
        this.range = this.chart.range;

        if (this.range <= 0) return;
        this.chart.opt.IsMobile ? this.bindMobileEvent() : this.bindPcEvent();
    }
}
sliderBar.prototype = {
    constructor: sliderBar,
    bindMobileEvent: function() {
        var that = this;

        that.tabControl.addEventListener('touchstart', start, false);
        that.SlideGap = 30;

        function start(event) {
            var touch = event.targetTouches[0];
            that.startPos = {
                x: touch.pageX,
                y: touch.pageY
            };
            that.tabControl.addEventListener('touchmove', move, false);
            that.tabControl.addEventListener('touchend', end, false);
        }

        function move(event) {
            // 当屏幕有多个touch或者页面被缩放过， 就不执行move操作
            if (event.targetTouches.length > 1 || event.scale && event.scale !== 1) return;
            var touch = event.targetTouches[0],
                endPos = {
                    x: touch.pageX - that.startPos.x,
                    y: touch.pageY - that.startPos.y
                },
                isScrolling = Math.abs(endPos.x) < Math.abs(endPos.y) ? 1 : 0; //isScrolling为1时，表示纵向滑动，0为横向滑动
            if (isScrolling === 0 && Math.abs(endPos.x) > that.SlideGap) {
                event.preventDefault(); //阻止触摸事件的默认行为，即阻止滚屏

                var index = endPos.x > 0 ? Math.floor(endPos.x / that.SlideGap) : Math.ceil(endPos.x / that.SlideGap);
                index = that.showIndex - index;
                if (index == that.chart.showIndex || index < 0 || index > that.range) return;
                that.chart.showIndex = index;
                that.chart.Slider.call(that.chart);
            }
        }

        function end(event) {
            //解绑事件
            that.showIndex = that.chart.showIndex;
            that.tabControl.removeEventListener('touchmove', move, false);
            that.tabControl.removeEventListener('touchend', end, false);
        }
    },
    bindPcEvent: function() {
        var that = this;
        that.per = that.tabControl.width() / that.chart.ScrollStep;
        var left = that.tabControl.offset().left;

        that.ScrollIcon = that.chart.ScrollIcon;
        that.ScrollIcon.bind('mousedown.chartscroll', start);

        that.chart.$ScrollWrap.bind('click.chartscroll', function(e) {
            var dx = e.pageX - $(this).offset().left - that.per;
            var index = Math.round(dx / that.per);

            if (index == that.chart.showIndex || index < 0 || index > that.range) return;
            that.chart.showIndex = index;
            that.showIndex = that.chart.showIndex;
            that.chart.Slider.call(that.chart);
            var w = that.per * (that.showIndex + 1);
            that.chart.ScrollBar.width(w);
            that.chart.ScrollIcon.css('left', w);
        });

        function start(e) {
            //console.log('start');
            that.chart.unbind.call(that.chart);
            e = e || window.event;
            that.startPos = {
                x: e.pageX,
                y: e.pageY
            };

            $(window).bind('mouseup.chartscroll', end);
            $(window).bind('mousemove.chartscroll', move);

            return false;
        }

        function move(e) {
            e = e || window.event;
            e.preventDefault(); // 阻止选中文本
            var endPos = {
                x: e.pageX - that.startPos.x
            };

            if (endPos.x != 0) {
                var w = e.pageX - left;
                if (w < that.per) return;
                that.chart.ScrollBar.width(w);
                that.chart.ScrollIcon.css('left', w);
            }

            if (Math.abs(endPos.x) > that.per / 2) {
                event.preventDefault(); //阻止触摸事件的默认行为，即阻止滚屏
                var index = Math.round(endPos.x / that.per);
                index = that.showIndex + index;
                //console.log(index);
                if (index == that.chart.showIndex || index < 0 || index > that.range) return;
                that.chart.showIndex = index;
                that.chart.Slider.call(that.chart);
            }
        }

        function end(event) {
            //console.log('end');
            //解绑事件
            that.chart.bind.call(that.chart);
            that.showIndex = that.chart.showIndex;
            var w = that.per * (that.showIndex + 1);
            that.chart.ScrollBar.width(w);
            that.chart.ScrollIcon.css('left', w);
            $(window).unbind('mouseup.chartscroll');
            $(window).unbind('mousemove.chartscroll');

        }
    }
};

$.fn.tabMobile = function(fn) {
    this[0].addEventListener('touchstart', function(e) {
        $(this).data('start', e);
        $(this).data('end', null);
    }, false);

    this[0].addEventListener('touchmove', function(e) {
        $(this).data('end', e);
    }, false);

    this[0].addEventListener('touchend', function(event) {
        var s = $(this).data('start');
        if (!s) return;
        var se = s.touches[0];
        var e = $(this).data('end');
        var ee = e && e.touches[0];
        if (se) {
            if (ee) {

                if (Math.abs(se.pageX - ee.pageX) < 7 && Math.abs(se.pageY - ee.pageY) < 7) {
                    fn && fn(se);
                    event.preventDefault();
                }
            } else {
                fn && fn(se);
                event.preventDefault();
            }
        }
    });
};

//requestAnimationFrame  全兼容模式
(function() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz', 'o', 'ms'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame =
            window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };

    var $ToolTip = $('<div class="tool-tip" style="display: none;"></div>').appendTo($('body'));
    $('body').off('mouseenter.charttip').on('mouseenter.charttip', 'i.BarTip', function() {
        var $that = $(this);
        var offset = $that.offset();
        $ToolTip.html($that.attr('data-text')).css({
            left: offset.left + ($that.outerWidth() - $ToolTip.outerWidth()) / 2 - $(window).scrollLeft(),
            bottom: $(window).height() - offset.top + 6 + $(window).scrollTop()
        }).toggle();
        return false;
    });

    $('body').off('mouseleave.charttip').on('mouseleave.charttip', '.BarTip', function() {
        $ToolTip.hide();
    });
}());

export {
    HideSec,
    isMobile,
    isNumber,
    isInteger,
    bitwise,
    toRadians,
    Slider,
    sliderBar,
    drawBackGrid,
    showDownload
};