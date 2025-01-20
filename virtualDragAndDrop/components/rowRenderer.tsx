import React, { memo, useContext, useRef } from "react"
import { CellMeasurer, ListRowProps } from 'react-virtualized';
import DraggableItem from "./draggableItem";
import GlobalContext from "../context";
import { ListItem } from "../interface"
import FormItem from "./formItem"

interface IProps {
  data: ListRowProps
}

function rowRenderer(props: IProps) {
    const { data } = props
    const domRef = useRef<HTMLDivElement | null>(null)
    const {  removeItem } = useContext(GlobalContext)
    const { key, index, style, parent } = data;
    const { list, cache, isDragging } = parent.props;
    const { label, id } = list[index] || {};
    const itemData = list[index] as ListItem;
    const {fields = []} = itemData;
  console.log(data)
    return (
      <DraggableItem index={index} domRef={domRef} itemData={itemData}>
        <CellMeasurer
          cache={cache}
          columnIndex={0}
          rowIndex={index}
          parent={parent}
          key={id} 
        >
          {({ measure, registerChild }) => (
              <div
                ref={(node) => {
                  registerChild(node);
                  domRef.current = node
                }}
                style={{ ...style, border: '1px solid green' }}
              >
                <div className="form-item-box" style={{ display: 'flex' }} >
                  <div>{label}
                    {
                      fields.map((field, index: number) => {
                        return (
                          <FormItem id={id} key={id + "-" + index} field={field} measure={measure}/>
                        )
                      })
                    }
                   </div>
                </div>
                <div style={{
                  position: "absolute",
                  right: "0",
                  top: "50%"
                }}><button onClick={() => removeItem(index)}>删除</button></div>
                {/* line  可动态生成唯一 修改 transform Y */}
                <div className={'line line-index-' + index} ></div>
              </div>
          )}
        </CellMeasurer>
      </DraggableItem>
    );
  }
  

  const RowRenderer = memo(rowRenderer)

  export default RowRenderer