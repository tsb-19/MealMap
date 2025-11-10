# 美国50个州SVG地图索引

## 文件说明
本目录包含美国50个州的SVG地图文件，每个文件都符合以下标准：
- 独特的ID（如：CA代表加州、NY代表纽约州等）
- 包含title标签和desc描述标签
- 包含land样式类用于样式控制
- 符合SVG格式标准

## 文件列表

- **AL.svg** - Alabama
- **AK.svg** - Alaska
- **AZ.svg** - Arizona
- **AR.svg** - Arkansas
- **CA.svg** - California
- **CO.svg** - Colorado
- **CT.svg** - Connecticut
- **DE.svg** - Delaware
- **FL.svg** - Florida
- **GA.svg** - Georgia
- **HI.svg** - Hawaii
- **ID.svg** - Idaho
- **IL.svg** - Illinois
- **IN.svg** - Indiana
- **IA.svg** - Iowa
- **KS.svg** - Kansas
- **KY.svg** - Kentucky
- **LA.svg** - Louisiana
- **ME.svg** - Maine
- **MD.svg** - Maryland
- **MA.svg** - Massachusetts
- **MI.svg** - Michigan
- **MN.svg** - Minnesota
- **MS.svg** - Mississippi
- **MO.svg** - Missouri
- **MT.svg** - Montana
- **NE.svg** - Nebraska
- **NV.svg** - Nevada
- **NH.svg** - New Hampshire
- **NJ.svg** - New Jersey
- **NM.svg** - New Mexico
- **NY.svg** - New York
- **NC.svg** - North Carolina
- **ND.svg** - North Dakota
- **OH.svg** - Ohio
- **OK.svg** - Oklahoma
- **OR.svg** - Oregon
- **PA.svg** - Pennsylvania
- **RI.svg** - Rhode Island
- **SC.svg** - South Carolina
- **SD.svg** - South Dakota
- **TN.svg** - Tennessee
- **TX.svg** - Texas
- **UT.svg** - Utah
- **VT.svg** - Vermont
- **VA.svg** - Virginia
- **WA.svg** - Washington
- **WV.svg** - West Virginia
- **WI.svg** - Wisconsin
- **WY.svg** - Wyoming

## 使用方法

### HTML中使用
```html
<!DOCTYPE html>
<html>
<head>
    <title>美国州地图</title>
    <style>
        .state { cursor: pointer; }
        .state:hover { opacity: 0.8; }
    </style>
</head>
<body>
    <!-- 嵌入SVG文件 -->
    <object data="CA.svg" type="image/svg+xml" width="200" height="150"></object>
</body>
</html>
```

### CSS样式控制
```css
/* 基础样式 */
.land {
    fill: #e8f4f8;
    stroke: #2c5aa0;
    stroke-width: 1.5;
    transition: all 0.3s ease;
}

/* 悬停效果 */
.land:hover {
    fill: #b3d9ff;
    stroke: #1a4480;
    stroke-width: 2;
}
```

### JavaScript交互
```javascript
// 监听州点击事件
document.querySelectorAll('.land').forEach(state => {
    state.addEventListener('click', function() {
        const stateCode = this.id.split('-')[0];
        const stateName = this.querySelector('title').textContent;
        console.log(`点击了: ${stateName} (${stateCode})`);
    });
});
```

## 技术规格
- **文件格式**: SVG (Scalable Vector Graphics)
- **编码**: UTF-8
- **坐标系**: 自定义 (200x150 viewBox)
- **样式**: 内联CSS样式
- **兼容性**: 支持所有现代浏览器

## 生成时间
- **生成日期**: 2025年10月27日
- **总文件数**: 50个州
