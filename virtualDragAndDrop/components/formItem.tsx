import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Input, Form } from 'antd';
import { Field } from "../interface";
import { CellMeasurerChildProps } from "react-virtualized/dist/es/CellMeasurer";

const TextArea = Input.TextArea;

interface IProps {
    field: Field;
    id: number | string;
    measure: CellMeasurerChildProps["measure"];
    
}

export default function formItem (props: IProps) {
    const [, forceUpdate] = useState({})
    const {id, measure, field} = props
    const {name, fieldModel} = field;
    const { triggered, errorMessage } = fieldModel
    const fieldName = field.name + "-" +id

    useEffect(() => {
        if (!fieldModel) return;
        return fieldModel.subscribe(() => {
            forceUpdate({})
        })
    }, [fieldModel])


    useEffect(() => {
        if (!fieldModel) return;
        return () => {
            fieldModel.destroy()
        }
    }, [fieldModel])
    console.log(fieldModel, "局部更新")

    const hasError = triggered  && errorMessage?.length  
    const HelpContext = useMemo(() => {
        if (hasError) {
            return <div style={{color: "#ff4d4f", fontSize: "14px", lineHeight: 1.5, transition: "none"}}>{errorMessage?.[0]}</div>
        }
        return ''
    }, [hasError])

    if (name === "textarea") {
        return (
            <Form.Item
                name={fieldName}
                label={name}
                validateStatus={hasError ? "error" : ""}
                extra={HelpContext}
            >
                <TextArea autoSize onResize={() => measure()} />
            </Form.Item>
        )
    } else if (name === "input") {
        return (
            <Form.Item
                name={fieldName}
                label={name}
                extra={HelpContext}
                validateStatus={hasError ? "error" : ""}
            >
                <Input />
            </Form.Item>
        )
    }


    return null
    
}