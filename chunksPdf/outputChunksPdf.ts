import type { RGBAData } from 'jspdf';
import jsPDF from 'jspdf';
import type { Options } from 'html2canvas';
import html2canvas from 'html2canvas';
import { isArray } from 'lodash';

interface OptionData {
  // 主题内容
  element: HTMLElement;
  // pdf宽度
  contentWidth?: number;
  // 页脚
  footer: HTMLElement;
  // 页眉内容
  header?: HTMLElement;
  filename?: string;
  // 页头标题
  title: HTMLElement;
  // 页眉和页脚的间距留白 默认15
  baseY?: number;
  // 画质压缩比例
  encoder_options?: number;
  // 绘制的缩放比例
  scale?: number;
  // html2canvas 内置参数
  html2canvasOptions?: Options;
  // 只针对容器左右的预留,目前默认左右一样，判断内容是否阶段的时候，截取的切片x轴坐标
  containerPadding?: number;
  /**
   * @description: 在当前页绘制title之前的回调
   * @param { index } 第几页 从1开始
   *
   * @return { boolean } 是否绘制， true = 继续绘制
   */
  beforeRenderTitleCallback?: (index: number) => boolean;
  /**
   * @description: 在当前页绘制header之前的回调
   * @param { number } index 第几页 从1开始
   *
   * @return { boolean } 是否绘制， true = 继续绘制
   */
  beforeRenderHeaderCallback?: (index: number) => boolean;
  /**
   * @description: 在当前页绘制footer之前的回调
   * @param { number } pageIndex 当前页码,从1开始
   * @param { number } pageCount 总共多少页
   *
   * @return void
   */
  beforeRenderFooterCallback?: (pageIndex: number, pageCount: number) => void;
  /**
   * @description: 自定义函数，用于计算图片是否被截断
   *
   * @param {DrawPoint} data - 图片的截取区域信息
   * @param {number} data.x - 截取区域的起始 x 坐标
   * @param {number} data.y - 截取区域的起始 y 坐标
   * @param {number} data.w - 截取区域的宽度
   * @param {number} data.h - 截取区域的高度
   *
   * @param {object} other - 其他数据
   * @param {number} data.pageY - 当前element 对应的Y周裁剪坐标
   *
   * @returns {object} result
   * @returns {ResDrawPoint []} result.resPointList - 更新后的截取区域信息，包括 `x`、`y`、`w`、`h`, `rgb`
   * @returns {string} result.pureColorCondition -  对比条件 "or" 或还是 "and"
   */
  customCompute?: (
    data: DrawPoint,
    other: {
      pageY: number;
      element: HTMLElement | null;
    },
  ) => { resPointList: ResDrawPoint[]; pureColorCondition?: 'or' | 'and' };
  //
  debug?: boolean;
  // 预计算裁剪图片是否被截断的阈值，默认为1
  threshold?: number;
}

interface DrawElementData {
  width: number;
  height: number;
  data: string;
  canvas: HTMLCanvasElement;
}

interface DrawPoint {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ResDrawPoint extends DrawPoint {
  rgb?: number[];
}

interface ElementRange {
  startY: number;
  endY: number;
  element: HTMLElement;
}

type CanvasData = {
  headerCanvasData?: DrawElementData;
  titleCanvasData?: DrawElementData;
  footerCanvasData?: DrawElementData;
};

type ImageDataType = string | HTMLImageElement | HTMLCanvasElement | Uint8Array | RGBAData;

/**
 * @description: 生成pdf的类
 */
export default class OutputPdf {
  readonly options: OptionData & { contentWidth: number; scale: number };
  public pdf!: jsPDF;

