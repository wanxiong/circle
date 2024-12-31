// @ts-nocheck
import html2canvas from 'html2canvas';
import { isContinuousPureColor } from "../utils"


export const A4_WIDTH = 592.28;
export const A4_HEIGHT = 841.89;
export const MAX_HEIGHT = 10000
//  0 ~ 1
export const ENCODER_OPTIONS = 0.8;

export const scale = 2

// 将元素转化为canvas元素
// 通过 放大 提高清晰度
// width为内容宽度
export async function toCanvas(element, width, ignoreCanvasWidth = false, params: {
  x?: number;
  y?: number;
  h?: number;
}) {
  const {x = 0, y = 0, h} = params || {}
  // canvas元素
  const canvas = await html2canvas(element, {
    // allowTaint: true,
    // 允许渲染跨域图片
    scale,
    x,
    y,
    width: ignoreCanvasWidth ? undefined : parseInt(((document.body.offsetWidth / 5) * 4).toFixed(0)),
    ...(h ? { height: h } : {})
    // 增加清晰度
  });
  // 获取canavs转化后的宽度
  const canvasWidth = canvas.width;
  // 获取canvas转化后的高度
  const canvasHeight = canvas.height;
  // 高度转化为PDF的高度
  const height = (width / canvasWidth) * canvasHeight;
  // 转化成图片Data
  const canvasData = canvas.toDataURL('image/jpeg', ENCODER_OPTIONS);
  //console.log(canvasData)
  return { width, height, data: canvasData, canvas };
}



export function getChunksData (element) {
  let chunks = parseInt(element.scrollHeight / MAX_HEIGHT);
  const lastChunk =  element.scrollHeight % MAX_HEIGHT;
  let chunksHeight = new Array(chunks).fill(1).map((v, i) => {
    return {
      y: i * MAX_HEIGHT,
      height:  MAX_HEIGHT,
      rateHeight: 0
    }
  })
  if (lastChunk > 0) {
    chunksHeight.push({
      y: chunks * MAX_HEIGHT,
      height: lastChunk,
      rateHeight: 0
    })
  }

  return {
    chunksData: chunksHeight,
    chunks
  }
}


export async function previewElement (element, contentWidth) {
  // const { width, height, data, canvas } = await toCanvas(element, contentWidth, true);
  const canvasWidth = element.scrollWidth * scale;
  const canvasHeight = element.scrollHeight  * scale;
  const width = contentWidth;
  const height = (width / canvasWidth) * canvasHeight;
  return {
    pWidth: width, pHeight: height, pData: {}, pCanvas: {
      width: canvasWidth,
      height: canvasHeight
    }
  }
}


export async function addSubTitle(header, pdf, contentWidth, y = 0) {
  const { height: headerHeight, data: headerData } = await toCanvas(header, contentWidth, true);
  pdf.addImage(headerData, 'JPEG', 0, y, contentWidth, headerHeight);
  return {
    height: headerHeight,
  };
}


// 添加页眉
export async function addHeader(header, y, pdf, contentWidth) {
  const { height: headerHeight, data: headerData } = await toCanvas(header, contentWidth, true);
  pdf.addImage(headerData, 'JPEG', 0, y, contentWidth, headerHeight);
}



// 添加页脚
export async function addFooter(pageNum, now, footer, pdf, contentWidth) {
  const newFooter = footer.cloneNode(true);
  newFooter.querySelector('.pdf-footer-page').innerText = now;
  newFooter.querySelector('.pdf-footer-page-count').innerText = pageNum;
  document.documentElement.appendChild(newFooter);
  const { height: footerHeight, data: footerData } = await toCanvas(newFooter, contentWidth, true);
  pdf.addImage(footerData, 'JPEG', 0, A4_HEIGHT - footerHeight, contentWidth, footerHeight);
  document.documentElement.removeChild(newFooter);
}

// 添加
export function addImage(_x, _y, pdf, data, width, height) {
  pdf.addImage(data, 'JPEG', _x, _y, width, height);
}


// 增加空白遮挡
export function addBlank(x, y, width, height, pdf) {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, Math.ceil(width), Math.ceil(height), 'F');
}



