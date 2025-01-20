import { IList } from "./interface"

export const clearLine = (index: number) => {
    const oldTargetLine = document.body.querySelector(`.line-index-${index}`);
    oldTargetLine && (oldTargetLine.className = (`line line-index-${index}`))
}


export const checkValuesValidate = (
    list: IList
): number => {
    let errorIndex = -1
    for ( let [index, item] of list.entries()) {
        console.log(888)
        const fields = item.fields || [];
        for ( let field of fields) {
            const fieldModel = field.fieldModel
            fieldModel.triggered = true
            const errorList = fieldModel.validate()
            if (errorList?.length) {
                if (errorIndex === -1) {
                    errorIndex = index
                }
            }
            
        }
    }
    return errorIndex
}

export const checkValueValidate = (
    list: IList,
    values: Record<string, any>,
): Boolean => {
    const key = Object.keys(values)[0];
    const [fieldName, id] = key.split("-");
    const data = list.find((item) => {
        return item.id.toString() === id.toString()
    })
    if (data) {
        const fields = data.fields || [];
        const field = fields.find((field) => {
            return field.name === fieldName
        })
        if (field) {
            const fieldModel = field.fieldModel
            fieldModel.setState({
                value: values[key]
            })
            if (fieldModel.triggered) {
                fieldModel.validate()
            }
        }
    }

    return false
}


export const getValues = (list: IList,) => {
    const value = []
    for (let item of list) {
        const v: {
            id: number | string;
            values: any [];
        } = {
            id: item.id,
            values: []
        }
        item.fields.forEach((field) => {
            const val = field.fieldModel.getValue();
            v.values.push({
                name: field.name,
                value: { ...val }
            })
        })
        value.push(v)
    }
    console.log(value, "xwww")
    return value
}