  readonly A4_WIDTH = 592.28;
  readonly A4_HEIGHT = 841.89;
  // 内容宽度留白大小
  readonly baseX: number = 0;
  // 页眉和页脚的间距留白
  readonly baseY: number = 15;
  // pdf 和界面元素之间的比例
  readonly scaleRatio;
  // 页脚高度转化为PDF的高度
  private tFooterHeight = 0;
  // 页头高度转化为PDF的高度
  private tHeaderHeight = 0;
  // 收集element的区间
  elementRanges: ElementRange[] = [];
  // 画质压缩比例
  encoder_options = 0.8;
  // canvas data
  canvasData: CanvasData = {
    headerCanvasData: undefined,
    titleCanvasData: undefined,
    footerCanvasData: undefined,
  };

  constructor(options: OptionData) {
    const { element, debug } = options;
    if (!(element instanceof HTMLElement)) {
      throw new Error(
        "Invalid argument: 'element' must be an instance of HTMLElement. Please ensure that the provided element is a valid HTML element.",
      );
    }
    this.options = {
      ...options,
      contentWidth: options.contentWidth || 550,
      scale: options.scale || 2,
      debug: process.env.NODE_ENV !== 'development' ? false : debug,
    };
    this.baseX = (this.A4_WIDTH - this.options.contentWidth) / 2;
    this.baseY = options.baseY || 15;
    this.encoder_options = options.encoder_options || 0.8;
    // element 和 pdf的比例
    this.scaleRatio = this.options.contentWidth / element.scrollWidth;
  }

