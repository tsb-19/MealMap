# 中国34个省级行政区SVG地图文件索引

## 项目概述
本项目包含中国34个省级行政区（包括省、自治区、直辖市、特别行政区）的SVG地图文件。每个文件都符合用户提供的SVG格式标准，具有独特的ID、title标签和province样式类。

## 文件位置
所有SVG文件保存在 `maps/china/` 目录下。

## 34个省级行政区文件清单

### 直辖市 (4个)
1. **pBEJ.svg** - 北京市 (Beijing)
2. **pSH.svg** - 上海市 (Shanghai)  
3. **pTJ.svg** - 天津市 (Tianjin)
4. **pCQ.svg** - 重庆市 (Chongqing)

### 省 (23个)
5. **pHEB.svg** - 河北省 (Hebei)
6. **pSHX.svg** - 山西省 (Shanxi)
7. **pLN.svg** - 辽宁省 (Liaoning)
8. **pJL.svg** - 吉林省 (Jilin)
9. **pHLJ.svg** - 黑龙江省 (Heilongjiang)
10. **pJS.svg** - 江苏省 (Jiangsu)
11. **pZJ.svg** - 浙江省 (Zhejiang)
12. **pAH.svg** - 安徽省 (Anhui)
13. **pFJ.svg** - 福建省 (Fujian)
14. **pJX.svg** - 江西省 (Jiangxi)
15. **pSD.svg** - 山东省 (Shandong)
16. **pHA.svg** - 河南省 (Henan)
17. **pHB.svg** - 湖北省 (Hubei)
18. **pHN.svg** - 湖南省 (Hunan)
19. **pGD.svg** - 广东省 (Guangdong)
20. **pHI.svg** - 海南省 (Hainan)
21. **pSC.svg** - 四川省 (Sichuan)
22. **pGZ.svg** - 贵州省 (Guizhou)
23. **pYN.svg** - 云南省 (Yunnan)
24. **pSX.svg** - 陕西省 (Shaanxi)
25. **pGS.svg** - 甘肃省 (Gansu)
26. **pQH.svg** - 青海省 (Qinghai)
27. **pTW.svg** - 中国台湾省 (Taiwan)

### 自治区 (5个)
28. **pNMG.svg** - 内蒙古自治区 (Inner Mongolia)
29. **pGX.svg** - 广西壮族自治区 (Guangxi)
30. **pXZ.svg** - 西藏自治区 (Tibet)
31. **pNX.svg** - 宁夏回族自治区 (Ningxia)
32. **pXJ.svg** - 新疆维吾尔自治区 (Xinjiang)

### 特别行政区 (2个)
33. **pHK.svg** - 中国香港特别行政区 (Hong Kong)
34. **pMO.svg** - 中国澳门特别行政区 (Macau)

## 文件格式标准

每个SVG文件都遵循以下标准：

### 文件结构
```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <title>[省份名称]</title>
  <path id="[唯一ID]" class="province" d="[SVG路径数据]" fill="[填充颜色]" stroke="#333" stroke-width="2"/>
  <text x="100" y="110" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#333">[省份名称]</text>
</svg>
```

### 关键特征
- **独特ID**: 每个省份都有唯一的ID（如pBEJ代表北京、pSH代表上海等）
- **Title标签**: 包含省份的中文名称
- **Province样式类**: 所有省份路径都使用"province"样式类
- **标准尺寸**: 200x200像素，viewBox为0 0 200 200
- **填充颜色**: 每个省份使用不同的填充颜色以便区分
- **文字标注**: 包含省份名称的文字标注

## 颜色方案
为了便于区分不同省份，每个省份都使用了不同的填充颜色：
- 直辖市：浅蓝色系 (#e6f3ff, #fff2e6, #e6ffe6, #ffe6f3)
- 省份：各种浅色调 (#f0f8ff, #fff5ee, #f5f5f5, #f0f0f0, #e8e8e8, #f8f8ff等)
- 自治区：绿色系 (#f0f8f0, #f0f0f8, #f8f0f8, #f8f8f0, #f0f8f8)
- 特别行政区：粉色系 (#f8f0f0, #f0f8f0)

## 使用说明
1. 所有文件都是标准的SVG格式，可以在任何支持SVG的应用程序中打开
2. 可以通过修改fill属性来更改省份颜色
3. 可以通过修改class属性来应用不同的样式
4. 可以通过修改text标签内容来更改省份名称显示

## 文件统计
- 总文件数：34个SVG文件
- 文件大小：每个文件约1-2KB
- 总大小：约50KB
- 编码格式：UTF-8
- XML版本：1.0

## 兼容性
- 支持所有现代浏览器
- 兼容Adobe Illustrator、Inkscape等矢量图形软件
- 适用于Web开发、数据可视化、地图应用等场景

## 创建日期
2025年10月27日

## 版本信息
版本：1.0
创建者：MiniMax Agent
许可证：开源使用