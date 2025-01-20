import { useCallback } from "react"
import { CellMeasurerCache, List } from "react-virtualized";
import { FormInstance } from 'antd';
import { IList } from "../interface";
import { checkValuesValidate, checkValueValidate, getValues } from "../utils"
import Field from "../model/Field";

interface IProps {
    list: IList,
    form: FormInstance,
    listRef: React.RefObject<List>,
    setList: React.Dispatch<IList> ,
}


function useAction (props: IProps) {
    const { list, form, listRef, setList } = props

    const checkValue = async () => {
        const index = checkValuesValidate(list);
        if (index !== -1) {
            scrollToCell(index);
            setList([...list])
            return false
        }
        return true
    }
    const scrollToCell = useCallback((rowIndex: number) => {
        if (listRef.current) {
          listRef.current.scrollToRow(rowIndex);
        }
      }, [])

    const getFormValue = async () => {
       const isOk =  await checkValue();
       if (!isOk) return 
       alert("恭喜你，都填写完毕了")
        // todo list
       const v = getValues(list);
       console.log("values", v)
    }

    const checkFieldValidate = (value: Record<string, any>) => {
        checkValueValidate(list, value)
    }

    const addRow = () => {
        list.push({
            label: 'test -' + list.length,
            id: list.length,
            fields: [{
                name: "textarea",
                fieldModel: new Field({
                    initValue: {},
                    parentId: list.length,
                    rules: [{
                        required: true,
                        validateType: "required",
                        message: 'Please textarea your name',
                    }]
                })
            }, {
                name: "input",
                fieldModel: new Field({
                    initValue: {},
                    parentId: list.length,
                    rules: [{
                        required: true,
                        validateType: "required",
                        message: 'Please input your name',
                    }]
                }),
            }]
        })
        setList([...list])
    }

    const removeItem = (index: number) => {
        list.splice(index, 1);
        setList([...list])
    }

    return {
       checkValue,
       getFormValue,
       addRow,
       removeItem,
       checkFieldValidate
    }
}


export default useAction