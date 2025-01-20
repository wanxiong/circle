import React, { useEffect, useMemo } from 'react';
import { AutoSizer, List, ListRowProps } from 'react-virtualized';
import 'react-virtualized/styles.css';
import 'antd/dist/antd.css';
import {  Form, Button } from 'antd';
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import './index.css';
import RowRenderer from './components/rowRenderer';
import GlobalContext from './context';
import useInit from "./hooks/useInit"
import useAction from "./hooks/useAction"


function Example() {

  const { cache, form, list, setList, listRef} = useInit()
  const { getFormValue, addRow, removeItem, checkFieldValidate } = useAction({list, form, listRef, setList})
  const value = useMemo(() => {
    return {
      list,
      setList,
      removeItem
    }
  }, [list, setList, removeItem])


  console.log( "index", list, "xxxxxxxx")
  return (
    <div>
      <GlobalContext.Provider value={value}>
        <Form form={form} onValuesChange={(values) => {
          checkFieldValidate(values)
        }}>
          <br />
          <DndProvider backend={HTML5Backend}>
            <div style={{ height: '400px', border: "1px solid red" }}>
                <AutoSizer>
                  {({ height, width }: any) => {
                    console.log(height, "height")
                    return (
                      <List
                        height={400}
                        ref={listRef}
                        rowCount={list.length}
                        rowHeight={cache.rowHeight}
                        rowRenderer={(data: ListRowProps) => {
                          return <RowRenderer key={data.key} data={data}/>
                        }}
                        width={1000}
                        list={list}
                        cache={cache}
                        overscanRowCount={5}
                        onScroll={(params) => {
                          console.log(params)
                        }}
                      />
                    )
                  }}
                </AutoSizer>
            </div>
          </DndProvider>
        </Form>
        <br />
        <Button onClick={getFormValue}>获取表单内容</Button>
        <Button type='primary' onClick={addRow}>新增一列</Button>
      </GlobalContext.Provider>
    </div>
  );
}

export default Example;