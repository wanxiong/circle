
# OutputPdf 使用文档

## 简介

OutputPdf 是一个用于将 HTML 内容转换为 PDF 的工具类，支持自定义页眉、页脚、标题等内容，并且能够智能处理内容分页。

## 安装依赖

```bash
npm install jspdf html2canvas lodash
# 或
yarn add jspdf html2canvas lodash
```

## 基础使用

### 1. 简单示例

```tsx
import React, { useCallback } from 'react';
import OutputPdf from './OutputPdf';

const SimpleExample = () => {
  const handleExport = useCallback(async () => {
    const contentElement = document.getElementById('pdf-content');
    const footerElement = document.getElementById('pdf-footer');
    const titleElement = document.getElementById('pdf-title');
    
    if (!contentElement || !footerElement || !titleElement) return;

    try {
      const pdfGenerator = await OutputPdf.create({
        element: contentElement,
        footer: footerElement,
        title: titleElement,
        filename: 'example.pdf'
      });
      pdfGenerator.runExportPage();
    } catch (error) {
      console.error('PDF 导出失败:', error);
    }
  }, []);

  return (
    <div>
      <div id="pdf-title">文档标题</div>
      <div id="pdf-content">文档内容</div>
      <div id="pdf-footer">页脚内容</div>
      <button onClick={handleExport}>导出PDF</button>
    </div>
  );
};
```

### 2. 使用 useRef 的示例

```tsx
import React, { useRef } from 'react';
import OutputPdf from './OutputPdf';

const RefExample = () => {
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!contentRef.current || !titleRef.current || !footerRef.current) return;

    try {
      const pdfGenerator = await OutputPdf.create({
        element: contentRef.current,
        title: titleRef.current,
        footer: footerRef.current,
        contentWidth: 550,
        scale: 2,
        baseY: 15,
      });

      pdfGenerator.runExportPage();
    } catch (error) {
      console.error('PDF 导出失败:', error);
    }
  };

  return (
    <div>
      <div ref={titleRef}>文档标题</div>
      <div ref={contentRef}>文档内容</div>
      <div ref={footerRef}>页脚内容</div>
      <button onClick={handleExport}>导出PDF</button>
    </div>
  );
};
```

### 3. 带页码的示例

```tsx
import React, { useRef, useState } from 'react';
import OutputPdf from './OutputPdf';

const PageNumberExample = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!contentRef.current || !titleRef.current || !footerRef.current) return;

    try {
      const pdfGenerator = await OutputPdf.create({
        element: contentRef.current,
        title: titleRef.current,
        footer: footerRef.current,
        beforeRenderFooterCallback: (pageIndex, pageCount) => {
          setCurrentPage(pageIndex);
          setTotalPages(pageCount);
          if (footerRef.current) {
            footerRef.current.innerHTML = `第 ${pageIndex} 页，共 ${pageCount} 页`;
          }
        }
      });

      pdfGenerator.runExportPage();
    } catch (error) {
      console.error('PDF 导出失败:', error);
    }
  };

  return (
    <div>
      <div ref={titleRef}>文档标题</div>
      <div ref={contentRef}>文档内容</div>
      <div ref={footerRef}>
        第 {currentPage} 页，共 {totalPages} 页
      </div>
      <button onClick={handleExport}>导出PDF</button>
    </div>
  );
};
```

## 配置选项

```typescript
interface OptionData {
  // 必填项
  element: HTMLElement;              // 主要内容元素
  footer: HTMLElement;              // 页脚元素
  title: HTMLElement;               // 标题元素

  // 可选项
  header?: HTMLElement;             // 页眉元素
  filename?: string;                // 输出文件名
  contentWidth?: number;            // PDF内容宽度（默认：550）
  baseY?: number;                   // 页眉页脚间距（默认：15）
  encoder_options?: number;         // 图片压缩质量 0-1（默认：0.8）
  scale?: number;                   // 渲染缩放比例（默认：2）
  html2canvasOptions?: Options;     // html2canvas 配置项
  containerPadding?: number;        // 容器内边距（默认：0）
  debug?: boolean;                  // 是否开启调试模式
  threshold?: number;               // 裁剪阈值（默认：1）
}
```

## 注意事项

1. 确保所有图片资源都已加载完成再进行 PDF 生成
2. 建议设置适当的 scale 值以确保清晰度
3. 大型文档可能需要较长处理时间
4. 跨域图片需要配置 CORS
5. 建议在开发环境下开启 debug 模式便于调试

