import { ForwardedRef, useEffect, useMemo, useRef, useState } from "react"
import { CellMeasurerCache, List } from "react-virtualized";
import { Form } from 'antd';
import mockList from "../mockData"
import { IList } from "../interface";

function useInit () {
    const [list, setList] = useState<IList>(() => {
        return mockList
    });
    const [, forceUpdate] = useState({})
    const [form] = Form.useForm();
    const listRef = useRef<List>(null)
    const cache = useMemo(() => {
        return new CellMeasurerCache({
            fixedWidth: true,
            defaultHeight: 140,
        });
    }, [])

    useEffect(() => {
        if (listRef.current) {
            listRef.current.recomputeRowHeights();
            // listRef.current.measureAllRows()
        }
    }, [list]);
      
    return {
        cache,
        form,
        setList,
        list,
        listRef,
        forceUpdate
    }
}


export default useInit