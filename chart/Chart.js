import Bar from './barChart.js';
import Pie from './pieChart.js';
import Line from './lineChart.js';
import Funnel from './funnelChart.js';
import Radar from './radarChart.js';
import {
    isMobile
} from './lib.js';

function Chart(target) {
    let IsMobile = isMobile();

    this.Pie = function(opt) {
        opt = $.extend({}, DefaultOPT, opt);
        opt.IsMobile = IsMobile;
        return new Pie(opt, target);
    };

    this.Line = function(opt) {
        opt = $.extend({}, DefaultOPT, opt);
        opt.IsMobile = IsMobile;
        return new Line(opt, target);
    };

    this.Radar = function(opt) {
        opt = $.extend({}, DefaultOPT, opt);
        opt.IsMobile = IsMobile;
        return new Radar(opt, target);
    };

    this.Funnel = function(opt) {
        opt = $.extend({}, DefaultOPT, opt);
        opt.IsMobile = IsMobile;
        //opt.ShowType = 1;//1：显示有折角漏斗图，2：显示无折角漏斗图
        return new Funnel(opt, target);
    };

    this.Bar = function(opt) {
        opt = $.extend({}, DefaultOPT, opt);
        opt.IsMobile = IsMobile;
        return new Bar(opt, target);
    };
}

var DefaultOPT = {
    ShowDownLoad: false
};

$.fn.Chart = function() {
    var target = $(this);
    return new Chart(target);
};