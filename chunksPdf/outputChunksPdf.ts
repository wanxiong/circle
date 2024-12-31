// @ts-nocheck
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  toCanvas,
  addSubTitle,
  addHeader,
  addFooter,
  addBlank,
  A4_WIDTH,
  A4_HEIGHT,
  ENCODER_OPTIONS,
  findTableElement,
  findInterval,
  computeDiffNum,
  scale
} from './utils';

const padding =  10 ;
const containerPadding = 15 + 1

/*** 生成pdf(A4多页pdf截断问题， 包括页眉、页脚 和 上下左右留空的护理)
 * @param {Object} param
 * @param {HTMLElement} param.element - 需要转换的dom根节点
 * @param {number} [param.contentWidth=550] - 一页pdf的内容宽度，0-592.28
 * @param {string} [param.filename='document.pdf'] - pdf文件名
 * @param {HTMLElement} param.footer - 页脚dom元素
 * @param {HTMLElement} param.header - 页眉dom元素
 * @param {Object} param.customHeaderSlot.dom - 自定义头部隐藏的dom，需要在导出时候展示出来
 * @param {Object} param.customHeaderSlot.everyPage - 自定义头部隐藏的dom，是否每一页都需要添加, default： true，不需要责 false
 */
export async function outputChunksPdf({
  element,
  contentWidth = 550,
  footer,
  header,
  customHeaderSlot = {},
  filename = '测试A4分页.pdf',
  subTitle,
}) {
  if (!(element instanceof HTMLElement)) {
    return;
  }
  // jsPDFs实例
  const pdf = new jsPDF({
    unit: 'pt',
    format: 'a4',
    orientation: 'p',
  });
  // 页脚元素 经过转换后在PDF页面的高度
  const intervalList = findTableElement(element);
  const { height: tfooterHeight } = await toCanvas(footer, contentWidth, true);
  // 页眉元素 经过转换后在PDF的高度
  let theaderHeight = 0;
  if (subTitle) {
    theaderHeight = (await toCanvas(subTitle, contentWidth, true)).height || 0;
  }
  if (header) {
    theaderHeight += (await toCanvas(header, contentWidth, true)).height || 50;
  }
  let customHeaderSlotHeight = 0;
  let customHeaderSlotData = null;
  // 自定义导出dom存在
  if (customHeaderSlot.dom) {
    const customHeaderSlotCanvas = await toCanvas(customHeaderSlot.dom, contentWidth, true);
    customHeaderSlotHeight = customHeaderSlotCanvas.height;
    customHeaderSlotData = customHeaderSlotCanvas.data ?? null;
    theaderHeight += customHeaderSlotCanvas.height;
  }
  // 距离PDF左边的距离，/ 2 表示居中
  const baseX = (A4_WIDTH - contentWidth) / 2;
  // 预留空间给左边
  // 距离PDF 页眉和页脚的间距， 留白留空
  const baseY = 15;
  // 出去页头、页眉、还有内容与两者之间的间距后 每页内容的实际高度
  const originalPageHeight = A4_HEIGHT - tfooterHeight - theaderHeight - 2 * baseY;
  // 元素在网页页面的宽度
  const elementWidth = element.offsetWidth;
  // PDF内容宽度 和 在HTML中宽度 的比，
  // 用于将 元素在网页的高度 转化为 PDF内容内的高度，
  // 将 元素距离网页顶部的高度转化为 距离Canvas顶部的高度
  const renderedWidth = element.scrollWidth;
  const renderedHeight = element.scrollHeight;
  const scaleRatio = contentWidth / renderedWidth;

  let index = 1;
  let yPosition = 0;

  const pageContentHeight = Math.floor(originalPageHeight / scaleRatio);

  // 分块渲染
  while (yPosition < renderedHeight) {
    const clipHeight = Math.min(pageContentHeight, renderedHeight - yPosition);
    const lastPage = clipHeight < pageContentHeight;
    // 渲染当前片段
    let canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      x: 0,
      y: yPosition,
      width: renderedWidth,
      height: clipHeight,
      scrollX: 0,
      scrollY: -yPosition,
    });
    // document.body.append(canvas)
    // 修正操作
    let diffNum = 0;
    let diffCanvasHeight = 0;
    if (!lastPage) {
      diffNum = computeDiffNum({
          x: containerPadding * scale,
          y: canvas.height,
          w: canvas.width - 2 * containerPadding * scale,
          h: 1,
          canvas,
          initMinValue: 1,
      }, {
        intervalList,
        pageY: Math.max(yPosition, clipHeight)
      })
      diffCanvasHeight = diffNum * (contentWidth / canvas.width);
    }
    // 获取图像数据
    const imageData = canvas.toDataURL('image/jpeg', ENCODER_OPTIONS);
    const imageHeight = (contentWidth / canvas.width) * canvas.height;

    let headerY = 0;
    if (subTitle) {
      headerY = (await addSubTitle(subTitle, pdf, A4_WIDTH)).height;
    }

    // 自定义隐藏的dom
    if (customHeaderSlotData) {
      if (customHeaderSlot.everyPage === false) {
        if (i === 0) {
          pdf.addImage(customHeaderSlotData, 'JPEG', 0, headerY, contentWidth, customHeaderSlotHeight);
          headerY += customHeaderSlotHeight;
        }
      } else {
        addBlank(0, headerY, A4_WIDTH, customHeaderSlotHeight, pdf);
        pdf.addImage(customHeaderSlotData, 'JPEG', 0, headerY, contentWidth, customHeaderSlotHeight);
        headerY += customHeaderSlotHeight;
      }
    }
    // 添加页眉
    if (header) {
      await addHeader(header, headerY, pdf, A4_WIDTH);
    }
    // 插入内容图像，避免与页眉重叠
    pdf.addImage(imageData, 'JPEG', baseX, theaderHeight + baseY, contentWidth, imageHeight);

    // 将 内容 与 页脚之间留空留白的部分进行遮白处理
    addBlank(
      0,
      baseY + theaderHeight + imageHeight - diffCanvasHeight,
      A4_WIDTH,
      diffCanvasHeight,
      pdf,
    );

    yPosition += clipHeight;
    yPosition -= (diffNum / 2);
    if (diffNum/2 >= clipHeight) {
      // 兜底 宁愿截断都不要死循环
      yPosition += clipHeight;
    }

    if (customHeaderSlot.everyPage === false && i === 0) {
      theaderHeight -= Math.ceil(customHeaderSlotHeight);
    }
    // console.log(index, "====index===", yPosition, "===yPosition===", renderedHeight, "===renderedHeight", diffNum)
    
    if (yPosition < renderedHeight) {
      pdf.addPage();
      index++;
    }
  }
  
  for (let i = 1; i <= index; i++) {
    pdf.setPage(i);
    await addFooter(index, i, footer, pdf, A4_WIDTH);
  }

  return pdf.save(filename);
}
