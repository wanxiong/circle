import { memo, MutableRefObject } from "react";
import useDraggableItem from "./useDraggableItem"
import { ListItem } from "../interface"




export interface DraggableItemProps {
    index: number | string,
    children: React.ReactNode,
    itemData: ListItem,
    domRef: MutableRefObject<HTMLDivElement | null>
}

function draggableItem(props: DraggableItemProps) {
    const { index, children } = props
    const {
        drop,
        drag,
        isDragging
    } = useDraggableItem(props)

    const opacity = isDragging ? 0.4 : 1

    return (
      <>
        <div
          ref={(node => {
            drop(node)
            drag(node)
          })}
          style={{ opacity, marginBottom: "10px" }}
          data-testid={`box`}
          className={'draggable-item www-' + index}
        >
            {children}
        </div>
        {index === 0 && <div className="line"></div>} 
      </>
    );
}


const DraggableItem = memo(draggableItem)

export default DraggableItem