  private initPdf() {
    const pdf = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'p',
    });
    this.pdf = pdf;
    return pdf;
  }

  static async create(options: OptionData) {
    const instance = new OutputPdf(options);
    instance.initPdf();
    await instance.initConfig();
    return instance;
  }

  async initConfig() {
    const { element } = this.options;
    this.elementRanges = this.collectElementRanges(element);
    console.log(this.elementRanges, "this.elementRanges")
    await this.initFooterElement();
    await this.initTitleElement();
    await this.initHeaderElement();
    return this;
  }

  private async initFooterElement() {
    const { footer, contentWidth } = this.options;
    if (!footer) return;
    const data = await this.toCanvas(footer, contentWidth, true);
    this.tFooterHeight = data.height;
    this.canvasData.footerCanvasData = data;
  }
  // 标题
  private async initTitleElement() {
    const { title, contentWidth } = this.options;
    if (title) {
      const data = await this.toCanvas(title, contentWidth, true);
      this.canvasData.titleCanvasData = data;
    }
  }
  // 页头
  private async initHeaderElement() {
    if (!this.options.header) return;
    const { header, contentWidth } = this.options;
    if (header) {
      const data = await this.toCanvas(header, contentWidth, true);
      this.canvasData.headerCanvasData = data;
    }
  }
  // 除去页头、页眉、还有内容与两者之间的间距后 每页内容的实际高度
  private getOriginalPageHeight(headerY: number) {
    return this.A4_HEIGHT - this.tFooterHeight - headerY - 2 * this.baseY;
  }
  // 绘制title
  private async drawTitle(pageIndex: number, totalHeight: number, callback: (h: number) => void) {
    const { title, beforeRenderTitleCallback, contentWidth } = this.options;
    if (title) {
      let canDraw = false;
      if (typeof beforeRenderTitleCallback === 'function') {
        const next = beforeRenderTitleCallback(pageIndex);
        if (next) {
          canDraw = true;
        }
      } else {
        if (pageIndex === 1) {
          canDraw = true;
        }
      }
      if (canDraw && this.canvasData.titleCanvasData) {
        const { data, height } = this.canvasData.titleCanvasData;
        this.printImg(data, `title`);
        this.addImage(data, this.baseX, totalHeight, contentWidth, height);
        callback(height);
      }
    }
  }
  //

  addImage(
    imageData: ImageDataType,
    baseX = 0,
    y = 0,
    contentWidth: number,
    contentHeight: number,
  ) {
    const pdf = this.pdf;
    pdf.addImage(imageData, 'JPEG', baseX, y, contentWidth, contentHeight);
  }

  // 绘制header
  private async drawHeader(pageIndex: number, totalHeight: number, callback: (h: number) => void) {
    const { header, beforeRenderHeaderCallback, contentWidth } = this.options;
    if (header) {
      let canDraw = false;
      if (typeof beforeRenderHeaderCallback === 'function') {
        const next = beforeRenderHeaderCallback(pageIndex);
        if (next) {
          canDraw = true;
        }
      } else {
        if (pageIndex === 1) {
          canDraw = true;
        }
      }
      if (canDraw && this.canvasData.headerCanvasData) {
        const { data, height } = this.canvasData.headerCanvasData;
        this.printImg(data, `header`);
        this.addImage(data, this.baseX, totalHeight, contentWidth, height);
        callback(height);
      }
    }
  }

  private async drawContent(
    imageData: ImageDataType,
    contentWidth: number,
    contentHeight: number,
    totalHeight: number,
  ) {
    this.addImage(imageData, this.baseX, totalHeight + this.baseY, contentWidth, contentHeight);
  }

  addBlank(x: number, y: number, width: number, height: number) {
    const pdf = this.pdf;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, Math.ceil(width), Math.ceil(height), 'F');
  }

  // 添加页脚
  async addFooter(pageNum: number, pageCount: number, footer: HTMLElement) {
    const { contentWidth, beforeRenderFooterCallback } = this.options;
    beforeRenderFooterCallback?.(pageNum, pageCount);
    const { height, data: footerData } = await this.toCanvas(footer, contentWidth, true);
    this.printImg(footerData, `footer-index-${pageNum}`);
    this.addImage(footerData, this.baseX, this.A4_HEIGHT - height, contentWidth, height);
  }

  async toCanvas(
    element: HTMLElement,
    width: number,
    ignoreCanvasWidth = false,
    params?: {
      x?: number;
      y?: number;
      h?: number;
    },
  ) {
    const { x = 0, y = 0, h } = params || {};
    // canvas元素
    const canvas = await html2canvas(element, {
      // allowTaint: true,
      // 允许渲染跨域图片
      scale: this.options.scale,
      x,
      y,
      useCORS: true,
      width: ignoreCanvasWidth
        ? undefined
        : parseInt(((document.body.offsetWidth / 5) * 4).toFixed(0)),
      ...(h ? { height: h } : {}),
      // 增加清晰度
    });
    // 获取canvas转化后的宽度
    const canvasWidth = canvas.width;
    // 获取canvas转化后的高度
    const canvasHeight = canvas.height;
    // 高度转化为PDF的高度
    const height = (width / canvasWidth) * canvasHeight;
    // 转化成图片Data
    const canvasData = canvas.toDataURL('image/jpeg', this.encoder_options);
    //console.log(canvasData)
    return { width, height, data: canvasData, canvas };
  }

  /**
   * @description: 验证data是否是纯色
   * @param { Uint8ClampedArray } data  ImageData.data值
   * @param { number [] } rgb
   * @return { boolean } 是否纯色
   */
  isPureColor(data: Uint8ClampedArray, rgb?: number[]) {
    const { scale, debug } = this.options;
    let isPureColor = true;
    let themeColor = rgb ? rgb.join(',') : '';
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] as unknown as number;
      const g = data[i + 1] as unknown as number;
      const b = data[i + 2] as unknown as number;
      const str = `${r},${g},${b}`;
      if (!themeColor) {
        themeColor = str;
      } else if (themeColor !== str) {
        if (debug) {
          console.log(
            `isPureColor (x轴canvas绘制像素点到 => ${i === 0 ? 1 : i / 4 + 1
            } px中止) (x对应html => 绘制像素点到${Math.ceil(
              (i === 0 ? 1 : i / 4 + 1) / scale,
            )}px中止) (主题色 => ${themeColor}) (中断色 => ${str})`,
          );
        }
        // 非连续性颜色
        isPureColor = false;
        break;
      }
    }
    return isPureColor;
  }

  computeAdjustmentNum(
    data: DrawPoint & {
      canvas: HTMLCanvasElement;
      threshold?: number;
      // 指定色组
      rgb?: number[];
    },
    other: {
      // 当前element 对应的Y周裁剪坐标
      pageY: number;
    },
  ) {
    const { scale, customCompute, debug } = this.options;
    const { pageY } = other;
    const { x, y, w, h, canvas, threshold = 1, rgb } = data;
    let isPure = false;
    let num = 0;
    let temp: { imgData: ImageData; id: string }[] | null = [];
    while (!isPure) {
      const [sx, sy, sw, sh] = [x, y - (num || 1), w, h];
      if (typeof customCompute === 'function') {
        const { resPointList: resultDataList, pureColorCondition = 'and' } = customCompute(
          { x, y: sy, w, h },
          { pageY, element: this.findElementByY(pageY - num) },
        );
        if (resultDataList?.length) {
          for (const resultData of resultDataList) {
            const { x: rx, y: ry, w: rw, h: rh, rgb: rRgb } = resultData;
            const imgData = canvas.getContext('2d')!.getImageData(rx, ry, rw, rh);
            isPure = this.isPureColor(imgData.data, rRgb || rgb);
            if (debug) {
              temp.push({
                imgData,
                id: `compute-X-${rx}px-Y-${ry}px`,
              });
            }
            if (pureColorCondition === 'and') {
              if (!isPure) {
                break;
              }
            } else {
              if (isPure) {
                break;
              }
            }
          }
        }
      } else {
        const imgData = canvas.getContext('2d')!.getImageData(sx, sy, sw, sh);
        if (debug) {
          temp.push({
            imgData,
            id: `compute-X-${sx}px-Y-${sy}px`,
          });
        }
        isPure = this.isPureColor(imgData.data, rgb);
      }
      if (!isPure) {
        // 阈值
        num += threshold * scale;
      } else {
        isPure = true;
      }
    }
    this.printImg(temp, ``, canvas);
    temp = null;
    return num;
  }

  printImg(
    imageData: string | ImageData | { imgData: ImageData; id: string }[],
    type: string,
    canvas?: HTMLCanvasElement,
  ) {
    const { debug } = this.options;
    if (!debug) return;
    let src = '';
    const img = document.createElement('img');
    if (typeof imageData === 'string') {
      src = imageData;
      img.id = `base64Image-${type}-` + Math.random().toFixed(5);
    }

    if (canvas) {
      const imageDataList = isArray(imageData) ? imageData : [{ imgData: imageData, id: type }];
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.fillStyle = '#1e1e1e';
      tempCtx.fillRect(0, 0, canvas.width, canvas.height);
      imageDataList.forEach((item, index) => {
        tempCtx.putImageData(item.imgData as ImageData, 0, index * 40);
        console.log(`base64Image-${item.id}`);
        img.id = `base64Image-${item.id}-` + Math.random().toFixed(5);
      });
      const base64Image = tempCanvas.toDataURL();
      src = base64Image;
    }

    img.classList.add('pdf-base64Image');
    document.body.append(img);
    (document.getElementById(img.id) as HTMLImageElement).src = src;
  }
  // 导出函数
  async runExportPage() {
    let index = 1;
    let yPosition = 0;
    const {
      element,
      contentWidth,
      header: headerElement,
      scale,
      containerPadding = 0,
    } = this.options;
    const pdf = this.pdf;
    const renderedHeight = this.options.element.scrollHeight;
    const renderedWidth = this.options.element.scrollWidth;
    // 分块渲染
    while (yPosition < renderedHeight) {
      this.tHeaderHeight = 0;
      // 添加标题
      this.drawTitle(index, this.tHeaderHeight, (h: number) => {
        this.tHeaderHeight += h;
      });

      // 添加页眉
      if (headerElement)
        this.drawHeader(index, this.tHeaderHeight, (h: number) => {
          this.tHeaderHeight += h;
        });

      const originalPageHeight = this.getOriginalPageHeight(this.tHeaderHeight);
      // 把pdf的真实内容转换成页面的高度
      const pageContentHeight = Math.floor(originalPageHeight / this.scaleRatio);
      // 每片取最小值
      const clipHeight = Math.min(pageContentHeight, renderedHeight - yPosition);
      const lastPage = clipHeight < pageContentHeight;
      // 渲染当前片段
      const canvas = await html2canvas(element, {
        scale: this.options.scale,
        useCORS: true,
        x: 0,
        y: yPosition,
        width: renderedWidth,
        height: clipHeight,
        scrollX: 0,
        ...(this.options.html2canvasOptions || {}),
      });
      // 修正操作
      let diffNum = 0;
      let diffCanvasHeight = 0;
      if (!lastPage) {
        diffNum = this.computeAdjustmentNum(
          {
            x: containerPadding * scale,
            y: canvas.height,
            w: canvas.width - 2 * containerPadding * scale,
            h: 1,
            canvas,
            threshold: this.options.threshold,
          },
          {
            pageY: (yPosition + clipHeight) * scale,
          },
        );
        diffCanvasHeight = diffNum * (contentWidth / canvas.width);
      }
      // 获取图像数据
      const imageData = canvas.toDataURL('image/jpeg', this.encoder_options);
      const imageHeight = (contentWidth / canvas.width) * canvas.height;

      this.printImg(imageData, `content-index-${index}`);

      this.drawContent(imageData, contentWidth, imageHeight, this.tHeaderHeight);
      // 将修正的内容与页脚之间留空留白的部分进行遮白处理
      // 修正异常或者图片都是截断
      const heightOutOfRange = diffNum / scale >= clipHeight;
      if (diffCanvasHeight && !heightOutOfRange) {
        this.addBlank(
          0,
          this.baseY + this.tHeaderHeight + imageHeight - diffCanvasHeight,
          this.A4_WIDTH,
          diffCanvasHeight,
        );
      }
      // 添加高度
      yPosition += clipHeight;
      if (!heightOutOfRange) {
        // 修正高度
        yPosition -= diffNum / scale;
      }
      console.log(yPosition, yPosition * 2, "yPosition")
      if (yPosition < renderedHeight) {
        pdf.addPage();
        index++;
      }
    }
    for (let i = 1; i <= index; i++) {
      pdf.setPage(i);
      await this.addFooter(i, index, this.options.footer);
    }

    return pdf.save(this.options.filename);
  }

  // 收集每个子元素的 startY 和 endY
  collectElementRanges(container: HTMLElement): ElementRange[] {
    const { scale } = this.options;
    const ranges: ElementRange[] = [];
    const children = container.children;
    Array.from(children).forEach((child) => {
      const rect = child.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // 计算元素相对于容器的位置
      const startY = Math.floor(rect.top - containerRect.top) * scale; // 相对于 container 的 top 坐标
      const endY = Math.ceil(parseFloat((rect.bottom - containerRect.top).toFixed(3))) * scale; // 相对于 container 的 bottom 坐标

      ranges.push({ startY, endY, element: child as HTMLElement });
    });

    // 按 startY 排序，方便后续的二分查找
    ranges.sort((a, b) => a.startY - b.startY);
    return ranges;
  }

  // 查找给定 Y 坐标所在的元素
  private findElementByY(y: number, ranges?: ElementRange[]): HTMLElement | null {
    let left = 0;
    let right = (ranges || this.elementRanges).length - 1;
    const rangesData = ranges || this.elementRanges;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const range = rangesData[mid];

      if (y >= range.startY && y <= range.endY) {
        return range.element;
      } else if (y < range.startY) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    // 如果没有找到匹配的区间，返回 null
    return null;
  }
}