// 获取元素距离网页顶部的距离
// 通过遍历offsetParant获取距离顶端元素的高度值
export function getElementTop(element) {
  let actualTop = element.offsetTop;
  let current = element.offsetParent;
  while (current && current !== null) {
    actualTop += current.offsetTop;
    current = current.offsetParent;
  }
  return actualTop;
}



export function findTableElement (element: HTMLElement) {
  const intervalList = []
  const allElement = element.querySelectorAll(".mdm-table-tag")
  if (allElement) {
    Array.from(allElement).forEach((ele) => {
      // 不要溢出的坐标
      const innerHeight = ele.offsetHeight;
      const offsetTop = ele.offsetTop;
      intervalList.push({
        startY: offsetTop,
        endY: innerHeight + offsetTop
      })
    })
  }

  return intervalList
}

export function findInterval (list: {startY: number,endY: number } [], pageY) {
  if (!list.length) {
    return "single"
  }
  for( let i = 0; i < list.length; i++) {
    const { startY, endY } = list[i];
    if (startY < pageY &&  pageY <= endY) {
      return "multiple"
    }
  }
  return "multiple"
}

const mulTablePadding =  10;
export function computeDiffNum(diffData: {
  x: number;
  y: number;
  w: number;
  h: number;
  canvas: HTMLCanvasElement;
  initMinValue?: number;
}, other: {
  intervalList: any [],
  pageY: number
}) {
  const {pageY, intervalList} = other;
  const { x, y, w, h, canvas, initMinValue = 0 } = diffData;
  let isPure = false;
  let num = 0;
  let initValue = pageY

  while (!isPure) {
    initValue -=  (num / 2);
    const type = findInterval(intervalList, initValue);
    if (type === 'single') {
      // 加1px误差
      const imgData = canvas.getContext('2d')!.getImageData(x , y - Math.max(initMinValue, num), w - 1 * scale, h);
      const data = imgData.data;
      isPure = isPureColor(data, [0xff, 0xff, 0xff]);
      if (!isPure) {
        // 阈值
        num += 5;
      } else {
        isPure = true;
      }
    } else {
      // mdm-form-antd-field-diff-texttype padding 10
      const leftWidth = w * 0.45 - mulTablePadding * scale;
      const rightWidth = w * 0.55 - mulTablePadding * 2 * scale - 2 * scale;
      const leftImgData = canvas.getContext('2d')!.getImageData(x + mulTablePadding * scale, y - Math.max(initMinValue, num), leftWidth, h);
      const leftData = leftImgData.data;
      const leftIsPure = isContinuousPureColor(leftData);
      let rightIsPure = true;
      if (!leftIsPure) {
        num += 3;
        // const tempCanvas = document.createElement('canvas');
        // tempCanvas.width = canvas.width;
        // tempCanvas.height = canvas.height;
        // const tempCtx = tempCanvas.getContext('2d')!;
        // tempCtx.putImageData(leftImgData, 0, 0);
        // const base64Image = tempCanvas.toDataURL();
        // const img = document.createElement("img");
        // img.id = "base64Image" + Math.random().toFixed(5);
        // document.body.append(img);
        // document.getElementById(img.id)!.src = base64Image;
      } else {
        const rightImgData = canvas.getContext('2d')!.getImageData(x + w * 0.45 + mulTablePadding * scale + 1 * scale , y - Math.max(initMinValue, num), rightWidth, h);
        const rightData = rightImgData.data;
        rightIsPure = isContinuousPureColor(rightData);
        if (!rightIsPure) {
          num += 3;
        }
      //   if (num < 50) {
      //   const tempCanvas = document.createElement('canvas');
      //   tempCanvas.width = canvas.width;
      //   tempCanvas.height = canvas.height;
      //   const tempCtx = tempCanvas.getContext('2d')!;
      //   tempCtx.putImageData(rightImgData, 0, 0);
      //   const base64Image = tempCanvas.toDataURL();
      //   const img = document.createElement("img");
      //   img.id = "base64Image" + Math.random().toFixed(5);
      //   document.body.append(img);
      //   document.getElementById(img.id)!.src = base64Image;
      // }
      }
      if (leftIsPure && rightIsPure) {
        isPure = true;
      }
    }
  }
  return num;
}