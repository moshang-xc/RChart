# RChart

基于 canvas 绘制的图表组件

## 目前支持五种图表的绘制

- 柱状图
- 折线图
- 雷达图
- 饼图
- 漏斗图

## 效果展示

### 柱图，折线图，雷达图，漏斗图

![柱图，折线，雷达，漏斗](https://github.com/moshang-xc/gitskills/blob/master/share/chart1.jpg)

### 饼图

![饼图](https://github.com/moshang-xc/gitskills/blob/master/share/chart2.jpg)

## 安装

```
#clone
git clone https://github.com/moshang-xc/RChart.git

#安装迷你http服务器
npm install http-mini

cd Rchart

#运行server
http-mini 8088
```

## 使用示例

```html
<div id="chart" class="clearFix"></div>
```

```js
//canvas柱状图
var Categories = ["Jim", "Lucy", "Lily", "Adele", "Novak"];
var Series = [
  {
    Name: "系列一",
    Data: ["10.00", 80, "78.00", "34.45", 99.0]
  },
  {
    Name: "系列二",
    Data: [10, 78.34, 40, "89.78", 78]
  },
  {
    Name: "系列三",
    Data: [100, 56, "56.000", 78, 34]
  },
  {
    Name: "系列四",
    Data: [78, 90, "56.000", 56, 45]
  },
  {
    Name: "系列五",
    Data: [12, 34, "56.000", 70, "89.78"]
  },
  {
    Name: "系列六",
    Data: ["89.78", 78, 18, 56, 78]
  }
];

$("#chart").ChartBase({
  ChartType: 1,
  Width: 420,
  Height: 300,
  setCfg: false,
  Categories: Categories,
  Series: Series,
  ShowTitle: true,
  ClickChartCBack: function(ret) {
    alert(ret.Name + ":" + ret.Data);
  }
});
```

## 配置参数

| 参数名称         | 值类型   | 默认值 | 说明                                               |
| ---------------- | -------- | ------ | -------------------------------------------------- |
| ChartType        | Number   | 1      | 图形类型                                           |
| Width            | Number   | 400    | 图像宽度                                           |
| Height           | Number   | 300    | 图像高度                                           |
| Categories       | Array    | []     | 类别，图像可点击的 X 轴 label                      |
| Series           | Array    | []     | 系列，图像需要显示的数据                           |
| ShowTitle        | Boolean  | false  | 是否显示标题                                       |
| DragDoneCallBack | Function | Null   | 配置报表所需回掉函数                               |
| ClickChartCBack  | Function | Null   | 点击对应图像的回调，可用于获取当前点击的条目的数据 |

1. 图形类型

- 0：折线图
- 1：柱状图
- 2：饼图
- 3：雷达图
- 4：漏斗图

2. `ClickChartCBack(option)`参数说明

```js
option = { Name: "", Data: "", Category: "", CateCode: "", SeriesCode: "" };
```

- Name:点击图表字段名
- Data:点击图表数值
- Category:点击图标系列
- CateCode:类别 Code
- SeriesCode:系列 Code

**例如：**

```js
{'Name':'语文','Data':'78',Category:'jim'}
```
