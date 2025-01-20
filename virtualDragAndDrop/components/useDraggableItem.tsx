import { useContext } from "react"
import GlobalContext, { ItemTypes } from "../context"
import { clearLine } from "../utils"
import { useDrag, useDrop } from "react-dnd"
import { DraggableItemProps } from "./draggableItem"
import { ListItem } from "../interface"

function useDraggableItem (props: DraggableItemProps) {
    const { index, itemData, domRef} = props
    const { setList, list } = useContext(GlobalContext)
    const [{ canDrop, isOver }, drop] = useDrop(() => ({
      accept: ItemTypes.BOX,
      drop: (item, monitor) => {
        return {
          itemData, index
        }
      },
      hover: (item: any, monitor: any) => {
        const dragIndex = item.index
        const hoverIndex = index
        console.log(item.oldHoverIndex, "item.oldHoverIndex", hoverIndex)
        if (dragIndex === hoverIndex) {
          clearLine(item.oldHoverIndex)
          return
        }
         // Don't replace items with themselves
        
        if (item.oldHoverIndex !== hoverIndex) {
          clearLine(item.oldHoverIndex)
        }
       
        const hoverBoundingRect = domRef.current?.getBoundingClientRect();
        if (hoverBoundingRect) {
          // const hoverMiddleY =
          // (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          // const clientOffset = monitor.getClientOffset()
          // Get pixels to the top
          // const hoverClientY = clientOffset.y - hoverBoundingRect.top
           // Dragging downwards
          if (dragIndex < hoverIndex ) {
            const targetLine = (domRef.current as HTMLElement).querySelector(".line");
            if (targetLine && !targetLine.className.includes('bottom-line')) {
              targetLine.className = (targetLine.className + ' bottom-line')
            }
          }
          if (dragIndex > hoverIndex ) {
            const targetLine = (domRef.current as HTMLElement).querySelector(".line");
            if (targetLine && !targetLine.className.includes('top-line')) {
              targetLine.className = (targetLine.className + ' top-line')
            }
          }
        }
  
        if (item.oldHoverIndex !== hoverIndex) {
          item.oldHoverIndex = hoverIndex
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    
    }), [index, itemData])
  
    const [{ isDragging }, drag] = useDrag<{itemData: ListItem, index: number | string}, any, any>(() => ({
      type: ItemTypes.BOX,
      item: () => {
        console.log("item start Dragging")
        return { itemData, index }
      },
      end: (item, monitor: any) => {
        const dropResult = monitor.getDropResult()
        if (item && dropResult && item.index !== dropResult.index) {
          console.log("source",item, item.itemData.label)
          console.log("target",dropResult, dropResult.itemData.label)
          let sourceData = list[index];
          let targetData = list[dropResult.index];
          list[index] = targetData
          list[dropResult.index] = sourceData
          setList([...list])
        }
  
        const targetLineAll = document.querySelectorAll(".line");
        targetLineAll.forEach((targetLine) => {
          targetLine.className = targetLine.className.replace(/(top\-line)|(bottom\-line)/g, " ")
        })
      },
      // canDrag?: boolean | ((monitor: DragSourceMonitor<DragObject, DropResult>) => boolean);
     canDrag: (monitor) => {
      console.log(
        monitor.getClientOffset(),
        monitor.getInitialClientOffset(),
        monitor.getInitialSourceClientOffset(),
        monitor.getDifferenceFromInitialOffset())
      return true
     },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
        handlerId: monitor.getHandlerId(),
      }),
    }), [index, itemData])


    return {
        drop,
        drag,
        isDragging
    }
}


export default useDraggableItem